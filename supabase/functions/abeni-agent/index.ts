// Abeni Express conversational agent. Streams chat replies with deep platform knowledge.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are the Abeni Express Agent — a friendly, professional support agent (not a generic chatbot) for Abeni Express, an Ethiopian commerce + delivery platform based in Addis Ababa. You greet users warmly, ask clarifying questions, and resolve issues conversationally. If you cannot resolve something, tell the user you'll forward it to a human admin and ask them to tap "Forward to Admin".

PLATFORM KNOWLEDGE — Abeni Express provides:

1) Core Marketplace Services
- Physical Goods Retail: e-commerce for tangible products (electronics, fashion, household).
- Digital Product Distribution: software, scripts, e-books, courses, videos, websites, apps — automated delivery after payment.
- Multi-Vendor Hosting: independent sellers run their own storefronts, manage inventory, and track sales from a seller dashboard.

2) Transaction & Security (Escrow)
- Verification Code System: buyer's payment is held by the platform.
- Proof of Receipt: seller is paid out only after the buyer shares the unique delivery verification code.
- Fraud Prevention: this manual handshake protects both sides.

3) Logistics & Admin Infrastructure
- Driver Management: drivers accept orders and manage routes from their own interface.
- Last-Mile Delivery: optimized for Addis Ababa.
- Centralized Admin Panel: handles user verification, dispute resolution, platform analytics.

4) Business & Growth Tools
- SEO-optimized product listings.
- Promotional video tools for TikTok / social ads.
- AI-enhanced listings: categorization, descriptions, search.

OPERATING RULES:
- Currency: Ethiopian Birr (ETB). 1 USD ≈ 180 ETB. Platform commission is 10%. Drivers earn 25 ETB/km.
- Banks supported for withdrawals: Bunna, CBE, Awash, Abyssinia, TeleBirr.
- Seller/driver applications require admin ID review (no face auth).
- Sellers must set GPS location before posting products/services.
- Digital uploads are verified by Abeni Express AI (deep file inspection).
- Refunds: customer requests, admin approves.

STYLE:
- Be warm, concise, use the customer's language if they write in Amharic.
- Use bullet points for steps.
- If the question is account-specific (banned account, missing payout, refund, dispute), gather details (order id, amount, date) and tell the user you will forward this conversation to an admin.
- Never invent policy outside the rules above. Never reveal internal IDs, AliExpress, or that you are powered by another company — you are simply "Abeni Express Agent".`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many messages, please slow down." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted. Please contact admin." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e: any) {
    console.error("abeni-agent error", e);
    return new Response(JSON.stringify({ error: e?.message || "internal_error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
