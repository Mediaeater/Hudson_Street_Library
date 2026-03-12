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

console.log('=== Malformed Tags ===\n');

records.forEach((record, idx) => {
    if (!record.tags) return;
    const tags = record.tags.split(',').map(t => t.trim());

    tags.forEach(tag => {
        if (tag.includes('http')) {
            console.log(`URL tag (line ${idx + 2}): "${tag}" in book: ${record.title}`);
        }
        if (tag.includes(';')) {
            console.log(`Semicolon tag (line ${idx + 2}): "${tag}" in book: ${record.title}`);
        }
        if (tag.length > 60) {
            console.log(`Long tag (line ${idx + 2}): "${tag}" (${tag.length} chars) in book: ${record.title}`);
        }
    });
});
