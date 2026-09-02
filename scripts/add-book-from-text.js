#!/usr/bin/env node

/**
 * Add Book From Text Description
 *
 * Simple workflow: Paste book text → Auto-populate CSV → Get cover filename
 *
 * Usage:
 *   node scripts/add-book-from-text.js --text "Book description here"
 *   node scripts/add-book-from-text.js --file books-to-add.txt
 *   node scripts/add-book-from-text.js --json book_data_slug.json --wing cryptology
 *   node scripts/add-book-from-text.js --interactive
 *
 * Example text format:
 *   Ayoung Kim: Synthetic Storyteller
 *   The Floorplan, 2025 | Softcover | 400 pages
 *
 * The script will:
 *   1. Parse the text to extract book details
 *   2. Look up ISBN and additional info from APIs
 *   3. Resolve the wing, and take the next free id from that wing's block
 *   4. Append the row to that wing's CSV with today's accession date
 *   5. Provide cover filename for you to add
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const https = require('https');
const { execSync } = require('child_process');
const { BookMetadataAggregator } = require('./utils/book-metadata-aggregator');
const CSVHandler = require('./utils/csv-handler');
const {
  loadCatalogSync,
  resolveWing,
  defaultWing,
  wingFile,
  nextIdForWing,
} = require('./utils/catalog');

// Configuration
const ROOT = path.join(__dirname, '..');
const COVERS_DIR = path.join(__dirname, '../src/assets/images/books');
const ACCESSION_LOCATION = 'Hudson Street Library, NYC';

// Parse command line arguments
const args = process.argv.slice(2);
let inputText = '';
let inputFile = '';
let inputJson = '';
let interactive = false;
let assumeYes = false;
let wingArg = '';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--text') {
    inputText = args[++i];
  } else if (args[i] === '--file') {
    inputFile = args[++i];
  } else if (args[i] === '--json') {
    inputJson = args[++i];
  } else if (args[i] === '--wing') {
    wingArg = args[++i];
  } else if (args[i] === '--interactive') {
    interactive = true;
  } else if (args[i] === '--yes' || args[i] === '-y') {
    assumeYes = true;
  } else if (args[i] === '--help') {
    console.log(`
Add Book From Text Description

Usage:
  node scripts/add-book-from-text.js --text "Book description"
  node scripts/add-book-from-text.js --file books-to-add.txt
  node scripts/add-book-from-text.js --json book_data.json
  node scripts/add-book-from-text.js --json book_data.json --wing cryptology
  node scripts/add-book-from-text.js --interactive

Options:
  --text <description>    Book description text
  --file <path>           File with book descriptions (one per paragraph)
  --json <path>           JSON file from research-asst skill
  --wing <slug>           Catalogue wing to file under (default: the JSON
                          record's "wing", else art). The wing decides both
                          the target CSV and the id block.
  --interactive           Interactive mode with prompts
  --yes, -y               Skip the confirmation prompt (for --json; scriptable)
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
 * Generate cover filename following convention:
 *   {author_last}_{author_first}_{title-kebab}_{isbn}.jpg — all lowercase.
 *
 * This used to emit `{First}_{Last}_{Title}_{isbn}.jpg` in mixed case, which is
 * neither the documented convention nor what the shelf uses. It only showed on
 * records where research-asst hadn't already set `cover_image.local_path`
 * (it names files correctly itself), so the ingest's own naming went unexercised
 * on most adds. Existing files keep their historical names; this fixes new ones.
 */
function generateCoverFilename(author_last, author_first, title, isbn) {
  const part = (str, sep) => (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, sep)
    .substring(0, 50)
    .replace(new RegExp(`\\${sep}+$`), '');

  const authorPart = [part(author_last, '_'), part(author_first, '_')]
    .filter(Boolean).join('_') || 'unknown';
  const titlePart = part(title, '-');
  const isbnPart = isbn ? `_${isbn.replace(/[^0-9Xx]/g, '').toLowerCase()}` : '';

  return `${authorPart}_${titlePart}${isbnPart}.jpg`;
}

/**
 * ISBN-13 checksum. Also validates the 977x ISSN/EAN barcodes periodicals use,
 * since they share the EAN-13 check-digit algorithm. Returns true/false, or
 * null when the input isn't 13 digits.
 */
function isValidIsbn13(digits) {
  if (!/^\d{13}$/.test(digits)) return null;
  const sum = digits.slice(0, 12).split('')
    .reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(digits[12]);
}

/** ISBN-10 checksum. Returns true/false, or null when not a 10-char ISBN-10. */
function isValidIsbn10(value) {
  if (!/^\d{9}[\dX]$/.test(value)) return null;
  const sum = value.split('')
    .reduce((acc, c, i) => acc + (c === 'X' ? 10 : Number(c)) * (10 - i), 0);
  return sum % 11 === 0;
}

/** Warn (never block) when the page description is a thin stub, not a full page. */
function warnIfThinDescription(description) {
  const desc = description || '';
  if (desc.length < 300 || !/<p[\s>]/i.test(desc)) {
    console.warn('\n⚠️  Description looks thin — short, or missing a <p> framing paragraph.');
    console.warn('   The page description should lead with a framing sentence and run ~800–1300 chars.');
    console.warn('   Consider re-running /research-asst for this title before committing.\n');
  }
}

/** Warn (never block) when the ISBN/ASIN fails its checksum — catches typos and
 *  related-product ISBNs. Unknown formats (ASINs, odd lengths) pass silently. */
function warnIfSuspiciousIsbn(isbnAsin) {
  const raw = (isbnAsin || '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (!raw) return;
  const v13 = isValidIsbn13(raw);
  const v10 = isValidIsbn10(raw);
  if (v13 === false || (v13 === null && v10 === false)) {
    console.warn(`\n⚠️  ISBN checksum looks invalid: ${isbnAsin}`);
    console.warn('   Verify it — a transposed digit or a related-product ISBN may have been captured.\n');
  }
}

/**
 * Today's date in the cataloguer's own timezone, YYYY-MM-DD.
 * `toISOString()` is UTC, so an evening add in New York stamped tomorrow's
 * accession date — and an accession date one day in the future reorders
 * Recently Added.
 */
function todayLocal() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Which wing this add is filed under. An explicit --wing wins; otherwise the
 * research record may name one; otherwise the default wing. An unknown slug
 * throws (catalog.js lists the valid ones) rather than silently landing the
 * row in books.csv.
 */
function resolveTargetWing(recordWing) {
  const slug = wingArg || recordWing || defaultWing().slug;
  return resolveWing(slug);
}

/**
 * Read the catalogue for an add.
 *
 * The duplicate guard sees EVERY wing — the same book must not be filed twice
 * under two wings — while the id and the target file come from the wing being
 * added to. Columns come from the loader, not from the first row, so a wing
 * whose file is still header-only works.
 */
function readCatalogFor(wing) {
  const { data, columns } = loadCatalogSync();
  return {
    records: data,
    nextId: nextIdForWing(wing.slug),
    headers: columns,
    file: wingFile(wing),
  };
}

/**
 * Add book to its wing's CSV using robust CSVHandler
 */
async function addBookToCSV(bookData, nextId, headers, file) {
  // Create new record with all columns
  const newRecord = {};
  headers.forEach(header => {
    newRecord[header] = bookData[header] || '';
  });

  // Set ID and accession date
  newRecord.id = nextId.toString();
  newRecord.accession_no = todayLocal();
  newRecord.location = ACCESSION_LOCATION;

  // Append only the new row. This never rewrites the existing rows, so the
  // diff is a single added line — no whole-file re-quoting churn, and no
  // read-time trimming/auto-correction leaking into unrelated records.
  const appendResult = await CSVHandler.appendBook(file, newRecord);

  if (!appendResult.success) {
    throw new Error(`Failed to append to CSV: ${appendResult.errors.join(', ')}`);
  }

  if (appendResult.backup) {
    console.log(`💾 Backup created: ${appendResult.backup}`);
  }

  return newRecord;
}

/**
 * Duplicate guard — the ingest is not idempotent (every run appends a new
 * row), so flag rows already matching on ISBN, or on title + surname when
 * the ISBN is absent or differs (new editions share a title, not an ISBN).
 */
function findExistingMatches(records, bookData) {
  const norm = (v) => (v || '').trim().toLowerCase();
  const isbn = norm(bookData.isbn_asin);
  const title = norm(bookData.title);
  const last = norm(bookData.author_last);
  return records.filter((r) =>
    (isbn && norm(r.isbn_asin) === isbn) ||
    (title && norm(r.title) === title && norm(r.author_last) === last)
  );
}

// Prompts even when --yes was passed: --yes covers the routine confirm, not a
// duplicate override. With no interactive stdin (a scripted re-run) the prompt
// gets no answer and resolves false, so the run aborts instead of appending.
function confirmDuplicateAdd() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    let answered = false;
    rl.question('Add anyway? (y/n): ', (answer) => {
      answered = true;
      rl.close();
      const a = answer.trim().toLowerCase();
      resolve(a === 'y' || a === 'yes');
    });
    rl.on('close', () => {
      if (!answered) resolve(false);
    });
  });
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

    // Wing, id and target file
    const wing = resolveTargetWing();
    const { nextId, headers, file } = readCatalogFor(wing);
    const target = path.relative(ROOT, file);

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
    console.log(`Wing:            ${wing.name} (${wing.slug}) → ${target}`);
    console.log(`ID:              ${nextId}`);
    console.log(`Title:           ${bookData.title}`);
    console.log(`Author:          ${bookData.author_full_name}`);
    console.log(`Publisher:       ${bookData.publisher || '(not found)'}`);
    console.log(`Year:            ${bookData.publication_year || '(not found)'}`);
    console.log(`ISBN:            ${bookData.isbn_asin || '(not found)'}`);
    console.log(`Pages:           ${bookData.page_count || '(not specified)'}`);
    console.log(`Binding:         ${bookData.binding || '(not specified)'}`);
    console.log(`Accession Date:  ${todayLocal()}`);
    console.log(`Location:        ${ACCESSION_LOCATION}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Ask for confirmation
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`Add this book to ${target}? (y/n): `, async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        // Add to CSV
        const record = await addBookToCSV(bookData, nextId, headers, file);

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
    // LOC subject headings have no column of their own; fold them into notes
    // rather than silently dropping them.
    const locSubjects = researchData.loc_data?.subject_headings || [];
    const subjectsNote = locSubjects.length ? `Subjects (LOC): ${locSubjects.join('; ')}.` : '';

    // No subtitle column exists — fold it into title (colon-joined, the
    // site-wide convention) or it would be dropped when the row is built
    // from the CSV headers.
    const fullTitle = researchData.subtitle && !researchData.title.includes(researchData.subtitle)
      ? `${researchData.title}: ${researchData.subtitle}`
      : researchData.title;
    // author_full_name carries ALL authors (comma-joined); authors[0] alone
    // supplies the first/last sort keys. Anything else loses co-authors.
    const authorNames = (researchData.authors || []).map((a) => a?.name).filter(Boolean);
    // Explicit last/first on authors[0] win — splitting a display name can't
    // handle middle names, particles ("van der"), or family-name-first order.
    // Fallback mirrors the text-path heuristic: mononym → last (an empty
    // author_last breaks the page slug), else last token = last, rest = first.
    const primaryAuthor = researchData.authors?.[0] || {};
    let author_first = str(primaryAuthor.first).trim();
    let author_last = str(primaryAuthor.last).trim();
    if (!author_first && !author_last) {
      const nameParts = str(primaryAuthor.name).trim().split(/\s+/).filter(Boolean);
      if (nameParts.length === 1) {
        author_last = nameParts[0];
      } else if (nameParts.length > 1) {
        author_last = nameParts[nameParts.length - 1];
        author_first = nameParts.slice(0, -1).join(' ');
      }
    }
    // publisher arrives as {name, url} from research-asst, but accept a plain
    // string too — a bare "publisher": "Mack" must not drop the field.
    const publisherData = typeof researchData.publisher === 'string'
      ? { name: researchData.publisher }
      : (researchData.publisher || {});
    // isbn is documented as {isbn13, isbn10} but a bare "isbn": "978..." string
    // is the obvious shorthand — take it rather than silently dropping the ISBN.
    const isbn = typeof researchData.isbn === 'string'
      ? researchData.isbn.trim()
      : (researchData.isbn?.isbn13 || researchData.isbn?.isbn10 || '');

    // Map JSON to CSV format
    const bookData = {
      title: fullTitle,
      author_first,
      author_last,
      author_full_name: authorNames.join(', ') || '',
      publisher: publisherData.name || '',
      // Accept the top-level publisher_url too — research-asst emits it there
      // when `publisher` is a plain string, and it has its own CSV column.
      publisher_url: publisherData.url || researchData.publisher_url || '',
      publication_year: researchData.year?.toString() || '',
      isbn_asin: isbn,
      binding: researchData.format || '',
      page_count: researchData.pages?.toString() || '',
      // Ship the rich tier as the page description (leads with framing, weaves in
      // artist context); fall back to the short summary only if extended is absent.
      description: researchData.description?.extended || researchData.description?.main || '',
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
      num_images: str(researchData.num_images),
      edition_printrun: researchData.edition || '',
      editor,
      designer,
      contributors: otherContributors,
      is_signed_inscribed: signed === true ? 'true' : signed === false ? 'false' : '',
      collection_grouping: researchData.collection_grouping || '',
      classification: researchData.classification || '',
      notes: [researchData.notes, subjectsNote].filter(Boolean).join(' '),
      artist_url: researchData.authors?.[0]?.url || researchData.artist_links?.[0]?.url || ''
    };

    // Pre-commit sanity nudges (warn only — never block the add).
    warnIfThinDescription(bookData.description);
    warnIfSuspiciousIsbn(bookData.isbn_asin);

    // Wing, id and target file. The record may name its own wing; --wing wins.
    const wing = resolveTargetWing(researchData.wing);
    const { records, nextId, headers, file } = readCatalogFor(wing);
    const target = path.relative(ROOT, file);

    // Duplicate guard: runs before the cover download so an aborted re-run
    // leaves no orphan cover file behind. `records` is the whole catalogue,
    // so a match in another wing is caught too.
    const existing = findExistingMatches(records, bookData);
    if (existing.length > 0) {
      console.log('⚠️  Possible duplicate — already in the catalogue:');
      existing.forEach((r) => {
        console.log(`   id ${r.id} [${r.collection}]: ${r.title} — ${r.author_full_name}${r.isbn_asin ? ` (ISBN ${r.isbn_asin})` : ''}`);
      });
      const proceed = await confirmDuplicateAdd();
      if (!proceed) {
        console.log('\n❌ Cancelled - no changes made (duplicate)\n');
        process.exit(1);
      }
    }

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
    console.log(`Wing:            ${wing.name} (${wing.slug}) → ${target}`);
    console.log(`ID:              ${nextId}`);
    console.log(`Title:           ${bookData.title}`);
    console.log(`Author:          ${bookData.author_full_name}`);
    console.log(`Author sort:     last="${bookData.author_last}" first="${bookData.author_first}"`);
    console.log(`Publisher:       ${bookData.publisher || '(not found)'}`);
    console.log(`Year:            ${bookData.publication_year || '(not found)'}`);
    console.log(`ISBN:            ${bookData.isbn_asin || '(not found)'}`);
    console.log(`Pages:           ${bookData.page_count || '(not specified)'}`);
    console.log(`Binding:         ${bookData.binding || '(not specified)'}`);
    console.log(`Tags:            ${bookData.tags}`);
    console.log(`Accession Date:  ${todayLocal()}`);
    console.log(`Location:        ${ACCESSION_LOCATION}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Perform the add and structure validation.
    const doAdd = async () => {
      await addBookToCSV(bookData, nextId, headers, file);

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

      console.log('🔨 Next Steps:');
      console.log(`  1. Review book details in ${target}`);
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
      rl.question(`Add this book to ${target}? (y/n): `, async (answer) => {
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
