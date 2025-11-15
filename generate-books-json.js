#!/usr/bin/env node
/**
 * Generate books.json from books.csv for search functionality
 */

const fs = require('fs');
const path = require('path');
const CSVHandler = require('./scripts/utils/csv-handler');

const CSV_PATH = path.join(__dirname, 'src/_data/books.csv');
const JSON_OUTPUT_PATH = path.join(__dirname, 'data/books.json');

console.log('Generating books.json from CSV...\n');

try {
  // Read CSV
  console.log(`Reading CSV: ${CSV_PATH}`);
  const csvResult = CSVHandler.readBooksSync(CSV_PATH);
  const bookData = csvResult.data;

  console.log(`Parsed ${bookData.length} books from CSV`);
  console.log(`  Valid rows: ${csvResult.stats.validRows}`);
  console.log(`  Corrected rows: ${csvResult.stats.correctedRows}`);
  console.log(`  Invalid rows: ${csvResult.stats.invalidRows}\n`);

  // Ensure data directory exists
  const dataDir = path.dirname(JSON_OUTPUT_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created directory: ${dataDir}`);
  }

  // Write JSON
  fs.writeFileSync(JSON_OUTPUT_PATH, JSON.stringify(bookData, null, 2));
  console.log(`✓ Written ${bookData.length} books to: ${JSON_OUTPUT_PATH}`);

  // Show file size
  const stats = fs.statSync(JSON_OUTPUT_PATH);
  console.log(`  File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

} catch (error) {
  console.error('Error generating books.json:', error);
  process.exit(1);
}
