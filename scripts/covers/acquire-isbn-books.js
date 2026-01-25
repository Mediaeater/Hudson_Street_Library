#!/usr/bin/env node

/**
 * Acquire covers for all books that have valid ISBNs
 * This gives us the best chance of success since all 4 APIs can search by ISBN
 */

// Load environment variables
require('dotenv').config();

const CSVHandler = require('./scripts/utils/csv-handler');
const { BookAPIClient } = require('./scripts/utils/book-api-client');
const path = require('path');
const fs = require('fs');

const csvPath = path.join(__dirname, 'src/_data/books.csv');
const IMAGES_DIR = path.join(__dirname, 'src/assets/images/books');
const LOG_FILE = path.join(__dirname, 'isbn-acquisition-log.json');

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

async function acquireCoversForISBNBooks() {
    print('\n=== Acquiring Covers for ISBN Books ===\n', 'cyan');

    // Read CSV
    const result = CSVHandler.readBooksSync(csvPath);
    const allBooks = result.data;

    // Filter books with valid ISBNs
    const booksWithISBN = allBooks.filter(book => {
        const isbn = book.isbn_asin || book.ISBN || book.isbn || '';
        if (!isbn || isbn.toLowerCase() === 'null' || isbn.trim() === '') {
            return false;
        }
        const cleaned = isbn.replace(/[-\s]/g, '');
        return cleaned.match(/^\d{10}$/) || cleaned.match(/^\d{13}$/);
    });

    print(`Total books: ${allBooks.length}`, 'dim');
    print(`Books with valid ISBN: ${booksWithISBN.length}`, 'cyan');
    print('', 'reset');

    const apiClient = new BookAPIClient();
    const stats = {
        total: booksWithISBN.length,
        success: 0,
        failed: 0,
        alreadyExists: 0,
        byAPI: {
            googleBooks: 0,
            openLibrary: 0,
            worldCat: 0,
            libraryThing: 0
        }
    };

    const acquisitionLog = [];

    // Ensure images directory exists
    if (!fs.existsSync(IMAGES_DIR)) {
        fs.mkdirSync(IMAGES_DIR, { recursive: true });
    }

    print('Starting acquisition...', 'cyan');
    print('Trying APIs in order: Google Books → Open Library → WorldCat → LibraryThing\n', 'dim');

    for (let i = 0; i < booksWithISBN.length; i++) {
        const book = booksWithISBN[i];
        const num = i + 1;

        print(`[${num}/${booksWithISBN.length}] ${book.title || 'Untitled'} - ${book.author_first || ''} ${book.author_last || ''}`, 'cyan');

        const searchBook = {
            title: book.title,
            author: `${book.author_first || ''} ${book.author_last || ''}`.trim(),
            isbn: book.isbn_asin || book.ISBN || book.isbn
        };

        try {
            // Try to find cover
            const result = await apiClient.findBookCover(searchBook, {
                skipExisting: true,
                strict: false,
                apis: ['googleBooks', 'openLibrary', 'worldCat', 'libraryThing'],
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
            print(`  ✓ Found on ${result.source}`, 'green');
            const filepath = await apiClient.downloadImage(result.imageUrl, book, {
                outputDir: IMAGES_DIR,
                overwrite: false
            });

            stats.success++;
            stats.byAPI[result.source] = (stats.byAPI[result.source] || 0) + 1;

            print(`  ✓ Saved: ${path.basename(filepath)}`, 'green');

            acquisitionLog.push({
                book: searchBook,
                status: 'success',
                source: result.source,
                filepath: filepath
            });

            // Rate limiting - wait 1 second between books
            if (i < booksWithISBN.length - 1) {
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
    print('By API:', 'cyan');
    print(`  Google Books: ${stats.byAPI.googleBooks || 0}`, 'white');
    print(`  Open Library: ${stats.byAPI.openLibrary || 0}`, 'white');
    print(`  WorldCat: ${stats.byAPI.worldCat || 0}`, 'white');
    print(`  LibraryThing: ${stats.byAPI.libraryThing || 0}`, 'white');
    print('', 'reset');
    print(`Success rate: ${((stats.success / stats.total) * 100).toFixed(1)}%`, 'cyan');
    print(`Log saved to: ${LOG_FILE}`, 'dim');
    print('', 'reset');
}

acquireCoversForISBNBooks().catch(console.error);
