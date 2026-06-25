
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OrderConfirmationRequest {
  orderId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId }: OrderConfirmationRequest = await req.json();

    // Create Supabase client with service role to access all data
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("customer_id, total_etb")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Get customer email and profile
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(order.customer_id);
    
    if (userError || !user?.email) {
      throw new Error("Customer email not found");
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", order.customer_id)
      .maybeSingle();

    // Get order items
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

    console.log("Sending order confirmation email to:", user.email);

    const emailResponse = await resend.emails.send({
      from: "Abeni Express <onboarding@resend.dev>",
      to: [user.email],
      subject: `Great News! Your Order #${orderNumber} for ${productName} is Officially Confirmed!`,
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
              .highlight {
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                border-left: 4px solid #667eea;
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
            </style>
          </head>
          <body>
            <div class="header">
              <h1 style="margin: 0;">🎉 Payment Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${customerName}</strong>,</p>
              
              <p>We're absolutely thrilled to let you know that your payment has been successfully verified! Your order is officially confirmed and ready to go.</p>
              
              <div class="highlight">
                <p style="margin: 0;">You've successfully secured the <span class="product-name">${productName}</span>! Our team is already preparing your material for shipping.</p>
              </div>
              
              <h3>What's next?</h3>
              <p>We're busy packing it up now. You will receive a separate email with your tracking number the moment your order leaves our facility.</p>
              
              <p>Thank you so much for choosing us. We can't wait for you to get started with your new material!</p>
              
              <div class="footer">
                <p>Thank you,</p>
                <p><strong>The Abeni Express Team</strong></p>
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
    console.error("Error in send-order-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

Deno.serve(handler);
