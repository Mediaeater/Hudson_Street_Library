#!/usr/bin/env node

/**
 * Find and replace small cover images
 * Scans the images directory for covers below the minimum size threshold
 * and attempts to re-acquire them from the APIs
 */

const CSVHandler = require('../utils/csv-handler');
const { BookAPIClient } = require('../utils/book-api-client');
const { IMAGE_CONFIG } = require('../utils/image-core');
const path = require('path');
const fs = require('fs');

const csvPath = path.join(__dirname, 'src/_data/books.csv');
const IMAGES_DIR = path.join(__dirname, 'src/assets/images/books');
const LOG_FILE = path.join(__dirname, 'replace-small-covers-log.json');

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

async function replaceSmallCovers() {
    print('\n=== Finding and Replacing Small Covers ===\n', 'cyan');

    // Read CSV
    const result = CSVHandler.readBooksSync(csvPath);
    const allBooks = result.data;

    // Scan images directory for small files
    const smallCovers = [];

    if (!fs.existsSync(IMAGES_DIR)) {
        print('Images directory does not exist!', 'red');
        return;
    }

    const imageFiles = fs.readdirSync(IMAGES_DIR)
        .filter(file => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(file).toLowerCase()));

    print(`Scanning ${imageFiles.length} images...`, 'dim');

    for (const file of imageFiles) {
        const filepath = path.join(IMAGES_DIR, file);
        const stats = fs.statSync(filepath);

        if (stats.size < IMAGE_CONFIG.validation.minSize) {
            smallCovers.push({
                filename: file,
                filepath: filepath,
                size: stats.size
            });
        }
    }

    print(`Found ${smallCovers.length} covers below ${IMAGE_CONFIG.validation.minSize} bytes\n`, 'yellow');

    if (smallCovers.length === 0) {
        print('No small covers found. All images are above the minimum size threshold.', 'green');
        return;
    }

    // Match small covers to books
    const apiClient = new BookAPIClient();
    const stats = {
        total: smallCovers.length,
        success: 0,
        failed: 0,
        replaced: 0
    };

    const replacementLog = [];

    print('Starting replacement...', 'cyan');
    print('Trying APIs in order: Google Books → Open Library → WorldCat → LibraryThing\n', 'dim');

    for (let i = 0; i < smallCovers.length; i++) {
        const smallCover = smallCovers[i];
        const num = i + 1;

        print(`[${num}/${smallCovers.length}] ${smallCover.filename} (${smallCover.size} bytes)`, 'yellow');

        // Try to match filename to book
        // Filename format is: AuthorLast_Title_ISBN.jpg
        const book = findBookByFilename(allBooks, smallCover.filename);

        if (!book) {
            print(`  ✗ Could not match file to book in CSV`, 'red');
            stats.failed++;
            replacementLog.push({
                file: smallCover.filename,
                status: 'no_match',
                reason: 'Could not find matching book in CSV'
            });
            print('', 'reset');
            continue;
        }

        print(`  📖 Matched to: ${book.title} by ${book.author_first} ${book.author_last}`, 'dim');

        const searchBook = {
            title: book.title,
            author: `${book.author_first || ''} ${book.author_last || ''}`.trim(),
            isbn: book.isbn_asin || book.ISBN || book.isbn
        };

        try {
            // Delete old small cover
            fs.unlinkSync(smallCover.filepath);
            print(`  🗑️  Deleted small cover`, 'dim');

            // Try to find better cover
            const result = await apiClient.findBookCover(searchBook, {
                skipExisting: false,
                strict: false,
                apis: ['googleBooks', 'openLibrary', 'worldCat', 'libraryThing'],
                outputDir: IMAGES_DIR
            });

            if (!result.found || !result.imageUrl) {
                print(`  ✗ No replacement found: ${result.reason || 'Unknown'}`, 'red');
                stats.failed++;
                replacementLog.push({
                    file: smallCover.filename,
                    book: searchBook,
                    status: 'not_found',
                    reason: result.reason,
                    oldSize: smallCover.size
                });
                print('', 'reset');
                continue;
            }

            // Download new cover
            print(`  ✓ Found replacement on ${result.source}`, 'green');
            const filepath = await apiClient.downloadImage(result.imageUrl, book, {
                outputDir: IMAGES_DIR,
                overwrite: true
            });

            const newStats = fs.statSync(filepath);
            const improvement = newStats.size - smallCover.size;

            stats.success++;
            stats.replaced++;

            print(`  ✓ Replaced: ${path.basename(filepath)} (${newStats.size} bytes, +${improvement} bytes)`, 'green');

            replacementLog.push({
                file: smallCover.filename,
                book: searchBook,
                status: 'success',
                source: result.source,
                oldSize: smallCover.size,
                newSize: newStats.size,
                improvement: improvement
            });

            // Rate limiting - wait 1 second between books
            if (i < smallCovers.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            print(`  ✗ Error: ${error.message}`, 'red');
            stats.failed++;
            replacementLog.push({
                file: smallCover.filename,
                book: searchBook,
                status: 'error',
                error: error.message,
                oldSize: smallCover.size
            });
        }

        print('', 'reset');
    }

    // Save log
    fs.writeFileSync(LOG_FILE, JSON.stringify(replacementLog, null, 2));

    // Print summary
    print('\n=== Summary ===\n', 'cyan');
    print(`Total small covers found: ${stats.total}`, 'white');
    print(`Successfully replaced: ${stats.replaced}`, 'green');
    print(`Failed to replace: ${stats.failed}`, 'red');
    print('', 'reset');
    print(`Success rate: ${((stats.replaced / stats.total) * 100).toFixed(1)}%`, 'cyan');
    print(`Log saved to: ${LOG_FILE}`, 'dim');
    print('', 'reset');
}

/**
 * Try to find a book in the CSV by matching the filename
 * @param {Array} books - Array of books from CSV
 * @param {string} filename - Image filename to match
 * @returns {Object|null} - Matching book or null
 */
function findBookByFilename(books, filename) {
    // Remove extension
    const nameWithoutExt = filename.replace(/\.[^.]+$/, '');

    // Try to extract ISBN from filename (last part before extension)
    const parts = nameWithoutExt.split('_');
    const possibleISBN = parts[parts.length - 1];

    // First try exact ISBN match
    for (const book of books) {
        const isbn = (book.isbn_asin || book.ISBN || book.isbn || '').replace(/[-\s]/g, '');
        if (isbn && isbn === possibleISBN) {
            return book;
        }
    }

    // If no ISBN match, try fuzzy matching on author/title
    const authorPart = parts[0] || '';
    const titleParts = parts.slice(1, -1).join(' ');

    for (const book of books) {
        const bookAuthorLast = (book.author_last || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const filenameAuthor = authorPart.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (bookAuthorLast === filenameAuthor) {
            const bookTitle = (book.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
            const filenameTitle = titleParts.toLowerCase().replace(/[^a-z0-9]/g, '');

            if (bookTitle.includes(filenameTitle) || filenameTitle.includes(bookTitle)) {
                return book;
            }
        }
    }

    return null;
}

replaceSmallCovers().catch(console.error);
