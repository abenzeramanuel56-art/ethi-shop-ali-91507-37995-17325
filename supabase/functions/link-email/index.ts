// Links a real email (and optional password) to an account that signed up with Telegram.
// The email is only attached after the user clicks the confirmation link we send via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    const user = userRes?.user;
    if (userErr || !user) return json({ error: "unauthorized" }, 401);

    const { email, password, redirectTo } = await req.json();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "invalid_email" }, 400);
    if (password && String(password).length < 6) return json({ error: "weak_password" }, 400);

    // Password can be set immediately; the email is only attached after confirmation.
    if (password) {
      const { error: pwErr } = await admin.auth.admin.updateUserById(user.id, { password });
      if (pwErr) throw pwErr;
    }

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "email_change_new",
      email: user.email!,
      newEmail: email,
      options: { redirectTo: redirectTo || undefined },
    });
    if (linkErr) throw linkErr;
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) throw new Error("could_not_generate_link");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({
        from: "Abeni Express <onboarding@resend.dev>",
        to: [email],
        subject: "Confirm your email for Abeni Express",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
            <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);color:#fff;padding:28px;border-radius:12px;text-align:center">
              <h1 style="margin:0;font-size:22px">Abeni Express</h1>
              <p style="margin:8px 0 0;opacity:.9">Confirm your email address</p>
            </div>
            <div style="background:#f8fafc;padding:28px;border-radius:12px;margin-top:16px">
              <p style="margin:0 0 20px">Click below to attach this email to your Abeni Express account. Until you confirm, nothing changes on your account.</p>
              <p style="text-align:center;margin:24px 0">
                <a href="${actionLink}" style="display:inline-block;padding:14px 28px;background:#1e40af;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Confirm email</a>
              </p>
              <p style="color:#64748b;font-size:13px;margin:20px 0 0">Or paste this URL:<br/><a href="${actionLink}" style="color:#1e40af;word-break:break-all">${actionLink}</a></p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">© 2026 Abeni Express</p>
          </div>`,
      }),
    });
    if (!res.ok) throw new Error(`resend_failed: ${await res.text()}`);

    return json({ success: true });
  } catch (e: any) {
    console.error("link-email error", e);
    return json({ error: e.message }, 500);
  }
});
