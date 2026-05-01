// Verifies an uploaded digital product (code, app, website, file, document, video) matches its description using Lovable AI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { productId } = await req.json();
    if (!productId) {
      return new Response(JSON.stringify({ error: "productId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: product, error: pErr } = await admin
      .from("digital_products")
      .select("*")
      .eq("id", productId)
      .single();

    if (pErr || !product) {
      return new Response(JSON.stringify({ error: "product not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Download the file from storage
    const url = product.file_url as string;
    const marker = "/digital-products/";
    const idx = url.indexOf(marker);
    const path = idx >= 0 ? url.substring(idx + marker.length).split("?")[0] : url;

    const { data: fileData, error: dlErr } = await admin.storage.from("digital-products").download(path);
    if (dlErr || !fileData) {
      console.error("download error", dlErr);
      await admin.from("digital_products").update({
        ai_verification_status: "rejected",
        ai_verification_notes: "Could not access uploaded file for verification."
      }).eq("id", productId);
      return new Response(JSON.stringify({ error: "Could not download file" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let contentSample = "";
    let analysisType: "code" | "text" | "binary" = "binary";
    const fileName = (product.file_name as string) || "unknown";
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const codeExts = ['js','jsx','ts','tsx','py','java','c','cpp','cs','go','rb','php','html','htm','css','scss','vue','svelte','json','yml','yaml','sh','sql','rs','swift','kt','dart'];
    const textExts = ['txt','md','csv','rtf','log'];

    try {
      if (codeExts.includes(ext)) {
        contentSample = (await fileData.text()).slice(0, 12000);
        analysisType = "code";
      } else if (textExts.includes(ext) || product.product_type === "code") {
        const text = await fileData.text();
        if (/[\x00-\x08\x0E-\x1F]/.test(text.slice(0, 200))) {
          contentSample = `[Binary file: ${fileName}, size: ${product.file_size_bytes || 0} bytes]`;
          analysisType = "binary";
        } else {
          contentSample = text.slice(0, 12000);
          analysisType = codeExts.includes(ext) ? "code" : "text";
        }
      } else {
        contentSample = `[Binary file: ${fileName}, size: ${product.file_size_bytes || 0} bytes, extension: .${ext}]`;
        analysisType = "binary";
      }
    } catch {
      contentSample = `[Unreadable file: ${fileName}, size: ${product.file_size_bytes || 0} bytes]`;
      analysisType = "binary";
    }

    const category = product.category || "other";
    const systemPrompt = `You are a strict content verification assistant for a digital marketplace.
You decide if the uploaded ${analysisType} file actually matches the seller's stated TITLE, DESCRIPTION, and CATEGORY.

CATEGORY-SPECIFIC RULES:
- "apps" or "websites": expects code (HTML/JS/TS/Python/etc.) or a packaged app (apk, exe, zip with code). If you can read the code, verify it implements features hinted at in the description (e.g. login, dashboard, game, calculator). Reject if the code is empty, "Hello World", placeholder, or completely unrelated to the description.
- "code": expects source code matching the language and purpose described.
- "courses": expects video, PDF, slides, or zip with lessons. For text/PDF samples, check the topic matches.
- "videos": expects mp4/mov/webm extensions.
- "documents": expects pdf/doc/docx/txt/md, content topic should match.
- "other": be lenient.

Reply with strict JSON: {"matches": true|false, "confidence": 0-100, "reason": "short reason"}.
Reject if: file is empty, clearly unrelated, malicious, just a placeholder, or wrong file type for the category.
Approve if the content is plausibly what the description claims.`;

    const userPrompt = `TITLE: ${product.title}
DESCRIPTION: ${product.description}
CATEGORY: ${category}
PRODUCT TYPE: ${product.product_type}
FILE NAME: ${fileName}
FILE EXTENSION: .${ext}
FILE SIZE: ${product.file_size_bytes || 0} bytes
ANALYSIS MODE: ${analysisType}

CONTENT SAMPLE (truncated):
${contentSample}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      await admin.from("digital_products").update({
        ai_verification_status: "approved",
        ai_verification_notes: "Auto-approved (verification service unavailable)."
      }).eq("id", productId);
      return new Response(JSON.stringify({ matches: true, fallback: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const raw: string = aiData.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    let verdict: { matches?: boolean; confidence?: number; reason?: string } = {};
    try { verdict = JSON.parse(cleaned); } catch { verdict = { matches: true, confidence: 50, reason: "Unable to parse AI response" }; }

    const status = verdict.matches ? "approved" : "rejected";
    const notes = `${verdict.reason || "No reason given"} (AI confidence: ${verdict.confidence ?? "?"}%)`;

    await admin.from("digital_products").update({
      ai_verification_status: status,
      ai_verification_notes: notes,
    }).eq("id", productId);

    await admin.from("notifications").insert({
      user_id: product.seller_id,
      title: status === "approved" ? "Digital Product Approved ✓" : "Digital Product Rejected ✗",
      message: status === "approved"
        ? `Your digital product "${product.title}" has been verified and is now live for purchase.`
        : `Your digital product "${product.title}" was rejected. Reason: ${notes}`,
      type: status === "approved" ? "success" : "warning",
    });

    return new Response(JSON.stringify({ status, notes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("verify-digital-product error", e);
    return new Response(JSON.stringify({ error: e?.message || "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
