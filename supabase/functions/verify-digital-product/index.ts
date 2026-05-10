// Abeni Express AI verifies an uploaded digital product (code, app, website, file, document, video, image)
// matches its description. Performs DEEP analysis: reads code as text, sends PDFs/images/docs as multimodal inputs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Max bytes we'll embed as base64 in a single multimodal request (~15MB)
const MAX_INLINE_BYTES = 15 * 1024 * 1024;

const CODE_EXTS = ['js','jsx','ts','tsx','py','java','c','cpp','cs','go','rb','php','html','htm','css','scss','vue','svelte','json','yml','yaml','sh','sql','rs','swift','kt','dart'];
const TEXT_EXTS = ['txt','md','csv','rtf','log'];
const IMAGE_MIME: Record<string,string> = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', bmp:'image/bmp', svg:'image/svg+xml' };
const DOC_MIME: Record<string,string> = { pdf:'application/pdf', doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt:'application/vnd.ms-powerpoint', pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation' };
const VIDEO_MIME: Record<string,string> = { mp4:'video/mp4', mov:'video/quicktime', webm:'video/webm', mkv:'video/x-matroska' };
const AUDIO_MIME: Record<string,string> = { mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', m4a:'audio/mp4' };

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(bin);
}

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
      .from("digital_products").select("*").eq("id", productId).single();

    if (pErr || !product) {
      return new Response(JSON.stringify({ error: "product not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = product.file_url as string;
    const marker = "/digital-products/";
    const idx = url.indexOf(marker);
    const path = idx >= 0 ? url.substring(idx + marker.length).split("?")[0] : url;

    const { data: fileData, error: dlErr } = await admin.storage.from("digital-products").download(path);
    if (dlErr || !fileData) {
      console.error("download error", dlErr);
      await admin.from("digital_products").update({
        ai_verification_status: "rejected",
        ai_verification_notes: "Abeni Express AI could not access the uploaded file."
      }).eq("id", productId);
      return new Response(JSON.stringify({ error: "Could not download file" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fileName = (product.file_name as string) || "unknown";
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const fileSize = product.file_size_bytes || fileData.size || 0;
    const category = product.category || "other";

    const systemPrompt = `You are Abeni Express AI, the strict content verification agent for the Abeni Express digital marketplace.
You perform DEEP analysis of the uploaded file (read code line by line, read documents page by page, look at images, watch/inspect videos) to decide if it genuinely matches the seller's TITLE, DESCRIPTION, and CATEGORY.

CATEGORY-SPECIFIC RULES:
- "apps"/"websites": expect runnable code or a packaged app. Check that the code actually implements the features the description claims (login, dashboard, game logic, calculator, etc.). Reject placeholders, "Hello World", empty stubs, or unrelated code.
- "code": expect source code matching the language and purpose described.
- "courses": expect lessons (video/PDF/slides). Read sample content and confirm topic matches description.
- "videos": must be a video file; describe what you observe.
- "documents": read the document; verify topic, depth and that it isn't blank or junk.
- "other": be lenient but reject obvious junk.

Reply with STRICT JSON ONLY: {"matches": true|false, "confidence": 0-100, "reason": "1-3 sentence detailed explanation referencing what you actually saw inside the file"}.
Reject if: file is empty, clearly unrelated to the description, malicious, a placeholder, or wrong file type for the category.`;

    let userContent: any[] = [];
    let analysisType = "binary";

    const isCode = CODE_EXTS.includes(ext) || product.product_type === "code";
    const isText = TEXT_EXTS.includes(ext);
    const imgMime = IMAGE_MIME[ext];
    const docMime = DOC_MIME[ext];
    const vidMime = VIDEO_MIME[ext];
    const audMime = AUDIO_MIME[ext];

    let textHeader = `TITLE: ${product.title}\nDESCRIPTION: ${product.description}\nCATEGORY: ${category}\nPRODUCT TYPE: ${product.product_type}\nFILE NAME: ${fileName}\nFILE EXTENSION: .${ext}\nFILE SIZE: ${fileSize} bytes\n`;

    try {
      if (isCode || isText) {
        const text = await fileData.text();
        const sample = text.slice(0, 30000);
        analysisType = isCode ? "code" : "text";
        userContent = [{ type: "text", text: `${textHeader}ANALYSIS MODE: ${analysisType}\n\nFULL CONTENT (truncated to 30k chars):\n${sample}` }];
      } else if ((imgMime || docMime || vidMime || audMime) && fileSize <= MAX_INLINE_BYTES) {
        const mime = imgMime || docMime || vidMime || audMime;
        const b64 = await blobToBase64(fileData);
        analysisType = imgMime ? "image" : docMime ? "document" : vidMime ? "video" : "audio";
        userContent = [
          { type: "text", text: `${textHeader}ANALYSIS MODE: ${analysisType}\n\nInspect the attached file in DETAIL and decide if it matches the description. Read every page / look at every frame you can.` },
          { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
        ];
      } else {
        analysisType = "binary";
        userContent = [{ type: "text", text: `${textHeader}ANALYSIS MODE: binary (file too large or unsupported for direct inspection)\n\nDecide based on filename, extension, size and description plausibility only.` }];
      }
    } catch (e) {
      console.error("read error", e);
      userContent = [{ type: "text", text: `${textHeader}ANALYSIS MODE: unreadable\n\nFile could not be read. Be cautious.` }];
    }

    // Use Gemini 2.5 Pro for deeper multimodal reasoning on documents/videos, Flash for text/code.
    const model = (analysisType === "document" || analysisType === "video" || analysisType === "image")
      ? "google/gemini-2.5-pro"
      : "google/gemini-2.5-flash";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      await admin.from("digital_products").update({
        ai_verification_status: "approved",
        ai_verification_notes: "Auto-approved (Abeni Express AI verification service unavailable)."
      }).eq("id", productId);
      return new Response(JSON.stringify({ matches: true, fallback: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const raw: string = aiData.choices?.[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
    let verdict: { matches?: boolean; confidence?: number; reason?: string } = {};
    try { verdict = JSON.parse(cleaned); } catch {
      // try to extract first {...}
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) { try { verdict = JSON.parse(m[0]); } catch {} }
      if (!verdict.reason) verdict = { matches: true, confidence: 50, reason: "Unable to parse Abeni Express AI response" };
    }

    const status = verdict.matches ? "approved" : "rejected";
    const notes = `Abeni Express AI: ${verdict.reason || "No reason given"} (confidence: ${verdict.confidence ?? "?"}%)`;

    await admin.from("digital_products").update({
      ai_verification_status: status,
      ai_verification_notes: notes,
    }).eq("id", productId);

    await admin.from("notifications").insert({
      user_id: product.seller_id,
      title: status === "approved" ? "Digital Product Approved ✓" : "Digital Product Rejected ✗",
      message: status === "approved"
        ? `Your digital product "${product.title}" has been verified by Abeni Express AI and is now live for purchase.`
        : `Your digital product "${product.title}" was rejected by Abeni Express AI. Reason: ${notes}`,
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
