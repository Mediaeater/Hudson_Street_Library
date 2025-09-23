#!/usr/bin/env node

const fs = require('fs');
const CSVHandler = require('./utils/csv-handler');

async function fixCsvFormatting(inputFile, outputFile) {
  console.log(`🔧 Fixing CSV formatting for ${inputFile}...`);

  try {
    // Read the CSV file using enhanced handler (which already handles these issues)
    const csvResult = await CSVHandler.read(inputFile);
    const records = csvResult.data;
    
    console.log(`📊 Parsed ${records.length} records`);
    console.log(`📈 Stats: ${csvResult.stats.validRows} valid, ${csvResult.stats.correctedRows} corrected, ${csvResult.stats.invalidRows} invalid`);

    if (csvResult.errors.length > 0) {
      console.log(`⚠️  Found ${csvResult.errors.length} issues (warnings/errors)`);
      csvResult.errors.slice(0, 5).forEach((error, index) => {
        console.log(`  ${index + 1}. Row ${error.row}: ${error.message || error.warnings?.join(', ')}`);
      });
    }

    // Records are already cleaned and validated by the enhanced handler
    const fixedRecords = records;
    
    // Write the fixed CSV using enhanced handler
    const writeResult = await CSVHandler.write(outputFile, fixedRecords);

    if (!writeResult.success) {
      throw new Error(`Failed to write fixed CSV: ${writeResult.errors.join(', ')}`);
    }

    if (writeResult.backup) {
      console.log(`💾 Created backup: ${writeResult.backup}`);
    }
    
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

  fixCsvFormatting(inputFile, outputFile).catch(console.error);
}

module.exports = { fixCsvFormatting };