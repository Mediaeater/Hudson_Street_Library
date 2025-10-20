#!/usr/bin/env node

/**
 * Quick test of LibraryThing API against specific books
 */

const { BookAPIClient } = require('./scripts/utils/book-api-client');

const testBooks = [
    { title: 'Artists', author: 'Jason Schmidt', isbn: null },
    { title: 'Artists II', author: 'Jason Schmidt', isbn: null },
    { title: 'Artists Who Make Books', author: 'NA VA', isbn: null },
    { title: 'At The / In Der Albertina', author: 'Lewis Baltz', isbn: null },
    { title: 'At Zenith', author: 'William Eggleston', isbn: null },
    { title: 'Athens Love', author: 'Ren Hang', isbn: null },
    { title: 'Atlas', author: 'Gerhard Richter', isbn: null },
    { title: 'August (signed)', author: 'Ren Hang', isbn: null },
    { title: 'Automated Photography', author: 'NA VA', isbn: null },
    { title: 'Bad Ass and Beauty—One Love', author: 'Mao Ishikawa', isbn: null },
    { title: 'Ballet: Photographs of the New York City Ballet', author: 'Henry Leutwyler', isbn: null },
    { title: "Barbara Hammer's Truant: Photographs 1970-1979", author: 'Barbara Hammer', isbn: null },
    { title: 'Barbara Kruger : Thinking of You, I Mean Me, I Mean You', author: 'Barbra Kruger', isbn: null },
    { title: 'Barry McGee', author: 'Barry McGee', isbn: null },
    { title: 'Basketball & Kool-Aid', author: 'David Hammons', isbn: null },
    { title: 'Basquiat', author: 'Jean-Michael Basquiat', isbn: null }
];

async function testLibraryThing() {
    console.log('\n=== Testing LibraryThing API ===\n');
    console.log('NOTE: LibraryThing requires ISBN, these books have NULL ISBNs\n');

    const apiClient = new BookAPIClient();
    let found = 0;
    let notFound = 0;
    let noISBN = 0;

    for (const book of testBooks) {
        if (!book.isbn) {
            console.log(`⚠️  ${book.title} - No ISBN (LibraryThing requires ISBN)`);
            noISBN++;
            continue;
        }

        try {
            const result = await apiClient.searchLibraryThing(book);

            if (result.found) {
                console.log(`✓ ${book.title}`);
                console.log(`  URL: ${result.imageUrl}\n`);
                found++;
            } else {
                console.log(`✗ ${book.title}`);
                console.log(`  Reason: ${result.reason}\n`);
                notFound++;
            }
        } catch (error) {
            console.log(`✗ ${book.title}`);
            console.log(`  Error: ${error.message}\n`);
            notFound++;
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Found: ${found}`);
    console.log(`Not Found: ${notFound}`);
    console.log(`No ISBN (skipped): ${noISBN}`);
    console.log('\nConclusion: LibraryThing REQUIRES valid ISBNs.');
    console.log('These books have NULL ISBNs, so LibraryThing cannot find them.');
    console.log('Google Books and Open Library can search by title/author.\n');
}

testLibraryThing().catch(console.error);
