#!/usr/bin/env node
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const CSV_PATH = 'src/_data/books.csv';

// Read CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

// Separate OPB books from others
const opbBooks = [];
const otherBooks = [];

records.forEach((record) => {
    if (record.title && record.title.includes('One Picture Book Two Vol')) {
        opbBooks.push(record);
    } else {
        otherBooks.push(record);
    }
});

console.log(`Found ${opbBooks.length} One Picture Book volumes`);

// Sort OPB books by volume number (descending)
opbBooks.sort((a, b) => {
    const volRegex = /Vol (\d+)/i;
    const matchA = a.title.match(volRegex);
    const matchB = b.title.match(volRegex);

    if (!matchA || !matchB) return 0;

    const volA = parseInt(matchA[1], 10);
    const volB = parseInt(matchB[1], 10);

    // Descending order (52 → 1)
    return volB - volA;
});

console.log('Sorted order:');
opbBooks.forEach(book => {
    const match = book.title.match(/Vol (\d+)/i);
    if (match) {
        console.log(`  Vol ${match[1]}: ${book.title.substring(0, 60)}...`);
    }
});

// Combine: OPB books first (sorted), then all other books
const sortedRecords = [...opbBooks, ...otherBooks];

// Write back
const headers = Object.keys(records[0]);
const output = stringify(sortedRecords, { header: true, columns: headers });
fs.writeFileSync(CSV_PATH, output);

console.log(`\n✅ CSV updated with ${opbBooks.length} OPB volumes in descending order`);
