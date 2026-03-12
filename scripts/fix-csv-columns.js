#!/usr/bin/env node
/**
 * CSV Column Fixer
 * Fixes rows with incorrect column counts
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const CSV_PATH = path.join(__dirname, '../src/_data/books.csv');
const BACKUP_PATH = CSV_PATH + '.backup-before-fix';

console.log('🔧 CSV Column Fixer\n');

// Backup first
fs.copyFileSync(CSV_PATH, BACKUP_PATH);
console.log(`✓ Backup created: ${BACKUP_PATH}\n`);

// Read the CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');

// Parse with relaxed column count to see all rows
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_column_count: true,
  relax_quotes: true
});

console.log(`Parsed ${records.length} records\n`);

// Get headers
const headers = Object.keys(records[0]);
console.log(`Expected ${headers.length} columns\n`);

// Check and fix each record
let fixed = 0;
const fixedRecords = records.map((record, index) => {
  const columns = Object.keys(record);
  const actualColumns = columns.length;

  if (actualColumns !== headers.length) {
    fixed++;
    console.log(`Line ${index + 2}: ${actualColumns} cols → fixing`);

    // Ensure all expected columns exist
    const fixedRecord = {};
    headers.forEach(header => {
      fixedRecord[header] = record[header] || '';
    });
    return fixedRecord;
  }

  return record;
});

console.log(`\nFixed ${fixed} records\n`);

// Write back
const newCsv = stringify(fixedRecords, {
  header: true,
  columns: headers
});

fs.writeFileSync(CSV_PATH, newCsv);
console.log('✅ CSV fixed and saved\n');

// Verify
console.log('Verifying...');
try {
  const verified = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true
  });
  console.log(`✓ Successfully parsed ${verified.length} records`);
} catch (error) {
  console.log(`✗ Verification failed: ${error.message}`);
  console.log('\nRestoring backup...');
  fs.copyFileSync(BACKUP_PATH, CSV_PATH);
  console.log('✓ Backup restored');
  process.exit(1);
}
