const fs = require('fs');

const booksCSV = fs.readFileSync('./src/_data/books.csv', 'utf-8');
const lines = booksCSV.split('\n');

console.log('Music books with ISBN numbers:\n');

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current.trim());

    const id = parseInt(fields[0]);
    if (id >= 1440 && id <= 1484) {
        const title = fields[4] || '';
        const isbn = fields[13] || '';

        if (isbn && isbn !== 'NULL' && isbn !== '') {
            // Clean ISBN (remove dashes and spaces)
            const cleanISBN = isbn.replace(/[-\s]/g, '');
            console.log(`ID: ${id}`);
            console.log(`Title: ${title}`);
            console.log(`ISBN: ${cleanISBN}`);
            console.log('---');
        }
    }
}
