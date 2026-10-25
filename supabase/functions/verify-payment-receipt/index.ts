import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { normalizeReceiptId, validReceipt, paymentTarget } from './policy.ts';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const inputSchema = z.object({ order_id: z.string().uuid(), order_kind: z.enum(['physical','service','digital']).default('physical'), payment_method: z.enum(['cbe', 'telebirr']), transaction_id: z.string().max(64) });

// Fail closed until the authenticated provider contract has been inspected.
// Do not guess provider identifiers, paid-amount, recipient or asynchronous-job fields.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ state: 'failed', reason: 'unknown' }, 405);
  let started: { orderId: string; token: string; callId: number; kind: 'physical' | 'service' | 'digital' } | null = null;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ state: 'pending_review', reason: 'service_error', saved: false }, 503);
  const admin = createClient(url, key);
  const finishPending = async () => {
    if (!started) return json({ state: 'pending_review', reason: 'service_error', saved: false }, 503);
    const { data, error } = await admin.rpc(paymentTarget(started.kind).finish, {
      p_order_id: started.orderId, p_token: started.token, p_state: 'pending_review', p_reason: 'service_error',
      p_reference: null, p_request: null, p_mode: null, p_amount: null, p_service_error: true, p_call_id: started.callId,
    });
    if (error) return json({ state: 'pending_review', reason: 'service_error', saved: false }, 503);
    return json({ ...data, verified: false, saved: true });
  };
  try {
    const authorization = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authError } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    if (authError || !user) return json({ state: 'failed', reason: 'order_not_found' }, 401);
    if (Number(req.headers.get('content-length') ?? 0) > 11 * 1024 * 1024) return json({ state: 'failed', reason: 'invalid_file' }, 400);
    const form = await req.formData();
    const parsed = inputSchema.safeParse({ order_id: form.get('order_id'), order_kind: form.get('order_kind') ?? 'physical', payment_method: form.get('payment_method'), transaction_id: normalizeReceiptId(String(form.get('transaction_id') ?? '')) });
    if (!parsed.success) return json({ state: 'failed', reason: 'missing_input' }, 400);
    const { order_id: orderId, order_kind: kind, payment_method: method, transaction_id: transactionId } = parsed.data;
    const target = paymentTarget(kind);
    const table = target.table;
    const ownerColumn = target.owner;
    const { data: order } = await admin.from(table).select(`id,${ownerColumn},status`).eq('id', orderId).maybeSingle();
    if (!order || order[ownerColumn] !== user.id) return json({ state: 'failed', reason: 'order_not_found' }, 404);
    if (['payment_verified','ready_to_order','ordered_on_aliexpress','shipped','delivered','awaiting_customer_confirmation','in_progress','completed'].includes(order.status)) return json({ state: 'confirmed', verified: true, order_id: orderId });
    const file = form.get('receipt');
    if (!transactionId && !(file instanceof File)) return json({ state: 'failed', reason: 'missing_input' }, 400);
    if (file instanceof File && !validReceipt(file.type, file.size)) return json({ state: 'failed', reason: 'invalid_file' }, 400);
    if (file instanceof File) {
      const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const signatureMatches = file.type === 'image/jpeg' ? head[0] === 255 && head[1] === 216 && head[2] === 255 : file.type === 'image/png' ? head.join(',') === '137,80,78,71,13,10,26,10' : String.fromCharCode(...head.slice(0, 5)) === '%PDF-';
      if (!signatureMatches) return json({ state: 'failed', reason: 'invalid_file' }, 400);
    }
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ipHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip)))).map(b => b.toString(16).padStart(2, '0')).join('');
    const screenshotPath = file instanceof File ? `${user.id}/${orderId}/${crypto.randomUUID()}.${file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg'}` : null;
     const { data: begin, error: beginError } = await admin.rpc(target.begin, { ...(kind === 'physical' ? {} : { p_kind: kind }), p_order_id: orderId, p_user_id: user.id, p_ip_hash: ipHash, p_method: transactionId ? 'id' : 'screenshot', p_payment_method: method, p_transaction_id: transactionId, p_screenshot_path: screenshotPath });
    if (beginError) return json({ state: 'pending_review', reason: 'service_error', saved: false }, 503);
    if (!begin?.token) return json({ ...begin, verified: begin?.state === 'confirmed' });
    started = { orderId, token: begin.token, callId: begin.call_id, kind };
    if (file instanceof File && screenshotPath) {
      const { error: uploadError } = await admin.storage.from('payment-proofs').upload(screenshotPath, file, { contentType: file.type });
      if (uploadError) return await finishPending();
      // Stored location is private; SignedImage resolves it only for authorized viewers.
      const storedLocation = `${url}/storage/v1/object/authenticated/payment-proofs/${screenshotPath}`;
      const { error: saveError } = await admin.from(table).update({ payment_proof_url: storedLocation, payment_method: method }).eq('id', orderId);
      if (saveError) return await finishPending();
    }
    const apiKey = Deno.env.get('SHEGERPAY_API_KEY');
    if (!apiKey) return await finishPending();
    const mode = apiKey.startsWith('sk_test_') ? 'test' : apiKey.startsWith('sk_live_') ? 'live' : null;
    const base = 'https://api.shegerpay.com/api/v1';
    const providersResponse = await fetch(`${base}/providers`, { headers: { 'X-API-Key': apiKey }, signal: AbortSignal.timeout(10000) });
    if (!providersResponse.ok) return await finishPending();
    const catalog = await providersResponse.json();
    // Exact IDs were observed from /providers. Confirm they are still offered before use.
    const provider = Array.isArray(catalog.providers) ? catalog.providers.find((p: { id?: string; active?: boolean }) => p.id === method && p.active === true)?.id : null;
    if (!provider) return await finishPending();
    const { data: setting } = await admin.from('app_settings').select('value').eq('key', 'checkout_payment_details').maybeSingle();
    const details = setting?.value?.[method];
    if (!details?.name || !details?.account) return await finishPending();
    let body: string | FormData;
    const headers: Record<string, string> = { 'X-API-Key': apiKey };
    if (transactionId) {
      const payload: Record<string, unknown> = { provider, transaction_id: transactionId, amount: begin.amount, merchant_name: details.name };
      if (setting?.value?.expected_sender_enabled === true) {
        const { data: profile } = await admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
        if (profile?.full_name) payload.expected_sender_name = profile.full_name;
      }
      body = JSON.stringify(payload);
      headers['Content-Type'] = 'application/json';
    } else {
      if (!(file instanceof File)) return await finishPending();
      body = new FormData();
      body.append('screenshot', file);
      body.append('amount', String(begin.amount));
      body.append('provider', provider);
      body.append('merchant_name', details.name);
    }
    const response = await fetch(`${base}/${transactionId ? 'verify' : 'verify-image'}`, { method: 'POST', headers, body, signal: AbortSignal.timeout(35000) });
    if ([401,402,429,503].includes(response.status) || response.status >= 500) return await finishPending();
    const result = await response.json();
    const requestId = typeof result.request_id === 'string' ? result.request_id.slice(0, 128) : null;
    const reference = typeof result.reference_id === 'string' ? normalizeReceiptId(result.reference_id).slice(0, 128) : null;
    if (requestId) console.info('Payment verification request', requestId);
    // Paid amount, recipient and async job field names have not been established by
    // a real receipt response. Fail closed instead of guessing those fields.
    const serviceError = !response.ok && response.status !== 400 || ['pending','processing'].includes(result.status);
    const state = serviceError || result.verified === true ? 'pending_review' : 'failed';
    const reason = serviceError ? 'service_error' : result.verified === true ? 'amount_missing' : response.status === 400 && !transactionId ? 'unreadable' : 'not_found';
    const { data: completed, error: completeError } = await admin.rpc(target.finish, {
      p_order_id: orderId, p_token: started.token, p_state: state, p_reason: reason,
      p_reference: reference, p_request: requestId, p_mode: mode, p_amount: null,
      p_service_error: serviceError, p_call_id: started.callId,
    });
    if (completeError) return await finishPending();
    return json({ ...completed, verified: false, saved: true });
  } catch {
    return await finishPending();
  }
});
