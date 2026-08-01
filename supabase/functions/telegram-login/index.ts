// Signs a user in using the 6-digit code their Telegram bot sent them.
// Body: { code: "123456" } -> { token_hash, email } for supabase.auth.verifyOtp on the client.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { code } = await req.json();
    if (!code || !/^\d{6}$/.test(String(code))) return json({ error: "invalid_code" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: verification } = await supabase
      .from("telegram_verifications")
      .select("telegram_id, expires_at")
      .eq("verification_code", String(code))
      .maybeSingle();

    if (!verification || new Date(verification.expires_at).getTime() < Date.now()) {
      return json({ error: "code_invalid_or_expired" }, 400);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", verification.telegram_id)
      .maybeSingle();

    if (!profile) return json({ error: "telegram_not_linked" }, 404);

    const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(profile.id);
    if (userErr || !userRes?.user?.email) return json({ error: "no_email_on_account" }, 400);

    const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: userRes.user.email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      console.error("generateLink error", linkErr);
      return json({ error: linkErr?.message ?? "link_failed" }, 500);
    }

    await supabase.from("telegram_verifications").delete().eq("telegram_id", verification.telegram_id);

    return json({ token_hash: link.properties.hashed_token, email: userRes.user.email });
  } catch (e: any) {
    console.error("telegram-login error", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});
