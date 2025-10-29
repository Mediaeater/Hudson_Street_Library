const fs = require('fs');

// Read the Music CSV
const musicCsvPath = '/Users/m/Downloads/Music - Rare Books - Sheet1.csv';
const mainCsvPath = './src/_data/books.csv';

const musicData = fs.readFileSync(musicCsvPath, 'utf-8');
const mainCsvData = fs.readFileSync(mainCsvPath, 'utf-8');

// Get the last ID from the main CSV
const mainLines = mainCsvData.trim().split('\n');
const lastLine = mainLines[mainLines.length - 1];
const lastId = parseInt(lastLine.split(',')[0]);
let nextId = lastId + 1;

console.log(`Last ID in books.csv: ${lastId}`);
console.log(`Starting from ID: ${nextId}`);

// Parse Music CSV (skip first row - header)
const musicLines = musicData.split('\n').slice(1);
const newEntries = [];

musicLines.forEach((line, index) => {
    if (!line.trim()) return;

    // Split by commas but handle quoted fields
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
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

    // Parse fields based on CSV structure
    // Title,,Author/Phographer,,Format,,Publisher,,Notes,,Size,,Discription,,Year,,ISBN,,Price
    const title = fields[0] || '';
    const author = fields[2] || '';
    const format = fields[4] || '';
    const publisher = fields[6] || '';
    const notes = fields[8] || '';
    const size = fields[10] || '';
    const description = fields[12] || '';
    const year = fields[14] || '';
    const isbn = fields[16] || '';

    // Skip if no title
    if (!title || title.trim() === '') return;

    // Parse dimensions from size field (assuming inches)
    let width_cm = null;
    let height_cm = null;
    if (size) {
        const match = size.match(/([\d.]+)\s*x\s*([\d.]+)\s*x?\s*([\d.]+)?\s*inches?/i);
        if (match) {
            // Convert inches to cm
            height_cm = (parseFloat(match[1]) * 2.54).toFixed(2);
            width_cm = (parseFloat(match[2]) * 2.54).toFixed(2);
        }
    }

    // Extract author last and first name
    let authorLast = '';
    let authorFirst = '';
    if (author) {
        const parts = author.split(/\s+/);
        if (parts.length > 1) {
            authorLast = parts[parts.length - 1];
            authorFirst = parts.slice(0, -1).join(' ');
        } else {
            authorLast = author;
        }
    }

    // Build the CSV row
    const csvRow = [
        nextId,                                    // id
        authorLast.replace(/\"/g, '""'),           // author_last
        authorFirst.replace(/\"/g, '""'),          // author_first
        author.replace(/\"/g, '""'),               // author_full_name
        title.replace(/\"/g, '""'),                // title
        publisher.replace(/\"/g, '""'),            // publisher
        year || 'NULL',                            // publication_year
        height_cm || 'NULL',                       // height_cm
        width_cm || 'NULL',                        // width_cm
        'NULL',                                    // depth_cm
        format || 'NULL',                          // binding
        'NULL',                                    // page_count
        notes ? notes.replace(/\"/g, '""') : 'NULL', // edition_printrun
        isbn || 'NULL',                            // isbn_asin
        'NULL',                                    // editor
        'NULL',                                    // contributors
        'false',                                   // is_signed_inscribed
        'NULL',                                    // designer
        description ? description.replace(/\"/g, '""') : 'NULL', // description
        'NULL',                                    // artist_url
        'NULL',                                    // publisher_url
        'Music Photobooks',                        // collection_grouping
        'Music, Photography, Punk, Rock, Pop Culture', // tags
        'Music Photography',                       // classification
        'NULL',                                    // bisac
        'NULL',                                    // ddc
        'Hudson Street Library, NYC',              // location
        'NULL',                                    // accession_no
        'NULL'                                     // image_url
    ];

    // Escape commas in fields
    const escapedRow = csvRow.map(field => {
        if (field === 'NULL') return field;
        const str = String(field);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str}"`;
        }
        return str;
    }).join(',');

    newEntries.push(escapedRow);
    console.log(`Added: ${nextId} - ${title}`);
    nextId++;
});

// Append to main CSV
const updatedCsv = mainCsvData.trim() + '\n' + newEntries.join('\n') + '\n';
fs.writeFileSync(mainCsvPath, updatedCsv);

console.log(`\n✓ Added ${newEntries.length} music books to books.csv`);
console.log(`  New ID range: ${lastId + 1} to ${nextId - 1}`);
