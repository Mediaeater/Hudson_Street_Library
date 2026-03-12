const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const csvPath = path.join(__dirname, '../src/_data/books.csv');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
});

// Check for lowercase variants
const checks = [
    ['photography', 'Photography'],
    ['art', 'Art'],
    ['punk', 'Punk'],
    ['rock', 'Rock'],
    ['catalogs', 'Catalogs'],
    ['nyc', 'New York City']
];

console.log('=== Case Normalization Check ===\n');

checks.forEach(([lower, proper]) => {
    let lowerCount = 0;
    let properCount = 0;

    records.forEach(record => {
        if (!record.tags) return;
        const tags = record.tags.split(',').map(t => t.trim());

        tags.forEach(tag => {
            if (tag === lower) lowerCount++;
            if (tag === proper) properCount++;
        });
    });

    console.log(`${proper.padEnd(20)} ${properCount.toString().padStart(4)} | ${lower.padEnd(20)} ${lowerCount.toString().padStart(4)}`);
});

console.log('\n=== Malformed Tag Check ===\n');

// Check for malformed tags
let urlTags = 0;
let semicolonTags = 0;
let longTags = 0;

records.forEach(record => {
    if (!record.tags) return;
    const tags = record.tags.split(',').map(t => t.trim());

    tags.forEach(tag => {
        if (tag.includes('http')) urlTags++;
        if (tag.includes(';')) semicolonTags++;
        if (tag.length > 60) longTags++;
    });
});

console.log(`Tags with URLs: ${urlTags}`);
console.log(`Tags with semicolons: ${semicolonTags}`);
console.log(`Tags over 60 chars: ${longTags}`);
