import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, redirectTo } = await req.json();
    if (!email) throw new Error("email required");

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Confirm user exists — do not reveal to caller
    const { data: list } = await admin.auth.admin.listUsers();
    const user = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate a recovery link via Supabase Admin API
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: redirectTo || undefined,
      },
    });
    if (linkErr) throw linkErr;
    const actionLink = linkData.properties?.action_link;
    if (!actionLink) throw new Error("could_not_generate_link");

    // Send via Resend
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Abeni Express <onboarding@resend.dev>",
        to: [email],
        subject: "Reset your Abeni Express password",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
            <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);color:#fff;padding:28px;border-radius:12px;text-align:center">
              <h1 style="margin:0;font-size:22px">Abeni Express</h1>
              <p style="margin:8px 0 0;opacity:.9">Password reset</p>
            </div>
            <div style="background:#f8fafc;padding:28px;border-radius:12px;margin-top:16px">
              <p style="margin:0 0 12px">Hi,</p>
              <p style="margin:0 0 20px">Click the button below to reset your password. This link expires in 1 hour.</p>
              <p style="text-align:center;margin:24px 0">
                <a href="${actionLink}"
                   style="display:inline-block;padding:14px 28px;background:#1e40af;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
                  Reset password
                </a>
              </p>
              <p style="color:#64748b;font-size:13px;margin:20px 0 0">
                If the button doesn't work, copy and paste this URL:<br/>
                <a href="${actionLink}" style="color:#1e40af;word-break:break-all">${actionLink}</a>
              </p>
              <p style="color:#64748b;font-size:12px;margin:20px 0 0">If you didn't request this, ignore this email.</p>
            </div>
            <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">© 2026 Abeni Express</p>
          </div>
        `,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`resend_failed: ${err}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("send-password-reset error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
