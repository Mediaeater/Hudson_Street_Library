const fs = require('fs');
const path = require('path');

// Read the Matsuda CSV
const matsudaCsvPath = '/Users/m/Downloads/Matsuda Catalogs - Sheet1.csv';
const mainCsvPath = './src/_data/books.csv';

const matsudaData = fs.readFileSync(matsudaCsvPath, 'utf-8');
const mainCsvData = fs.readFileSync(mainCsvPath, 'utf-8');

// Get the last ID from the main CSV
const mainLines = mainCsvData.trim().split('\n');
const lastLine = mainLines[mainLines.length - 1];
const lastId = parseInt(lastLine.split(',')[0]);
let nextId = lastId + 1;

console.log(`Last ID in books.csv: ${lastId}`);
console.log(`Starting from ID: ${nextId}`);

// Parse Matsuda CSV (skip first 2 header rows)
const matsudaLines = matsudaData.split('\n').slice(2);
const newEntries = [];

matsudaLines.forEach((line, index) => {
    if (!line.trim() || line.trim().startsWith(',,,')) return;

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

    // CSV has leading comma, so all indexes are +1
    const publisher = fields[1] || 'M. Matsuda';
    const series = fields[3] || '';
    // Field 5 is a boolean/flag, field 6 is the actual title
    const titleField = fields[6] || '';
    const title = titleField || series;
    const author = fields[8] || 'Mitsuhiro Matsuda';
    const photographer = fields[10] || '';
    const description = fields[12] || '';
    const year = fields[14] || '';
    const size = fields[16] || '';
    const notes = fields[18] || '';
    const subjects = fields[20] || 'Costume -- Catalogs; Men\'s clothing -- Catalogs; Fashion photography';
    const type = fields[22] || 'Trade catalog';
    const condition = fields[24] || '';
    const isbn = fields[26] || '';


    // Skip entries without series
    if (!series || series.trim() === '' || !series.includes('Nicole times')) return;

    // Parse dimensions from size field
    let width_cm = null;
    let height_cm = null;
    if (size) {
        const match = size.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
        if (match) {
            // Convert inches to cm (assuming sizes are in inches)
            height_cm = (parseFloat(match[1]) * 2.54).toFixed(2);
            width_cm = (parseFloat(match[2]) * 2.54).toFixed(2);
        }
    }

    // Build the CSV row
    const csvRow = [
        nextId,                                    // id
        'Matsuda',                                 // author_last
        'Mitsuhiro',                               // author_first
        author.replace(/"/g, '""'),               // author_full_name
        title.replace(/"/g, '""'),                // title
        publisher.replace(/"/g, '""'),            // publisher
        year || 'NULL',                            // publication_year
        height_cm || 'NULL',                       // height_cm
        width_cm || 'NULL',                        // width_cm
        'NULL',                                    // depth_cm
        'NULL',                                    // binding
        'NULL',                                    // page_count
        notes ? notes.replace(/"/g, '""') : 'NULL', // edition_printrun
        isbn || 'NULL',                            // isbn_asin
        'NULL',                                    // editor
        photographer ? photographer.replace(/"/g, '""') : 'NULL', // contributors
        'false',                                   // is_signed_inscribed
        'Yukio Kobayashi',                         // designer
        description ? description.replace(/"/g, '""') : 'NULL', // description
        'NULL',                                    // artist_url
        'NULL',                                    // publisher_url
        'Matsuda Fashion Catalogs',                // collection_grouping
        'Fashion, Catalogs, Japanese Fashion, Menswear, 1980s, 1990s', // tags
        'Fashion Photography',                     // classification
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

console.log(`\n✓ Added ${newEntries.length} Matsuda catalogs to books.csv`);
console.log(`  New ID range: ${lastId + 1} to ${nextId - 1}`);
