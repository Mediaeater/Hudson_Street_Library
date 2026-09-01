#!/usr/bin/env node
/**
 * CSV Structure Validator
 * Line-oriented check for the catalogue files: every row must have exactly the
 * header's column count (37). Run it after a manual edit; `npm run test:csv`
 * (validate-csv-robust.js) is the full pass.
 *
 * With no argument it checks every file declared in src/_data/wings.json
 * (books.csv + src/_data/catalog/*.csv). Pass a path to check one file.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { listCatalogFiles, EXPECTED_COLUMNS } = require('./utils/catalog');

const RULE = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

function checkFile(csvPath) {
  console.log(`Checking: ${path.relative(process.cwd(), csvPath)}\n`);

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n');
  console.log(`Total lines: ${lines.length}`);

  const header = parse(lines[0], { columns: false })[0];
  const expectedColumns = header.length;
  console.log(`Expected columns: ${expectedColumns}${expectedColumns === EXPECTED_COLUMNS ? '' : `  ⚠ schema is ${EXPECTED_COLUMNS}`}\n`);

  // Line-by-line pass. A multi-line field cannot be checked this way (the
  // whole-file parse below covers it); what this catches is the common manual
  // edit mistake, a single row with a comma too many or too few.
  const issues = [];
  let validLines = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    try {
      const parsed = parse(line, { columns: false, skip_empty_lines: true, relax_column_count: false });
      if (parsed.length === 0) continue;
      const actual = parsed[0].length;
      if (actual !== expectedColumns) {
        issues.push({ line: i + 1, expected: expectedColumns, actual, preview: line.substring(0, 100) + '...' });
      } else {
        validLines++;
      }
    } catch (error) {
      issues.push({ line: i + 1, error: error.message, preview: line.substring(0, 100) + '...' });
    }
  }

  console.log(RULE);
  console.log('Results:');
  console.log(`${RULE}\n`);
  console.log(`✓ Valid lines: ${validLines}`);
  console.log(`✗ Issues found: ${issues.length}\n`);

  if (issues.length > 0) {
    console.log('Issues:\n');
    issues.slice(0, 10).forEach(issue => {
      console.log(`Line ${issue.line}:`);
      if (issue.error) console.log(`  Error: ${issue.error}`);
      else console.log(`  Expected ${issue.expected} columns, got ${issue.actual}`);
      console.log(`  Preview: ${issue.preview}\n`);
    });
    if (issues.length > 10) console.log(`... and ${issues.length - 10} more issues\n`);
    console.log(RULE);
    console.log('Recommended Actions:');
    console.log(`${RULE}\n`);
    console.log('1. Fix quoted fields containing commas');
    console.log(`2. Ensure all rows have exactly ${EXPECTED_COLUMNS} columns`);
    console.log('3. Check for newlines within fields');
    console.log('4. Run: node scripts/fix-csv-issues.js (if available)\n');
  } else {
    console.log('✅ No structural issues found!\n');
  }

  console.log('Additional Checks:\n');
  const unescapedQuotes = (csvContent.match(/(?<![",])"(?![,"])/g) || []).length;
  console.log(`Potentially unescaped quotes: ${unescapedQuotes}`);

  console.log('\nTrying to parse entire CSV...');
  let parseFailed = false;
  try {
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, relax_column_count: false });
    console.log(`✓ Successfully parsed ${records.length} records\n`);
  } catch (error) {
    parseFailed = true;
    console.log(`✗ Parse error: ${error.message}\n`);
  }

  return parseFailed || expectedColumns !== EXPECTED_COLUMNS;
}

console.log('🔍 CSV Structure Validator\n');

let targets;
try {
  targets = process.argv[2] ? [path.resolve(process.argv[2])] : listCatalogFiles().map(f => f.file);
} catch (error) {
  console.error(`❌ ${error.message}`);
  process.exit(1);
}

const failed = targets.map(checkFile).filter(Boolean).length;
process.exit(failed > 0 ? 1 : 0);
