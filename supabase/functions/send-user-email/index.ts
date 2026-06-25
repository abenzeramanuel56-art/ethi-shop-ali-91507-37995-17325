
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
    const { userId, subject, heading, message } = await req.json();
    if (!userId || !subject || !message) throw new Error("userId, subject, message required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: u, error } = await admin.auth.admin.getUserById(userId);
    if (error || !u?.user?.email) throw new Error("user email not found");

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();

    const name = profile?.full_name || "Customer";

    await resend.emails.send({
      from: "Abeni Express <onboarding@resend.dev>",
      to: [u.user.email],
      subject,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
          <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);color:#fff;padding:28px;border-radius:12px;text-align:center">
            <h1 style="margin:0;font-size:22px">Abeni Express</h1>
            <p style="margin:8px 0 0;opacity:.9">${heading || "Notification"}</p>
          </div>
          <div style="background:#f8fafc;padding:24px;border-radius:12px;margin-top:16px">
            <p>Hi <strong>${name}</strong>,</p>
            <div style="font-size:15px;line-height:1.6;color:#1e293b">${message}</div>
            <p style="margin-top:24px;color:#475569">Thanks for using Abeni Express.</p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">© 2026 Abeni Express</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("send-user-email error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
