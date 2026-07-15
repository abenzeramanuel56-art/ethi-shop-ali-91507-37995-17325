// Telegram bot webhook — one-way auth handshake only.
// Handles `/start auth`: generates a 6-digit code, stores it in
// `telegram_verifications`, and replies to the user with the code.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sendMessage(chatId: number, text: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch((e) => console.error("sendMessage error", e));
}

function generateCode(): string {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return (buf[0] % 1_000_000).toString().padStart(6, "0");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const update = await req.json();
    const message = update.message ?? update.edited_message;
    const chatId = message?.chat?.id;
    const text: string = message?.text ?? "";
    const fromId: number | undefined = message?.from?.id;
    const username: string | undefined = message?.from?.username;

    if (!chatId || !fromId) {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only accept the `/start auth` handshake. Everything else gets a canned reply.
    if (/^\/start(\s+auth)?\b/i.test(text.trim())) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      const code = generateCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      // Remove any prior codes for this telegram user
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
      } else {
        await sendMessage(
          chatId,
          `👋 Welcome to <b>Abeni Express</b>!\n\nYour verification code is:\n\n<code>${code}</code>\n\nEnter it in the app within 5 minutes to link your Telegram for notifications.`
        );
      }
    } else {
      await sendMessage(
        chatId,
        "This bot only handles account linking. Open the Abeni Express app and tap “Continue with Telegram” to get a code."
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("telegram-webhook error", e);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
