const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

// Read and parse CSV
const csvPath = path.join(__dirname, 'src/_data/books.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const books = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
});

// Filter for One Picture Book Two entries
const opbBooks = books.filter(book =>
    book.title && book.title.includes('One Picture Book Two')
);

console.log(`\n=== One Picture Book Two Cover Image Validation ===\n`);
console.log(`Total OPB entries found: ${opbBooks.length}\n`);

// Function to generate expected filename (matches aggregate-view.html logic)
function generateCoverFileName(book) {
    const author = (book.author_last || 'Unknown').replace(/[^a-zA-Z0-9.-]/g, '_');
    const title = (book.title || 'Untitled').replace(/[^a-zA-Z0-9.-]/g, '_');
    const isbn = (book.isbn_asin || '').replace(/[^a-zA-Z0-9.-]/g, '_');

    let coverFileName;
    if (isbn && isbn !== 'NULL' && isbn !== '') {
        coverFileName = `${author}_${title}_${isbn}`.replace(/_+/g, '_').replace(/^_|_$/g, '').substring(0, 150) + '.jpg';
    } else {
        coverFileName = `${author}_${title}_NULL`.replace(/_+/g, '_').replace(/^_|_$/g, '').substring(0, 150) + '.jpg';
    }

    return coverFileName;
}

// Validate each book
const results = {
    matches: [],
    mismatches: [],
    missingAuthor: [],
    emptyIsbn: []
};

const imagesDir = path.join(__dirname, 'src/assets/images/books');

opbBooks.forEach(book => {
    const expectedFileName = generateCoverFileName(book);
    const expectedPath = path.join(imagesDir, expectedFileName);
    const exists = fs.existsSync(expectedPath);

    const result = {
        title: book.title,
        author_last: book.author_last,
        isbn_asin: book.isbn_asin,
        expectedFileName,
        exists
    };

    if (exists) {
        results.matches.push(result);
    } else {
        results.mismatches.push(result);
    }

    // Check for missing author_last
    if (!book.author_last || book.author_last.trim() === '') {
        results.missingAuthor.push(result);
    }

    // Check for empty ISBN
    if (!book.isbn_asin || book.isbn_asin === 'NULL' || book.isbn_asin.trim() === '') {
        results.emptyIsbn.push(result);
    }
});

// Report results
console.log(`✓ Matches: ${results.matches.length}/${opbBooks.length}`);
console.log(`✗ Mismatches: ${results.mismatches.length}/${opbBooks.length}\n`);

if (results.missingAuthor.length > 0) {
    console.log(`⚠ Books with missing author_last: ${results.missingAuthor.length}\n`);
}

if (results.emptyIsbn.length > 0) {
    console.log(`⚠ Books with empty/NULL ISBN: ${results.emptyIsbn.length}\n`);
}

// Show mismatches
if (results.mismatches.length > 0) {
    console.log(`=== MISMATCHES ===\n`);
    results.mismatches.forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.title}`);
        console.log(`   Author: ${item.author_last || '(empty)'}`);
        console.log(`   ISBN: ${item.isbn_asin || '(empty)'}`);
        console.log(`   Expected file: ${item.expectedFileName}`);

        // Try to find similar files
        const files = fs.readdirSync(imagesDir);
        const similarFiles = files.filter(f => {
            const namePart = item.expectedFileName.replace('.jpg', '');
            return f.includes(namePart.substring(0, 30)) ||
                   (item.author_last && f.startsWith(item.author_last.replace(/[^a-zA-Z0-9.-]/g, '_')));
        });

        if (similarFiles.length > 0) {
            console.log(`   Similar files found:`);
            similarFiles.forEach(f => console.log(`     - ${f}`));
        }
        console.log('');
    });
}

// Show sample matches for verification
if (results.matches.length > 0) {
    console.log(`=== SAMPLE MATCHES (first 5) ===\n`);
    results.matches.slice(0, 5).forEach((item, idx) => {
        console.log(`${idx + 1}. ${item.title}`);
        console.log(`   File: ${item.expectedFileName}`);
        console.log('');
    });
}

// Summary
console.log(`=== SUMMARY ===\n`);
console.log(`Total entries: ${opbBooks.length}`);
console.log(`Matching covers: ${results.matches.length}`);
console.log(`Missing covers: ${results.mismatches.length}`);
console.log(`Missing author_last field: ${results.missingAuthor.length}`);
console.log(`Empty/NULL ISBN: ${results.emptyIsbn.length}`);
console.log('');

process.exit(results.mismatches.length > 0 ? 1 : 0);
