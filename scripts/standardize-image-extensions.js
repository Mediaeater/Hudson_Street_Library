#!/usr/bin/env node
/**
 * Standardize Image Extensions
 * Renames all .jpeg files to .jpg and updates CSV references
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const CSV_PATH = path.join(__dirname, '../src/_data/books.csv');
const BOOKS_DIR = path.join(__dirname, '../src/assets/images/books');
const CSV_BACKUP = CSV_PATH + '.backup-before-extension-fix';

console.log('🔧 Standardizing Image Extensions (.jpeg → .jpg)\n');

// Backup CSV first
fs.copyFileSync(CSV_PATH, CSV_BACKUP);
console.log(`✓ CSV backup created: ${CSV_BACKUP}\n`);

// Find all .jpeg files
const jpegFiles = fs.readdirSync(BOOKS_DIR)
  .filter(file => file.toLowerCase().endsWith('.jpeg'));

console.log(`Found ${jpegFiles.length} .jpeg files to rename:\n`);

if (jpegFiles.length === 0) {
  console.log('✅ No .jpeg files found - nothing to do!\n');
  process.exit(0);
}

// Rename files
const renamedFiles = [];
jpegFiles.forEach(oldFilename => {
  const newFilename = oldFilename.replace(/\.jpeg$/i, '.jpg');
  const oldPath = path.join(BOOKS_DIR, oldFilename);
  const newPath = path.join(BOOKS_DIR, newFilename);

  try {
    fs.renameSync(oldPath, newPath);
    renamedFiles.push({ old: oldFilename, new: newFilename });
    console.log(`  ✓ ${oldFilename} → ${newFilename}`);
  } catch (error) {
    console.log(`  ✗ Failed to rename ${oldFilename}: ${error.message}`);
  }
});

console.log(`\nRenamed ${renamedFiles.length} files\n`);

// Update CSV references
console.log('Updating CSV references...\n');

const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true
});

let updated = 0;
const updatedRecords = records.map(record => {
  if (record.image_url && record.image_url.includes('.jpeg')) {
    const oldUrl = record.image_url;
    record.image_url = record.image_url.replace(/\.jpeg$/i, '.jpg');
    console.log(`  ✓ Updated: ${path.basename(oldUrl)} → ${path.basename(record.image_url)}`);
    updated++;
  }
  return record;
});

console.log(`\nUpdated ${updated} CSV references\n`);

// Write updated CSV
const headers = Object.keys(records[0]);
const newCsv = stringify(updatedRecords, {
  header: true,
  columns: headers
});

fs.writeFileSync(CSV_PATH, newCsv);
console.log('✅ CSV updated and saved\n');

// Verify
console.log('Verifying...');
try {
  const verified = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true
  });
  console.log(`✓ Successfully parsed ${verified.length} records\n`);
} catch (error) {
  console.log(`✗ Verification failed: ${error.message}`);
  console.log('\nRestoring CSV backup...');
  fs.copyFileSync(CSV_BACKUP, CSV_PATH);
  console.log('✓ CSV backup restored');
  console.log('⚠️  Note: Image files were renamed but CSV was reverted');
  process.exit(1);
}

// Summary
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Summary:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Files renamed: ${renamedFiles.length}`);
console.log(`  CSV references updated: ${updated}`);
console.log(`  All image extensions now standardized to .jpg`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
