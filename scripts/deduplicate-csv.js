#!/usr/bin/env node
/**
 * CSV Deduplicator
 * Removes duplicate rows based on book ID (first column)
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const CSV_PATH = path.join(__dirname, '../src/_data/books.csv');
const BACKUP_PATH = CSV_PATH + '.backup-before-dedup';

console.log('🔧 CSV Deduplicator\n');

// Backup first
fs.copyFileSync(CSV_PATH, BACKUP_PATH);
console.log(`✓ Backup created: ${BACKUP_PATH}\n`);

// Read the CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');

// Parse
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true
});

console.log(`Parsed ${records.length} records\n`);

// Deduplicate by ID (first column)
const seen = new Set();
const deduplicated = [];
let duplicates = 0;

records.forEach((record, index) => {
  const id = record.id || Object.values(record)[0]; // First column is ID

  if (!seen.has(id)) {
    seen.add(id);
    deduplicated.push(record);
  } else {
    duplicates++;
    console.log(`Duplicate found: ID ${id} (line ${index + 2})`);
  }
});

console.log(`\nRemoved ${duplicates} duplicates`);
console.log(`Kept ${deduplicated.length} unique records\n`);

// Get headers
const headers = Object.keys(records[0]);

// Write back
const newCsv = stringify(deduplicated, {
  header: true,
  columns: headers
});

fs.writeFileSync(CSV_PATH, newCsv);
console.log('✅ Deduplicated CSV saved\n');

// Verify
console.log('Verifying...');
try {
  const verified = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true
  });
  console.log(`✓ Successfully parsed ${verified.length} unique records`);
} catch (error) {
  console.log(`✗ Verification failed: ${error.message}`);
  console.log('\nRestoring backup...');
  fs.copyFileSync(BACKUP_PATH, CSV_PATH);
  console.log('✓ Backup restored');
  process.exit(1);
}
