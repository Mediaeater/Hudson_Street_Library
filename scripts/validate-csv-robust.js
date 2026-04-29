#!/usr/bin/env node
/**
 * Robust CSV Validator using CSVHandler
 * Properly handles multi-line fields and quote escaping
 */

const path = require('path');
const CSVHandler = require('./utils/csv-handler');

const CSV_PATH = process.argv[2] || path.join(__dirname, '../src/_data/books.csv');

console.log('🔍 Robust CSV Validator\n');
console.log(`Checking: ${CSV_PATH}\n`);

async function validate() {
  try {
    const result = await CSVHandler.readBooks(CSV_PATH);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`✓ Total records: ${result.data.length}`);
    console.log(`✓ Valid rows: ${result.stats.validRows}`);
    console.log(`✓ Corrected rows: ${result.stats.correctedRows}`);
    console.log(`✗ Invalid rows: ${result.stats.invalidRows}`);
    console.log(`⚠  Warnings: ${result.errors.filter(e => e.type === 'warning').length}`);
    console.log(`❌ Errors: ${result.errors.filter(e => e.type === 'error').length}\n`);

    if (result.errors.length > 0) {
      const errors = result.errors.filter(e => e.type === 'error');
      const warnings = result.errors.filter(e => e.type === 'warning');

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

        if (errors.length > 10) {
          console.log(`... and ${errors.length - 10} more errors\n`);
        }
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
    }

    // Check for common data quality issues
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Data Quality Checks:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const missingTitles = result.data.filter(b => !b.title || b.title.trim() === '');
    const missingAuthors = result.data.filter(b => !b.author_full_name || b.author_full_name.trim() === '');
    const missingCovers = result.data.filter(b => !b.image_url || b.image_url.trim() === '');
    const hasISBN = result.data.filter(b => b.isbn_asin && b.isbn_asin.trim() !== '');

    console.log(`Books with ISBN: ${hasISBN.length}/${result.data.length} (${(hasISBN.length/result.data.length*100).toFixed(1)}%)`);
    console.log(`Books with covers: ${result.data.length - missingCovers.length}/${result.data.length} (${((result.data.length - missingCovers.length)/result.data.length*100).toFixed(1)}%)`);
    console.log(`Missing titles: ${missingTitles.length}`);
    console.log(`Missing authors: ${missingAuthors.length}\n`);

    // Exit code
    if (result.stats.invalidRows > 0) {
      console.log('❌ CSV validation FAILED - invalid rows found\n');
      process.exit(1);
    } else if (result.errors.filter(e => e.type === 'error').length > 0) {
      console.log('❌ CSV validation FAILED - errors found\n');
      process.exit(1);
    } else {
      console.log('✅ CSV validation PASSED\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

validate();
