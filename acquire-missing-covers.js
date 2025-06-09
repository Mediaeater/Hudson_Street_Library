const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const DELAY_MS = 1000; // 1 second between API calls
const USER_AGENT = 'Hudson Street Library Cover Acquisition Tool';

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read command line arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 50;

console.log(`🚀 Starting book cover acquisition (limit: ${limit})`);

// Function to make HTTPS requests
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 10000
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy();
            reject(new Error('Request timeout'));
        });
    });
}

// Function to download image
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        // Convert http to https
        const httpsUrl = url.replace(/^http:/, 'https:');
        
        const file = fs.createWriteStream(filepath);
        
        const request = https.get(httpsUrl, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 15000
        }, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                file.close();
                try { fs.unlinkSync(filepath); } catch(e) {}
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        });
        
        request.on('error', (err) => {
            file.close();
            try { fs.unlinkSync(filepath); } catch(e) {}
            reject(err);
        });
        
        request.on('timeout', () => {
            request.destroy();
            file.close();
            try { fs.unlinkSync(filepath); } catch(e) {}
            reject(new Error('Download timeout'));
        });
    });
}

// Function to get book cover from Open Library
async function getCoverFromOpenLibrary(isbn) {
    try {
        const apiUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
        const data = await httpsGet(apiUrl);
        
        const bookKey = `ISBN:${isbn}`;
        if (data[bookKey] && data[bookKey].cover) {
            return data[bookKey].cover.large || data[bookKey].cover.medium || data[bookKey].cover.small;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Function to get book cover from Google Books
async function getCoverFromGoogleBooks(isbn) {
    try {
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
        const data = await httpsGet(apiUrl);
        
        if (data.items && data.items.length > 0) {
            const book = data.items[0];
            if (book.volumeInfo && book.volumeInfo.imageLinks) {
                return book.volumeInfo.imageLinks.thumbnail || book.volumeInfo.imageLinks.smallThumbnail;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Function to clean filename
function cleanFilename(str) {
    return str.replace(/[^a-zA-Z0-9.-]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '')
              .substring(0, 100); // Limit length
}

// Parse CSV and find candidates
function findCandidates() {
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    const imageUrlIndex = headers.indexOf('image_url');
    const isbnIndex = headers.indexOf('isbn_asin');
    const titleIndex = headers.indexOf('title');
    const authorIndex = headers.indexOf('author_full_name');
    
    const candidates = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        
        const imageUrl = columns[imageUrlIndex] || '';
        const isbn = columns[isbnIndex] || '';
        const title = columns[titleIndex] || '';
        const author = columns[authorIndex] || '';
        
        // Check if missing image
        const hasImage = imageUrl && imageUrl.trim() !== '' && 
                         imageUrl.trim() !== '""' && 
                         imageUrl.trim().toLowerCase() !== '"null"' && 
                         imageUrl.trim().toLowerCase() !== 'null';
        
        // Check if has ISBN
        const cleanISBN = isbn.replace(/"/g, '').trim();
        const hasISBN = cleanISBN && cleanISBN !== '' && 
                       cleanISBN.toLowerCase() !== 'null';
        
        if (!hasImage && hasISBN) {
            candidates.push({
                title: title.replace(/"/g, '').trim() || 'Unknown Title',
                author: author.replace(/"/g, '').trim() || 'Unknown Author',
                isbn: cleanISBN,
                filename: cleanFilename(`${author.replace(/"/g, '')}_${title.replace(/"/g, '')}_${cleanISBN}`) + '.jpg'
            });
        }
    }
    
    return candidates;
}

// Main acquisition function
async function acquireCovers() {
    const candidates = findCandidates();
    console.log(`📚 Found ${candidates.length} books needing covers`);
    
    const booksToProcess = candidates.slice(0, limit);
    console.log(`🎯 Processing ${booksToProcess.length} books...\n`);
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    
    for (const book of booksToProcess) {
        processed++;
        console.log(`[${processed}/${booksToProcess.length}] ${book.title} by ${book.author}`);
        console.log(`   ISBN: ${book.isbn}`);
        
        const filepath = path.join(IMAGES_DIR, book.filename);
        
        // Skip if file already exists
        if (fs.existsSync(filepath)) {
            console.log(`   ✅ Already exists`);
            successful++;
            continue;
        }
        
        try {
            // Try Open Library first
            let coverUrl = await getCoverFromOpenLibrary(book.isbn);
            let source = 'Open Library';
            
            // If not found, try Google Books
            if (!coverUrl) {
                await new Promise(resolve => setTimeout(resolve, 500));
                coverUrl = await getCoverFromGoogleBooks(book.isbn);
                source = 'Google Books';
            }
            
            if (coverUrl) {
                await downloadImage(coverUrl, filepath);
                console.log(`   ✅ Downloaded from ${source}`);
                successful++;
            } else {
                console.log(`   ❌ No cover found`);
                failed++;
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            failed++;
        }
        
        // Rate limiting delay
        if (processed < booksToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }
    
    const successRate = Math.round((successful / processed) * 100);
    console.log(`\n🎉 Acquisition Complete:`);
    console.log(`   Processed: ${processed} books`);
    console.log(`   Successful: ${successful} covers`);
    console.log(`   Failed: ${failed} attempts`);
    console.log(`   Success rate: ${successRate}%`);
    
    if (successful > 0) {
        console.log(`\n📂 Images saved to: ${IMAGES_DIR}`);
        console.log(`💡 Run image optimization next to generate variants`);
    }
}

// Run the acquisition
acquireCovers().catch(console.error);