#!/usr/bin/env node
// Pre-commit guard: the book count in every wing CSV declared in wings.json
// must never decrease (nor may an existing wing CSV be deleted silently).
//
// History audit (2026-07-23) found 29 count drops across 431 commits; most were
// legitimate dedupes, but one unrelated commit silently destroyed 7 books that
// were never recovered. This check makes any decrease a deliberate act.
//
// Intentional removals (dedupes, corrections) bypass with:
//   ALLOW_BOOK_COUNT_DECREASE=1 git commit ...

const { execFileSync } = require('child_process');
const { parse } = require('csv-parse/sync');
const { loadWings } = require('./utils/catalog');

function countRecords(source, csvPath) {
  let content;
  try {
    content = execFileSync('git', ['show', `${source}:${csvPath}`], {
      maxBuffer: 1024 * 1024 * 100,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();
  } catch (e) {
    return null; // file absent at this source
  }
  const rows = parse(content, { relax_column_count: true, skip_empty_lines: true });
  return Math.max(0, rows.length - 1); // minus header
}

const wings = loadWings();
const drops = [];
let checked = 0;

for (const wing of wings) {
  const csvPath = `src/_data/${wing.file}`;
  const head = countRecords('HEAD', csvPath);
  const staged = countRecords('', csvPath);

  if (head === null) continue; // brand-new wing not yet in HEAD
  checked++;

  if (staged === null) {
    drops.push({ wing: wing.slug, csvPath, head, staged: 0, deleted: true });
  } else if (staged < head) {
    drops.push({ wing: wing.slug, csvPath, head, staged, deleted: false });
  }
}

if (drops.length > 0) {
  const summary = drops
    .map(d => d.deleted
      ? `${d.csvPath}: DELETED (had ${d.head} rows)`
      : `${d.csvPath}: ${d.head} → ${d.staged} (-${d.head - d.staged})`)
    .join('\n   ');

  if (process.env.ALLOW_BOOK_COUNT_DECREASE === '1') {
    console.log(`⚠️  Book count decreasing (allowed by ALLOW_BOOK_COUNT_DECREASE):\n   ${summary}`);
    process.exit(0);
  }

  console.error(`❌ Book count would DECREASE:\n   ${summary}`);
  console.error('');
  console.error('   The catalog count must never go backwards. If this removal is');
  console.error('   intentional (duplicate, corrupted row), commit with:');
  console.error('');
  console.error('     ALLOW_BOOK_COUNT_DECREASE=1 git commit ...');
  console.error('');
  process.exit(1);
}

console.log(`✅ Book count check passed across ${checked} wing file(s) (non-decreasing)`);
process.exit(0);
