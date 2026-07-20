#!/usr/bin/env node
// Stamps assets/styles.css and assets/nav.js with a content hash in every
// HTML file that links them, rewriting the ?v= query string.
//
// Why: Cloudflare caches those files under stable filenames, and the zone's
// Browser Cache TTL overrides whatever Cache-Control the repo sends - so a
// visitor can hold a stale stylesheet for hours after a deploy. HTML is
// never cached, so changing the query string is what actually forces a
// refetch. Doing it by hand is easy to forget, and forgetting it ships a
// broken-looking site, so this runs from the pre-commit hook instead.
//
// Usage:  node tools/stamp-assets.mjs [--check]
//   (no args)  rewrite HTML in place, print what changed
//   --check    exit 1 if anything is out of date, change nothing

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');
const ASSETS = ['assets/styles.css', 'assets/nav.js'];

const hashOf = (rel) =>
  createHash('sha256').update(readFileSync(join(root, rel))).digest('hex').slice(0, 10);

function htmlFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (['.git', 'node_modules', 'tmp', 'output'].includes(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) htmlFiles(full, found);
    else if (entry.endsWith('.html')) found.push(full);
  }
  return found;
}

const hashes = Object.fromEntries(ASSETS.map((a) => [a, hashOf(a)]));
const stale = [];

for (const file of htmlFiles(root)) {
  const before = readFileSync(file, 'utf8');
  let after = before;

  for (const [asset, hash] of Object.entries(hashes)) {
    const name = asset.split('/').pop();
    // match src/href="...<name>?v=anything" or with no query string at all
    after = after.replace(
      new RegExp(`(${name.replace('.', '\\.')})(\\?v=[^"']*)?(?=["'])`, 'g'),
      `$1?v=${hash}`
    );
  }

  if (after !== before) {
    stale.push(file.slice(root.length + 1));
    if (!checkOnly) writeFileSync(file, after);
  }
}

if (stale.length === 0) {
  console.log('asset stamps up to date');
  process.exit(0);
}

if (checkOnly) {
  console.error(`Asset stamps are stale in ${stale.length} file(s):`);
  for (const f of stale) console.error(`  ${f}`);
  console.error('\nRun: node tools/stamp-assets.mjs');
  process.exit(1);
}

console.log(`stamped ${stale.length} file(s):`);
for (const [asset, hash] of Object.entries(hashes)) console.log(`  ${asset} -> ?v=${hash}`);
