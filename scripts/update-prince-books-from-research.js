#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

/**
 * Update Richard Prince books in CSV with researched metadata and improved tags
 */

const CSV_PATH = path.join(__dirname, '../src/_data/books.csv');
const RESEARCH_DIR = '/tmp';
const BACKUP_DIR = path.join(__dirname, '../backups');

// Create backup
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const backupPath = path.join(BACKUP_DIR, `books-prince-update-${Date.now()}.csv`);
fs.copyFileSync(CSV_PATH, backupPath);
console.log(`✓ Backup created: ${backupPath}\n`);

// Load CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

console.log(`Loaded ${records.length} records from CSV\n`);

// Find all research JSON files
const researchFiles = [];
for (let i = 1; i <= 17; i++) {
  const batchDir = path.join(RESEARCH_DIR, `prince-research-batch${i}`);
  if (fs.existsSync(batchDir)) {
    const files = fs.readdirSync(batchDir)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(batchDir, f));
    researchFiles.push(...files);
  }
}

console.log(`Found ${researchFiles.length} research files\n`);

let updateCount = 0;
const updates = [];

// Process each research file
for (const filePath of researchFiles) {
  try {
    const research = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const bookId = String(research.book_id);

    const record = records.find(r => r.id === bookId);
    if (!record) {
      console.warn(`⚠️  No record found for ID ${bookId}`);
      continue;
    }

    const changes = [];

    // Update ISBN
    if (research.isbn?.isbn13 && !record.isbn_asin) {
      record.isbn_asin = research.isbn.isbn13;
      changes.push('isbn');
    }

    // Update publisher
    if (research.publisher?.name && !record.publisher) {
      record.publisher = research.publisher.name;
      changes.push('publisher');
    }

    // Update publisher URL
    if (research.publisher?.url && !record.publisher_url) {
      record.publisher_url = research.publisher.url;
      changes.push('publisher_url');
    }

    // Update year
    if (research.year && !record.publication_year) {
      record.publication_year = String(research.year);
      changes.push('year');
    }

    // Update pages
    if (research.pages && !record.page_count) {
      record.page_count = String(research.pages);
      changes.push('pages');
    }

    // Update format/binding
    if (research.format && !record.binding) {
      record.binding = research.format;
      changes.push('format');
    }

    // Update description (use extended if available, else main)
    const newDesc = research.description?.extended || research.description?.main;
    if (newDesc && (!record.description || record.description.length < 100)) {
      record.description = newDesc;
      changes.push('description');
    }

    // Update tags - CRITICAL: comma-separated
    if (research.tags && Array.isArray(research.tags) && research.tags.length > 0) {
      const newTags = research.tags.join(', ');
      if (!record.tags || record.tags.length < 10) {
        record.tags = newTags;
        changes.push('tags');
      }
    }

    // Update dimensions
    if (research.dimensions) {
      const dims = research.dimensions;
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
          changes.push('width');
        }
        if (!record.height_cm) {
          record.height_cm = heightCm.toFixed(1);
          changes.push('height');
        }
      }
    }

    // Update artist URL if missing
    if (!record.artist_url) {
      record.artist_url = 'http://www.richardprince.com';
      changes.push('artist_url');
    }

    if (changes.length > 0) {
      updateCount++;
      updates.push({
        id: bookId,
        title: record.title,
        changes: changes
      });
      console.log(`✓ Updated ID ${bookId} (${record.title}): ${changes.join(', ')}`);
    }

  } catch (err) {
    console.error(`❌ Error processing ${filePath}:`, err.message);
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
console.log(`Books updated: ${updateCount}/${researchFiles.length}`);
console.log(`Backup: ${backupPath}`);
console.log(`\n✅ Updated books.csv successfully!\n`);

// Write update log
const logPath = path.join(__dirname, '../archive/prince-research/prince-research-update-log.json');
fs.writeFileSync(logPath, JSON.stringify(updates, null, 2));
console.log(`Update log: ${logPath}`);
