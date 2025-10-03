import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrackingNotificationRequest {
  orderId: string;
  trackingNumber: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, trackingNumber }: TrackingNotificationRequest = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("customer_id, total_etb, status")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(order.customer_id);
    
    if (userError || !user?.email) {
      throw new Error("Customer email not found");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", order.customer_id)
      .maybeSingle();

    const { data: orderItems } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity")
      .eq("order_id", orderId);

    const productName = orderItems && orderItems.length > 0
      ? orderItems.map((item: any) => 
          item.quantity > 1 ? `${item.product_name} (x${item.quantity})` : item.product_name
        ).join(", ")
      : "Your Products";

    const customerName = profile?.full_name || "Valued Customer";
    const orderNumber = orderId.slice(0, 8).toUpperCase();

    console.log("Sending tracking notification email to:", user.email);

    const emailResponse = await resend.emails.send({
      from: "Get It <onboarding@resend.dev>",
      to: [user.email],
      subject: `Your Order #${orderNumber} is on its way! 📦`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
              }
              .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                border-radius: 8px 8px 0 0;
                text-align: center;
              }
              .content {
                background: #f9fafb;
                padding: 30px;
                border-radius: 0 0 8px 8px;
              }
              .tracking-box {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
              }
              .tracking-number {
                font-size: 24px;
                font-weight: bold;
                color: #667eea;
                font-family: monospace;
                letter-spacing: 1px;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
                font-size: 14px;
              }
              .product-name {
                color: #667eea;
                font-weight: bold;
              }
              .button {
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                margin-top: 15px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">📦 Your Order is Shipped!</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${customerName}</strong>,</p>
              
              <p>Great news! Your order has been shipped and is on its way to you.</p>
              
              <div class="tracking-box">
                <p style="margin: 0 0 10px 0; color: #6b7280;">Tracking Number:</p>
                <div class="tracking-number">${trackingNumber}</div>
                <p style="margin: 15px 0 0 0; font-size: 14px; color: #6b7280;">
                  <strong>Order:</strong> <span class="product-name">${productName}</span>
                </p>
              </div>
              
              <h3>Track Your Package</h3>
              <p>You can track your order status anytime by logging into your account and viewing your orders. Your tracking number has been saved there for easy access.</p>
              
              <a href="${Deno.env.get("SUPABASE_URL")?.replace("supabase.co", "lovableproject.com") || ""}/account" class="button">View Order Status</a>
              
              <h3>What's Next?</h3>
              <ul>
                <li>Your package is now in transit</li>
                <li>You'll receive updates as it moves closer to you</li>
                <li>Typical delivery time: 7-14 business days</li>
              </ul>
              
              <p>Thank you for shopping with us!</p>
              
              <div class="footer">
                <p>Questions about your order?</p>
                <p><strong>The Team at Get It .com</strong></p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-tracking-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
