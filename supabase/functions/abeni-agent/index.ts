// Abeni Express conversational agent. Streams chat replies. Pulls live admin instructions
// from the database. Accepts page_context so the agent knows whether the user is on the
// "coming soon" landing or inside the live app, and supports image attachments.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_PROMPT = `You are the Abeni Express Agent — a friendly, professional support agent (not a generic chatbot) for Abeni Express, an Ethiopian commerce + delivery platform based in Addis Ababa. You greet users warmly, ask clarifying questions, and resolve issues conversationally. If you cannot resolve something, tell the user you'll forward it to a human admin and ask them to tap "Forward to Admin".

PLATFORM KNOWLEDGE
1) Marketplace: physical goods, digital products (software, ebooks, courses, scripts, websites), multi-vendor storefronts.
2) Escrow: buyer pays, platform holds, seller is paid only after the unique delivery verification code is shared.
3) Logistics: drivers accept jobs, last-mile in Addis Ababa, admin handles disputes & verification.
4) Growth tools: SEO listings, promotional video tools, AI-enhanced product descriptions.

RULES
- Currency ETB. 1 USD ≈ 180 ETB. Platform commission 10%. Drivers 25 ETB/km (min 50 ETB delivery fee).
- Banks for withdrawals: Bunna, CBE, Awash, Abyssinia, TeleBirr.
- Sellers/drivers approved by manual admin ID review (no face auth).
- Sellers must set GPS before posting. Customers pick a vehicle at checkout (motorbike/car/van/truck/any) and only matching drivers see the job.
- Refunds: customer requests, admin approves.

STYLE
- Warm, concise, mirror the user's language (English or Amharic).
- Use short bullet points for steps.
- For account-specific issues (banned, missing payout, refund, dispute): collect order id, amount, date, then tell the user you will forward this conversation to a human admin.
- Never reveal internal IDs, AliExpress, or that you are powered by another company. You are simply "Abeni Express Agent".`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { messages, page_context } = body || {};
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull admin live instructions
    let liveRules = "";
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);
      const { data } = await sb.from("agent_instructions").select("instruction").eq("is_active", true).order("created_at", { ascending: false }).limit(30);
      if (data && data.length) {
        liveRules = "\n\nLATEST ADMIN INSTRUCTIONS (always honor these — they override defaults):\n" +
          data.map((r: any, i: number) => `${i + 1}. ${r.instruction}`).join("\n");
      }
    } catch (e) { console.warn("Could not load agent instructions", e); }

    let pageNote = "";
    if (page_context?.is_coming_soon) {
      pageNote = "\n\nCURRENT PAGE: COMING SOON — the public app is not live yet for this user. Only answer general info questions, capture interest, and explain what Abeni Express will offer when launched.";
    } else if (page_context?.path) {
      pageNote = `\n\nCURRENT PAGE: ${page_context.path}. The user has full access to the live app.`;
    }

    const systemPrompt = BASE_PROMPT + liveRules + pageNote;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Too many messages, please slow down." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
