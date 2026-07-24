#!/usr/bin/env node
// Pre-commit guard: the book count in books.csv must never decrease.
//
// History audit (2026-07-23) found 29 count drops across 431 commits; most were
// legitimate dedupes, but one unrelated commit silently destroyed 7 books that
// were never recovered. This check makes any decrease a deliberate act.
//
// Intentional removals (dedupes, corrections) bypass with:
//   ALLOW_BOOK_COUNT_DECREASE=1 git commit ...

const { execSync } = require('child_process');
const { parse } = require('csv-parse/sync');

const CSV_PATH = 'src/_data/books.csv';

function countRecords(source) {
  let content;
  try {
    content = execSync(`git show ${source}:"${CSV_PATH}"`, {
      maxBuffer: 1024 * 1024 * 100,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).toString();
  } catch (e) {
    return null; // file absent at this source (e.g. first commit)
  }
  const rows = parse(content, { relax_column_count: true });
  return rows.length - 1; // minus header
}

const staged = countRecords(''); // ':path' = index (staged content)
const head = countRecords('HEAD');

if (staged === null || head === null) {
  process.exit(0); // nothing to compare
}

if (staged < head) {
  if (process.env.ALLOW_BOOK_COUNT_DECREASE === '1') {
    console.log(`⚠️  Book count decreasing ${head} → ${staged} (allowed by ALLOW_BOOK_COUNT_DECREASE)`);
    process.exit(0);
  }
  console.error(`❌ Book count would DECREASE: ${head} → ${staged} (-${head - staged})`);
  console.error('');
  console.error('   The catalog count must never go backwards. If this removal is');
  console.error('   intentional (duplicate, corrupted row), commit with:');
  console.error('');
  console.error('     ALLOW_BOOK_COUNT_DECREASE=1 git commit ...');
  console.error('');
  process.exit(1);
}

console.log(`✅ Book count check: ${head} → ${staged} (non-decreasing)`);
process.exit(0);
