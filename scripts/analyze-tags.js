const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const csvPath = path.join(__dirname, '../src/_data/books.csv');

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true
});

// Count tags
const tagCounts = {};

records.forEach(record => {
    if (!record.tags) return;

    const tags = record.tags.split(',').map(tag => tag.trim()).filter(tag => {
        // Apply same filters as the template
        return tag &&
               tag.length <= 60 &&
               tag.indexOf('http') === -1 &&
               tag.indexOf(';') === -1;
    });

    tags.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
});

// Sort by count
const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1]);

console.log('\n=== Top 30 Tags ===');
sortedTags.slice(0, 30).forEach(([tag, count], index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${tag.padEnd(30)} ${count}`);
});

console.log('\n=== Tags with 2+ books ===');
const tagsWithMultiple = sortedTags.filter(([tag, count]) => count >= 2);
console.log(`Total: ${tagsWithMultiple.length} tags`);

console.log('\n=== Statistics ===');
console.log(`Total unique tags: ${sortedTags.length}`);
console.log(`Tags with 1 book: ${sortedTags.filter(([tag, count]) => count === 1).length}`);
console.log(`Tags with 2+ books: ${tagsWithMultiple.length}`);
console.log(`Tags with 20+ books: ${sortedTags.filter(([tag, count]) => count >= 20).length}`);
