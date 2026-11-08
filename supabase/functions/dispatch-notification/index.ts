// Centralized admin notification dispatcher.
// - Admin-only.
// - Persists to `notifications` (in-app bell). Telegram + push mirroring happens via the DB trigger.
// - Also emails the same message from updates@abeniexpress.online to the selected user or everyone.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendBatch, isRealEmail, escapeHtml, shell } from "../_shared/mailer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function allEmails(supabase: any, ids: Set<string>) {
  const out: string[] = [];
  for (let page = 1; page < 200; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (ids.has(u.id) && isRealEmail(u.email)) out.push(u.email!);
    if (data.users.length < 1000) break;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: caller } = await supabase.auth.getUser(token);
    if (!caller?.user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: caller.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const payload = await req.json();
    const { user_id, title, body, type, link, image_url } = payload ?? {};
    const broadcast = payload?.broadcast === true;
    const sendEmailToo = payload?.email !== false;

    if ((!user_id && !broadcast) || !title || !body) return json({ error: "user_id, title, body required" }, 400);
    if (String(title).length > 200 || String(body).length > 5000) return json({ error: "too_long" }, 400);

    let recipients: string[] = [];
    if (broadcast) {
      const { data: all } = await supabase.from("profiles").select("id");
      recipients = (all ?? []).map((p: any) => p.id);
    } else {
      recipients = [user_id];
    }

    const rows = recipients.map((uid) => ({
      user_id: uid, title, message: body, type: type ?? "info", is_read: false,
      link: link ?? null, image_url: image_url ?? null,
    }));
    const { error: insertErr } = await supabase.from("notifications").insert(rows);
    if (insertErr) return json({ error: insertErr.message }, 500);

    let emailed = 0;
    if (sendEmailToo) {
      try {
        let emails: string[] = [];
        if (broadcast) emails = await allEmails(supabase, new Set(recipients));
        else {
          const { data } = await supabase.auth.admin.getUserById(user_id);
          if (isRealEmail(data?.user?.email)) emails = [data!.user!.email!];
        }
        const img = typeof image_url === "string" && /^https:\/\//.test(image_url)
          ? `<img src="${escapeHtml(image_url)}" style="max-width:100%;border-radius:8px;margin-bottom:16px"/>` : "";
        const html = shell("Latest update", `${img}<h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h2>
          <p style="white-space:pre-wrap;margin:0 0 20px">${escapeHtml(body)}</p>
          <p style="text-align:center"><a href="https://abeniexpress.online${typeof link === "string" && link.startsWith("/") ? escapeHtml(link) : "/"}" style="display:inline-block;padding:12px 24px;background:#1e40af;color:#fff;text-decoration:none;border-radius:8px">Open Abeni Express</a></p>`);
        emailed = await sendBatch("updates", emails, `Abeni Express: ${title}`, html);
      } catch (e) {
        console.error("email dispatch failed", e);
      }
    }

    return json({ ok: true, sent: rows.length, emailed });
  } catch (e: any) {
    console.error("dispatch-notification error", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});
