const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const csvPath = path.join(__dirname, '../src/_data/books.csv');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
});

let cleaned = 0;

records.forEach((record) => {
    if (!record.tags) return;

    let tags = record.tags.split(',').map(t => t.trim());
    const originalLength = tags.length;

    // Filter out malformed tags
    tags = tags.filter(tag => {
        // Remove tags with URLs
        if (tag.includes('http')) {
            cleaned++;
            return false;
        }
        // Remove tags with semicolons (these look like classification data)
        if (tag.includes(';')) {
            cleaned++;
            return false;
        }
        // Remove tags over 60 characters
        if (tag.length > 60) {
            cleaned++;
            return false;
        }
        return true;
    });

    if (tags.length !== originalLength) {
        record.tags = tags.join(', ');
    }
});

// Write back to CSV
const output = stringify(records, {
    header: true,
    quoted: true,
    quoted_empty: true
});

fs.writeFileSync(csvPath, output);

console.log(`✓ Cleaned ${cleaned} malformed tags from CSV`);
