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

    if (!aliexpressUrl || typeof aliexpressUrl !== 'string' || !aliexpressUrl.includes('aliexpress.com')) {
      return new Response(
        JSON.stringify({ error: 'Valid AliExpress URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper to try extracting from HTML with multiple strategies
    const extractImage = (html: string): string | null => {
      // 1) og:image
      const og = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
      if (og?.[1]) return og[1];

      // 2) twitter:image
      const tw = html.match(/<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i);
      if (tw?.[1]) return tw[1];

      // 3) Any JSON-LD blocks (AliExpress sometimes nests multiple)
      const ldMatches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
      for (const match of ldMatches) {
        try {
          const json = JSON.parse(match.replace(/<script type=\"application\/ld\+json\">/i, '').replace(/<\/script>/i, ''));
          const image = (json?.image && (Array.isArray(json.image) ? json.image[0] : json.image)) || json?.offers?.image;
          if (typeof image === 'string') return image;
        } catch (_) {/* no-op */}
      }

      // 4) window.runParams style JSON with imageUrl or imagePathList
      const runParamsMatch = html.match(/window\.(runParams|__AER_DATA__|AER_DATA)\s*=\s*({[\s\S]*?});/i);
      if (runParamsMatch?.[2]) {
        try {
          const data = JSON.parse(runParamsMatch[2]);
          // Common places
          const fromImageModule = data?.imageModule?.imagePathList?.[0] || data?.imageModule?.imageUrls?.[0];
          if (fromImageModule) return fromImageModule;
          const fromProduct = data?.product?.imageUrl || data?.product?.images?.[0];
          if (fromProduct) return fromProduct;
        } catch (_) {/* ignore */}
      }

      // 5) auctionImages array
      const auctionImages = html.match(/\"auctionImages\"\s*:\s*\[(.*?)\]/);
      if (auctionImages?.[1]) {
        const first = auctionImages[1].split(',')[0].replace(/[\"\s]/g, '');
        if (first) return first;
      }

      // 6) Fallback: first product-like image src
      const anyImg = html.match(/<img[^>]+src=["'](https?:[^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*>/i);
      if (anyImg?.[1]) return anyImg[1];

      return null;
    };

    // Fetch helper with realistic headers
    const fetchWithHeaders = async (url: string) => {
      return await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.google.com/',
        },
        redirect: 'follow',
      });
    };

    console.log('Fetching product page:', aliexpressUrl);
    let response = await fetchWithHeaders(aliexpressUrl);

    // Handle regional or mobile redirection fallback
    if (!response.ok || response.status === 403) {
      const mobileUrl = aliexpressUrl.replace('www.aliexpress.com', 'm.aliexpress.com');
      console.log('Primary fetch failed, trying mobile:', mobileUrl, 'status:', response.status);
      response = await fetchWithHeaders(mobileUrl);
    }

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch product page: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await response.text();
    let imageUrl = extractImage(html);

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Could not extract image from product page' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean URL
    imageUrl = imageUrl.split('?')[0];
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;

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
