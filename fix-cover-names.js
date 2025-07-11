const fs = require('fs');
const path = require('path');

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';

console.log('🔧 Fixing book cover filenames to match website expectations...\n');

// Parse CSV to get book data
function parseCSV() {
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    const books = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        books.push({
            id: columns[headers.indexOf('id')],
            authorFirst: columns[headers.indexOf('author_first')]?.replace(/"/g, '').trim(),
            authorLast: columns[headers.indexOf('author_last')]?.replace(/"/g, '').trim(),
            authorFull: columns[headers.indexOf('author_full_name')]?.replace(/"/g, '').trim(),
            title: columns[headers.indexOf('title')]?.replace(/"/g, '').trim(),
            isbn: columns[headers.indexOf('isbn_asin')]?.replace(/"/g, '').trim()
        });
    }
    return books;
}

// Get all image files
const imageFiles = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
const books = parseCSV();

let renamed = 0;
let skipped = 0;

// Process Tillmans covers
const tillmansCovers = imageFiles.filter(f => f.includes('Tillmans_Wolfgang'));

for (const oldFilename of tillmansCovers) {
    // Extract the title from the filename
    const match = oldFilename.match(/Tillmans_Wolfgang-(.+?)_(\d+|NULL)\.jpg/);
    if (!match) continue;
    
    const fileTitle = match[1].replace(/_/g, ' ');
    const fileId = match[2];
    
    // Find matching book in CSV
    const book = books.find(b => {
        if (fileId !== 'NULL' && b.id === fileId) return true;
        
        // Match by title for books without proper ID
        const normalizedBookTitle = b.title?.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
        const normalizedFileTitle = fileTitle.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
        
        return b.authorLast?.toLowerCase() === 'tillmans' && 
               normalizedBookTitle && normalizedFileTitle &&
               (normalizedBookTitle.includes(normalizedFileTitle.substring(0, 20)) ||
                normalizedFileTitle.includes(normalizedBookTitle.substring(0, 20)));
    });
    
    if (book && book.isbn && book.isbn !== 'NULL' && /^\d{9,13}[\dX]?$/.test(book.isbn.replace(/-/g, ''))) {
        // Create ISBN-based filename for books with valid ISBN
        const newFilename = `${book.isbn}_cover.jpg`;
        const oldPath = path.join(IMAGES_DIR, oldFilename);
        const newPath = path.join(IMAGES_DIR, newFilename);
        
        if (!fs.existsSync(newPath)) {
            fs.renameSync(oldPath, newPath);
            console.log(`✅ Renamed: ${oldFilename} → ${newFilename}`);
            renamed++;
        } else {
            console.log(`⚠️  Skipped (already exists): ${newFilename}`);
            skipped++;
        }
    } else if (book) {
        console.log(`ℹ️  No valid ISBN for: ${book.title} (current file: ${oldFilename})`);
    }
}

// Process other artist covers similarly
const princeCovers = imageFiles.filter(f => f.includes('Prince_Richard'));
const guytonCovers = imageFiles.filter(f => f.includes('Guyton_Wade'));
const krugerCovers = imageFiles.filter(f => f.includes('Kruger_Barbara'));

function processArtistCovers(covers, artistLast) {
    for (const oldFilename of covers) {
        const match = oldFilename.match(new RegExp(`${artistLast}_[^-]+-(.+?)_(\\d+|[^.]+)\\.jpg`));
        if (!match) continue;
        
        const fileTitle = match[1].replace(/_/g, ' ');
        const fileIdOrISBN = match[2];
        
        // Find matching book
        const book = books.find(b => {
            if (/^\d{9,13}[\dX]?$/.test(fileIdOrISBN) && b.isbn === fileIdOrISBN) return true;
            
            const normalizedBookTitle = b.title?.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
            const normalizedFileTitle = fileTitle.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase();
            
            return b.authorLast?.toLowerCase() === artistLast.toLowerCase() && 
                   normalizedBookTitle && normalizedFileTitle &&
                   (normalizedBookTitle.includes(normalizedFileTitle.substring(0, 20)) ||
                    normalizedFileTitle.includes(normalizedBookTitle.substring(0, 20)));
        });
        
        if (book && book.isbn && book.isbn !== 'NULL' && /^\d{9,13}[\dX]?$/.test(book.isbn.replace(/-/g, ''))) {
            const newFilename = `${book.isbn}_cover.jpg`;
            const oldPath = path.join(IMAGES_DIR, oldFilename);
            const newPath = path.join(IMAGES_DIR, newFilename);
            
            if (!fs.existsSync(newPath)) {
                fs.renameSync(oldPath, newPath);
                console.log(`✅ Renamed: ${oldFilename} → ${newFilename}`);
                renamed++;
            } else {
                console.log(`⚠️  Skipped (already exists): ${newFilename}`);
                skipped++;
            }
        }
    }
}

console.log('\nProcessing Richard Prince covers...');
processArtistCovers(princeCovers, 'Prince');

console.log('\nProcessing Wade Guyton covers...');
processArtistCovers(guytonCovers, 'Guyton');

console.log('\nProcessing Barbara Kruger covers...');
processArtistCovers(krugerCovers, 'Kruger');

console.log(`\n📊 Summary:`);
console.log(`   Files renamed: ${renamed}`);
console.log(`   Files skipped: ${skipped}`);
console.log(`   Total processed: ${renamed + skipped}`);