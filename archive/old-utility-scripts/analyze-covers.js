const fs = require('fs');

// Read and parse CSV manually
const csvContent = fs.readFileSync('./src/_data/books.csv', 'utf8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
const imageUrlIndex = headers.indexOf('image_url');
const isbnIndex = headers.indexOf('isbn_asin');

console.log('CSV Analysis:');
console.log('Headers:', headers.slice(0, 5), '...', headers.slice(-3));
console.log('image_url column index:', imageUrlIndex);
console.log('isbn_asin column index:', isbnIndex);

let totalBooks = 0;
let booksWithImages = 0;
let booksWithoutImages = 0;
let booksWithISBN = 0;
let candidatesForAcquisition = 0;

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line (simple approach)
    const columns = line.split(',');
    
    totalBooks++;
    
    const imageUrl = columns[imageUrlIndex] || '';
    const isbn = columns[isbnIndex] || '';
    
    // Check if has image
    const hasImage = imageUrl && imageUrl.trim() !== '' && imageUrl.trim() !== '""' && imageUrl.trim().toLowerCase() !== '"null"' && imageUrl.trim().toLowerCase() !== 'null';
    
    // Check if has ISBN
    const hasISBN = isbn && isbn.trim() !== '' && isbn.trim() !== '""' && isbn.trim().toLowerCase() !== '"null"' && isbn.trim().toLowerCase() !== 'null';
    
    if (hasImage) {
        booksWithImages++;
    } else {
        booksWithoutImages++;
    }
    
    if (hasISBN) {
        booksWithISBN++;
    }
    
    if (!hasImage && hasISBN) {
        candidatesForAcquisition++;
    }
}

console.log('\nResults:');
console.log('Total books:', totalBooks);
console.log('Books with images:', booksWithImages);
console.log('Books without images:', booksWithoutImages);
console.log('Books with ISBN:', booksWithISBN);
console.log('Candidates for acquisition (no image + has ISBN):', candidatesForAcquisition);

// Show some sample books without images
console.log('\nSample of books without images:');
let sampleCount = 0;
for (let i = 1; i < Math.min(lines.length, 20); i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const columns = line.split(',');
    const imageUrl = columns[imageUrlIndex] || '';
    const hasImage = imageUrl && imageUrl.trim() !== '' && imageUrl.trim() !== '""' && imageUrl.trim().toLowerCase() !== '"null"' && imageUrl.trim().toLowerCase() !== 'null';
    
    if (!hasImage && sampleCount < 5) {
        const title = columns[headers.indexOf('title')] || 'Unknown';
        const author = columns[headers.indexOf('author_full_name')] || 'Unknown';
        const isbn = columns[isbnIndex] || 'No ISBN';
        console.log(`- ${title.replace(/"/g, '')} by ${author.replace(/"/g, '')} (ISBN: ${isbn.replace(/"/g, '')})`);
        sampleCount++;
    }
}