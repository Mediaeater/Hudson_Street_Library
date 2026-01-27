#!/usr/bin/env node

/**
 * Classification to Tags Mapper
 *
 * Converts structured Classification field data → standardized tags
 * for books that have classifications but no tags.
 *
 * Classification format: Semicolon-separated hierarchical values
 * Example: "Photography; Individual Photographers; General Monographs"
 *
 * Tag format: Lowercase, comma-separated, no redundancy
 * Example: "individual-photographers, monograph"
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const BOOKS_CSV = path.join(__dirname, '../src/_data/books.csv');

/**
 * Parse classification string and convert to tags
 * @param {string} classification - Semicolon-separated classification
 * @returns {string[]} - Array of tag strings
 */
function classificationToTags(classification) {
  if (!classification || !classification.trim()) {
    return [];
  }

  const tags = [];
  const parts = classification.split(';').map(p => p.trim()).filter(Boolean);

  parts.forEach(part => {
    // Skip generic "Photography" - too broad
    if (part === 'Photography') {
      return;
    }

    // Handle common patterns
    const normalized = part
      .toLowerCase()
      .replace(/^photography[;:\s]+/i, '') // Remove "Photography: " prefix
      .replace(/\s+/g, '-') // Spaces to hyphens
      .replace(/,/g, '') // Remove commas
      .trim();

    if (normalized && !tags.includes(normalized)) {
      tags.push(normalized);
    }
  });

  return tags;
}

/**
 * Simplify classification-derived tags
 * @param {string[]} tags - Raw tags from classification
 * @returns {string[]} - Simplified tags
 */
function simplifyTags(tags) {
  const simplified = [];

  const mappings = {
    'individual-photographers': 'photographer',
    'individual-photographer-monographs': 'photographer-monograph',
    'individual-photographer-monograph-photography': 'photographer-monograph',
    'individual-artist-monographs': 'artist-monograph',
    'individual-artist-book': 'artist-book',
    'general-monographs': 'monograph',
    'photobooks': 'photobook',
    'music-photography': 'music',
    'fashion-photography': 'fashion',
    'artist-book': 'artist-book',
    'exhibition-catalog': 'exhibition-catalog',
    'surveillance-index': 'surveillance'
  };

  tags.forEach(tag => {
    const mapped = mappings[tag] || tag;
    if (!simplified.includes(mapped)) {
      simplified.push(mapped);
    }
  });

  return simplified;
}

/**
 * Main function
 */
async function main() {
  console.log('Classification → Tags Mapper');
  console.log('================================\n');

  // Read books.csv
  console.log('Reading books.csv...');
  const csvContent = fs.readFileSync(BOOKS_CSV, 'utf-8');
  const books = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Total books: ${books.length}\n`);

  // Find books with classification but no tags
  const booksToTag = books.filter(book => {
    const hasClassification = book.classification && book.classification.trim();
    const hasTags = book.tags && book.tags.trim();
    return hasClassification && !hasTags;
  });

  console.log(`Books with classification but no tags: ${booksToTag.length}\n`);

  if (booksToTag.length === 0) {
    console.log('No books to process. Exiting.');
    return;
  }

  // Process each book
  let processedCount = 0;
  const preview = [];

  booksToTag.forEach((book, index) => {
    const tags = classificationToTags(book.classification);
    const simplified = simplifyTags(tags);

    if (simplified.length > 0) {
      book.tags = simplified.join(', ');
      processedCount++;

      // Preview first 10
      if (preview.length < 10) {
        preview.push({
          id: book.id,
          title: book.title.substring(0, 50),
          classification: book.classification,
          tags: book.tags
        });
      }
    }
  });

  console.log(`Processed ${processedCount} books\n`);
  console.log('Preview of first 10 tagged books:');
  console.log('=================================\n');

  preview.forEach(p => {
    console.log(`[${p.id}] ${p.title}`);
    console.log(`  Classification: ${p.classification}`);
    console.log(`  → Tags: ${p.tags}\n`);
  });

  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\nUpdate ${processedCount} books in books.csv? (yes/no): `, (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      // Create backup
      const backup = BOOKS_CSV + '.backup-' + Date.now();
      fs.copyFileSync(BOOKS_CSV, backup);
      console.log(`\nBackup created: ${path.basename(backup)}`);

      // Write updated CSV
      const output = stringify(books, {
        header: true,
        quoted: true
      });
      fs.writeFileSync(BOOKS_CSV, output);
      console.log(`Updated books.csv with ${processedCount} new tags`);
      console.log('\n✅ Done!');
    } else {
      console.log('\nAborted. No changes made.');
    }
    rl.close();
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

module.exports = { classificationToTags, simplifyTags };
