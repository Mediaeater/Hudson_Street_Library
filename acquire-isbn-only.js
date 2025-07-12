#!/usr/bin/env node

// Focus on books with ISBNs for better success rate
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const BOOKS_CSV = './src/_data/books.csv';
const COVERS_DIR = './src/assets/images/books';

async function findBooksWithISBN() {
    const allBooks = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream(BOOKS_CSV)
            .pipe(csv())
            .on('data', (row) => {
                const isbn = row.isbn_asin || '';
                if (isbn && isbn !== 'No ISBN' && isbn.match(/^\d/)) { // Valid ISBN
                    allBooks.push({
                        title: row.title || 'Unknown Title',
                        author: row.author_full_name || 'Unknown Author',
                        isbn: isbn,
                        publisher: row.publisher || ''
                    });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });
    
    // Filter books needing covers
    const needingCovers = allBooks.filter(book => {
        const filename = `${book.author.replace(/[^a-zA-Z0-9.-]/g, '_')}_${book.title.replace(/[^a-zA-Z0-9.-]/g, '_')}_${book.isbn.replace(/[^a-zA-Z0-9.-]/g, '_')}.jpg`.substring(0, 200);
        const coverPath = path.join(COVERS_DIR, filename);
        return !fs.existsSync(coverPath);
    });
    
    console.log(`\n📚 Books with valid ISBNs needing covers: ${needingCovers.length}`);
    console.log('\nNext 20 to process:');
    console.log('─'.repeat(60));
    
    needingCovers.slice(0, 20).forEach((book, i) => {
        console.log(`${i + 1}. "${book.title}" by ${book.author}`);
        console.log(`   ISBN: ${book.isbn}`);
    });
    
    console.log('\n💡 To acquire these with better success rate:');
    console.log('   node acquire-covers-strict.js --start <index> --limit 20');
}

findBooksWithISBN().catch(console.error);