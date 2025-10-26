#!/usr/bin/env node

/**
 * Acquire book covers using Open Library direct cover API
 * Uses: https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg
 * Rate limit: 100 requests per 5 minutes per IP
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// Parse CSV manually
function parseCSV(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    const books = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',');
        const book = {};
        headers.forEach((header, index) => {
            book[header.trim()] = values[index]?.trim() || '';
        });

        books.push(book);
    }

    return books;
}

// Download image from URL
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);

        https.get(url, (response) => {
            if (response.statusCode === 404) {
                fs.unlinkSync(filepath);
                reject(new Error('Cover not found (404)'));
                return;
            }

            if (response.statusCode !== 200) {
                fs.unlinkSync(filepath);
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                const stats = fs.statSync(filepath);

                // Check if image is too small (likely placeholder)
                if (stats.size < 3000) {
                    fs.unlinkSync(filepath);
                    reject(new Error(`Image too small (${stats.size} bytes)`));
                    return;
                }

                resolve({ filepath, size: stats.size });
            });
        }).on('error', (err) => {
            fs.unlinkSync(filepath);
            reject(err);
        });
    });
}

// Generate safe filename
function generateFilename(book) {
    const author = book.author_last || 'Unknown';
    const title = (book.title || 'Untitled').substring(0, 50);
    const isbn = book.isbn_asin || book.ISBN || 'noISBN';

    return `${author}_${title}_${isbn}.jpg`
        .replace(/[^a-zA-Z0-9_.-]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 150);
}

// Main function
async function main() {
    const limit = parseInt(process.argv[2]) || 50;

    console.log(`\n📚 Open Library Direct Cover Acquisition\n`);
    console.log(`Rate Limit: 100 requests per 5 minutes`);
    console.log(`Processing up to ${limit} books\n`);

    const CSV_PATH = path.join(__dirname, 'src/_data/books.csv');
    const IMAGES_DIR = path.join(__dirname, 'src/assets/images/books');

    // Read books
    const allBooks = parseCSV(CSV_PATH);

    // Filter books with ISBN but no cover
    const booksToProcess = allBooks.filter(book => {
        const isbn = book.isbn_asin || book.ISBN || '';
        if (!isbn || isbn === 'NULL' || isbn.trim() === '') return false;

        const cleanISBN = isbn.replace(/[-\s]/g, '');
        if (!cleanISBN.match(/^\d{10,13}$/)) return false;

        const filename = generateFilename(book);
        const filepath = path.join(IMAGES_DIR, filename);

        return !fs.existsSync(filepath);
    }).slice(0, limit);

    console.log(`Found ${booksToProcess.length} books to process\n`);

    const stats = {
        success: 0,
        failed: 0,
        total: booksToProcess.length
    };

    const results = [];

    for (let i = 0; i < booksToProcess.length; i++) {
        const book = booksToProcess[i];
        const isbn = (book.isbn_asin || book.ISBN).replace(/[-\s]/g, '');
        const num = i + 1;

        console.log(`[${num}/${stats.total}] ${book.title} by ${book.author_first} ${book.author_last}`);
        console.log(`  ISBN: ${isbn}`);

        // Try all three sizes, starting with Large
        const sizes = ['L', 'M', 'S'];
        let success = false;

        for (const size of sizes) {
            const url = `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg?default=false`;
            const filename = generateFilename(book);
            const filepath = path.join(IMAGES_DIR, filename);

            try {
                const result = await downloadImage(url, filepath);
                console.log(`  ✓ Downloaded (${size}): ${filename} (${result.size} bytes)`);
                stats.success++;
                success = true;
                results.push({
                    book: book.title,
                    author: `${book.author_first} ${book.author_last}`,
                    isbn,
                    status: 'success',
                    size: size,
                    bytes: result.size
                });
                break;
            } catch (error) {
                if (size === 'S') {
                    console.log(`  ✗ Not found in any size: ${error.message}`);
                }
            }
        }

        if (!success) {
            stats.failed++;
            results.push({
                book: book.title,
                author: `${book.author_first} ${book.author_last}`,
                isbn,
                status: 'failed',
                reason: 'No cover available'
            });
        }

        // Rate limiting: wait 3 seconds between books (20 per minute = well under 100 per 5 min)
        if (i < booksToProcess.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        console.log('');
    }

    // Summary
    console.log(`\n=== Summary ===\n`);
    console.log(`Total processed: ${stats.total}`);
    console.log(`Successfully acquired: ${stats.success}`);
    console.log(`Failed: ${stats.failed}`);
    console.log(`Success rate: ${((stats.success / stats.total) * 100).toFixed(1)}%\n`);

    // Save results
    const logPath = path.join(__dirname, 'openlibrary-acquisition-log.json');
    fs.writeFileSync(logPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to: ${logPath}\n`);
}

main().catch(console.error);
