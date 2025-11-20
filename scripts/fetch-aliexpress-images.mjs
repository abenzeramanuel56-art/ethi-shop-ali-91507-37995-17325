#!/usr/bin/env node
/*
  Script: fetch-aliexpress-images.mjs
  - Finds products with missing `image_url` in your `products` table,
    searches AliExpress for the product name, extracts a product image,
    downloads and rehosts it in your Supabase storage bucket, and
    updates `products.image_url`.

  Usage (PowerShell example):
    $env:SUPABASE_URL='https://your.supabase.co'
    $env:SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
    npm run fetch-aliexpress-images -- --bucket product-images --limit 100 --dry

  Notes:
  - This is best-effort and depends on AliExpress pages being fetchable
    and containing meta image tags. Some pages require JS rendering and
    won't succeed.
  - Use --dry first to preview actions.
*/

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { createClient } from '@supabase/supabase-js';
import cheerio from 'cheerio';

// Simple retry helper
async function retry(fn, attempts = 3, delay = 500) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

const argv = process.argv.slice(2);
function getArg(name, defaultValue) {
  const idx = argv.indexOf(name);
  if (idx === -1) return defaultValue;
  const val = argv[idx + 1];
  if (!val || val.startsWith('--')) return true;
  return val;
}

const BUCKET = getArg('--bucket', 'product-images');
const LIMIT = Number(getArg('--limit', 0)) || 0;
const DRY = argv.includes('--dry');
const START = Number(getArg('--start', 0)) || 0;
const CONCURRENCY = Number(getArg('--concurrency', 3)) || 3;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function fetchText(url) {
  return retry(async () => {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36' } });
    if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
    return res.text();
  }, 3, 400);
}

function extractFromHtml(html, base) {
  try {
    const $ = cheerio.load(html);
    const og = $('meta[property="og:image"]').attr('content') || $('meta[property="og:image:secure_url"]').attr('content');
    if (og) return new URL(og, base).toString();
    const tw = $('meta[name="twitter:image"]').attr('content');
    if (tw) return new URL(tw, base).toString();
    // prefer large images
    let candidate = null;
    $('img').each((i, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original');
      if (!src) return;
      // skip tiny icons
      const w = parseInt($(el).attr('width') || '0', 10);
      const h = parseInt($(el).attr('height') || '0', 10);
      if (w && h && (w < 50 || h < 50)) return;
      if (!candidate) candidate = src;
    });
    if (candidate) return new URL(candidate, base).toString();
  } catch (e) {
    // fallback to regex
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (og && og[1]) return new URL(og[1], base).toString();
    const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (tw && tw[1]) return new URL(tw[1], base).toString();
    const img = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (img && img[1]) return new URL(img[1], base).toString();
  }
  return null;
}

function extFromContentType(ct) {
  if (!ct) return 'jpg';
  ct = ct.split(';')[0].trim().toLowerCase();
  if (ct === 'image/jpeg') return 'jpg';
  if (ct === 'image/png') return 'png';
  if (ct === 'image/webp') return 'webp';
  if (ct === 'image/gif') return 'gif';
  if (ct === 'image/svg+xml') return 'svg';
  return 'jpg';
}

async function downloadBuffer(url) {
  return retry(async () => {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36' } });
    if (!res.ok) throw new Error(`Download failed ${res.status} for ${url}`);
    const contentType = res.headers.get('content-type');
    const buf = await res.arrayBuffer();
    return { buffer: Buffer.from(buf), contentType };
  }, 3, 500);
}

async function processRow(row) {
  const name = row.name || row.unique_product_code || '';
  // prefer any existing external/product link saved in the DB
  const possibleLink = row.external_url || row.source_url || row.product_url || row.ali_url || row.link || row.url || null;
  if (!name) return { ok: false, reason: 'no name', id: row.id };

  try {
    let imgUrl = null;
    let productUrl = null;

    // If a product link exists on the row, use it directly
    if (possibleLink && typeof possibleLink === 'string') {
      productUrl = possibleLink;
      try {
        const prodHtml = await fetchText(productUrl);
        imgUrl = extractFromHtml(prodHtml, productUrl);
      } catch (e) {
        // fallthrough to searching by name
        productUrl = null;
      }
    }

    // If we still don't have an image, search AliExpress by name
    if (!imgUrl) {
      const q = encodeURIComponent(name);
      const searchUrl = `https://www.aliexpress.com/wholesale?SearchText=${q}`;
      const searchHtml = await fetchText(searchUrl);
      const linkMatch = searchHtml.match(/<a[^>]+href=["']([^"']+\/item\/[^"']+)["']/i) || searchHtml.match(/<a[^>]+href=["']([^"']+\/product\/[^"']+)["']/i);
      if (linkMatch && linkMatch[1]) productUrl = new URL(linkMatch[1], 'https://www.aliexpress.com').toString();
      imgUrl = extractFromHtml(searchHtml, 'https://www.aliexpress.com');
      if (!imgUrl && productUrl) {
        const prodHtml = await fetchText(productUrl);
        imgUrl = extractFromHtml(prodHtml, productUrl);
      }
    }

    if (!imgUrl) return { ok: false, reason: 'no image found', id: row.id };

    // Download image and upload
    const { buffer, contentType } = await downloadBuffer(imgUrl);
    const ext = extFromContentType(contentType) || (imgUrl.split('.').pop() || 'jpg');
    const filename = `products/${row.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    if (DRY) {
      return { ok: true, dry: true, id: row.id, imgUrl, filename };
    }

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filename, buffer, { upsert: true, contentType });
    if (uploadError) throw uploadError;

    // Get public URL or signed
    const { data: pub } = await supabase.storage.from(BUCKET).getPublicUrl(filename) as any;
    let publicUrl = pub?.publicUrl || pub?.public_url || pub?.publicURL;
    if (!publicUrl) {
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(filename, 60 * 60);
      publicUrl = signed?.data?.signedUrl || signed?.data?.signedURL;
    }

    if (!publicUrl) throw new Error('no url from storage');

    const { error: updateErr } = await supabase.from('products').update({ image_url: publicUrl }).eq('id', row.id);
    if (updateErr) throw updateErr;

    return { ok: true, id: row.id, savedUrl: publicUrl };
  } catch (e) {
    return { ok: false, reason: e.message || String(e), id: row.id };
  }
}

async function run() {
  console.log('Fetching products missing images...');
  let query = supabase.from('products').select('id,name,unique_product_code,image_url').is('image_url', null).or('image_url.eq.""') .order('id', { ascending: true }).range(START, (LIMIT && START + LIMIT - 1) || -1);
  const { data: rows, error } = await query;
  if (error) {
    console.error('Failed to fetch products:', error.message || error);
    process.exit(1);
  }
  console.log(`Found ${rows.length} products without image`);

  const queue = [...rows];
  const results = [];
  const workers = new Array(CONCURRENCY).fill(0).map(async () => {
    while (queue.length) {
      const row = queue.shift();
      if (!row) break;
      process.stdout.write(`Processing product ${row.id}...\r`);
      const res = await processRow(row);
      results.push(res);
    }
  });

  await Promise.all(workers);

  const ok = results.filter(r => r.ok).length;
  const failed = results.length - ok;
  console.log('\nDone. Summary:', { total: results.length, ok, failed });
  const sampleFails = results.filter(r => !r.ok).slice(0, 50);
  if (sampleFails.length) console.log('Sample failures:', sampleFails);
}

run().catch(err => { console.error('Fatal', err); process.exit(1); });
