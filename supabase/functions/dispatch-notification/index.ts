// Centralized notification dispatcher.
// - Persists to `notifications` (single source of truth).
// - Mirrors to Telegram if the user has linked their telegram_id (non-blocking).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendTelegram(chatId: number, title: string, body: string) {
  if (!BOT_TOKEN) return;
  const text = `<b>${title}</b>\n\n${body}`;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch (e) {
    console.error("telegram mirror error", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { user_id, title, body, type } = payload ?? {};

    if (!user_id || !title || !body) {
      return new Response(JSON.stringify({ error: "user_id, title, body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Step 1: Persist to notifications (column is `message` in existing schema).
    const { error: insertErr } = await supabase.from("notifications").insert({
      user_id,
      title,
      message: body,
      type: type ?? "info",
      is_read: false,
    });
    if (insertErr) {
      console.error("notif insert error", insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Mirror to Telegram if linked (non-blocking).
    supabase
      .from("profiles")
      .select("telegram_id")
      .eq("id", user_id)
      .maybeSingle()
      .then(({ data }) => {
        const tid = data?.telegram_id;
        if (tid) sendTelegram(Number(tid), title, body);
      });

    return new Response(JSON.stringify({ ok: true }), {
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
