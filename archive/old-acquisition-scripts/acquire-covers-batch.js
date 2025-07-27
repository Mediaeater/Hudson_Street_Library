#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const csv = require('csv-parser');

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

console.log(`Starting book cover acquisition (limit: ${limit})`);

// Function to make HTTPS requests
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'User-Agent': USER_AGENT
            }
        };
        
        https.get(url, options, (res) => {
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
        }).on('error', reject);
    });
}

// Function to download image
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        const options = {
            headers: {
                'User-Agent': USER_AGENT
            }
        };
        
        https.get(url, options, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            } else {
                file.close();
                fs.unlinkSync(filepath); // Remove empty file
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            file.close();
            fs.unlinkSync(filepath); // Remove empty file
            reject(err);
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
        console.log(`Open Library API error for ISBN ${isbn}:`, error.message);
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
        console.log(`Google Books API error for ISBN ${isbn}:`, error.message);
        return null;
    }
}

// Function to clean filename
function cleanFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// Main acquisition function
async function acquireCovers() {
    const books = [];
    
    // Read CSV file
    return new Promise((resolve, reject) => {
        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                // Check if book has missing cover (NULL or empty image_url)
                if (row.ISBN && row.ISBN.trim() && 
                    (!row.image_url || row.image_url.trim() === '' || row.image_url.trim().toLowerCase() === 'null')) {
                    books.push({
                        title: row.Title || 'Unknown Title',
                        author: row.Author || 'Unknown Author',
                        isbn: row.ISBN.trim(),
                        filename: cleanFilename(`${row.Author || 'Unknown'}_${row.Title || 'Unknown'}_${row.ISBN}`.replace(/\s+/g, '_')) + '.jpg'
                    });
                }
            })
            .on('end', async () => {
                console.log(`Found ${books.length} books with missing covers`);
                
                let processed = 0;
                let successful = 0;
                let failed = 0;
                
                // Process books up to limit
                const booksToProcess = books.slice(0, limit);
                console.log(`Processing ${booksToProcess.length} books...\n`);
                
                for (const book of booksToProcess) {
                    processed++;
                    console.log(`[${processed}/${booksToProcess.length}] Processing: ${book.title} by ${book.author}`);
                    console.log(`ISBN: ${book.isbn}`);
                    
                    const filepath = path.join(IMAGES_DIR, book.filename);
                    
                    // Skip if file already exists
                    if (fs.existsSync(filepath)) {
                        console.log(`✓ Cover already exists: ${book.filename}`);
                        successful++;
                        continue;
                    }
                    
                    try {
                        // Try Open Library first
                        let coverUrl = await getCoverFromOpenLibrary(book.isbn);
                        let source = 'Open Library';
                        
                        // If not found, try Google Books
                        if (!coverUrl) {
                            await new Promise(resolve => setTimeout(resolve, 500)); // Short delay between APIs
                            coverUrl = await getCoverFromGoogleBooks(book.isbn);
                            source = 'Google Books';
                        }
                        
                        if (coverUrl) {
                            await downloadImage(coverUrl, filepath);
                            console.log(`✓ Downloaded from ${source}: ${book.filename}`);
                            successful++;
                        } else {
                            console.log(`✗ No cover found for ISBN: ${book.isbn}`);
                            failed++;
                        }
                        
                    } catch (error) {
                        console.log(`✗ Error downloading cover: ${error.message}`);
                        failed++;
                    }
                    
                    // Rate limiting delay
                    if (processed < booksToProcess.length) {
                        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                    }
                }
                
                console.log(`\n=== Acquisition Complete ===`);
                console.log(`Processed: ${processed} books`);
                console.log(`Successful: ${successful} covers`);
                console.log(`Failed: ${failed} attempts`);
                console.log(`Success rate: ${Math.round((successful / processed) * 100)}%`);
                
                resolve();
            })
            .on('error', reject);
    });
}

// Run the acquisition
acquireCovers().catch(console.error);