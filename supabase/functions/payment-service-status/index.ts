import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const url = Deno.env.get('SUPABASE_URL'), service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !service) return json({ healthy: false, mode: null }, 503);
  const db = createClient(url, service);
  const { data: { user } } = await db.auth.getUser((req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, ''));
  if (!user) return json({ healthy: false }, 401);
  const { data: calls } = await db.from('payment_verification_calls').select('service_error,mode').order('created_at', { ascending: false }).limit(3);
  const key = Deno.env.get('SHEGERPAY_API_KEY');
  const mode = key?.startsWith('sk_test_') ? 'test' : key?.startsWith('sk_live_') ? 'live' : null;
  const healthy = Boolean(key && calls?.length === 3 && calls.every(c => !c.service_error));
  if (req.method !== 'POST') return json({ healthy, mode });
  // Authenticated callers may inspect public provider capabilities; no credentials are returned.
  if (!key) return json({ healthy: false, mode, provider_status: 'unconfigured' });
  try {
    const response = await fetch('https://api.shegerpay.com/api/v1/providers', { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(12000) });
    // Providers contain public integration metadata only, never receipt or customer data.
    const providers = response.ok ? await response.json() : null;
    let sample = null;
    if (mode === 'test' && response.ok) {
      const probe = await fetch('https://api.shegerpay.com/api/v1/verify', { method: 'POST', headers: { 'X-API-Key': key, 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'cbe', transaction_id: 'ABENI_TEST_NONEXISTENT', amount: 100, merchant_name: 'Selamawit Gebretsadik' }), signal: AbortSignal.timeout(12000) });
      sample = { status: probe.status, response: await probe.json() };
    }
    return json({ healthy, mode, provider_status: response.status, providers, sample });
  } catch {
    return json({ healthy: false, mode, provider_status: 'unavailable' });
  }
});