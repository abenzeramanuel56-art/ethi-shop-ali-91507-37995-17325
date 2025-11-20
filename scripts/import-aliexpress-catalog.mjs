#!/usr/bin/env node
/*
  Import products from AliExpress search results into `products` table.
  - Downloads images, uploads to Supabase storage, and inserts product rows.
  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node ./scripts/import-aliexpress-catalog.mjs --count 1000 --bucket product-images --categories electronics,fashion --dry
*/
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { createClient } from '@supabase/supabase-js';
import cheerio from 'cheerio';

const argv = process.argv.slice(2);
function getArg(name, def) { const i = argv.indexOf(name); if (i === -1) return def; const v = argv[i+1]; return v && !v.startsWith('--') ? v : true; }
const COUNT = Number(getArg('--count', 1000)) || 1000;
const BUCKET = getArg('--bucket', 'product-images');
const CATS = (getArg('--categories', 'electronics,fashion,home') || '').split(',').map(s => s.trim()).filter(Boolean);
const DRY = argv.includes('--dry');
const USD_TO_ETB = Number(getArg('--usd-to-etb', 200)) || 200;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return res.text();
}

function extractProductsFromSearch(html, base) {
  const $ = cheerio.load(html);
  const items = [];
  $('a').each((i, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    // product links often contain /item/ or /product/
    if (/\/item\//i.test(href) || /\/product\//i.test(href)) {
      const img = $(el).find('img').first().attr('src') || $(el).find('img').first().attr('data-src');
      const title = $(el).find('img').first().attr('alt') || $(el).text().trim();
      items.push({ href: new URL(href, base).toString(), img, title });
    }
  });
  return items;
}

function extFromContentType(ct) { if (!ct) return 'jpg'; ct = ct.split(';')[0].trim().toLowerCase(); if (ct==='image/jpeg') return 'jpg'; if (ct==='image/png') return 'png'; if (ct==='image/webp') return 'webp'; if (ct==='image/gif') return 'gif'; return 'jpg'; }

async function downloadBuffer(url) { const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0' } }); if (!res.ok) throw new Error(`${res.status}`); const ct = res.headers.get('content-type'); const buf = await res.arrayBuffer(); return { buffer: Buffer.from(buf), contentType: ct }; }

async function uploadBuffer(buffer, contentType, key) {
  const { error } = await supabase.storage.from(BUCKET).upload(key, buffer, { upsert: true, contentType });
  if (error) throw error;
  const { data } = await supabase.storage.from(BUCKET).getPublicUrl(key);
  const publicUrl = data?.publicUrl || data?.public_url || data?.publicURL;
  return publicUrl;
}

async function insertProduct({ name, description, priceUsd, imageUrl, productUrl, category }) {
  const code = `ALI-${Math.random().toString(36).slice(2,10)}`;
  const cost_usd = priceUsd ? Number(priceUsd) : null;
  const price_etb = cost_usd ? Math.round(cost_usd * USD_TO_ETB) : 0;
  if (DRY) return { ok: true, dry: true, name, productUrl, cost_usd, price_etb };
  const { error } = await supabase.from('products').insert([{ name, description: description || null, price_etb: price_etb, cost_usd: cost_usd, image_url: imageUrl || null, category: category || 'other', stock_status: true, unique_product_code: code, aliexpress_url: productUrl || null }]);
  if (error) throw error;
  return { ok: true };
}

async function run() {
  console.log(`Importing up to ${COUNT} products across categories: ${CATS.join(',')}`);
  let added = 0;
  for (const cat of CATS) {
    let page = 1;
    while (added < COUNT) {
      const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(cat)}&page=${page}`;
      console.log('Fetching', searchUrl);
      let html; try { html = await fetchText(searchUrl); } catch (e) { console.warn('search fetch failed', e.message); break; }
      const items = extractProductsFromSearch(html, 'https://www.aliexpress.com');
      if (!items.length) break;
      for (const it of items) {
        if (added >= COUNT) break;
        try {
          let imageUrl = it.img && it.img.startsWith('http') ? it.img : null;
          if (!imageUrl) {
            try {
              const prodHtml = await fetchText(it.href);
              const $ = cheerio.load(prodHtml);
              const og = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content');
              if (og) imageUrl = new URL(og, it.href).toString();
            } catch (e) {
              console.warn('Failed to fetch product page', e.message);
            }
          }

          let savedUrl = null;
          if (imageUrl) {
            try {
              const { buffer, contentType } = await downloadBuffer(imageUrl);
              const ext = extFromContentType(contentType);
              const key = `products/import/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
              savedUrl = DRY ? key : await uploadBuffer(buffer, contentType, key);
            } catch (e) { console.warn('image download/upload failed', e.message); }
          }

          const name = it.title || `AliExpress ${cat}`;
          // attempt to extract USD price from product page
          let priceUsd = null;
          try {
            const prodHtml = await fetchText(it.href);
            // try common meta tags
            const matchMeta = prodHtml.match(/<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i) || prodHtml.match(/<meta[^>]+name=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i);
            if (matchMeta && matchMeta[1]) {
              priceUsd = parseFloat(matchMeta[1].replace(/[,\s]/g, '')) || null;
            } else {
              // fallback: look for price patterns like "price":"123.45" or itemprop="price"
              const pjson = prodHtml.match(/"price"\s*[:=]\s*\"?([0-9.,]+)\"?/i);
              if (pjson && pjson[1]) priceUsd = parseFloat(pjson[1].replace(/[,\s]/g, '')) || null;
              if (!priceUsd) {
                const itemprop = prodHtml.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) || prodHtml.match(/itemprop=["']price["'][^>]*>([0-9.,]+)/i);
                if (itemprop && itemprop[1]) priceUsd = parseFloat(itemprop[1].replace(/[,\s]/g, '')) || null;
              }
            }
          } catch (e) {
            // ignore price extraction errors
          }

          await insertProduct({ name, description: null, priceUsd, imageUrl: savedUrl, productUrl: it.href, category: cat });
          added += 1;
          console.log(`Added ${added}: ${name}`);
          if (added >= COUNT) break;
        } catch (e) {
          console.warn('failed item', e.message);
        }
      }
      page += 1;
    }
    if (added >= COUNT) break;
  }
  console.log('Done. Added', added);
}

run().catch(e => { console.error(e); process.exit(1); });
