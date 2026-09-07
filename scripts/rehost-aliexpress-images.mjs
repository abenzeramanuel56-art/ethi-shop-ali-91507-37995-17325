#!/usr/bin/env node
/*
  Script: rehost-aliexpress-images.mjs
  - Downloads remote product images (including AliExpress page images) and rehosts them
    into your Supabase storage bucket, then updates the `products.image_url` field
    to point to the new public URL.

  Usage:
    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run rehost-images -- --bucket product-images --limit 100 --dry

  Env variables required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

  Options:
    --bucket <name>   Storage bucket to upload images (default: product-images)
    --limit <n>       Max products to process (default: 0 = all)
    --dry             Dry-run: do not upload or update DB, just log
    --start <offset>  Start offset for pagination (default: 0)
    --concurrency <n> Number of parallel downloads (default: 4)
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { createClient } from '@supabase/supabase-js';

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
const CONCURRENCY = Number(getArg('--concurrency', 4)) || 4;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

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

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return res.text();
}

// Try to extract a direct image URL from an AliExpress product page or other page
function extractImageUrlFromHtml(html, baseUrl) {
  // Try og:image
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (og && og[1]) return new URL(og[1], baseUrl).toString();

  // Try twitter:image
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (tw && tw[1]) return new URL(tw[1], baseUrl).toString();

  // Try common img tags (first big image)
  const img = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (img && img[1]) return new URL(img[1], baseUrl).toString();

  return null;
}

async function downloadBuffer(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed ${res.status} for ${url}`);
  const contentType = res.headers.get('content-type');
  const buffer = await res.arrayBuffer();
  return { buffer: Buffer.from(buffer), contentType };
}

async function processProductRow(row, index) {
  const original = row.image_url;
  if (!original) return { ok: false, reason: 'no image_url', row };

  let imageUrl = original;
  // If it's not an http URL, skip (can't download)
  if (!/^https?:\/\//i.test(imageUrl)) {
    return { ok: false, reason: 'not http url', row };
  }

  // If URL looks like direct image (ends with image ext) try directly
  const looksLikeImage = /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(imageUrl);

  try {
    if (!looksLikeImage) {
      // fetch page and try to extract a direct image
      try {
        const html = await fetchText(imageUrl);
        const extracted = extractImageUrlFromHtml(html, imageUrl);
        if (extracted) imageUrl = extracted;
      } catch (e) {
        console.warn(`[${row.id}] failed to fetch/parse page: ${e.message}`);
      }
    }

    // Download the resolved imageUrl
    const { buffer, contentType } = await downloadBuffer(imageUrl);

    const ext = extFromContentType(contentType) || (imageUrl.split('.').pop() || 'jpg');
    const filename = `products/${row.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    if (DRY) {
      console.log(`[DRY] Would upload ${imageUrl} => ${filename}`);
      return { ok: true, dry: true, filename, imageUrl };
    }

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filename, buffer, { upsert: true, contentType });
    if (uploadError) throw uploadError;

    // get public url (works if bucket is public)
    const { data: publicData } = await supabase.storage.from(BUCKET).getPublicUrl(filename) as any;
    const publicUrl = publicData?.publicUrl || publicData?.public_url || publicData?.publicURL;

    if (!publicUrl) {
      // try createSignedUrl
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(filename, 60 * 60);
      const signedUrl = signed?.data?.signedUrl || signed?.data?.signedURL;
      if (signedUrl) {
        // update DB with signed URL
        await supabase.from('products').update({ image_url: signedUrl }).eq('id', row.id);
        return { ok: true, filename, imageUrl, savedUrl: signedUrl };
      }
      throw new Error('Could not obtain public or signed url');
    }

    // update DB to new publicUrl
    const { error: updateError } = await supabase.from('products').update({ image_url: publicUrl }).eq('id', row.id);
    if (updateError) throw updateError;

    return { ok: true, filename, imageUrl, savedUrl: publicUrl };
  } catch (e) {
    return { ok: false, reason: e.message || String(e), row };
  }
}

async function run() {
  console.log('Starting rehost script');
  console.log({ BUCKET, LIMIT, START, DRY, CONCURRENCY });

  // Fetch product rows that likely need rehosting: image_url not null
  let query = supabase.from('products').select('id,image_url').order('id', { ascending: true }).range(START, (LIMIT && START + LIMIT - 1) || -1);
  const { data: rows, error } = await query;
  if (error) {
    console.error('Failed to fetch products:', error.message || error);
    process.exit(1);
  }

  console.log(`Found ${rows.length} products to check`);

  let idx = 0;
  const results = [];
  const queue = [...rows];

  const workers = new Array(CONCURRENCY).fill(0).map(async () => {
    while (queue.length) {
      const row = queue.shift();
      if (!row) break;
      idx += 1;
      process.stdout.write(`Processing ${idx}/${rows.length} (product ${row.id})\r`);
      const res = await processProductRow(row, idx);
      results.push(res);
    }
  });

  await Promise.all(workers);

  console.log('\nDone. Summary:');
  const ok = results.filter(r => r.ok).length;
  const failed = results.length - ok;
  console.log(`Processed ${results.length} rows: ok=${ok}, failed=${failed}`);
  const failures = results.filter(r => !r.ok).slice(0, 50);
  if (failures.length) console.log('Sample failures:', failures);
  console.log('Finished');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
