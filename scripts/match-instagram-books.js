#!/usr/bin/env node

/**
 * Match Instagram Books with Collection
 * This script helps identify which books from Instagram are in the collection
 * and which ones might need to be added
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parse/sync');

// Load the main books collection
const booksCSVPath = path.join(__dirname, '../src/_data/books.csv');
const instagramBooksPath = path.join(__dirname, '../src/_data/instagram-books.json');

function loadBooksCollection() {
    const csvContent = fs.readFileSync(booksCSVPath, 'utf-8');
    const records = csv.parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
    return records;
}

function loadInstagramBooks() {
    const jsonContent = fs.readFileSync(instagramBooksPath, 'utf-8');
    return JSON.parse(jsonContent);
}

function normalizeString(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findBookInCollection(instagramBook, collection) {
    // Try to match by ISBN first
    if (instagramBook.isbn) {
        const isbnMatch = collection.find(book =>
            book.ISBN === instagramBook.isbn
        );
        if (isbnMatch) return { book: isbnMatch, matchType: 'ISBN' };
    }

    // Try to match by title and author
    const normalizedTitle = normalizeString(instagramBook.title);
    const normalizedAuthor = normalizeString(instagramBook.author);

    const titleAuthorMatch = collection.find(book => {
        const bookTitle = normalizeString(book.Title);
        const bookAuthor = normalizeString(book['Author/Artist']);

        return bookTitle === normalizedTitle &&
               bookAuthor === normalizedAuthor;
    });

    if (titleAuthorMatch) return { book: titleAuthorMatch, matchType: 'Title+Author' };

    // Try fuzzy title match
    const titleMatch = collection.find(book => {
        const bookTitle = normalizeString(book.Title);
        return bookTitle.includes(normalizedTitle) ||
               normalizedTitle.includes(bookTitle);
    });

    if (titleMatch) return { book: titleMatch, matchType: 'Fuzzy Title' };

    return null;
}

function generateReport() {
    console.log('📚 Instagram Books Matching Report');
    console.log('==================================\n');

    const collection = loadBooksCollection();
    const instagramData = loadInstagramBooks();
    const instagramBooks = instagramData.books.filter(b => b.title); // Skip template entry

    console.log(`Total books in collection: ${collection.length}`);
    console.log(`Books featured on Instagram: ${instagramBooks.length}\n`);

    const matched = [];
    const unmatched = [];

    instagramBooks.forEach(igBook => {
        const match = findBookInCollection(igBook, collection);

        if (match) {
            matched.push({
                instagram: igBook,
                collection: match.book,
                matchType: match.matchType
            });
        } else {
            unmatched.push(igBook);
        }
    });

    // Display matched books
    console.log(`✅ Matched Books (${matched.length}):`);
    console.log('-----------------');
    matched.forEach(m => {
        console.log(`• "${m.instagram.title}" by ${m.instagram.author}`);
        console.log(`  Match type: ${m.matchType}`);
        console.log(`  Collection ID: ${m.collection.ID}`);
        console.log(`  Has cover: ${m.collection.cover_filename ? 'Yes' : 'No'}`);
        console.log();
    });

    // Display unmatched books
    console.log(`\n❌ Books Not Found in Collection (${unmatched.length}):`);
    console.log('------------------------------------');
    unmatched.forEach(book => {
        console.log(`• "${book.title}" by ${book.author}`);
        if (book.publisher) console.log(`  Publisher: ${book.publisher}`);
        if (book.year) console.log(`  Year: ${book.year}`);
        if (book.post_date) console.log(`  Posted: ${book.post_date}`);
        console.log();
    });

    // Generate suggestions
    console.log('\n💡 Suggestions:');
    console.log('---------------');

    if (unmatched.length > 0) {
        console.log(`• ${unmatched.length} Instagram books are not in your collection database`);
        console.log('  Consider adding them to books.csv');
    }

    const noCoverCount = matched.filter(m => !m.collection.cover_filename).length;
    if (noCoverCount > 0) {
        console.log(`• ${noCoverCount} matched books don't have covers`);
        console.log('  Run cover acquisition for these books');
    }

    // Save report to file
    const report = {
        generated: new Date().toISOString(),
        summary: {
            collection_total: collection.length,
            instagram_featured: instagramBooks.length,
            matched: matched.length,
            unmatched: unmatched.length,
            matched_without_covers: noCoverCount
        },
        matched_books: matched.map(m => ({
            title: m.instagram.title,
            author: m.instagram.author,
            collection_id: m.collection.ID,
            match_type: m.matchType,
            has_cover: !!m.collection.cover_filename
        })),
        unmatched_books: unmatched
    };

    const reportPath = path.join(__dirname, '../instagram-match-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Full report saved to: ${reportPath}`);
}

// Run the report
generateReport();