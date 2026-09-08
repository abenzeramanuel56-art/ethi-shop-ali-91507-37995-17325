// Signs a user in using the 6-digit code their Telegram bot sent them.
// Body: { code: "123456" } -> { token_hash, email, created } for supabase.auth.verifyOtp on the client.
//
// A brand-new Telegram user that has never linked before is NOT an error: we
// create their Abeni Express account on the spot, link the telegram_id, and
// return a magic-link token so they land signed in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { TERMS_MSG } from "../_shared/i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { code, full_name } = await req.json();
    if (!code || !/^\d{6}$/.test(String(code))) return json({ error: "invalid_code" }, 400);
    const fullNameInput = typeof full_name === "string" ? full_name.trim().slice(0, 100) : "";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: verification } = await supabase
      .from("telegram_verifications")
      .select("telegram_id, telegram_username, expires_at")
      .eq("verification_code", String(code))
      .maybeSingle();

    if (!verification || new Date(verification.expires_at).getTime() < Date.now()) {
      return json({ error: "code_invalid_or_expired" }, 400);
    }

    const telegramId = verification.telegram_id as number;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", telegramId)
      .maybeSingle();

    let userId = profile?.id as string | undefined;
    let email: string | undefined;
    let created = false;

    if (userId) {
      const { data: userRes, error: userErr } = await supabase.auth.admin.getUserById(userId);
      if (userErr || !userRes?.user?.email) return json({ error: "no_email_on_account" }, 400);
      email = userRes.user.email;
    } else {
      // First-time Telegram user — create the account instead of dead-ending them.
      created = true;
      email = `tg${telegramId}@telegram.internal`;
      const password = crypto.randomUUID() + crypto.randomUUID();
      const fullName = verification.telegram_username
        ? `@${verification.telegram_username}`
        : `Telegram user ${telegramId}`;

      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, telegram_id: telegramId },
      });

      if (createErr || !newUser?.user) {
        // The account may already exist from a previous partial attempt.
        const { data: list } = await supabase.auth.admin.listUsers();
        const existing = list.users.find((u) => u.email?.toLowerCase() === email!.toLowerCase());
        if (!existing) {
          console.error("createUser error", createErr);
          return json({ error: createErr?.message ?? "could_not_create_account" }, 500);
        }
        userId = existing.id;
        created = false;
      } else {
        userId = newUser.user.id;
      }

      // Only one Abeni account per Telegram account.
      await supabase.from("profiles").update({ telegram_id: null }).eq("telegram_id", telegramId);
      const { error: linkProfileErr } = await supabase
        .from("profiles")
        .update({ telegram_id: telegramId })
        .eq("id", userId);
      if (linkProfileErr) console.error("profile link error", linkProfileErr);

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "Welcome to Abeni Express 🎉",
        message:
          "Your account was created with Telegram. Add an email and password from your Account page so you can also sign in without Telegram.",
        type: "success",
        is_read: false,
      });

      // Terms & Conditions for the brand-new account.
      const doc = TERMS_MSG.en;
      await supabase.from("notifications").insert({
        user_id: userId,
        title: doc.title,
        message: doc.body,
        type: "info",
        is_read: false,
        link: "/terms",
      });
    }

    const { data: link, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email!,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      console.error("generateLink error", linkErr);
      return json({ error: linkErr?.message ?? "link_failed" }, 500);
    }

    await supabase.from("telegram_verifications").delete().eq("telegram_id", telegramId);

    return json({ token_hash: link.properties.hashed_token, email, created });
  } catch (e: any) {
    console.error("telegram-login error", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});
