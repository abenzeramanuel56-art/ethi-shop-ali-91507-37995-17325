import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { aliexpressUrl } = await req.json();

    if (!aliexpressUrl) {
      return new Response(
        JSON.stringify({ error: 'AliExpress URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching product page:', aliexpressUrl);

    // Fetch the AliExpress product page
    const response = await fetch(aliexpressUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch product page: ${response.status}`);
    }

    const html = await response.text();

    // Extract image URL from the HTML
    // AliExpress uses various patterns, try multiple approaches
    let imageUrl = null;

    // Pattern 1: Look for og:image meta tag
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/);
    if (ogImageMatch) {
      imageUrl = ogImageMatch[1];
    }

    // Pattern 2: Look for main product image in JSON-LD
    if (!imageUrl) {
      const jsonLdMatch = html.match(/<script type="application\/ld\+json">({[^<]+})<\/script>/);
      if (jsonLdMatch) {
        try {
          const jsonData = JSON.parse(jsonLdMatch[1]);
          if (jsonData.image) {
            imageUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
          }
        } catch (e) {
          console.error('Failed to parse JSON-LD:', e);
        }
      }
    }

    // Pattern 3: Look for imageUrl in window data
    if (!imageUrl) {
      const windowDataMatch = html.match(/window\.runParams\s*=\s*{[^}]*"imageUrl":"([^"]+)"/);
      if (windowDataMatch) {
        imageUrl = windowDataMatch[1].replace(/\\/g, '');
      }
    }

    // Pattern 4: Look for data-image or src attributes in img tags
    if (!imageUrl) {
      const imgMatch = html.match(/<img[^>]*class="[^"]*magnifier-image[^"]*"[^>]*src="([^"]+)"/);
      if (imgMatch) {
        imageUrl = imgMatch[1];
      }
    }

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Could not extract image from product page' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean up the URL
    imageUrl = imageUrl.split('?')[0]; // Remove query parameters for cleaner URL
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    }

    console.log('Extracted image URL:', imageUrl);

    return new Response(
      JSON.stringify({ imageUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
