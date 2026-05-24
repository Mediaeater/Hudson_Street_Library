#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

/**
 * Consolidates research results from multiple batch directories
 * and updates books.csv with new metadata
 */

const BATCH_DIRS = Array.from({ length: 17 }, (_, i) =>
  `/tmp/prince-research-batch${i + 1}`
);

const CSV_PATH = path.join(__dirname, '../src/_data/books.csv');
const BACKUP_PATH = path.join(__dirname, `../books-backup-${Date.now()}.csv`);

console.log('=== Richard Prince Research Consolidation ===\n');

// Backup CSV first
console.log('Creating backup...');
fs.copyFileSync(CSV_PATH, BACKUP_PATH);
console.log(`Backup created: ${BACKUP_PATH}\n`);

// Collect all JSON files from batch directories
const researchResults = [];
let foundFiles = 0;

for (const batchDir of BATCH_DIRS) {
  if (!fs.existsSync(batchDir)) {
    console.log(`⏭️  Skipping ${batchDir} (not found)`);
    continue;
  }

  const files = fs.readdirSync(batchDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const filePath = path.join(batchDir, file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      researchResults.push(data);
      foundFiles++;
    } catch (err) {
      console.error(`❌ Error reading ${filePath}:`, err.message);
    }
  }
}

console.log(`\n✓ Found ${foundFiles} research result files\n`);

if (foundFiles === 0) {
  console.log('No research results found yet. Agents may still be working.');
  process.exit(0);
}

// Load CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

console.log(`Loaded ${records.length} records from CSV\n`);

// Update records with research data
let updateCount = 0;
const updateLog = [];

for (const research of researchResults) {
  // Find matching record by ID or title
  const bookId = research.book_id || research.id;
  const record = records.find(r => r.id === String(bookId));

  if (!record) {
    console.warn(`⚠️  No matching record found for book ID ${bookId}`);
    continue;
  }

  const updates = [];

  // Update fields if research data is more complete
  if (research.isbn?.isbn13 && !record.isbn_asin) {
    record.isbn_asin = research.isbn.isbn13;
    updates.push('isbn');
  }

  if (research.publisher?.name && !record.publisher) {
    record.publisher = research.publisher.name;
    updates.push('publisher');
  }

  if (research.publisher?.url && !record.publisher_url) {
    record.publisher_url = research.publisher.url;
    updates.push('publisher_url');
  }

  if (research.year && !record.publication_year) {
    record.publication_year = String(research.year);
    updates.push('year');
  }

  if (research.pages && !record.page_count) {
    record.page_count = String(research.pages);
    updates.push('pages');
  }

  if (research.format && !record.binding) {
    record.binding = research.format;
    updates.push('format');
  }

  if (research.description?.main && !record.description) {
    record.description = research.description.main;
    updates.push('description');
  } else if (research.description?.extended && record.description && record.description.length < 100) {
    record.description = research.description.extended;
    updates.push('description (extended)');
  }

  if (research.tags && research.tags.length > 0 && !record.tags) {
    record.tags = research.tags.join(', ');
    updates.push('tags');
  }

  if (research.dimensions) {
    const dims = research.dimensions;
    // Parse dimensions like "10 × 10 in" or "263 x 220 mm"
    const match = dims.match(/(\d+\.?\d*)\s*[×x]\s*(\d+\.?\d*)\s*(in|mm|cm)/i);
    if (match) {
      const [, width, height, unit] = match;
      let widthCm = parseFloat(width);
      let heightCm = parseFloat(height);

      if (unit.toLowerCase() === 'in') {
        widthCm = widthCm * 2.54;
        heightCm = heightCm * 2.54;
      } else if (unit.toLowerCase() === 'mm') {
        widthCm = widthCm / 10;
        heightCm = heightCm / 10;
      }

      if (!record.width_cm) {
        record.width_cm = widthCm.toFixed(1);
        updates.push('width');
      }
      if (!record.height_cm) {
        record.height_cm = heightCm.toFixed(1);
        updates.push('height');
      }
    }
  }

  if (research.artist_url && !record.artist_url) {
    record.artist_url = research.artist_url;
    updates.push('artist_url');
  }

  if (updates.length > 0) {
    updateCount++;
    updateLog.push({
      id: bookId,
      title: record.title,
      updates: updates
    });
    console.log(`✓ Updated book ${bookId} (${record.title}): ${updates.join(', ')}`);
  }
}

// Write updated CSV
const updatedCsv = stringify(records, {
  header: true,
  quoted: true,
  quoted_empty: true
});

fs.writeFileSync(CSV_PATH, updatedCsv);

console.log(`\n=== SUMMARY ===`);
console.log(`Books updated: ${updateCount}/${foundFiles}`);
console.log(`Backup saved: ${BACKUP_PATH}`);
console.log(`\nUpdated books.csv successfully!\n`);

// Write update log
const logPath = path.join(__dirname, '../archive/prince-research/prince-research-update-log.json');
fs.writeFileSync(logPath, JSON.stringify(updateLog, null, 2));
console.log(`Update log: ${logPath}`);
