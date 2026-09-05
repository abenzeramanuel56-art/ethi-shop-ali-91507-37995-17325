// Centralized notification dispatcher.
// - Persists to `notifications` (single source of truth).
// - Mirrors to Telegram if the user has linked their telegram_id (non-blocking).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { user_id, title, body, type, link, image_url } = payload ?? {};

    const broadcast = payload?.broadcast === true;

    if ((!user_id && !broadcast) || !title || !body) {
      return new Response(JSON.stringify({ error: "user_id, title, body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Step 1: Persist to notifications (column is `message` in existing schema).
    let recipients: string[] = [];
    if (broadcast) {
      const { data: all } = await supabase.from("profiles").select("id");
      recipients = (all ?? []).map((p: any) => p.id);
    } else {
      recipients = [user_id];
    }

    const rows = recipients.map((uid) => ({
      user_id: uid,
      title,
      message: body,
      type: type ?? "info",
      is_read: false,
      link: link ?? null,
      image_url: image_url ?? null,
    }));

    const { error: insertErr } = await supabase.from("notifications").insert(rows);
    if (insertErr) {
      console.error("notif insert error", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Telegram + push mirroring is handled by the DB trigger on `notifications`.

    return new Response(JSON.stringify({ ok: true, sent: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("dispatch-notification error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
