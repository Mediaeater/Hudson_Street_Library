#!/usr/bin/env node

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

function fixCsvFormatting(inputFile, outputFile) {
  console.log(`🔧 Fixing CSV formatting for ${inputFile}...`);
  
  try {
    // Read the CSV file
    const csvContent = fs.readFileSync(inputFile, 'utf8');
    
    // Parse CSV with relaxed column count
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // Allow inconsistent column counts
      quote: '"',
      escape: '"'
    });
    
    console.log(`📊 Parsed ${records.length} records`);
    
    // Get the expected columns from the first record
    const expectedColumns = Object.keys(records[0]);
    console.log(`🔍 Expected ${expectedColumns.length} columns:`, expectedColumns.slice(0, 5), '...');
    
    // Fix each record to ensure all columns exist
    const fixedRecords = records.map((record, index) => {
      const fixedRecord = {};
      
      // Ensure all expected columns exist
      expectedColumns.forEach(column => {
        if (record.hasOwnProperty(column)) {
          fixedRecord[column] = record[column];
        } else {
          fixedRecord[column] = 'NULL'; // Default value for missing columns
        }
      });
      
      return fixedRecord;
    });
    
    // Write the fixed CSV
    const fixedCsv = stringify(fixedRecords, {
      header: true,
      quoted: true,
      quoted_empty: true,
      escape: '"'
    });
    
    fs.writeFileSync(outputFile, fixedCsv);
    
    console.log(`✅ Fixed CSV written to ${outputFile}`);
    console.log(`📈 Total records: ${fixedRecords.length}`);
    
    return fixedRecords.length;
    
  } catch (error) {
    console.error(`❌ Error fixing CSV: ${error.message}`);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  const inputFile = process.argv[2] || 'src/_data/HSL-CLEAN.csv';
  const outputFile = process.argv[3] || 'src/_data/books.csv';
  
  fixCsvFormatting(inputFile, outputFile);
}

module.exports = { fixCsvFormatting };