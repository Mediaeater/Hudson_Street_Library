#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const csv = require('csv-parser');

/*
 * Book Cover Acquisition Script
 * 
 * API Priority Order:
 * 1. Google Books (https://www.googleapis.com/books/v1) - Most reliable, good coverage
 * 2. Open Library (https://openlibrary.org) - Good alternative source
 * 3. LibraryThing (https://covers.librarything.com) - Currently disabled due to 403 blocking
 * 
 * All active APIs are tried in sequence until a cover is found.
 */

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const USER_AGENT = 'Hudson Street Library Cover Acquisition Tool';

// Configurable settings with defaults
const config = {
    baseDelay: parseInt(process.env.BASE_DELAY_MS) || 1000,
    minImageSize: parseInt(process.env.MIN_IMAGE_SIZE) || 3000, // 3KB default
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY_MS) || 2000,
    backoffMultiplier: parseFloat(process.env.BACKOFF_MULTIPLIER) || 1.5
};

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read command line arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 50;

console.log(`Starting book cover acquisition (limit: ${limit})`);
console.log(`Configuration:`, config);

// Function to make HTTPS requests with retry logic
async function httpsGetWithRetry(url, retries = config.maxRetries) {
    let lastError;
    let currentDelay = config.retryDelay;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await httpsGet(url);
        } catch (error) {
            lastError = error;
            console.log(`  Attempt ${attempt}/${retries} failed: ${error.message}`);
            
            if (attempt < retries) {
                console.log(`  Waiting ${currentDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay = Math.floor(currentDelay * config.backoffMultiplier);
            }
        }
    }
    
    throw new Error(`Failed after ${retries} attempts: ${lastError.message}`);
}

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
                        // Not JSON, return raw data
                        resolve(data);
                    }
                } else if (res.statusCode === 429) {
                    reject(new Error(`Rate limited (HTTP 429)`));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// Function to download image with retry logic
async function downloadImageWithRetry(url, filepath, retries = config.maxRetries) {
    let lastError;
    let currentDelay = config.retryDelay;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await downloadImage(url, filepath);
            
            // Verify image size
            const stats = fs.statSync(filepath);
            if (stats.size < config.minImageSize) {
                fs.unlinkSync(filepath);
                throw new Error(`Image too small (${stats.size} bytes < ${config.minImageSize} bytes)`);
            }
            
            return;
        } catch (error) {
            lastError = error;
            console.log(`  Download attempt ${attempt}/${retries} failed: ${error.message}`);
            
            if (attempt < retries) {
                console.log(`  Waiting ${currentDelay}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                currentDelay = Math.floor(currentDelay * config.backoffMultiplier);
            }
        }
    }
    
    throw new Error(`Download failed after ${retries} attempts: ${lastError.message}`);
}

// Function to download image
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        const headers = {
            'User-Agent': USER_AGENT
        };
        
        // Add referer for LibraryThing
        if (url.includes('librarything.com')) {
            headers['Referer'] = 'https://www.librarything.com/';
        }
        
        const options = {
            headers
        };
        
        https.get(url, options, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
                file.on('error', (err) => {
                    file.close();
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                    reject(err);
                });
            } else {
                file.close();
                if (fs.existsSync(filepath)) {
                    fs.unlinkSync(filepath);
                }
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            reject(err);
        });
    });
}

// Function to get book cover from LibraryThing
async function getCoverFromLibraryThing(isbn) {
    try {
        // LibraryThing cover URL format
        // Using 'devkey/YOUR_KEY' if you have one, otherwise omit the devkey part
        // For now, using the direct public URL format
        const coverUrl = `https://covers.librarything.com/large/isbn/${isbn}`;
        
        // LibraryThing returns a 1x1 pixel image if no cover exists
        // This will be caught by our minimum size check
        return coverUrl;
    } catch (error) {
        console.log(`  LibraryThing API error for ISBN ${isbn}:`, error.message);
        return null;
    }
}

// Function to get book cover from Open Library
async function getCoverFromOpenLibrary(isbn) {
    try {
        const apiUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
        const data = await httpsGetWithRetry(apiUrl);
        
        const bookKey = `ISBN:${isbn}`;
        if (data[bookKey] && data[bookKey].cover) {
            return data[bookKey].cover.large || data[bookKey].cover.medium || data[bookKey].cover.small;
        }
        return null;
    } catch (error) {
        console.log(`  Open Library API error for ISBN ${isbn}:`, error.message);
        return null;
    }
}

// Function to get book cover from Google Books
async function getCoverFromGoogleBooks(isbn) {
    try {
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
        const data = await httpsGetWithRetry(apiUrl);
        
        if (data.items && data.items.length > 0) {
            const book = data.items[0];
            if (book.volumeInfo && book.volumeInfo.imageLinks) {
                // Get highest quality available
                const links = book.volumeInfo.imageLinks;
                let imageUrl = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
                
                // Convert HTTP to HTTPS for Google Books URLs
                if (imageUrl && imageUrl.startsWith('http://')) {
                    imageUrl = imageUrl.replace('http://', 'https://');
                }
                
                return imageUrl;
            }
        }
        return null;
    } catch (error) {
        console.log(`  Google Books API error for ISBN ${isbn}:`, error.message);
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
    const errors = [];
    
    // Read CSV file
    return new Promise((resolve, reject) => {
        fs.createReadStream(CSV_PATH)
            .pipe(csv())
            .on('data', (row) => {
                try {
                    // Check if book has missing cover (NULL or empty image_url)
                    if (row.isbn_asin && row.isbn_asin.trim() && 
                        (!row.image_url || row.image_url.trim() === '' || row.image_url.trim().toLowerCase() === 'null')) {
                        books.push({
                            title: row.title || 'Unknown Title',
                            author: row.author_full_name || `${row.author_first || ''} ${row.author_last || ''}`.trim() || 'Unknown Author',
                            isbn: row.isbn_asin.trim(),
                            filename: cleanFilename(`${row.author_last || 'Unknown'}_${row.title || 'Unknown'}_${row.isbn_asin}`.replace(/\s+/g, '_')) + '.jpg'
                        });
                    }
                } catch (parseError) {
                    errors.push({
                        row: JSON.stringify(row),
                        error: parseError.message
                    });
                }
            })
            .on('end', async () => {
                if (errors.length > 0) {
                    console.log(`\nCSV Parsing Errors (${errors.length}):`, errors);
                }
                
                console.log(`Found ${books.length} books with missing covers`);
                
                let processed = 0;
                let successful = 0;
                let failed = 0;
                const failedBooks = [];
                
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
                        const stats = fs.statSync(filepath);
                        if (stats.size >= config.minImageSize) {
                            console.log(`✓ Cover already exists: ${book.filename} (${stats.size} bytes)`);
                            successful++;
                            continue;
                        } else {
                            console.log(`  Existing cover too small (${stats.size} bytes), re-downloading...`);
                            fs.unlinkSync(filepath);
                        }
                    }
                    
                    let coverAcquired = false;
                    
                    try {
                        // Try Google Books first (most reliable)
                        console.log(`  Trying Google Books...`);
                        let coverUrl = await getCoverFromGoogleBooks(book.isbn);
                        
                        if (coverUrl) {
                            try {
                                await downloadImageWithRetry(coverUrl, filepath);
                                console.log(`✓ Downloaded from Google Books: ${book.filename}`);
                                successful++;
                                coverAcquired = true;
                            } catch (downloadError) {
                                console.log(`  Google Books download failed: ${downloadError.message}`);
                            }
                        } else {
                            console.log(`  No cover found on Google Books`);
                        }
                        
                        // If not successful, try Open Library
                        if (!coverAcquired) {
                            await new Promise(resolve => setTimeout(resolve, 500)); // Short delay between APIs
                            console.log(`  Trying Open Library...`);
                            coverUrl = await getCoverFromOpenLibrary(book.isbn);
                            
                            if (coverUrl) {
                                try {
                                    await downloadImageWithRetry(coverUrl, filepath);
                                    console.log(`✓ Downloaded from Open Library: ${book.filename}`);
                                    successful++;
                                    coverAcquired = true;
                                } catch (downloadError) {
                                    console.log(`  Open Library download failed: ${downloadError.message}`);
                                }
                            } else {
                                console.log(`  No cover found on Open Library`);
                            }
                        }
                        
                        // Skip LibraryThing for now due to 403 errors
                        // If still not successful, try LibraryThing (currently blocked with 403)
                        /*
                        if (!coverAcquired) {
                            await new Promise(resolve => setTimeout(resolve, 500)); 
                            console.log(`  Trying LibraryThing...`);
                            coverUrl = await getCoverFromLibraryThing(book.isbn);
                            
                            if (coverUrl) {
                                try {
                                    await downloadImageWithRetry(coverUrl, filepath);
                                    console.log(`✓ Downloaded from LibraryThing: ${book.filename}`);
                                    successful++;
                                    coverAcquired = true;
                                } catch (downloadError) {
                                    console.log(`  LibraryThing download failed: ${downloadError.message}`);
                                }
                            }
                        }
                        */
                        
                        if (!coverAcquired) {
                            console.log(`✗ No cover found for ISBN: ${book.isbn}`);
                            failed++;
                            failedBooks.push({
                                title: book.title,
                                author: book.author,
                                isbn: book.isbn,
                                reason: 'No cover found on any API'
                            });
                        }
                        
                    } catch (error) {
                        console.log(`✗ Error processing book: ${error.message}`);
                        failed++;
                        failedBooks.push({
                            title: book.title,
                            author: book.author,
                            isbn: book.isbn,
                            reason: error.message
                        });
                    }
                    
                    // Rate limiting delay (with exponential backoff if we're getting rate limited)
                    if (processed < booksToProcess.length) {
                        const delay = failed > successful ? config.baseDelay * 2 : config.baseDelay;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
                
                console.log(`\n=== Acquisition Complete ===`);
                console.log(`Processed: ${processed} books`);
                console.log(`Successful: ${successful} covers`);
                console.log(`Failed: ${failed} attempts`);
                console.log(`Success rate: ${Math.round((successful / processed) * 100)}%`);
                
                if (failedBooks.length > 0) {
                    console.log(`\nFailed Books:`);
                    failedBooks.forEach((book, index) => {
                        console.log(`${index + 1}. ${book.title} by ${book.author} (ISBN: ${book.isbn})`);
                        console.log(`   Reason: ${book.reason}`);
                    });
                    
                    // Write failed books to file for later processing
                    const failedBooksPath = './failed-covers.json';
                    fs.writeFileSync(failedBooksPath, JSON.stringify(failedBooks, null, 2));
                    console.log(`\nFailed books saved to: ${failedBooksPath}`);
                }
                
                resolve();
            })
            .on('error', (csvError) => {
                console.error('CSV parsing error:', csvError);
                reject(csvError);
            });
    });
}

// Run the acquisition
acquireCovers().catch(console.error);