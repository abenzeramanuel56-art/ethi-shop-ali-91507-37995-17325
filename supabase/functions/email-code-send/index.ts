// Sends a 6-digit sign-in or password-reset code by email (no links).
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const purpose = body?.purpose === "reset" ? "reset" : "login";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) return json({ error: "invalid_email" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userId } = await admin.rpc("auth_user_id_by_email", { p_email: email });
    // Don't reveal whether the account exists.
    if (!userId) return json({ success: true });

    // Max 5 codes per 15 minutes per email.
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await admin.from("email_login_codes").select("id", { count: "exact", head: true })
      .eq("email", email).gte("created_at", since);
    if ((count ?? 0) >= 5) return json({ error: "too_many_requests" }, 429);

    // Invalidate older unused codes.
    await admin.from("email_login_codes").update({ consumed_at: new Date().toISOString() })
      .eq("email", email).eq("purpose", purpose).is("consumed_at", null);

    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const code = n.toString().padStart(6, "0");
    await admin.from("email_login_codes").insert({
      email, purpose, code_hash: await sha256(`${email}:${code}`),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });

    const title = purpose === "reset" ? "Password reset code" : "Your sign-in code";
    await sendEmail({
      from: "security",
      to: email,
      subject: `${code} is your Abeni Express ${purpose === "reset" ? "reset" : "sign-in"} code`,
      html: shell(title, `<p>Enter this code in the app:</p>
        <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e40af;text-align:center;margin:24px 0">${code}</p>
        <p style="color:#64748b;font-size:13px">Expires in 10 minutes. Never share this code. If you didn't request it, ignore this email.</p>`),
    });
    return json({ success: true });
  } catch (e: any) {
    console.error("email-code-send", e);
    return json({ error: e?.message ?? "failed" }, 500);
  }
});
