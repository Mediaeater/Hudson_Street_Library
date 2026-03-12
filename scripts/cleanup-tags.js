const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const csvPath = path.join(__dirname, '../src/_data/books.csv');

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
});

let urlTagsFixed = 0;
let caseNormalized = 0;

// Tag normalization map
const tagNormalizations = {
    'photography': 'Photography',
    'art': 'Art',
    'nyc': 'New York City',
    'new york city': 'New York City',
    'punk': 'Punk',
    'rock': 'Rock',
    'catalogs': 'Catalogs'
};

records.forEach((record, index) => {
    if (!record.tags) return;

    let tags = record.tags.split(',').map(tag => tag.trim());
    let modified = false;

    // Fix URL tags
    tags = tags.map(tag => {
        if (tag === 'https://purple.fr/') {
            urlTagsFixed++;
            modified = true;
            return 'Purple Magazine';
        }
        return tag;
    });

    // Normalize case
    tags = tags.map(tag => {
        const lowerTag = tag.toLowerCase();
        if (tagNormalizations[lowerTag] && tag !== tagNormalizations[lowerTag]) {
            caseNormalized++;
            modified = true;
            return tagNormalizations[lowerTag];
        }
        return tag;
    });

    // Remove duplicates that may have been created by normalization
    tags = [...new Set(tags)];

    if (modified) {
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

console.log(`✓ Tag cleanup complete:`);
console.log(`  - Fixed ${urlTagsFixed} URL tags (https://purple.fr/ → Purple Magazine)`);
console.log(`  - Normalized ${caseNormalized} case variations`);
console.log(`  - Processed ${records.length} total books`);
