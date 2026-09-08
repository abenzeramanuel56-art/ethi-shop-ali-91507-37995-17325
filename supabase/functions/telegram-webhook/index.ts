// Telegram bot webhook.
// Supported handshakes:
//   /start <32-hex token>  -> instantly links that Telegram account to the Abeni Express user who generated the token
//   /start login | auth    -> replies with a 6-digit code used to link OR sign in from the web app
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TERMS_MSG, pickLang } from "../_shared/i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch((e) => {
    console.error("sendMessage error", e);
    return null;
  });
  if (res && !res.ok) console.error("sendMessage failed", res.status, await res.text());
}

function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ok = () =>
    new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const update = await req.json();
    const message = update.message ?? update.edited_message;
    const chatId = message?.chat?.id;
    const text: string = (message?.text ?? "").trim();
    const fromId: number | undefined = message?.from?.id;
    const username: string | undefined = message?.from?.username;
    const firstName: string = message?.from?.first_name ?? "there";

    if (!chatId || !fromId) return ok();

    const startMatch = text.match(/^\/start(?:\s+(\S+))?/i);
    if (!startMatch) {
      await sendMessage(
        chatId,
        "This bot only handles Abeni Express account linking and notifications. Open the app and tap “Continue with Telegram”.",
      );
      return ok();
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const payload = startMatch[1] ?? "";

    // 1) One-tap linking via deep-link token — the bot knows exactly who pressed Start.
    if (/^[a-f0-9]{32}$/i.test(payload)) {
      const { data: tokenRow } = await supabase
        .from("telegram_link_tokens")
        .select("user_id, expires_at")
        .eq("token", payload)
        .maybeSingle();

      if (!tokenRow || new Date(tokenRow.expires_at).getTime() < Date.now()) {
        await sendMessage(chatId, "⚠️ This link expired. Go back to Abeni Express and tap “Continue with Telegram” again.");
        return ok();
      }

      // one Telegram account can only be linked to one Abeni Express account
      await supabase.from("profiles").update({ telegram_id: null }).eq("telegram_id", fromId);

      const { error: linkErr } = await supabase
        .from("profiles")
        .update({ telegram_id: fromId })
        .eq("id", tokenRow.user_id);

      await supabase.from("telegram_link_tokens").delete().eq("token", payload);

      if (linkErr) {
        console.error("link error", linkErr);
        await sendMessage(chatId, "⚠️ Linking failed. Please try again from the app.");
        return ok();
      }

      await supabase.from("notifications").insert({
        user_id: tokenRow.user_id,
        title: "Telegram linked",
        message: "Your Telegram account is now linked. You'll receive every Abeni Express update here.",
        type: "success",
        is_read: false,
      });

      await sendMessage(
        chatId,
        `✅ <b>Linked!</b>\n\nHi ${firstName}, your Telegram is now connected to your <b>Abeni Express</b> account. Every order, wallet and delivery update will arrive here.`,
      );

      // Terms & Conditions in the user's language, straight to this chat.
      const { data: prof } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", tokenRow.user_id)
        .maybeSingle();
      const doc = TERMS_MSG[pickLang((prof as any)?.language)];
      await sendMessage(chatId, `<b>${doc.title}</b>\n\n${doc.body}`);
      return ok();
    }

    // 2) Code handshake (used for signing in with Telegram or manual linking).
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await supabase.from("telegram_verifications").delete().eq("telegram_id", fromId);
    const { error } = await supabase.from("telegram_verifications").insert({
      telegram_id: fromId,
      telegram_username: username ?? null,
      verification_code: code,
      expires_at: expiresAt,
    });

    if (error) {
      console.error("insert code error", error);
      await sendMessage(chatId, "⚠️ Something went wrong. Please try again.");
      return ok();
    }

    await sendMessage(
      chatId,
      `👋 Hi ${firstName}! Your <b>Abeni Express</b> code is:\n\n<code>${code}</code>\n\nEnter it in the app within 5 minutes to continue.`,
    );
    return ok();
  } catch (e) {
    console.error("telegram-webhook error", e);
    return ok();
  }
});
