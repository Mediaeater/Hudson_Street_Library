#!/usr/bin/env node

/**
 * Acquire covers specifically using LibraryThing API
 * Targets books that failed with other APIs
 */

// Load environment variables
require('dotenv').config();

const CSVHandler = require('./scripts/utils/csv-handler');
const { BookAPIClient } = require('./scripts/utils/book-api-client');
const path = require('path');
const fs = require('fs');

const csvPath = path.join(__dirname, 'src/_data/books.csv');
const IMAGES_DIR = path.join(__dirname, 'src/assets/images/books');
const LOG_FILE = path.join(__dirname, 'librarything-acquisition-log.json');
const PREVIOUS_LOG = path.join(__dirname, 'isbn-acquisition-log.json');

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

function print(text, color = 'reset') {
    console.log(`${colors[color]}${text}${colors.reset}`);
}

async function acquireCoversFromLibraryThing() {
    print('\n=== Acquiring Covers using LibraryThing ===\n', 'cyan');

    // Read CSV
    const result = CSVHandler.readBooksSync(csvPath);
    const allBooks = result.data;

    // Filter books with valid ISBNs that don't have covers yet
    const booksWithISBN = allBooks.filter(book => {
        const isbn = book.isbn_asin || book.ISBN || book.isbn || '';
        if (!isbn || isbn.toLowerCase() === 'null' || isbn.trim() === '') {
            return false;
        }
        const cleaned = isbn.replace(/[-\s]/g, '');
        return cleaned.match(/^\d{10}$/) || cleaned.match(/^\d{13}$/);
    });

    // Load previous log to find books that failed
    let failedBooks = [];
    if (fs.existsSync(PREVIOUS_LOG)) {
        try {
            const previousLog = JSON.parse(fs.readFileSync(PREVIOUS_LOG, 'utf8'));
            const failedISBNs = new Set(
                previousLog
                    .filter(entry => entry.status === 'not_found')
                    .map(entry => entry.book?.isbn)
                    .filter(Boolean)
            );

            failedBooks = booksWithISBN.filter(book => {
                const isbn = (book.isbn_asin || book.ISBN || book.isbn || '').replace(/[-\s]/g, '');
                return failedISBNs.has(isbn);
            });

            print(`Loaded ${previousLog.length} entries from previous log`, 'dim');
            print(`Found ${failedBooks.length} books that failed previously`, 'yellow');
        } catch (error) {
            print(`Could not load previous log: ${error.message}`, 'yellow');
            print('Will try all books with ISBNs that don\'t have covers', 'dim');
        }
    }

    // If no previous log or no failed books, target all books without covers
    let targetBooks = failedBooks.length > 0 ? failedBooks : booksWithISBN;

    // Further filter to only books without existing covers
    targetBooks = targetBooks.filter(book => {
        const isbn = (book.isbn_asin || book.ISBN || book.isbn || '').replace(/[-\s]/g, '');
        const expectedFilename = `${book.author_last}_${book.title}_${isbn}.jpg`
            .replace(/[^a-zA-Z0-9_.-]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 100);
        const filepath = path.join(IMAGES_DIR, expectedFilename);
        return !fs.existsSync(filepath);
    });

    print(`Total books with ISBN: ${booksWithISBN.length}`, 'dim');
    print(`Books to try with LibraryThing: ${targetBooks.length}`, 'cyan');
    print('', 'reset');

    if (targetBooks.length === 0) {
        print('No books need LibraryThing covers!', 'green');
        return;
    }

    const apiClient = new BookAPIClient();
    const stats = {
        total: targetBooks.length,
        success: 0,
        failed: 0,
        alreadyExists: 0
    };

    const acquisitionLog = [];

    // Ensure images directory exists
    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    print('Starting acquisition with LibraryThing API...', 'cyan');
    print(`API Key: ${process.env.LIBRARY_THING_API_KEY ? 'Loaded' : 'Not found (using devkey)'}`, 'dim');
    print('', 'reset');

    for (let i = 0; i < targetBooks.length; i++) {
        const book = targetBooks[i];
        const num = i + 1;

        print(`[${num}/${targetBooks.length}] ${book.title || 'Untitled'} - ${book.author_first || ''} ${book.author_last || ''}`, 'cyan');

        const searchBook = {
            title: book.title,
            author: `${book.author_first || ''} ${book.author_last || ''}`.trim(),
            isbn: book.isbn_asin || book.ISBN || book.isbn
        };

        try {
            // Try to find cover using ONLY LibraryThing
            const result = await apiClient.findBookCover(searchBook, {
                skipExisting: true,
                strict: false,
                apis: ['libraryThing'],  // Only use LibraryThing
                outputDir: IMAGES_DIR
            });

            if (result.skipped && result.localPath) {
                print(`  ✓ Already exists: ${path.basename(result.localPath)}`, 'dim');
                stats.alreadyExists++;
                continue;
            }

            if (!result.found || !result.imageUrl) {
                print(`  ✗ No cover found: ${result.reason || 'Unknown'}`, 'red');
                stats.failed++;
                acquisitionLog.push({
                    book: searchBook,
                    status: 'not_found',
                    reason: result.reason
                });
                continue;
            }

            // Download cover
            print(`  ✓ Found on LibraryThing`, 'green');
            const filepath = await apiClient.downloadImage(result.imageUrl, book, {
                outputDir: IMAGES_DIR,
                overwrite: false
            });

            stats.success++;

            print(`  ✓ Saved: ${path.basename(filepath)}`, 'green');

            acquisitionLog.push({
                book: searchBook,
                status: 'success',
                source: 'libraryThing',
                filepath: filepath
            });

            // Rate limiting - wait 1 second between books
            if (i < targetBooks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            print(`  ✗ Error: ${error.message}`, 'red');
            stats.failed++;
            acquisitionLog.push({
                book: searchBook,
                status: 'error',
                error: error.message
            });
        }

        print('', 'reset');
    }

    // Save log
    fs.writeFileSync(LOG_FILE, JSON.stringify(acquisitionLog, null, 2));

    // Print summary
    print('\n=== Summary ===\n', 'cyan');
    print(`Total processed: ${stats.total}`, 'white');
    print(`Already had covers: ${stats.alreadyExists}`, 'dim');
    print(`Successfully acquired: ${stats.success}`, 'green');
    print(`Failed to find: ${stats.failed}`, 'red');
    print('', 'reset');
    print(`Success rate: ${((stats.success / stats.total) * 100).toFixed(1)}%`, 'cyan');
    print(`Log saved to: ${LOG_FILE}`, 'dim');
    print('', 'reset');
}

acquireCoversFromLibraryThing().catch(console.error);
