import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>\s*\/\/ Hosting domains[\s\S]*?<\/script>/)?.[0]
  .replace(/^<script>|<\/script>$/g, '');
assert.ok(script, 'Staging indexing policy must exist');

function policyFor(hostname) {
  let policy = 'index, follow';
  runInNewContext(script, {
    window: { location: { hostname } },
    document: { querySelector: () => ({ setAttribute: (_name, value) => { policy = value; } }) },
  });
  return policy;
}

test('Lovable deployment and preview addresses are excluded from indexing', () => {
  for (const host of ['abeniexpress.lovable.app', 'id-preview--example.lovable.app']) {
    assert.equal(policyFor(host), 'noindex, follow');
  }
});

test('Vercel deployment and preview addresses are excluded from indexing', () => {
  for (const host of ['abeniexpress.vercel.app', 'abeniexpress-git-preview-team.vercel.app']) {
    assert.equal(policyFor(host), 'noindex, follow');
  }
});

test('Production custom domain remains indexable', () => {
  for (const host of ['abeniexpress.online', 'www.abeniexpress.online']) {
    assert.equal(policyFor(host), 'index, follow');
  }
});

test('Unrelated domains cannot match staging suffixes accidentally', () => {
  for (const host of ['notlovable.app', 'vercel.app.example.com', 'localhost']) {
    assert.equal(policyFor(host), 'index, follow');
  }
});