#!/usr/bin/env node
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const CSV_PATH = 'src/_data/books.csv';

// Read CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

// Find the 4 books to reorder (IDs 1743-1746)
const indices = [];
records.forEach((record, i) => {
    if (['1743', '1744', '1745', '1746'].includes(record.id)) {
        indices.push(i);
    }
});

if (indices.length !== 4) {
    console.error('Error: Could not find all 4 books');
    process.exit(1);
}

// Extract the 4 books
const books = indices.map(i => records[i]);

console.log('Before:');
books.forEach(b => console.log(`  ${b.id}: ${b.title}`));

// Reverse the order (so #49, #50, #51, #52)
books.reverse();

// Put them back in the correct positions
indices.forEach((idx, i) => {
    records[idx] = books[i];
});

console.log('\nAfter:');
books.forEach(b => console.log(`  ${b.id}: ${b.title}`));

// Write back
const headers = Object.keys(records[0]);
const output = stringify(records, { header: true, columns: headers });
fs.writeFileSync(CSV_PATH, output);

console.log('\n✅ CSV updated');
