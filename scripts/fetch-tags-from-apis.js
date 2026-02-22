#!/usr/bin/env node

/**
 * Fetch Tags from Library APIs
 *
 * Uses existing book-api-client.js to fetch categories/subjects from
 * Google Books and OpenLibrary APIs for books with ISBNs but no tags.
 *
 * Converts library classifications → standardized tags
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { BookAPIClient } = require('./utils/book-api-client');

require('dotenv').config();

const BOOKS_CSV = path.join(__dirname, '../src/_data/books.csv');

/**
 * Convert library subjects/categories to tags
 */
function subjectsToTags(subjects) {
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return [];
  }

  const tags = new Set();

  subjects.forEach(subject => {
    const normalized = subject
      .toLowerCase()
      .trim()
      // Remove common prefixes
      .replace(/^(photography|art)\s*[:\-]\s*/i, '')
      // Convert to hyphenated format
      .replace(/\s+/g, '-')
      .replace(/[\/,&]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');

    if (normalized && normalized.length > 2) {
      tags.add(normalized);
    }
  });

  return Array.from(tags);
}

/**
 * Simplify and deduplicate tags
 */
function simplifyTags(tags) {
  const simplified = new Set();

  // Common patterns to simplify
  const mappings = {
    'individual-photographers': 'photographer',
    'photographers': 'photographer',
    'portrait-photography': 'portrait',
    'landscape-photography': 'landscape',
    'street-photography': 'street',
    'documentary-photography': 'documentary',
    'fashion-photography': 'fashion',
    'music-photography': 'music',
    'architecture-photography': 'architecture',
    'photobook': 'photobook',
    'photobooks': 'photobook',
    'monograph': 'monograph',
    'monographs': 'monograph',
    'exhibition-catalog': 'exhibition-catalog',
    'artist-book': 'artist-book'
  };

  tags.forEach(tag => {
    const mapped = mappings[tag] || tag;
    simplified.add(mapped);
  });

  return Array.from(simplified);
}

/**
 * Main function
 */
async function main() {
  console.log('Fetch Tags from Library APIs');
  console.log('==============================\n');

  // Read books.csv
  console.log('Reading books.csv...');
  const csvContent = fs.readFileSync(BOOKS_CSV, 'utf-8');
  const books = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Total books: ${books.length}\n`);

  // Find books with ISBN but no tags
  const booksToProcess = books.filter(book => {
    const hasISBN = book.isbn_asin && book.isbn_asin.match(/^\d{10,13}$/);
    const hasTags = book.tags && book.tags.trim();
    return hasISBN && !hasTags;
  });

  console.log(`Books with ISBN but no tags: ${booksToProcess.length}\n`);

  if (booksToProcess.length === 0) {
    console.log('No books to process. Exiting.');
    return;
  }

  // Initialize API client
  const apiClient = new BookAPIClient({
    rateLimit: {
      minInterval: 1500, // 1.5s between requests (be nice to APIs)
      maxConcurrent: 1    // One at a time
    }
  });

  let processedCount = 0;
  let successCount = 0;
  const preview = [];
  const failures = [];

  console.log(`Processing ${booksToProcess.length} books...\n`);
  console.log('This will take approximately', Math.ceil(booksToProcess.length * 1.5 / 60), 'minutes\n');

  for (const book of booksToProcess) {
    processedCount++;
    console.log(`[${processedCount}/${booksToProcess.length}] ${book.title} (ISBN: ${book.isbn_asin})`);

    try {
      // Try Google Books first
      const googleResult = await apiClient.searchGoogleBooks({
        isbn: book.isbn_asin,
        title: book.title,
        author: book.author_full_name
      });

      let tags = [];

      if (googleResult.found && googleResult.metadata && googleResult.metadata.categories) {
        console.log(`  ✓ Google Books: ${googleResult.metadata.categories.length} categories`);
        tags = subjectsToTags(googleResult.metadata.categories);
      } else {
        console.log(`  ✗ Google Books: No categories found`);

        // Try OpenLibrary as fallback
        const openLibResult = await apiClient.searchOpenLibrary({
          isbn: book.isbn_asin
        });

        if (openLibResult.found && openLibResult.metadata && openLibResult.metadata.subjects) {
          console.log(`  ✓ OpenLibrary: ${openLibResult.metadata.subjects.length} subjects`);
          tags = subjectsToTags(openLibResult.metadata.subjects);
        } else {
          console.log(`  ✗ OpenLibrary: No subjects found`);
        }
      }

      if (tags.length > 0) {
        const simplified = simplifyTags(tags);
        book.tags = simplified.join(', ');
        successCount++;
        console.log(`  → Tags: ${book.tags}\n`);

        if (preview.length < 10) {
          preview.push({
            id: book.id,
            title: book.title.substring(0, 50),
            isbn: book.isbn_asin,
            tags: book.tags
          });
        }
      } else {
        console.log(`  → No tags generated\n`);
        failures.push({
          id: book.id,
          title: book.title,
          isbn: book.isbn_asin
        });
      }

    } catch (error) {
      console.log(`  ✗ Error: ${error.message}\n`);
      failures.push({
        id: book.id,
        title: book.title,
        isbn: book.isbn_asin,
        error: error.message
      });
    }
  }

  console.log('\n=================================');
  console.log(`Processed: ${processedCount} books`);
  console.log(`Successfully tagged: ${successCount} books`);
  console.log(`Failed: ${failures.length} books`);
  console.log('=================================\n');

  if (preview.length > 0) {
    console.log('Preview of first 10 tagged books:');
    console.log('=================================\n');

    preview.forEach(p => {
      console.log(`[${p.id}] ${p.title}`);
      console.log(`  ISBN: ${p.isbn}`);
      console.log(`  Tags: ${p.tags}\n`);
    });
  }

  if (failures.length > 0 && failures.length <= 10) {
    console.log('\nBooks that could not be tagged:');
    console.log('=================================\n');
    failures.forEach(f => {
      console.log(`[${f.id}] ${f.title} (ISBN: ${f.isbn})`);
      if (f.error) console.log(`  Error: ${f.error}`);
    });
    console.log();
  }

  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\nUpdate ${successCount} books in books.csv? (yes/no): `, (answer) => {
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
      console.log(`Updated books.csv with ${successCount} new tags`);

      // Write failures log if any
      if (failures.length > 0) {
        const failuresLog = path.join(__dirname, '../plans/improve-tag-coverage/api-failures.json');
        fs.writeFileSync(failuresLog, JSON.stringify(failures, null, 2));
        console.log(`Failures logged to: ${path.basename(failuresLog)}`);
      }

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
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { subjectsToTags, simplifyTags };
