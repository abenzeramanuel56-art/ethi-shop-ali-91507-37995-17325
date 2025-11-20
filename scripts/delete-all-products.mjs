#!/usr/bin/env node
/* Delete all products (use --dry to preview) */
import { createClient } from '@supabase/supabase-js';
const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
async function run() {
  console.log('Fetching product count...');
  const { data, error, count } = await supabase.from('products').select('id', { count: 'exact', head: false });
  if (error) { console.error(error); process.exit(1); }
  console.log(`Found ${data.length} products`);
  if (dry) {
    console.log('Dry run: not deleting. Use without --dry to actually delete.');
    return;
  }
  console.log('Deleting products...');
  const { error: delErr } = await supabase.from('products').delete().neq('id', '');
  if (delErr) { console.error('Delete failed', delErr); process.exit(1); }
  console.log('All products deleted.');
}
run().catch(e => { console.error(e); process.exit(1); });
