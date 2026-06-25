import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, redirectTo } = await req.json();
    if (!email) throw new Error("email required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: redirectTo || "https://abeniexpress.lovable.app/reset-password" },
    });

    if (error) throw error;
    const actionLink = data?.properties?.action_link;
    if (!actionLink) throw new Error("no link generated");

    await resend.emails.send({
      from: "Abeni Express <onboarding@resend.dev>",
      to: [email],
      subject: "Reset your Abeni Express password",
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
          <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);color:#fff;padding:28px;border-radius:12px;text-align:center">
            <h1 style="margin:0;font-size:22px">Abeni Express</h1>
            <p style="margin:8px 0 0;opacity:.9">Password reset request</p>
          </div>
          <div style="background:#f8fafc;padding:24px;border-radius:12px;margin-top:16px">
            <p>Hello,</p>
            <p>We received a request to reset the password for your Abeni Express account. Click the button below to choose a new password. This link expires in 1 hour.</p>
            <p style="text-align:center;margin:24px 0">
              <a href="${actionLink}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
            </p>
            <p style="font-size:13px;color:#475569">If the button doesn't work, copy and paste this link in your browser:<br><span style="word-break:break-all">${actionLink}</span></p>
            <p style="font-size:13px;color:#475569">If you didn't request this, you can safely ignore this email.</p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">© 2026 Abeni Express</p>
        </div>
      `,
    });

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
