// Sends browser web-push notifications to a user's registered devices.
// Body: { user_id, title, body, url?, tag? }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@abeniexpress.online";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { user_id, title, body, url, tag } = await req.json();
    if (!user_id || !title) return json({ error: "user_id and title required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (error) return json({ error: error.message }, 500);
    if (!subs?.length) return json({ ok: true, sent: 0 });

    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/", tag });
    let sent = 0;
    const dead: string[] = [];

    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            { TTL: 3600, urgency: "high" },
          );
          sent++;
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(s.endpoint);
          else console.error("push error", e?.statusCode, e?.body ?? e?.message);
        }
      }),
    );

    if (dead.length) await supabase.from("push_subscriptions").delete().in("endpoint", dead);

    return json({ ok: true, sent });
  } catch (e: any) {
    console.error("send-push error", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});
