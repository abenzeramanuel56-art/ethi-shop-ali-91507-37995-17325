// Shared Resend sender. Three dedicated addresses on the verified abeniexpress.online domain.
export const SENDERS = {
  support: "Abeni Express Support <support@abeniexpress.online>",
  security: "Abeni Express Security <security@abeniexpress.online>",
  updates: "Abeni Express Updates <updates@abeniexpress.online>",
} as const;

export type SenderKey = keyof typeof SENDERS;

export function isRealEmail(email?: string | null): email is string {
  if (!email) return false;
  if (/@telegram\.(abeni|abeniexpress\.online|internal)$/i.test(email)) return false;
  if (/^tg\d+@/i.test(email)) return false;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

export async function sendEmail(opts: {
  from: SenderKey;
  to: string | string[];
  subject: string;
  html: string;
}) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: SENDERS[opts.from],
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });
  if (!res.ok) throw new Error(`resend_failed [${res.status}]: ${await res.text()}`);
  return await res.json();
}

/** Sends one email per recipient in batches of 100 (Resend batch API). */
export async function sendBatch(from: SenderKey, recipients: string[], subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) throw new Error("RESEND_API_KEY not configured");
  let sent = 0;
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100).map((to) => ({ from: SENDERS[from], to: [to], subject, html }));
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(chunk),
    });
    if (res.ok) sent += chunk.length;
    else console.error("batch failed", res.status, await res.text());
  }
  return sent;
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export function shell(title: string, inner: string) {
  return `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
  <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);color:#fff;padding:24px;border-radius:12px;text-align:center">
    <h1 style="margin:0;font-size:22px">Abeni Express</h1><p style="margin:6px 0 0;opacity:.9">${title}</p></div>
  <div style="background:#f8fafc;padding:24px;border-radius:12px;margin-top:16px">${inner}</div>
  <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">© ${new Date().getFullYear()} Abeni Express · abeniexpress.online</p></div>`;
}
