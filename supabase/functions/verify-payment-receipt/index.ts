import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { normalizeReceiptId, validReceipt } from './policy.ts';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const inputSchema = z.object({ order_id: z.string().uuid(), payment_method: z.enum(['cbe', 'telebirr']), transaction_id: z.string().max(64) });

// Fail closed until the authenticated provider contract has been inspected.
// Do not guess provider identifiers, paid-amount, recipient or asynchronous-job fields.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ state: 'failed', reason: 'unknown' }, 405);
  let started: { orderId: string; token: string; callId: number } | null = null;
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ state: 'pending_review', reason: 'service_error', saved: false }, 503);
  const admin = createClient(url, key);
  const finishPending = async () => {
    if (!started) return json({ state: 'pending_review', reason: 'service_error', saved: false }, 503);
    const { data, error } = await admin.rpc('payment_finish', {
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
    const parsed = inputSchema.safeParse({ order_id: form.get('order_id'), payment_method: form.get('payment_method'), transaction_id: normalizeReceiptId(String(form.get('transaction_id') ?? '')) });
    if (!parsed.success) return json({ state: 'failed', reason: 'missing_input' }, 400);
    const { order_id: orderId, payment_method: method, transaction_id: transactionId } = parsed.data;
    const { data: order } = await admin.from('orders').select('id,customer_id,status').eq('id', orderId).maybeSingle();
    if (!order || order.customer_id !== user.id) return json({ state: 'failed', reason: 'order_not_found' }, 404);
    if (!['pending_payment','cancelled'].includes(order.status)) return json({ state: 'confirmed', verified: true, order_id: orderId });
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
    const { data: begin, error: beginError } = await admin.rpc('payment_begin', { p_order_id: orderId, p_user_id: user.id, p_ip_hash: ipHash, p_method: transactionId ? 'id' : 'screenshot', p_payment_method: method, p_transaction_id: transactionId, p_screenshot_path: screenshotPath });
    if (beginError) return json({ state: 'pending_review', reason: 'service_error', saved: false }, 503);
    if (!begin?.token) return json({ ...begin, verified: begin?.state === 'confirmed' });
    started = { orderId, token: begin.token, callId: begin.call_id };
    if (file instanceof File && screenshotPath) {
      const { error: uploadError } = await admin.storage.from('payment-proofs').upload(screenshotPath, file, { contentType: file.type });
      if (uploadError) return await finishPending();
      // Stored location is private; SignedImage resolves it only for authorized viewers.
      const storedLocation = `${url}/storage/v1/object/authenticated/payment-proofs/${screenshotPath}`;
      const { error: saveError } = await admin.from('orders').update({ payment_proof_url: storedLocation, payment_method: method }).eq('id', orderId);
      if (saveError) return await finishPending();
    }
    return await finishPending();
  } catch {
    return await finishPending();
  }
});
