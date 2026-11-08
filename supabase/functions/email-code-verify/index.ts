// Verifies a 6-digit email code. login -> returns token_hash for a session; reset -> sets new password then signs in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail, shell } from "../_shared/mailer.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const code = String(body?.code ?? "").trim();
    const purpose = body?.purpose === "reset" ? "reset" : "login";
    const newPassword = body?.newPassword ? String(body.newPassword) : "";
    if (!email || !/^\d{6}$/.test(code)) return json({ error: "invalid_code" }, 400);
    if (purpose === "reset" && (newPassword.length < 6 || newPassword.length > 72)) return json({ error: "weak_password" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await admin.from("email_login_codes")
      .select("id, code_hash, attempts, expires_at")
      .eq("email", email).eq("purpose", purpose).is("consumed_at", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (!row) return json({ error: "invalid_code" }, 400);
    if (new Date(row.expires_at) < new Date()) return json({ error: "code_expired" }, 400);
    if (row.attempts >= MAX_ATTEMPTS) return json({ error: "too_many_attempts" }, 429);

    if ((await sha256(`${email}:${code}`)) !== row.code_hash) {
      const attempts = row.attempts + 1;
      await admin.from("email_login_codes").update({
        attempts, ...(attempts >= MAX_ATTEMPTS ? { consumed_at: new Date().toISOString() } : {}),
      }).eq("id", row.id);
      return json({ error: attempts >= MAX_ATTEMPTS ? "too_many_attempts" : "invalid_code", remaining: MAX_ATTEMPTS - attempts }, 400);
    }

    // Burn the code (only if still unused — prevents double use).
    const { data: burned } = await admin.from("email_login_codes")
      .update({ consumed_at: new Date().toISOString() }).eq("id", row.id).is("consumed_at", null).select("id");
    if (!burned?.length) return json({ error: "invalid_code" }, 400);

    const { data: userId } = await admin.rpc("auth_user_id_by_email", { p_email: email });
    if (!userId) return json({ error: "invalid_code" }, 400);

    if (purpose === "reset") {
      const { error } = await admin.auth.admin.updateUserById(userId as string, { password: newPassword });
      if (error) throw error;
    }
    // Entering a code proves email ownership.
    await admin.auth.admin.updateUserById(userId as string, { email_confirm: true });

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (linkErr) throw linkErr;

    // Security alert (non-blocking).
    sendEmail({
      from: "security",
      to: email,
      subject: purpose === "reset" ? "Your Abeni Express password was changed" : "New sign-in to your Abeni Express account",
      html: shell("Security alert", `<p>${purpose === "reset" ? "Your password was just changed" : "Your account was just signed in to with an email code"}.</p>
        <p style="color:#64748b;font-size:13px">Time: ${new Date().toUTCString()}<br/>Device: ${(req.headers.get("user-agent") ?? "unknown").slice(0, 120).replace(/[<>]/g, "")}</p>
        <p>If this wasn't you, reset your password immediately and contact support@abeniexpress.online.</p>`),
    }).catch((e) => console.error("alert failed", e));

    return json({ success: true, token_hash: link.properties?.hashed_token });
  } catch (e: any) {
    console.error("email-code-verify", e);
    return json({ error: e?.message ?? "failed" }, 500);
  }
});
