#!/usr/bin/env node
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const CSV_PATH = 'src/_data/books.csv';

// Read CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

// Find and update the 4 books (IDs 1743-1746)
let updated = 0;
records.forEach((record) => {
    if (['1743', '1744', '1745', '1746'].includes(record.id)) {
        const oldTitle = record.title;
        record.title = record.title.replace(/#(\d+):/, 'Vol $1:');
        console.log(`${record.id}: ${oldTitle} → ${record.title}`);
        updated++;
    }
});

if (updated !== 4) {
    console.error(`Error: Expected to update 4 books, but updated ${updated}`);
    process.exit(1);
}

// Write back
const headers = Object.keys(records[0]);
const output = stringify(records, { header: true, columns: headers });
fs.writeFileSync(CSV_PATH, output);

console.log(`\n✅ Updated ${updated} book titles`);
