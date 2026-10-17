// Sends the Abeni Express Terms & Conditions to a user in their language.
// Delivered through the notifications table (mirrored to Telegram + push by DB trigger),
// or straight to a Telegram chat when only a telegram_id is known.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TERMS_MSG, pickLang } from "../_shared/i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { user_id, telegram_id, language } = await req.json();
    if (!user_id && !telegram_id) return json({ error: "user_id or telegram_id required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let lang = pickLang(language);
    if (user_id && !language) {
      const { data: p } = await supabase
        .from("profiles")
        .select("language")
        .eq("id", user_id)
        .maybeSingle();
      lang = pickLang((p as any)?.language);
    }

    const doc = TERMS_MSG[lang];

    if (user_id) {
      const { error } = await supabase.from("notifications").insert({
        user_id,
        title: doc.title,
        message: doc.body,
        type: "info",
        is_read: false,
        link: "/terms",
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, lang, via: "notification" });
    }

    if (BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: Number(telegram_id),
          text: `<b>${doc.title}</b>\n\n${doc.body}`,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
    }
    return json({ ok: true, lang, via: "telegram" });
  } catch (e: any) {
    console.error("send-terms error", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});
