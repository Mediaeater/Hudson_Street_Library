#!/usr/bin/env node
/**
 * validate-jsonld.js
 *
 * Parses every <script type="application/ld+json"> block in the built site and
 * fails on any that is not valid JSON.
 *
 * Structured data fails silently: a malformed block is simply discarded by
 * search engines, the page still renders, and nothing in the build complains.
 * The bug that prompted this script sat on 18 book pages for months —
 * `"numberOfPages": {{ book.page_count | int }}` where page_count held a
 * non-numeric string, and nunjucks' `int` filter returns the empty string
 * (not 0) for a value it cannot parse, leaving `"numberOfPages": ,`.
 *
 * Runs against _site, after the manual book pages are copied in, so it checks
 * exactly what ships.
 *
 * Usage:
 *   node scripts/validate-jsonld.js            # scan _site
 *   node scripts/validate-jsonld.js --quiet    # only report failures
 *
 * Exits non-zero on any parse failure, with the file, the offending line, and
 * the surrounding context.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, '_site');

const quiet = process.argv.includes('--quiet');

const BLOCK_RE =
  /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

// A key whose value never rendered: `"numberOfPages": ,` or `"numberOfPages":`
// at end of line. This is what a template guard that let a bad value through
// looks like, and it is the case the position-less error messages hide.
const EMPTY_VALUE_RE = /"[^"]+"\s*:\s*(,\s*)?$/;

function contextAround(lines, line) {
  const from = Math.max(0, line - 2);
  const to = Math.min(lines.length, line + 1);
  const out = [];
  for (let i = from; i < to; i++) {
    const marker = i === line - 1 ? '>' : ' ';
    out.push(`${marker} ${String(i + 1).padStart(3)} | ${lines[i]}`);
  }
  return out;
}

/**
 * Turn a JSON.parse error into a pointer at the source line.
 *
 * V8 reports a character position on some syntax errors and only an excerpt on
 * others, so take the position when it is offered and otherwise fall back to
 * scanning for a key with no value — the shape this script exists to catch.
 */
function locate(text, err) {
  const lines = text.split('\n');

  const m = /position (\d+)/.exec(err.message);
  if (m) {
    const line = text.slice(0, Number(m[1])).split('\n').length;
    return { line, context: contextAround(lines, line) };
  }

  const found = lines.findIndex((l) => EMPTY_VALUE_RE.test(l));
  if (found !== -1) {
    return { line: found + 1, context: contextAround(lines, found + 1) };
  }

  return { line: null, context: lines.slice(0, 3).map((l) => `      | ${l}`) };
}

if (!fs.existsSync(SITE)) {
  console.error('\n❌ _site not found — nothing to validate.');
  console.error('   Run `npm run build` first, then re-run this script.\n');
  process.exit(1);
}

const files = walkHtml(SITE);
const failures = [];
let blocks = 0;

for (const file of files) {
  const html = fs.readFileSync(file, 'utf8');
  let match;
  let index = 0;
  BLOCK_RE.lastIndex = 0;
  while ((match = BLOCK_RE.exec(html)) !== null) {
    blocks++;
    index++;
    const body = match[1];
    try {
      JSON.parse(body);
    } catch (err) {
      failures.push({
        file: path.relative(ROOT, file),
        index,
        message: err.message,
        ...locate(body, err),
      });
    }
  }
}

if (!quiet) {
  console.log(
    `\nScanned ${blocks} ld+json block(s) across ${files.length} built page(s)`,
  );
}

if (failures.length) {
  console.error(`\n❌ ${failures.length} block(s) failed to parse\n`);
  for (const f of failures.slice(0, 25)) {
    console.error(`   ${f.file}  (block ${f.index})`);
    console.error(`   ${f.message}`);
    for (const line of f.context) console.error(`   ${line}`);
    console.error('');
  }
  if (failures.length > 25) {
    console.error(`   ... and ${failures.length - 25} more\n`);
  }
  console.error('   These blocks are discarded by search engines.');
  console.error(
    '   Check the emitting template in src/_includes/components/schema-*.njk —',
  );
  console.error(
    '   an optional property needs a guard that holds for every value the',
  );
  console.error('   column can actually contain, not just for empty.\n');
  process.exit(1);
}

console.log('\n✨ Every ld+json block parses\n');
