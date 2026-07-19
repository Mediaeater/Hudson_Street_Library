#!/usr/bin/env node

/**
 * Add Book From Text Description
 *
 * Simple workflow: Paste book text → Auto-populate CSV → Get cover filename → Update Datasette
 *
 * Usage:
 *   node scripts/add-book-from-text.js --text "Book description here"
 *   node scripts/add-book-from-text.js --file books-to-add.txt
 *   node scripts/add-book-from-text.js --interactive
 *   node scripts/add-book-from-text.js --interactive --no-rebuild  # Skip Datasette update
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
 *   5. Automatically rebuild Datasette catalog (unless --no-rebuild)
 *   6. Provide cover filename for you to add
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');
const { execSync } = require('child_process');
const { BookMetadataAggregator } = require('./utils/book-metadata-aggregator');
const CSVHandler = require('./utils/csv-handler');

// Configuration
const CSV_PATH = path.join(__dirname, '../src/_data/books.csv');
const COVERS_DIR = path.join(__dirname, '../src/assets/images/books');
const ACCESSION_LOCATION = 'Hudson Street Library, NYC';

// Parse command line arguments
const args = process.argv.slice(2);
let inputText = '';
let inputFile = '';
let inputJson = '';
let interactive = false;
let rebuildDatasette = true;
let assumeYes = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--text') {
    inputText = args[++i];
  } else if (args[i] === '--file') {
    inputFile = args[++i];
  } else if (args[i] === '--json') {
    inputJson = args[++i];
  } else if (args[i] === '--interactive') {
    interactive = true;
  } else if (args[i] === '--no-rebuild') {
    rebuildDatasette = false;
  } else if (args[i] === '--yes' || args[i] === '-y') {
    assumeYes = true;
  } else if (args[i] === '--help') {
    console.log(`
Add Book From Text Description

Usage:
  node scripts/add-book-from-text.js --text "Book description"
  node scripts/add-book-from-text.js --file books-to-add.txt
  node scripts/add-book-from-text.js --json book_data.json
  node scripts/add-book-from-text.js --interactive

Options:
  --text <description>    Book description text
  --file <path>           File with book descriptions (one per paragraph)
  --json <path>           JSON file from research-asst skill
  --interactive           Interactive mode with prompts
  --yes, -y               Skip the confirmation prompt (for --json; scriptable)
  --no-rebuild            Skip Datasette catalog rebuild (faster)
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

  // Extract publisher URL if provided (http:// or https://)
  let publisher_url = '';
  const urlMatch = text.match(/(https?:\/\/[^\s\n]+)/i);
  if (urlMatch) {
    publisher_url = urlMatch[1].trim();
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
    description,
    publisher_url
  };
}

/**
 * Search for book metadata using comprehensive multi-source aggregator
 */
async function searchBookMetadata(bookInfo) {
  const aggregator = new BookMetadataAggregator({
    enablePublisherScraping: true,
    apiClient: {
      cache: { enabled: true }
    }
  });

  try {
    const results = await aggregator.searchAll(bookInfo);

    if (results.sources.length > 0) {
      return {
        found: true,
        confidence: results.confidence,
        sources: results.sources,
        metadata: results.metadata
      };
    }

    return { found: false };
  } catch (error) {
    console.log(`⚠️  Metadata search error: ${error.message}`);
    return { found: false, error: error.message };
  }
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
 * Read current CSV and get next ID using robust CSVHandler
 */
async function readCSV() {
  const result = await CSVHandler.readBooks(CSV_PATH);

  if (result.errors.length > 0 && result.errors.some(e => e.type === 'error')) {
    console.warn('⚠️  CSV has validation warnings:', result.errors.length);
  }

  const records = result.data;

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
 * Add book to CSV using robust CSVHandler
 */
async function addBookToCSV(bookData, nextId) {
  const { headers } = await readCSV();

  // Create new record with all columns
  const newRecord = {};
  headers.forEach(header => {
    newRecord[header] = bookData[header] || '';
  });

  // Set ID and accession date
  newRecord.id = nextId.toString();
  newRecord.accession_no = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  newRecord.location = ACCESSION_LOCATION;

  // Append only the new row. This never rewrites the existing rows, so the
  // diff is a single added line — no whole-file re-quoting churn, and no
  // read-time trimming/auto-correction leaking into unrelated records.
  const appendResult = await CSVHandler.appendBook(CSV_PATH, newRecord);

  if (!appendResult.success) {
    throw new Error(`Failed to append to CSV: ${appendResult.errors.join(', ')}`);
  }

  if (appendResult.backup) {
    console.log(`💾 Backup created: ${appendResult.backup}`);
  }

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

    // Comprehensive metadata search
    console.log('\n🔍 Searching multiple high-quality sources...');

    const searchInfo = {
      title: parsed.title,
      author: parsed.author_full_name,
      publisher: parsed.publisher,
      publication_year: parsed.publication_year,
      publisher_url: parsed.publisher_url // If provided in text
    };

    const lookupData = await searchBookMetadata(searchInfo);

    let bookData = { ...parsed };

    if (lookupData.found) {
      console.log(`\n✅ Found data in ${lookupData.sources.length} source(s) [${lookupData.confidence} confidence]`);
      console.log(`   Sources: ${lookupData.sources.join(', ')}`);

      const metadata = lookupData.metadata;

      // Merge found data with parsed data (parsed takes priority if already set)
      if (!bookData.isbn_asin && metadata.isbn) {
        bookData.isbn_asin = metadata.isbn;
        console.log(`   + ISBN: ${metadata.isbn} (from ${metadata.isbn_source})`);
      }

      if (!bookData.publisher && metadata.publisher) {
        bookData.publisher = metadata.publisher;
        console.log(`   + Publisher: ${metadata.publisher} (from ${metadata.publisher_source})`);
      }

      if (!bookData.publication_year && (metadata.publishedDate || metadata.publication_year)) {
        const year = metadata.publishedDate?.substring(0, 4) || metadata.publication_year;
        bookData.publication_year = year;
        console.log(`   + Year: ${year} (from ${metadata.publishedDate_source || metadata.publication_year_source})`);
      }

      if (!bookData.page_count && (metadata.pageCount || metadata.pages)) {
        bookData.page_count = (metadata.pageCount || metadata.pages).toString();
        console.log(`   + Pages: ${bookData.page_count} (from ${metadata.pageCount_source || metadata.pages_source})`);
      }

      if (!bookData.description && metadata.description) {
        bookData.description = metadata.description.substring(0, 500);
        console.log(`   + Description: ${bookData.description.substring(0, 80)}...`);
      }

      // Additional enrichment
      if (metadata.subjects && metadata.subjects.length > 0) {
        bookData.subjects = metadata.subjects.slice(0, 5).join('; ');
        console.log(`   + Subjects: ${bookData.subjects}`);
      }

      if (metadata.binding && !bookData.binding) {
        bookData.binding = metadata.binding;
        console.log(`   + Binding: ${metadata.binding}`);
      }
    } else {
      console.log('⚠️  No data found in any source - you can add details manually later');
      bookData.isbn_asin = '';
    }

    // Get next ID
    const { nextId } = await readCSV();

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

    rl.question('Add this book to books.csv? (y/n): ', async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        // Add to CSV
        const record = await addBookToCSV(bookData, nextId);

        console.log('\n✅ Book added successfully!\n');

        // Validate CSV structure immediately using robust validator
        console.log('🔍 Validating CSV structure...');
        try {
          const validateScript = path.join(__dirname, 'validate-csv-robust.js');
          if (fs.existsSync(validateScript)) {
            execSync(`node "${validateScript}"`, {
              stdio: 'inherit',
              cwd: path.join(__dirname, '..')
            });
            console.log('✅ CSV validation passed!\n');
          } else {
            console.log('⚠️  CSV validator not found, skipping validation\n');
          }
        } catch (error) {
          console.error('❌ CSV VALIDATION FAILED!');
          console.error('   This means the CSV has structural errors.');
          console.error('   Please run: node scripts/validate-csv-robust.js');
          console.error('   Fix any issues before committing.\n');
          process.exit(1);
        }
        console.log('📸 Cover Image Instructions:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Place cover image at: src/assets/images/books/${coverFilename}\n`);

        // Rebuild Datasette catalog
        if (rebuildDatasette) {
          console.log('🔄 Updating Datasette catalog...');
          try {
            const updateScript = path.join(__dirname, 'update-datasette-catalog.sh');
            if (fs.existsSync(updateScript)) {
              execSync(updateScript, {
                stdio: 'inherit',
                cwd: path.join(__dirname, '..')
              });
              console.log('✅ Datasette catalog updated!\n');
            } else {
              console.log('⚠️  Datasette update script not found, skipping rebuild\n');
            }
          } catch (error) {
            console.error('⚠️  Failed to update Datasette catalog:', error.message);
            console.log('   You can manually rebuild with: ./scripts/update-datasette-catalog.sh\n');
          }
        } else {
          console.log('⚠️  Skipped Datasette catalog rebuild (use --no-rebuild flag)\n');
        }

        console.log('🔨 Next Steps:');
        console.log('  1. Add cover image to books/ folder');
        console.log('  2. Run: npm test (full test suite)');
        console.log('  3. Run: npm run build');
        console.log('  4. Commit changes');
        console.log('\n💡 Tip: CSV validation ran automatically. If you manually edit books.csv later,');
        console.log('   always run: node scripts/validate-csv-structure.js\n');
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
 * Process JSON file from research-asst skill
 */
async function processBookFromJSON(jsonPath) {
  try {
    console.log('\n📖 Reading research data from JSON...\n');

    const jsonContent = fs.readFileSync(jsonPath, 'utf8');
    const researchData = JSON.parse(jsonContent);

    console.log('Research Data:', researchData.title);
    console.log(`Sources: ${researchData.research_log.sources_checked.join(', ')}`);
    console.log(`Confidence: ${researchData.research_log.confidence_score}\n`);

    // Split contributors into designer / editor / everyone else so each lands
    // in its own column (research-asst lists them with a `role`). An explicit
    // top-level `designer`/`editor` wins over role-matching.
    const contributors = Array.isArray(researchData.contributors) ? researchData.contributors : [];
    const byRole = (re) => contributors.find((c) => re.test(c.role || ''))?.name || '';
    const designer = researchData.designer || byRole(/design/i);
    const editor = researchData.editor || byRole(/editor/i);
    const otherContributors = contributors
      .filter((c) => !/design|editor/i.test(c.role || ''))
      .map((c) => (c.role ? `${c.name} (${c.role})` : c.name))
      .join('; ');
    const signed = researchData.signed;
    const str = (v) => (v === null || v === undefined ? '' : String(v));

    // Map JSON to CSV format
    const bookData = {
      title: researchData.title,
      subtitle: researchData.subtitle || '',
      author_first: researchData.authors[0]?.name.split(' ')[0] || '',
      author_last: researchData.authors[0]?.name.split(' ').slice(1).join(' ') || '',
      author_full_name: researchData.authors[0]?.name || '',
      publisher: researchData.publisher?.name || '',
      publisher_url: researchData.publisher?.url || '',
      publication_year: researchData.year?.toString() || '',
      isbn_asin: researchData.isbn?.isbn13 || researchData.isbn?.isbn10 || '',
      binding: researchData.format || '',
      page_count: researchData.pages?.toString() || '',
      // Ship the rich tier as the page description (leads with framing, weaves in
      // artist context); fall back to the short summary only if extended is absent.
      description: researchData.description?.extended || researchData.description?.main || '',
      subjects: researchData.loc_data?.subject_headings?.join('; ') || '',
      tags: researchData.tags?.join(', ') || '', // CRITICAL: comma-separated
      language: researchData.language || 'English',
      dimensions: researchData.dimensions || '',
      image_url: researchData.cover_image?.local_path || '',
      // Rich-record fields (research-asst supplies these explicitly). Dimension
      // order is publisher-specific, so height/width/depth are taken verbatim —
      // never parsed from the `dimensions` string — to avoid transposing them.
      height_cm: str(researchData.height_cm),
      width_cm: str(researchData.width_cm),
      depth_cm: str(researchData.depth_cm),
      weight_g: str(researchData.weight_g),
      edition_printrun: researchData.edition || '',
      editor,
      designer,
      contributors: otherContributors,
      is_signed_inscribed: signed === true ? 'true' : signed === false ? 'false' : '',
      collection_grouping: researchData.collection_grouping || '',
      classification: researchData.classification || '',
      notes: researchData.notes || '',
      artist_url: researchData.authors?.[0]?.url || researchData.artist_links?.[0]?.url || ''
    };

    // Get next ID
    const { nextId } = await readCSV();

    // Download cover image if URL provided
    if (researchData.cover_image?.url && !researchData.cover_image?.local_path) {
      const coverFilename = generateCoverFilename(
        bookData.author_last,
        bookData.author_first,
        bookData.title,
        bookData.isbn_asin
      );

      const coverPath = path.join(COVERS_DIR, coverFilename);

      console.log('📸 Downloading cover image...');
      const { BookResearchClient } = require('./utils/book-research-client');
      const client = new BookResearchClient();

      const downloadResult = await client.downloadImage(
        researchData.cover_image.url,
        coverPath
      );

      if (downloadResult.success) {
        bookData.image_url = `/assets/images/books/${coverFilename}`;
      }
    }

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
    console.log(`Tags:            ${bookData.tags}`);
    console.log(`Accession Date:  ${new Date().toISOString().split('T')[0]}`);
    console.log(`Location:        ${ACCESSION_LOCATION}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Perform the add, structure validation, and optional Datasette rebuild.
    const doAdd = async () => {
      await addBookToCSV(bookData, nextId);

      console.log('\n✅ Book added successfully!\n');

      // Validate CSV structure using robust validator
      console.log('🔍 Validating CSV structure...');
      try {
        const validateScript = path.join(__dirname, 'validate-csv-robust.js');
        if (fs.existsSync(validateScript)) {
          execSync(`node "${validateScript}"`, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
          });
          console.log('✅ CSV validation passed!\n');
        }
      } catch (error) {
        console.error('❌ CSV VALIDATION FAILED!');
        console.error('   Please run: node scripts/validate-csv-robust.js\n');
        process.exit(1);
      }

      // Rebuild Datasette catalog
      if (rebuildDatasette) {
        console.log('🔄 Updating Datasette catalog...');
        try {
          const updateScript = path.join(__dirname, 'update-datasette-catalog.sh');
          if (fs.existsSync(updateScript)) {
            execSync(updateScript, {
              stdio: 'inherit',
              cwd: path.join(__dirname, '..')
            });
            console.log('✅ Datasette catalog updated!\n');
          }
        } catch (error) {
          console.error('⚠️  Failed to update Datasette catalog:', error.message);
        }
      }

      console.log('🔨 Next Steps:');
      console.log('  1. Review book details in books.csv');
      console.log('  2. Run: npm test');
      console.log('  3. Run: npm run build');
      console.log('  4. Commit changes\n');
    };

    // --yes skips confirmation so the --json path is fully scriptable.
    if (assumeYes) {
      await doAdd();
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      rl.question('Add this book to books.csv? (y/n): ', async (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          await doAdd();
        } else {
          console.log('\n❌ Cancelled - no changes made\n');
        }
        rl.close();
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  if (interactive) {
    await interactiveMode();
  } else if (inputJson) {
    await processBookFromJSON(inputJson);
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
