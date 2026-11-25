#!/usr/bin/env node
/**
 * Robust CSV Validator using CSVHandler (`npm run test:csv`)
 * Properly handles multi-line fields and quote escaping.
 *
 * With no argument it validates every catalogue file declared in
 * src/_data/wings.json (src/_data/catalog/*.csv) and then runs the
 * cross-file checks from scripts/utils/catalog.js: 37 columns everywhere, one
 * shared header, unique ids, ids inside their wing's block. Pass a path to
 * check one file on its own (no cross-file pass).
 */

const fs = require('fs');
const path = require('path');
const { parse: parseSync } = require('csv-parse/sync');
const CSVHandler = require('./utils/csv-handler');
const { listCatalogFiles, loadCatalogSync, CatalogError, EXPECTED_COLUMNS } = require('./utils/catalog');

const RULE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const explicitPath = process.argv[2];

console.log('🔍 Robust CSV Validator\n');

function checkStrictStructure(csvPath) {
  const problems = [];
  let rows;
  try {
    rows = parseSync(fs.readFileSync(csvPath, 'utf8'), {
      columns: false,
      relax_column_count: false,
      skip_empty_lines: true,
      quote: '"',
      escape: '"',
    });
  } catch (err) {
    return [`CSV structure error: ${err.message}`];
  }
  if (rows.length === 0) return ['CSV is empty (needs at least the header row)'];
  const header = rows[0];
  if (header.length !== EXPECTED_COLUMNS) {
    problems.push(`Header has ${header.length} columns, expected ${EXPECTED_COLUMNS}`);
  }
  const idIdx = header.indexOf('id');
  const seen = new Set();
  for (let i = 1; i < rows.length; i++) {
    const rawId = idIdx >= 0 ? String(rows[i][idIdx] ?? '').trim() : '';
    if (!/^\d+$/.test(rawId)) {
      problems.push(`Row ${i + 1}: id "${rawId}" is not an integer`);
    } else if (seen.has(rawId)) {
      problems.push(`Row ${i + 1}: duplicate id ${rawId}`);
    } else {
      seen.add(rawId);
    }
  }
  return problems;
}

async function validateFile(csvPath) {
  console.log(`Checking: ${path.relative(process.cwd(), csvPath)}\n`);
  const result = await CSVHandler.readBooks(csvPath);

  console.log(RULE);
  console.log('Results:');
  console.log(`${RULE}\n`);

  const errors = result.errors.filter(e =>
    e.type === 'error' || e.type === 'fatal' || e.type === 'recovery' || e.type === 'skipped'
  );
  const warnings = result.errors.filter(e => e.type === 'warning');

  // Policy check: price must always be empty (see CLAUDE.md).
  const pricedRows = result.data.filter(b => b.price && b.price.trim() !== '');
  for (const b of pricedRows) {
    errors.push({
      row: b.id,
      type: 'error',
      message: `Non-empty price "${b.price}" violates no-price policy`,
      record: b,
    });
  }

  // Strict structural check even in single-file mode (37 cols, unique integer IDs).
  if (explicitPath) {
    for (const msg of checkStrictStructure(csvPath)) {
      errors.push({ row: '?', type: 'error', message: msg });
    }
  }

  console.log(`✓ Total records: ${result.data.length}`);
  console.log(`✓ Valid rows: ${result.stats.validRows}`);
  console.log(`✓ Corrected rows: ${result.stats.correctedRows}`);
  console.log(`✗ Invalid rows: ${result.stats.invalidRows}`);
  console.log(`⚠  Warnings: ${warnings.length}`);
  console.log(`❌ Errors: ${errors.length}\n`);

  if (errors.length > 0) {
    console.log('Errors:\n');
    errors.slice(0, 10).forEach((error, index) => {
      console.log(`${index + 1}. Row ${error.row}:`);
      console.log(`   ${error.message}`);
      if (error.record) {
        console.log(`   ID: ${error.record.id}, Title: ${error.record.title?.substring(0, 50)}`);
      }
      console.log('');
    });
    if (errors.length > 10) console.log(`... and ${errors.length - 10} more errors\n`);
  }

  if (warnings.length > 0 && warnings.length <= 10) {
    console.log('Warnings:\n');
    warnings.forEach((warning, index) => {
      console.log(`${index + 1}. Row ${warning.row}:`);
      console.log(`   ${warning.warnings?.join(', ')}`);
      console.log('');
    });
  } else if (warnings.length > 10) {
    console.log(`\nNote: ${warnings.length} warnings (mostly minor issues like missing optional fields)\n`);
  }

  if (result.data.length > 0) {
    console.log(RULE);
    console.log('Data Quality Checks:');
    console.log(`${RULE}\n`);

    const n = result.data.length;
    const missingTitles = warnings.filter(w => w.warnings?.some(m => m.includes('Missing required field: title')));
    const missingAuthors = warnings.filter(w => w.warnings?.some(m => m.includes('Missing required field: author_full_name')));
    const missingCovers = result.data.filter(b => !b.image_url || b.image_url.trim() === '');
    const hasISBN = result.data.filter(b => b.isbn_asin && b.isbn_asin.trim() !== '');

    console.log(`Books with ISBN: ${hasISBN.length}/${n} (${(hasISBN.length / n * 100).toFixed(1)}%)`);
    console.log(`Books with covers: ${n - missingCovers.length}/${n} (${((n - missingCovers.length) / n * 100).toFixed(1)}%)`);
    console.log(`Missing titles: ${missingTitles.length}`);
    console.log(`Missing authors: ${missingAuthors.length}\n`);
  } else {
    console.log('(header only, no rows)\n');
  }

  if (result.stats.invalidRows > 0) return `${path.basename(csvPath)}: invalid rows found`;
  if (errors.length > 0) return `${path.basename(csvPath)}: errors found`;
  return null;
}

async function validate() {
  const failures = [];
  let targets;

  try {
    targets = explicitPath
      ? [path.resolve(explicitPath)]
      : listCatalogFiles().map(f => f.file);
  } catch (error) {
    // Registry problems (a catalog/*.csv with no wing, a wing with no file, …)
    console.error(`❌ ${error.message}\n`);
    process.exit(1);
  }

  for (const file of targets) {
    const failure = await validateFile(file);
    if (failure) failures.push(failure);
  }

  if (!explicitPath) {
    console.log(RULE);
    console.log('Cross-file checks (37 columns, shared header, unique ids, id blocks):');
    console.log(`${RULE}\n`);
    try {
      const { files, data, wings } = loadCatalogSync();
      files.forEach(f => console.log(`✓ ${path.relative(process.cwd(), f.file)}: ${f.rows} rows (${f.slug})`));
      console.log(`✓ ${files.length} files, ${data.length} rows, ${wings.length} wings\n`);
    } catch (error) {
      if (!(error instanceof CatalogError)) throw error;
      console.log(`❌ ${error.message}\n`);
      failures.push(error.message);
    }
  }

  if (failures.length > 0) {
    console.log('❌ CSV validation FAILED\n');
    failures.forEach(f => console.log(`   - ${f}`));
    console.log('');
    process.exit(1);
  }
  console.log('✅ CSV validation PASSED\n');
  process.exit(0);
}

validate().catch(error => {
  console.error('❌ Fatal error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
