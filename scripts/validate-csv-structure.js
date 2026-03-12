#!/usr/bin/env node
/**
 * CSV Structure Validator
 * Checks for common CSV issues in books.csv
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.join(__dirname, '../src/_data/books.csv');

console.log('🔍 CSV Structure Validator\n');
console.log(`Checking: ${CSV_PATH}\n`);

// Read the file
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const lines = csvContent.split('\n');

console.log(`Total lines: ${lines.length}`);

// Get header
const header = lines[0].split(',');
const expectedColumns = header.length;
console.log(`Expected columns: ${expectedColumns}\n`);

// Check each line
const issues = [];
let validLines = 0;

for (let i = 1; i < lines.length; i++) {
  const lineNum = i + 1;
  const line = lines[i];

  // Skip empty lines
  if (!line.trim()) {
    continue;
  }

  // Count columns (simple comma split - won't handle quoted commas correctly)
  const simpleSplit = line.split(',');

  // Try to parse with csv-parse for accurate count
  try {
    const parsed = parse(line, {
      columns: false,
      skip_empty_lines: true,
      relax_column_count: false
    });

    if (parsed.length > 0) {
      const actualColumns = parsed[0].length;

      if (actualColumns !== expectedColumns) {
        issues.push({
          line: lineNum,
          expected: expectedColumns,
          actual: actualColumns,
          preview: line.substring(0, 100) + '...'
        });
      } else {
        validLines++;
      }
    }
  } catch (error) {
    issues.push({
      line: lineNum,
      error: error.message,
      preview: line.substring(0, 100) + '...'
    });
  }
}

// Report results
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('Results:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log(`✓ Valid lines: ${validLines}`);
console.log(`✗ Issues found: ${issues.length}\n`);

if (issues.length > 0) {
  console.log('Issues:\n');
  issues.slice(0, 10).forEach(issue => {
    console.log(`Line ${issue.line}:`);
    if (issue.error) {
      console.log(`  Error: ${issue.error}`);
    } else {
      console.log(`  Expected ${issue.expected} columns, got ${issue.actual}`);
    }
    console.log(`  Preview: ${issue.preview}`);
    console.log('');
  });

  if (issues.length > 10) {
    console.log(`... and ${issues.length - 10} more issues\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Recommended Actions:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('1. Fix quoted fields containing commas');
  console.log('2. Ensure all rows have exactly 36 columns');
  console.log('3. Check for newlines within fields');
  console.log('4. Run: node scripts/fix-csv-issues.js (if available)\n');
} else {
  console.log('✅ No structural issues found!\n');
}

// Additional checks
console.log('Additional Checks:\n');

// Check for common issues
const allContent = csvContent;
const unescapedQuotes = (allContent.match(/(?<![",])"(?![,"])/g) || []).length;
const suspiciousNewlines = lines.filter(l => l.includes('\n') && l.trim()).length;

console.log(`Potentially unescaped quotes: ${unescapedQuotes}`);
console.log(`Lines with embedded newlines: ${suspiciousNewlines}`);

// Try to parse entire file
console.log('\nTrying to parse entire CSV...');
try {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });
  console.log(`✓ Successfully parsed ${records.length} records`);
} catch (error) {
  console.log(`✗ Parse error: ${error.message}`);
}
