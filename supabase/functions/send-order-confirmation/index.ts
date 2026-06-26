import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { orderId } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (orderError || !order) throw new Error("Order not found");

    const { data: { user } } = await admin.auth.admin.getUserById(order.customer_id);
    if (!user?.email) throw new Error("Customer email not found");

    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", order.customer_id)
      .maybeSingle();

    const { data: items } = await admin
      .from("order_items")
      .select("product_name, quantity, price_etb")
      .eq("order_id", orderId);

    const customerName = profile?.full_name || "Valued Customer";
    const orderNumber = orderId.slice(0, 8).toUpperCase();
    const itemsRows = (items || []).map((i: any) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb">${i.product_name}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:center">${i.quantity}</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${(i.price_etb || 0).toLocaleString()} ETB</td>
        <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right">${((i.price_etb || 0) * (i.quantity || 1)).toLocaleString()} ETB</td>
      </tr>`).join("");

    await resend.emails.send({
      from: "Abeni Express <onboarding@resend.dev>",
      to: [user.email],
      subject: `Receipt: Order #${orderNumber} confirmed — Abeni Express`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#0f172a">
          <div style="background:linear-gradient(135deg,#3b82f6,#1e40af);color:#fff;padding:28px;border-radius:12px;text-align:center">
            <h1 style="margin:0">🎉 Payment Confirmed</h1>
            <p style="opacity:.9;margin:8px 0 0">Order #${orderNumber}</p>
          </div>

          <div style="background:#f8fafc;padding:24px;border-radius:12px;margin-top:16px">
            <p>Hi <strong>${customerName}</strong>,</p>
            <p>We've verified your payment. Here is your official receipt.</p>

            <h3 style="margin-top:24px;border-bottom:2px solid #1e40af;padding-bottom:6px">Items</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <thead>
                <tr style="background:#e0e7ff">
                  <th style="padding:10px;text-align:left">Product</th>
                  <th style="padding:10px;text-align:center">Qty</th>
                  <th style="padding:10px;text-align:right">Price</th>
                  <th style="padding:10px;text-align:right">Subtotal</th>
                </tr>
              </thead>
              <tbody>${itemsRows}</tbody>
            </table>

            <h3 style="margin-top:24px;border-bottom:2px solid #1e40af;padding-bottom:6px">Summary</h3>
            <table style="width:100%;font-size:14px">
              <tr><td>Subtotal</td><td style="text-align:right">${(order.subtotal_etb ?? order.total_etb ?? 0).toLocaleString()} ETB</td></tr>
              ${order.delivery_fee_etb ? `<tr><td>Delivery</td><td style="text-align:right">${Number(order.delivery_fee_etb).toLocaleString()} ETB</td></tr>` : ""}
              ${order.platform_fee_etb ? `<tr><td>Platform fee</td><td style="text-align:right">${Number(order.platform_fee_etb).toLocaleString()} ETB</td></tr>` : ""}
              <tr style="font-weight:bold;font-size:16px;border-top:2px solid #0f172a">
                <td style="padding-top:8px">Total Paid</td>
                <td style="padding-top:8px;text-align:right;color:#1e40af">${Number(order.total_etb).toLocaleString()} ETB</td>
              </tr>
            </table>

            <h3 style="margin-top:24px;border-bottom:2px solid #1e40af;padding-bottom:6px">Delivery</h3>
            <p style="margin:4px 0"><strong>Address:</strong> ${order.shipping_address || "-"}, ${order.city || ""}</p>
            <p style="margin:4px 0"><strong>Phone:</strong> ${order.phone || profile?.phone || "-"}</p>
            ${order.vehicle_type ? `<p style="margin:4px 0"><strong>Vehicle:</strong> ${order.vehicle_type}</p>` : ""}
            ${order.distance_km ? `<p style="margin:4px 0"><strong>Distance:</strong> ${order.distance_km} km</p>` : ""}
            ${order.tracking_number ? `<p style="margin:4px 0"><strong>Tracking #:</strong> ${order.tracking_number}</p>` : ""}

            <p style="margin-top:24px">A driver will be assigned shortly. You will receive live updates as the order moves.</p>
            <p style="color:#475569;margin-top:16px">Thank you for choosing Abeni Express.</p>
          </div>
          <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">© 2026 Abeni Express</p>
        </div>`,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("send-order-confirmation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
