#!/usr/bin/env node
/**
 * Robust CSV Validator using CSVHandler (`npm run test:csv`)
 * Properly handles multi-line fields and quote escaping.
 *
 * With no argument it validates every catalogue file declared in
 * src/_data/wings.json (books.csv + src/_data/catalog/*.csv) and then runs the
 * cross-file checks from scripts/utils/catalog.js: 37 columns everywhere, one
 * shared header, unique ids, ids inside their wing's block. Pass a path to
 * check one file on its own (no cross-file pass).
 */

const path = require('path');
const CSVHandler = require('./utils/csv-handler');
const { listCatalogFiles, loadCatalogSync, CatalogError } = require('./utils/catalog');

const RULE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
const explicitPath = process.argv[2];

console.log('🔍 Robust CSV Validator\n');

async function validateFile(csvPath) {
  console.log(`Checking: ${path.relative(process.cwd(), csvPath)}\n`);
  const result = await CSVHandler.readBooks(csvPath);

  console.log(RULE);
  console.log('Results:');
  console.log(`${RULE}\n`);

  const errors = result.errors.filter(e => e.type === 'error');
  const warnings = result.errors.filter(e => e.type === 'warning');

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
    const missingTitles = result.data.filter(b => !b.title || b.title.trim() === '');
    const missingAuthors = result.data.filter(b => !b.author_full_name || b.author_full_name.trim() === '');
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
