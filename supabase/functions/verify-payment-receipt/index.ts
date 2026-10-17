import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ verified: false, error: "unauthorized" }, 401);

    const form = await req.formData();
    const file = form.get("receipt");
    const orderId = String(form.get("order_id") ?? "");
    const method = String(form.get("payment_method") ?? "");
    if (!(file instanceof File) || !orderId) return json({ verified: false, error: "missing_fields" }, 400);

    const admin = createClient(url, service);
    const { data: order } = await admin.from("orders").select("id, customer_id, total_etb, status").eq("id", orderId).maybeSingle();
    if (!order || order.customer_id !== user.id) return json({ verified: false, error: "order_not_found" }, 404);
    // Amount always comes from the stored order, never trusted from the browser.
    const amount = Number(order.total_etb);

    const verifyUrl = Deno.env.get("RECEIPT_VERIFY_URL");
    const apiKey = Deno.env.get("RECEIPT_VERIFY_API_KEY");
    if (!verifyUrl || !apiKey) return json({ verified: false, configured: false, error: "verifier_not_configured" });

    const out = new FormData();
    out.append("receipt", file, file.name);
    out.append("amount", String(amount));
    out.append("payment_method", method);
    out.append("order_id", orderId);
    const r = await fetch(verifyUrl, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: out });
    const body = await r.json().catch(() => ({}));
    const ok = r.ok && (body?.verified === true || body?.success === true || body?.valid === true);
    if (!ok) return json({ verified: false, error: body?.error || body?.message || "verification_failed" });

    await admin.from("orders").update({ status: "payment_verified" }).eq("id", orderId);
    return json({ verified: true, reference: body?.transaction_id || body?.reference || orderId });
  } catch (e) {
    return json({ verified: false, error: String(e) }, 500);
  }
});
