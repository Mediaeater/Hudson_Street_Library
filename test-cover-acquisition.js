#!/usr/bin/env node

/**
 * Interactive Cover Acquisition Testing Tool
 *
 * This script provides an interactive workflow for testing cover acquisition
 * one book at a time, with preview and approval features.
 *
 * Usage:
 *   node test-cover-acquisition.js
 *
 * Features:
 *   - Search by ISBN, artist name, or book title
 *   - Preview covers before saving
 *   - Approve/reject/skip covers interactively
 *   - Track progress in a log file
 *   - Dry-run mode for testing
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const { promisify } = require('util');
const CSVHandler = require('./scripts/utils/csv-handler');
const { BookAPIClient } = require('./scripts/utils/book-api-client');
const { generateStandardFilename, validateImage } = require('./scripts/utils/image-core');

const execAsync = promisify(exec);

// Paths
const PROJECT_ROOT = path.resolve(__dirname);
const BOOKS_CSV = path.join(PROJECT_ROOT, 'src/_data/books.csv');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'src/assets/images/books');
const TEMP_DIR = path.join(PROJECT_ROOT, '.temp-covers');
const LOG_FILE = path.join(PROJECT_ROOT, 'cover-acquisition-log.json');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

// Session state
let sessionStats = {
    tested: 0,
    approved: 0,
    rejected: 0,
    skipped: 0,
    errors: 0
};

let sessionLog = [];
let isDryRun = false;

/**
 * Print colored text to console
 */
function print(text, color = 'reset') {
    console.log(`${colors[color]}${text}${colors.reset}`);
}

/**
 * Print header with styling
 */
function printHeader() {
    console.log('');
    print('═'.repeat(70), 'cyan');
    print('    Interactive Cover Acquisition Test Tool', 'bright');
    print('═'.repeat(70), 'cyan');
    console.log('');
}

/**
 * Create readline interface for user input
 */
function createReadlineInterface() {
    return readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
}

/**
 * Ask user a question and return their answer
 */
function askQuestion(rl, question, color = 'white') {
    return new Promise((resolve) => {
        rl.question(`${colors[color]}${question}${colors.reset}`, (answer) => {
            resolve(answer.trim());
        });
    });
}

/**
 * Load previous session log if it exists
 */
function loadSessionLog() {
    if (fs.existsSync(LOG_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
            return Array.isArray(data) ? data : [];
        } catch (error) {
            print(`Warning: Could not load previous session log: ${error.message}`, 'yellow');
            return [];
        }
    }
    return [];
}

/**
 * Save session log to file
 */
function saveSessionLog(log) {
    try {
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
    } catch (error) {
        print(`Warning: Could not save session log: ${error.message}`, 'yellow');
    }
}

/**
 * Add entry to session log
 */
function logEntry(book, status, details = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        book: {
            title: book.title,
            author: book.author_full_name,
            isbn: book.isbn_asin,
            id: book.id
        },
        status,
        ...details
    };

    sessionLog.push(entry);
    saveSessionLog(sessionLog);
}

/**
 * Search for books in CSV based on search term
 */
async function searchBooks(searchTerm) {
    const result = await CSVHandler.readBooks(BOOKS_CSV);

    if (!result.data || result.data.length === 0) {
        throw new Error('No books found in CSV file');
    }

    const searchLower = searchTerm.toLowerCase();

    // Search by ISBN, title, or author
    const matches = result.data.filter(book => {
        const isbn = (book.isbn_asin || '').toLowerCase();
        const title = (book.title || '').toLowerCase();
        const author = (book.author_full_name || '').toLowerCase();
        const authorLast = (book.author_last || '').toLowerCase();

        return isbn.includes(searchLower) ||
               title.includes(searchLower) ||
               author.includes(searchLower) ||
               authorLast.includes(searchLower);
    });

    return matches;
}

/**
 * Display book details
 */
function displayBookDetails(book, index = null) {
    const prefix = index !== null ? `${index}. ` : '';
    const title = book.title || 'Unknown Title';
    const author = book.author_full_name || 'Unknown Author';
    const isbn = book.isbn_asin || 'No ISBN';
    const coverStatus = book.image_url ? 'Has cover URL' : 'No cover';

    print(`${prefix}${title}`, 'bright');
    print(`   Author: ${author}`, 'white');
    print(`   ISBN: ${isbn}`, 'dim');
    print(`   Status: ${coverStatus}`, coverStatus === 'No cover' ? 'yellow' : 'green');
}

/**
 * Display list of matching books
 */
function displayBookList(books) {
    console.log('');
    print(`Found ${books.length} matching book(s):`, 'cyan');
    console.log('');

    books.forEach((book, index) => {
        displayBookDetails(book, index + 1);
        console.log('');
    });
}

/**
 * Get file size in human-readable format
 */
function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Get image dimensions if possible
 */
async function getImageDimensions(filepath) {
    try {
        const validation = await validateImage(filepath);
        if (validation.stats.width && validation.stats.height) {
            return `${validation.stats.width}x${validation.stats.height}`;
        }
    } catch (error) {
        // Ignore errors
    }
    return 'Unknown';
}

/**
 * Open image file in default viewer
 */
async function openImage(filepath) {
    try {
        let command;
        const platform = process.platform;

        if (platform === 'darwin') {
            command = `open "${filepath}"`;
        } else if (platform === 'win32') {
            command = `start "" "${filepath}"`;
        } else {
            command = `xdg-open "${filepath}"`;
        }

        await execAsync(command);
        return true;
    } catch (error) {
        print(`Warning: Could not open image: ${error.message}`, 'yellow');
        return false;
    }
}

/**
 * Download cover to temporary location
 */
async function downloadCoverToTemp(imageUrl, book, apiClient) {
    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const filename = generateStandardFilename(book);
    const tempPath = path.join(TEMP_DIR, filename);

    // Download image
    await apiClient.downloadImage(imageUrl, book, {
        outputDir: TEMP_DIR,
        filename: filename,
        overwrite: true,
        dryRun: isDryRun
    });

    return tempPath;
}

/**
 * Move file from temp to final location
 */
function moveCoverToFinal(tempPath, book) {
    if (isDryRun) {
        print('  [DRY RUN] Would move to final location', 'dim');
        return path.join(IMAGES_DIR, path.basename(tempPath));
    }

    // Ensure images directory exists
    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    const finalPath = path.join(IMAGES_DIR, path.basename(tempPath));

    // Move file
    fs.renameSync(tempPath, finalPath);

    return finalPath;
}

/**
 * Delete temporary file
 */
function deleteTempFile(filepath) {
    if (fs.existsSync(filepath)) {
        try {
            fs.unlinkSync(filepath);
        } catch (error) {
            print(`Warning: Could not delete temp file: ${error.message}`, 'yellow');
        }
    }
}

/**
 * Search for cover using specific API
 */
async function searchForCoverOnAPI(book, apiClient, apiName) {
    const searchBook = {
        title: book.title,
        author: book.author_full_name || `${book.author_first || ''} ${book.author_last || ''}`.trim(),
        isbn: book.isbn_asin
    };

    print(`Searching ${apiName}...`, 'cyan');

    const result = await apiClient.findBookCover(searchBook, {
        skipExisting: false,
        strict: false,
        apis: [apiName]
    });

    return result;
}

/**
 * Display cover details
 */
async function displayCoverDetails(result, tempPath) {
    console.log('');
    print('Cover Details:', 'bright');
    print(`  Source: ${result.source}`, 'cyan');
    print(`  URL: ${result.imageUrl}`, 'dim');

    if (fs.existsSync(tempPath)) {
        const stats = fs.statSync(tempPath);
        const dimensions = await getImageDimensions(tempPath);

        print(`  Size: ${formatFileSize(stats.size)}`, 'white');
        print(`  Dimensions: ${dimensions}`, 'white');
        print(`  Path: ${tempPath}`, 'dim');
    }
}

/**
 * Process a single book - try each API until approved
 */
async function processBook(book, apiClient, rl) {
    console.log('');
    print('─'.repeat(70), 'dim');
    console.log('');

    print('Selected Book:', 'bright');
    displayBookDetails(book);

    sessionStats.tested++;

    const apis = ['googleBooks', 'openLibrary', 'worldCat', 'libraryThing'];

    for (const apiName of apis) {
        try {
            print('');
            print(`Trying ${apiName}...`, 'cyan');

            // Search for cover on this specific API
            const result = await searchForCoverOnAPI(book, apiClient, apiName);

            if (!result.found || !result.imageUrl) {
                const reason = result.reason || result.error || 'No cover found';
                print(`✗ ${apiName}: ${reason}`, 'yellow');
                continue; // Try next API
            }

            print(`✓ Found cover on ${apiName}`, 'green');

            // Download to temp location
            print('Downloading...', 'cyan');
            const tempPath = await downloadCoverToTemp(result.imageUrl, book, apiClient);

            if (!isDryRun) {
                // Display cover details
                await displayCoverDetails(result, tempPath);

                // Open image for review
                console.log('');
                print('Opening image for review...', 'cyan');
                await openImage(tempPath);

                // Wait a moment for image to open
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Ask for approval
            console.log('');
            const answer = await askQuestion(
                rl,
                'Approve this cover? (y=yes, n=try next API, s=skip all, q=quit): ',
                'yellow'
            );

            const response = answer.toLowerCase();

            if (response === 'q' || response === 'quit') {
                deleteTempFile(tempPath);
                return 'quit';
            }

            if (response === 'y' || response === 'yes') {
                // Approve and move to final location
                const finalPath = moveCoverToFinal(tempPath, book);
                print(`✓ Cover saved to: ${finalPath}`, 'green');

                logEntry(book, 'approved', {
                    source: apiName,
                    url: result.imageUrl,
                    path: finalPath
                });

                sessionStats.approved++;
                return true; // Done with this book

            } else if (response === 's' || response === 'skip') {
                // Skip all remaining APIs for this book
                deleteTempFile(tempPath);
                print('Skipped book (will try remaining APIs)', 'yellow');
                logEntry(book, 'skipped', { lastTried: apiName });
                sessionStats.skipped++;
                return false;

            } else {
                // Reject - delete and try next API
                deleteTempFile(tempPath);
                print(`✗ Cover rejected. Trying next API...`, 'red');
                sessionStats.rejected++;
                // Continue to next API
            }

        } catch (error) {
            print(`✗ ${apiName} error: ${error.message}`, 'red');
            print(`  Continuing to next API...`, 'dim');
            // Continue to next API
        }
    }

    // No APIs found an approved cover
    print('');
    print('No suitable cover found from any API', 'red');
    logEntry(book, 'not_found', { triedAPIs: apis });
    sessionStats.errors++;
    return false;
}

/**
 * Display session summary
 */
function displaySessionSummary() {
    console.log('');
    print('═'.repeat(70), 'cyan');
    print('Session Summary', 'bright');
    print('═'.repeat(70), 'cyan');
    console.log('');

    print(`Books tested:     ${sessionStats.tested}`, 'white');
    print(`Approved:         ${sessionStats.approved}`, 'green');
    print(`Rejected:         ${sessionStats.rejected}`, 'red');
    print(`Skipped:          ${sessionStats.skipped}`, 'yellow');
    print(`Errors:           ${sessionStats.errors}`, 'red');

    console.log('');
    print(`Log file: ${LOG_FILE}`, 'dim');

    if (sessionStats.skipped > 0) {
        print(`Temp files: ${TEMP_DIR}`, 'dim');
    }

    console.log('');
}

/**
 * Display help information
 */
function displayHelp() {
    console.log(`
Interactive Cover Acquisition Testing Tool

This tool allows you to test cover acquisition one book at a time
with visual preview and approval workflow.

Features:
  - Search by ISBN, artist name, or book title
  - Preview covers before saving
  - Approve/reject/skip covers interactively
  - Track progress in a log file
  - Resume previous sessions

Workflow:
  1. Enter search term (ISBN, artist, or title)
  2. Select a book from search results
  3. Tool searches APIs for cover
  4. Cover opens in default image viewer
  5. Approve (y), Reject (n), Skip (s), or Quit (q)
  6. Test another book or exit

Commands during approval:
  y / yes  - Approve and save cover to final location
  n / no   - Reject and delete cover
  s / skip - Keep temp file but don't save
  q / quit - Exit the tool

Files:
  Log:        ${LOG_FILE}
  Temp:       ${TEMP_DIR}
  Final:      ${IMAGES_DIR}
  Source CSV: ${BOOKS_CSV}
`);
}

/**
 * Main interactive loop
 */
async function main() {
    const args = process.argv.slice(2);

    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
        displayHelp();
        return;
    }

    // Check for dry-run flag
    if (args.includes('--dry-run')) {
        isDryRun = true;
        print('Running in DRY RUN mode - no files will be saved', 'yellow');
    }

    printHeader();

    // Load previous session log
    sessionLog = loadSessionLog();
    if (sessionLog.length > 0) {
        print(`Loaded ${sessionLog.length} entries from previous sessions`, 'cyan');
    }

    // Initialize API client
    const apiClient = new BookAPIClient();

    const rl = createReadlineInterface();

    try {
        let continueSession = true;

        while (continueSession) {
            console.log('');

            // Get search term
            const searchTerm = await askQuestion(
                rl,
                'Enter search term (ISBN, artist, or title) or "q" to quit: ',
                'bright'
            );

            if (searchTerm.toLowerCase() === 'q' || searchTerm.toLowerCase() === 'quit') {
                break;
            }

            if (!searchTerm) {
                print('Please enter a search term', 'yellow');
                continue;
            }

            // Search for books
            print('Searching...', 'dim');
            const books = await searchBooks(searchTerm);

            if (books.length === 0) {
                print(`No books found matching "${searchTerm}"`, 'yellow');
                continue;
            }

            // Display search results
            displayBookList(books);

            // Ask user to select a book
            const selection = await askQuestion(
                rl,
                `Select book number (1-${books.length}) or "c" to cancel: `,
                'yellow'
            );

            if (selection.toLowerCase() === 'c' || selection.toLowerCase() === 'cancel') {
                continue;
            }

            const bookIndex = parseInt(selection) - 1;

            if (isNaN(bookIndex) || bookIndex < 0 || bookIndex >= books.length) {
                print('Invalid selection', 'red');
                continue;
            }

            const selectedBook = books[bookIndex];

            // Process the book
            const result = await processBook(selectedBook, apiClient, rl);

            if (result === 'quit') {
                break;
            }

            // Ask if user wants to test another book
            console.log('');
            const continueAnswer = await askQuestion(
                rl,
                'Test another book? (y/n): ',
                'yellow'
            );

            if (continueAnswer.toLowerCase() !== 'y' && continueAnswer.toLowerCase() !== 'yes') {
                continueSession = false;
            }
        }

    } catch (error) {
        console.error('');
        print(`Fatal error: ${error.message}`, 'red');
        console.error(error.stack);

    } finally {
        rl.close();

        // Display session summary
        displaySessionSummary();

        // Display API client stats
        const stats = apiClient.getStats();
        console.log('');
        print('API Statistics:', 'dim');
        print(`  Total requests: ${stats.requests}`, 'dim');
        print(`  Cache hits: ${stats.cacheHits}`, 'dim');
        print(`  Downloads: ${stats.downloads}`, 'dim');
        console.log('');
    }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
    console.log('\n');
    print('Session interrupted by user', 'yellow');
    displaySessionSummary();
    process.exit(0);
});

// Run main function
if (require.main === module) {
    main().catch(error => {
        console.error('\nFatal error:', error.message);
        process.exit(1);
    });
}

module.exports = {
    searchBooks,
    processBook,
    displayBookDetails,
    loadSessionLog,
    saveSessionLog
};
