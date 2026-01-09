#!/usr/bin/env node
/**
 * CSV Validation Script
 * Run after any CSV modifications to ensure data integrity
 */

const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'src', '_data', 'books.csv');
const EXPECTED_COLUMNS = 34;

function parseCSVLine(line) {
  const parts = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts;
}

function validateCSV() {
  console.log('=== CSV Validation ===\n');

  const content = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  const errors = [];
  const warnings = [];

  // Check header
  const header = parseCSVLine(lines[0]);
  if (header.length !== EXPECTED_COLUMNS) {
    errors.push(`Header has ${header.length} columns, expected ${EXPECTED_COLUMNS}`);
  }
  console.log(`Header: ${header.length} columns`);
  console.log(`Total rows: ${lines.length - 1}\n`);

  // Validate each row
  const ids = new Set();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = parseCSVLine(line);
    const lineNum = i + 1;

    // Check column count
    if (parts.length !== EXPECTED_COLUMNS) {
      errors.push(`Line ${lineNum}: Has ${parts.length} columns, expected ${EXPECTED_COLUMNS}`);
    }

    // Check ID
    const id = parts[0];
    if (!id || isNaN(parseInt(id))) {
      errors.push(`Line ${lineNum}: Invalid or missing ID: "${id}"`);
    } else if (ids.has(id)) {
      errors.push(`Line ${lineNum}: Duplicate ID: ${id}`);
    }
    ids.add(id);

    // Check for backslash-escaped quotes (invalid CSV)
    if (line.includes('\\"')) {
      errors.push(`Line ${lineNum}: Contains backslash-escaped quotes (use "" instead)`);
    }

    // Check for unbalanced quotes
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      errors.push(`Line ${lineNum}: Unbalanced quotes`);
    }

    // Warn about image_url pointing to non-existent files
    const imageUrl = parts[28];
    if (imageUrl && imageUrl.startsWith('/assets/images/')) {
      const imagePath = path.join(__dirname, '..', 'src', imageUrl);
      if (!fs.existsSync(imagePath)) {
        warnings.push(`Line ${lineNum} (ID ${id}): Image not found: ${imageUrl}`);
      }
    }
  }

  // Report
  if (errors.length === 0) {
    console.log('✓ No errors found\n');
  } else {
    console.log(`✗ ${errors.length} errors found:\n`);
    errors.forEach(e => console.log(`  - ${e}`));
    console.log();
  }

  if (warnings.length > 0) {
    console.log(`⚠ ${warnings.length} warnings:\n`);
    warnings.slice(0, 10).forEach(w => console.log(`  - ${w}`));
    if (warnings.length > 10) {
      console.log(`  ... and ${warnings.length - 10} more`);
    }
    console.log();
  }

  // Summary
  console.log('=== Summary ===');
  console.log(`Rows: ${lines.length - 1}`);
  console.log(`Unique IDs: ${ids.size}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  return errors.length === 0;
}

const isValid = validateCSV();
process.exit(isValid ? 0 : 1);
