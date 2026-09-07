import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { email, code, newPassword } = await req.json();
    if (!email || !code || !newPassword) throw new Error("email, code, newPassword required");
    if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: row } = await admin
      .from("email_verification_codes")
      .select("id, expires_at, consumed_at")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("Invalid code");
    if (row.consumed_at) throw new Error("Code already used");
    if (new Date(row.expires_at) < new Date()) throw new Error("Code expired");

    const { data: list } = await admin.auth.admin.listUsers();
    const user = list.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error("User not found");

    const { error: updErr } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });
    if (updErr) throw updErr;

    await admin
      .from("email_verification_codes")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
