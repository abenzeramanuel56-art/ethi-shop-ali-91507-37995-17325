import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email) throw new Error("email required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the user actually exists
    const { data: list } = await admin.auth.admin.listUsers();
    const user = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      // Don't reveal — just return success
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await admin.from("email_verification_codes").insert({
      email: email.toLowerCase(),
      code,
    });

    await resend.emails.send({
      from: "Abeni Express <onboarding@resend.dev>",
      to: [email],
      subject: `Your Abeni Express password reset code: ${code}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
          <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);color:#fff;padding:28px;border-radius:12px;text-align:center">
            <h1 style="margin:0;font-size:22px">Abeni Express</h1>
            <p style="margin:8px 0 0;opacity:.9">Password reset code</p>
          </div>
          <div style="background:#f8fafc;padding:24px;border-radius:12px;margin-top:16px;text-align:center">
            <p>Enter this 6-digit code in the app to reset your password:</p>
            <p style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1e40af;margin:24px 0">${code}</p>
            <p style="color:#64748b;font-size:13px">This code expires in 15 minutes. If you didn't request this, ignore this email.</p>
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
