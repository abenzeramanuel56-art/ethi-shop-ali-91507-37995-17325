// Mirrors a persisted notification to Telegram. Called by a DB trigger.
// Body: { notification_id: uuid }  — payload is only an id, content is re-read server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: notif } = await supabase
      .from("notifications")
      .select("user_id, title, message, link, image_url")
      .eq("id", notification_id)
      .maybeSingle();

    if (!notif) {
      return new Response(JSON.stringify({ ok: true, skipped: "not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fan out to browser push (works even when the app is closed).
    fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_ROLE}` },
      body: JSON.stringify({
        user_id: notif.user_id,
        title: notif.title,
        body: notif.message,
        url: (notif as any).link || "/",
        tag: notification_id,
      }),
    }).catch((e) => console.error("push fanout failed", e));

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_id")
      .eq("id", notif.user_id)
      .maybeSingle();

    const chatId = (profile as any)?.telegram_id;
    if (!chatId || !BOT_TOKEN) {
      return new Response(JSON.stringify({ ok: true, skipped: "not_linked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const escape = (s: string) =>
      String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const SITE_URL = Deno.env.get("SITE_URL") || "https://abeniexpress.online";
    const link = (notif as any).link as string | null;
    const imageUrl = (notif as any).image_url as string | null;
    const text = `<b>${escape(notif.title)}</b>\n\n${escape(notif.message)}`;
    const reply_markup = link
      ? { inline_keyboard: [[{ text: "Open my panel", url: link.startsWith("http") ? link : `${SITE_URL}${link.startsWith("/") ? "" : "/"}${link}` }]] }
      : undefined;

    const endpoint = imageUrl ? "sendPhoto" : "sendMessage";
    const payload: Record<string, unknown> = imageUrl
      ? { chat_id: Number(chatId), photo: imageUrl, caption: text, parse_mode: "HTML", reply_markup }
      : { chat_id: Number(chatId), text, parse_mode: "HTML", reply_markup };

    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`telegram sendMessage failed [${res.status}]: ${body}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("telegram-notify error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
