#!/usr/bin/env node
// Run the de-slop scanner over books.csv descriptions.
//
//   node scripts/deslop-descriptions.js 1503 1505     # named rows
//   node scripts/deslop-descriptions.js --all         # every row with a description
//   node scripts/deslop-descriptions.js --all -- --skip aphorism
//
// Each description is scanned as its OWN document. That matters: three of the
// scanner's checks (repeated openers, echoing sentences, fragment drumbeat) look
// at runs of consecutive sentences, so concatenating rows into one stream makes
// unrelated neighbours look like a run — a shelf of BUTT Magazine rows reports
// 80+ phantom hits that way. One row, one document, no false runs.
//
// Exit code follows the scanner: 0 clean, 1 tics found, 2 error. Read-only.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { parse } = require('csv-parse/sync');

const CSV = path.join(__dirname, '..', 'src/_data/books.csv');
const SCANNER = path.join(os.homedir(), '.claude/skills/de-slop/scripts/scan.py');

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
const ids = (sep === -1 ? argv : argv.slice(0, sep)).filter(a => a !== '--all');
const all = argv.includes('--all');
const passthrough = sep === -1 ? [] : argv.slice(sep + 1);

if ((!ids.length && !all) || argv.includes('-h') || argv.includes('--help')) {
  console.error('usage: deslop-descriptions.js <id> [id ...] | --all  [-- <scan.py flags>]');
  process.exit(2);
}
if (!fs.existsSync(SCANNER)) {
  console.error(`de-slop scanner not found at ${SCANNER} — is the de-slop skill installed?`);
  process.exit(2);
}

const rows = parse(fs.readFileSync(CSV), { columns: true, relax_column_count: true });
const has = r => (r.description || '').trim().length > 0;

let wanted;
if (all) {
  wanted = rows.filter(has);
} else {
  wanted = ids.map(id => {
    const r = rows.find(x => x.id === String(id));
    if (!r) {
      console.error(`no row with id ${id}`);
      process.exit(2);
    }
    return r;
  });
  const empty = wanted.filter(r => !has(r));
  if (empty.length) console.error(`note: no description on id ${empty.map(r => r.id).join(', ')}`);
  wanted = wanted.filter(has);
}

if (!wanted.length) {
  console.log('nothing to scan.');
  process.exit(0);
}

// One file per row, named for the id so the scanner's per-file header identifies
// the book. Descriptions go out as stored; scan.py strips the HTML itself.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deslop-'));
try {
  const files = wanted.map(r => {
    const f = path.join(dir, `book-${r.id}.html`);
    fs.writeFileSync(f, r.description);
    return f;
  });
  const res = spawnSync('python3', [SCANNER, ...passthrough, ...files], { stdio: 'inherit' });
  process.exit(res.status === null ? 2 : res.status);
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
