#!/usr/bin/env node

/**
 * Add Book From Text Description
 *
 * Simple workflow: Paste book text → Auto-populate CSV → Get cover filename
 *
 * Usage:
 *   node scripts/add-book-from-text.js --text "Book description here"
 *   node scripts/add-book-from-text.js --file books-to-add.txt
 *   node scripts/add-book-from-text.js --interactive
 *
 * Example text format:
 *   Ayoung Kim: Synthetic Storyteller
 *   The Floorplan, 2025 | Softcover | 400 pages
 *
 * The script will:
 *   1. Parse the text to extract book details
 *   2. Look up ISBN and additional info from APIs
 *   3. Generate next sequential ID
 *   4. Add to books.csv with today's accession date
 *   5. Provide cover filename for you to add
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// Configuration
const CSV_PATH = path.join(__dirname, '../src/_data/books.csv');
const COVERS_DIR = path.join(__dirname, '../src/assets/images/books');
const ACCESSION_LOCATION = 'Hudson Street Library, NYC';

// Parse command line arguments
const args = process.argv.slice(2);
let inputText = '';
let inputFile = '';
let interactive = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--text') {
    inputText = args[++i];
  } else if (args[i] === '--file') {
    inputFile = args[++i];
  } else if (args[i] === '--interactive') {
    interactive = true;
  } else if (args[i] === '--help') {
    console.log(`
Add Book From Text Description

Usage:
  node scripts/add-book-from-text.js --text "Book description"
  node scripts/add-book-from-text.js --file books-to-add.txt
  node scripts/add-book-from-text.js --interactive

Options:
  --text <description>    Book description text
  --file <path>           File with book descriptions (one per paragraph)
  --interactive           Interactive mode with prompts
  --help                  Show this help

Example text format:
  Ayoung Kim: Synthetic Storyteller
  The Floorplan, 2025 | Softcover | 400 pages | 150 color images

  Delivery Dancer's Arc: Inverse
  The National Asian Culture Center | 228 pages | paperback
`);
    process.exit(0);
  }
}

/**
 * Parse book text into structured data
 */
function parseBookText(text) {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l);

  if (lines.length === 0) {
    throw new Error('No text provided');
  }

  // First line is typically: "Author: Title" or just "Title"
  const firstLine = lines[0];
  let author = '';
  let title = '';

  if (firstLine.includes(':')) {
    const parts = firstLine.split(':');
    author = parts[0].trim();
    title = parts.slice(1).join(':').trim();
  } else {
    title = firstLine;
  }

  // Parse author name
  let author_first = '';
  let author_last = '';
  let author_full_name = author;

  if (author) {
    const nameParts = author.split(/\s+/);
    if (nameParts.length === 1) {
      author_last = nameParts[0];
    } else if (nameParts.length === 2) {
      author_first = nameParts[0];
      author_last = nameParts[1];
    } else {
      // More complex names - take last as last name, rest as first
      author_last = nameParts[nameParts.length - 1];
      author_first = nameParts.slice(0, -1).join(' ');
    }
  }

  // Second line typically has publisher and metadata
  const metadata = lines.slice(1).join(' ');

  // Extract publisher (text before first |, comma, or number)
  let publisher = '';
  const publisherMatch = metadata.match(/^([^|,\d]+)/);
  if (publisherMatch) {
    publisher = publisherMatch[1].trim();
  }

  // Extract year (4-digit number)
  let publication_year = '';
  const yearMatch = metadata.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    publication_year = yearMatch[1];
  }

  // Extract page count
  let page_count = '';
  const pagesMatch = metadata.match(/(\d+)\s*pages/i);
  if (pagesMatch) {
    page_count = pagesMatch[1];
  }

  // Extract binding type
  let binding = '';
  const bindingMatch = metadata.match(/\b(hardcover|softcover|paperback|hardback|spiral)\b/i);
  if (bindingMatch) {
    binding = bindingMatch[1].charAt(0).toUpperCase() + bindingMatch[1].slice(1).toLowerCase();
  }

  // Build description from image counts and other details
  let description = '';
  const imageMatch = metadata.match(/(\d+)\s*(?:color\s*)?images?/i);
  if (imageMatch) {
    description = `${imageMatch[0]}`;
  }

  return {
    author_first,
    author_last,
    author_full_name: author_full_name || `${author_first} ${author_last}`.trim(),
    title,
    publisher,
    publication_year,
    page_count,
    binding,
    description
  };
}

/**
 * Search for ISBN using Google Books API
 */
async function searchISBN(title, author) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(`${title} ${author}`.trim());
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=3`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.items && json.items.length > 0) {
            for (const item of json.items) {
              const volumeInfo = item.volumeInfo;

              // Try to find ISBN-13 first, then ISBN-10
              if (volumeInfo.industryIdentifiers) {
                const isbn13 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_13');
                const isbn10 = volumeInfo.industryIdentifiers.find(id => id.type === 'ISBN_10');

                if (isbn13) {
                  return resolve({
                    isbn: isbn13.identifier,
                    publisher: volumeInfo.publisher || '',
                    year: volumeInfo.publishedDate ? volumeInfo.publishedDate.substring(0, 4) : '',
                    pageCount: volumeInfo.pageCount || '',
                    description: volumeInfo.description || ''
                  });
                } else if (isbn10) {
                  return resolve({
                    isbn: isbn10.identifier,
                    publisher: volumeInfo.publisher || '',
                    year: volumeInfo.publishedDate ? volumeInfo.publishedDate.substring(0, 4) : '',
                    pageCount: volumeInfo.pageCount || '',
                    description: volumeInfo.description || ''
                  });
                }
              }
            }
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

/**
 * Generate cover filename following convention
 */
function generateCoverFilename(author_last, author_first, title, isbn) {
  // Clean up names and title for filename
  const cleanName = (str) => str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);

  const authorPart = author_last ?
    cleanName(`${author_first} ${author_last}`.trim()) :
    cleanName(author_first || 'Unknown');

  const titlePart = cleanName(title);
  const isbnPart = isbn ? `_${isbn.replace(/[^0-9X]/g, '')}` : '';

  return `${authorPart}_${titlePart}${isbnPart}.jpg`;
}

/**
 * Read current CSV and get next ID
 */
function readCSV() {
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  // Get max ID
  let maxId = 0;
  records.forEach(record => {
    const id = parseInt(record.id);
    if (!isNaN(id) && id > maxId) {
      maxId = id;
    }
  });

  return {
    records,
    nextId: maxId + 1,
    headers: Object.keys(records[0])
  };
}

/**
 * Add book to CSV
 */
function addBookToCSV(bookData, nextId) {
  const { records, headers } = readCSV();

  // Create new record with all columns
  const newRecord = {};
  headers.forEach(header => {
    newRecord[header] = bookData[header] || '';
  });

  // Set ID and accession date
  newRecord.id = nextId.toString();
  newRecord.accession_no = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  newRecord.location = ACCESSION_LOCATION;

  // Add to records
  records.push(newRecord);

  // Write back to CSV
  const csvContent = stringify(records, {
    header: true,
    columns: headers
  });

  // Create backup first
  const backupDir = path.join(__dirname, '../src/_data/backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const backupPath = path.join(backupDir, `books_backup_${timestamp}.csv`);
  fs.copyFileSync(CSV_PATH, backupPath);

  // Write new CSV
  fs.writeFileSync(CSV_PATH, csvContent);

  return newRecord;
}

/**
 * Interactive mode
 */
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

  console.log('\n📚 Add Book - Interactive Mode\n');
  console.log('Paste book description (press Enter twice when done):\n');

  let inputLines = [];

  rl.on('line', (line) => {
    if (line.trim() === '' && inputLines.length > 0) {
      rl.close();
    } else {
      inputLines.push(line);
    }
  });

  rl.on('close', async () => {
    const text = inputLines.join('\n');
    await processBook(text);
  });
}

/**
 * Process single book text
 */
async function processBook(text) {
  try {
    console.log('\n📖 Parsing book details...\n');

    // Parse text
    const parsed = parseBookText(text);
    console.log('Parsed:', parsed);

    // Look up ISBN
    console.log('\n🔍 Searching for ISBN...');
    const lookupData = await searchISBN(parsed.title, parsed.author_full_name);

    let bookData = { ...parsed };

    if (lookupData) {
      console.log('✓ Found ISBN:', lookupData.isbn);
      bookData.isbn_asin = lookupData.isbn;

      // Fill in missing data from lookup
      if (!bookData.publisher && lookupData.publisher) {
        bookData.publisher = lookupData.publisher;
      }
      if (!bookData.publication_year && lookupData.year) {
        bookData.publication_year = lookupData.year;
      }
      if (!bookData.page_count && lookupData.pageCount) {
        bookData.page_count = lookupData.pageCount.toString();
      }
      if (!bookData.description && lookupData.description) {
        bookData.description = lookupData.description.substring(0, 500);
      }
    } else {
      console.log('⚠ ISBN not found - you can add it manually later');
      bookData.isbn_asin = '';
    }

    // Get next ID
    const { nextId } = readCSV();

    // Generate cover filename
    const coverFilename = generateCoverFilename(
      bookData.author_last,
      bookData.author_first,
      bookData.title,
      bookData.isbn_asin
    );

    bookData.image_url = `/assets/images/books/${coverFilename}`;

    console.log('\n📋 Book Details:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`ID:              ${nextId}`);
    console.log(`Title:           ${bookData.title}`);
    console.log(`Author:          ${bookData.author_full_name}`);
    console.log(`Publisher:       ${bookData.publisher || '(not found)'}`);
    console.log(`Year:            ${bookData.publication_year || '(not found)'}`);
    console.log(`ISBN:            ${bookData.isbn_asin || '(not found)'}`);
    console.log(`Pages:           ${bookData.page_count || '(not specified)'}`);
    console.log(`Binding:         ${bookData.binding || '(not specified)'}`);
    console.log(`Accession Date:  ${new Date().toISOString().split('T')[0]}`);
    console.log(`Location:        ${ACCESSION_LOCATION}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Ask for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Add this book to books.csv? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        // Add to CSV
        const record = addBookToCSV(bookData, nextId);

        console.log('\n✅ Book added successfully!\n');
        console.log('📸 Cover Image Instructions:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Place cover image at: src/assets/images/books/${coverFilename}`);
        console.log('\nOr run cover acquisition:');
        console.log(`  node acquire-covers.js --limit 1\n`);

        console.log('🔨 Next Steps:');
        console.log('  1. Add cover image to books/ folder');
        console.log('  2. Run: npm test');
        console.log('  3. Run: npm run build');
        console.log('  4. Commit changes\n');
      } else {
        console.log('\n❌ Cancelled - no changes made\n');
      }
      rl.close();
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  if (interactive) {
    await interactiveMode();
  } else if (inputFile) {
    // Process file with multiple books
    const fileContent = fs.readFileSync(inputFile, 'utf8');
    const books = fileContent.split(/\n\s*\n/).filter(b => b.trim());

    console.log(`\n📚 Found ${books.length} book(s) in file\n`);

    for (let i = 0; i < books.length; i++) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing book ${i + 1} of ${books.length}`);
      console.log('='.repeat(60));
      await processBook(books[i]);

      // Add delay between API calls
      if (i < books.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } else if (inputText) {
    await processBook(inputText);
  } else {
    console.log('No input provided. Use --help for usage information.');
    process.exit(1);
  }
}

// Run
main().catch(console.error);
