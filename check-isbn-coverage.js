#!/usr/bin/env node

const CSVHandler = require('./scripts/utils/csv-handler');
const path = require('path');

const csvPath = path.join(__dirname, 'src/_data/books.csv');
const result = CSVHandler.readBooksSync(csvPath);
const books = result.data;

let withISBN = 0;
let withoutISBN = 0;
let validISBN = 0;
let invalidISBN = 0;

books.forEach(book => {
  const isbn = book.isbn_asin || book.ISBN || book.isbn || '';

  if (!isbn || isbn.toLowerCase() === 'null' || isbn.trim() === '') {
    withoutISBN++;
  } else {
    withISBN++;
    // Check if it's a valid ISBN (10 or 13 digits)
    const cleaned = isbn.replace(/[-\s]/g, '');
    if (cleaned.match(/^\d{10}$/) || cleaned.match(/^\d{13}$/)) {
      validISBN++;
    } else {
      invalidISBN++;
    }
  }
});

console.log('');
console.log('=== ISBN Statistics ===');
console.log('');
console.log('Total books:', books.length);
console.log('');
console.log('Books WITH ISBN:', withISBN, '(' + ((withISBN/books.length)*100).toFixed(1) + '%)');
console.log('  - Valid ISBN format:', validISBN, '(' + ((validISBN/books.length)*100).toFixed(1) + '%)');
console.log('  - Invalid ISBN format:', invalidISBN, '(' + ((invalidISBN/books.length)*100).toFixed(1) + '%)');
console.log('');
console.log('Books WITHOUT ISBN:', withoutISBN, '(' + ((withoutISBN/books.length)*100).toFixed(1) + '%)');
console.log('');
console.log('API Coverage Implications:');
console.log('  - LibraryThing/WorldCat can search:', validISBN, 'books (ISBN required)');
console.log('  - Google Books/Open Library can search:', books.length, 'books (title/author OK)');
console.log('');
