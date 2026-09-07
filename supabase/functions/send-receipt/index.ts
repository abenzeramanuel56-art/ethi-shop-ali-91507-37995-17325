// Builds a localized receipt after admin payment approval and delivers it through
// the notifications table (which mirrors to Telegram + browser push via DB trigger).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RECEIPT, pickLang } from "../_shared/i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { orderId, kind } = await req.json();
    if (!orderId) return json({ error: "orderId required" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const table = kind === "affiliate" ? "affiliate_orders" : "orders";

    const { data: order, error: orderErr } = await supabase
      .from(table)
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (orderErr || !order) return json({ error: "order not found" }, 404);

    const buyerId = (order as any).customer_id ?? (order as any).buyer_id;
    if (!buyerId) return json({ ok: true, skipped: "guest_order" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, language")
      .eq("id", buyerId)
      .maybeSingle();

    const lang = pickLang((profile as any)?.language);
    const t = RECEIPT[lang];
    const buyerName = (profile as any)?.full_name || "there";

    // Store name
    let storeName = "Abeni Express";
    const storeId = (order as any).seller_id ?? (order as any).reseller_id;
    if (kind === "affiliate" && (order as any).affiliate_store_id) {
      const { data: s } = await supabase
        .from("affiliate_stores")
        .select("store_name")
        .eq("id", (order as any).affiliate_store_id)
        .maybeSingle();
      if (s?.store_name) storeName = s.store_name;
    } else if (storeId) {
      const { data: s } = await supabase
        .from("seller_stores")
        .select("store_name")
        .eq("id", storeId)
        .maybeSingle();
      if (s?.store_name) storeName = s.store_name;
    }

    // Items
    let itemLines = "";
    if (kind !== "affiliate") {
      const { data: items } = await supabase
        .from("order_items")
        .select("product_name, quantity, price_etb")
        .eq("order_id", orderId);
      itemLines = (items ?? [])
        .map(
          (i: any) =>
            `• ${i.product_name} × ${i.quantity} — ${Number(i.price_etb * i.quantity).toLocaleString()} ETB`,
        )
        .join("\n");
    } else {
      itemLines = `• ×${(order as any).quantity} — ${Number((order as any).sold_price_etb).toLocaleString()} ETB`;
    }

    const created = new Date((order as any).created_at ?? Date.now());
    const dateStr = created.toISOString().slice(0, 16).replace("T", " ") + " UTC";
    const total = Number((order as any).total_etb ?? 0).toLocaleString();
    const shortId = String(orderId).slice(0, 8).toUpperCase();

    const message =
      `${t.intro(buyerName)}\n\n` +
      `${t.orderId}: #${shortId}\n` +
      `${t.store}: ${storeName}\n` +
      `${t.date}: ${dateStr}\n` +
      `${t.buyer}: ${buyerName}\n` +
      (itemLines ? `\n${t.items}:\n${itemLines}\n` : "") +
      `\n${t.total}: ${total} ETB\n` +
      ((order as any).shipping_address
        ? `${t.address}: ${(order as any).shipping_address}, ${(order as any).city ?? ""}\n`
        : "") +
      `\n${t.footer}`;

    const { error: insErr } = await supabase.from("notifications").insert({
      user_id: buyerId,
      title: t.title,
      message,
      type: "success",
      is_read: false,
      link: "/account",
    });
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ ok: true, lang });
  } catch (e: any) {
    console.error("send-receipt error", e);
    return json({ error: e?.message ?? "unknown" }, 500);
  }
});
