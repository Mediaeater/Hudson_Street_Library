#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const csv = require('csv-parser');

/*
 * Consolidated Book Cover Acquisition Script
 * 
 * Usage:
 *   ./acquire-covers-consolidated.js [options]
 * 
 * Options:
 *   --limit <n>          Number of books to process (default: 50)
 *   --artist <name>      Filter by artist name (e.g., "Tillmans")
 *   --strict             Enable strict matching with similarity thresholds
 *   --batch <size>       Process in batches (default: disabled)
 *   --min-size <bytes>   Minimum image size (default: 3000)
 *   --dry-run            Show what would be downloaded without downloading
 *   --help               Show this help message
 * 
 * Examples:
 *   ./acquire-covers-consolidated.js --limit 10
 *   ./acquire-covers-consolidated.js --artist "Tillmans" --strict
 *   ./acquire-covers-consolidated.js --batch 25 --limit 100
 */

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    limit: 50,
    artist: null,
    strict: false,
    batch: null,
    minSize: 3000,
    dryRun: false,
    help: false
};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--limit':
            options.limit = parseInt(args[++i]) || 50;
            break;
        case '--artist':
            options.artist = args[++i];
            break;
        case '--strict':
            options.strict = true;
            break;
        case '--batch':
            options.batch = parseInt(args[++i]);
            break;
        case '--min-size':
            options.minSize = parseInt(args[++i]) || 3000;
            break;
        case '--dry-run':
            options.dryRun = true;
            break;
        case '--help':
        case '-h':
            options.help = true;
            break;
    }
}

// Show help if requested
if (options.help) {
    console.log(`
Book Cover Acquisition Tool - Consolidated Version

Usage:
  ./acquire-covers-consolidated.js [options]

Options:
  --limit <n>          Number of books to process (default: 50)
  --artist <name>      Filter by artist name (e.g., "Tillmans", "Prince")
  --strict             Enable strict matching with similarity thresholds
  --batch <size>       Process in batches with delays
  --min-size <bytes>   Minimum image size in bytes (default: 3000)
  --dry-run            Show what would be downloaded without downloading
  --help               Show this help message

Examples:
  # Process 10 books
  ./acquire-covers-consolidated.js --limit 10
  
  # Find covers for Wolfgang Tillmans books only
  ./acquire-covers-consolidated.js --artist "Tillmans" --strict
  
  # Process 100 books in batches of 25
  ./acquire-covers-consolidated.js --batch 25 --limit 100
  
  # Dry run to see what would be downloaded
  ./acquire-covers-consolidated.js --dry-run --limit 20
`);
    process.exit(0);
}

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const USER_AGENT = 'Hudson Street Library Cover Acquisition Tool';

// API Configuration
const config = {
    baseDelay: parseInt(process.env.BASE_DELAY_MS) || 1000,
    minImageSize: options.minSize,
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY_MS) || 2000,
    backoffMultiplier: parseFloat(process.env.BACKOFF_MULTIPLIER) || 1.5,
    batchDelay: 10000, // 10 seconds between batches
    
    // Strict mode thresholds
    authorMatchThreshold: 0.8,
    titleMatchThreshold: 0.8
};

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Display configuration
console.log(`📚 Book Cover Acquisition Tool - Consolidated Version`);
console.log(`Configuration:`);
console.log(`  Limit: ${options.limit} books`);
if (options.artist) console.log(`  Artist Filter: "${options.artist}"`);
if (options.strict) console.log(`  Strict Mode: ENABLED`);
if (options.batch) console.log(`  Batch Size: ${options.batch}`);
console.log(`  Min Image Size: ${options.minSize} bytes`);
if (options.dryRun) console.log(`  🏃 DRY RUN MODE - No files will be downloaded`);
console.log('');

// String similarity functions for strict mode
function similarity(s1, s2) {
    s1 = (s1 || '').toLowerCase().trim();
    s2 = (s2 || '').toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    if (!s1 || !s2) return 0.0;
    
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s2.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s1.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(j - 1) !== s2.charAt(i - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s1.length] = lastValue;
    }
    return costs[s1.length];
}

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
    if (options.dryRun) {
        console.log(`  [DRY RUN] Would download: ${url}`);
        return;
    }
    
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

// Function to get book cover from Google Books
async function getCoverFromGoogleBooks(book) {
    try {
        let query;
        if (book.isbn && book.isbn.match(/^\d{10,13}$/)) {
            query = `isbn:${book.isbn}`;
        } else {
            // Build search query with author and title
            const parts = [];
            if (book.author) parts.push(`"${book.author}"`);
            if (book.title) parts.push(`"${book.title}"`);
            query = parts.join(' ');
        }
        
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`;
        const data = await httpsGetWithRetry(apiUrl);
        
        if (data.items && data.items.length > 0) {
            // In strict mode, verify the match
            if (options.strict) {
                for (const item of data.items) {
                    const volumeInfo = item.volumeInfo;
                    if (!volumeInfo) continue;
                    
                    // Check author match
                    const apiAuthors = volumeInfo.authors || [];
                    let authorMatch = false;
                    for (const apiAuthor of apiAuthors) {
                        if (similarity(apiAuthor, book.author) >= config.authorMatchThreshold) {
                            authorMatch = true;
                            break;
                        }
                    }
                    
                    // Check title match
                    const titleMatch = similarity(volumeInfo.title, book.title) >= config.titleMatchThreshold;
                    
                    if (authorMatch && titleMatch && volumeInfo.imageLinks) {
                        console.log(`  ✓ Strict match found: "${volumeInfo.title}" by ${apiAuthors.join(', ')}`);
                        const links = volumeInfo.imageLinks;
                        let imageUrl = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
                        
                        if (imageUrl && imageUrl.startsWith('http://')) {
                            imageUrl = imageUrl.replace('http://', 'https://');
                        }
                        
                        return imageUrl;
                    }
                }
                console.log(`  ✗ No strict match found in ${data.items.length} results`);
                return null;
            } else {
                // Non-strict mode: take first result
                const book = data.items[0];
                if (book.volumeInfo && book.volumeInfo.imageLinks) {
                    const links = book.volumeInfo.imageLinks;
                    let imageUrl = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;
                    
                    if (imageUrl && imageUrl.startsWith('http://')) {
                        imageUrl = imageUrl.replace('http://', 'https://');
                    }
                    
                    return imageUrl;
                }
            }
        }
        return null;
    } catch (error) {
        console.log(`  Google Books API error: ${error.message}`);
        return null;
    }
}

// Function to get book cover from Open Library
async function getCoverFromOpenLibrary(book) {
    try {
        if (!book.isbn || !book.isbn.match(/^\d{10,13}$/)) {
            return null;
        }
        
        const apiUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${book.isbn}&format=json&jscmd=data`;
        const data = await httpsGetWithRetry(apiUrl);
        
        const bookKey = `ISBN:${book.isbn}`;
        if (data[bookKey] && data[bookKey].cover) {
            return data[bookKey].cover.large || data[bookKey].cover.medium || data[bookKey].cover.small;
        }
        return null;
    } catch (error) {
        console.log(`  Open Library API error: ${error.message}`);
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

// Check if book matches artist filter
function matchesArtistFilter(book, artistFilter) {
    if (!artistFilter) return true;
    
    const filter = artistFilter.toLowerCase();
    const author = (book.author || '').toLowerCase();
    const authorLast = (book.authorLast || '').toLowerCase();
    const authorFirst = (book.authorFirst || '').toLowerCase();
    
    return author.includes(filter) || 
           authorLast.includes(filter) || 
           authorFirst.includes(filter);
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
                        
                        const book = {
                            title: row.title || 'Unknown Title',
                            author: row.author_full_name || `${row.author_first || ''} ${row.author_last || ''}`.trim() || 'Unknown Author',
                            authorLast: row.author_last || '',
                            authorFirst: row.author_first || '',
                            isbn: row.isbn_asin.trim(),
                            year: row.publication_year || '',
                            filename: cleanFilename(`${row.author_last || 'Unknown'}_${row.title || 'Unknown'}_${row.isbn_asin}`.replace(/\s+/g, '_')) + '.jpg'
                        };
                        
                        // Apply artist filter if specified
                        if (matchesArtistFilter(book, options.artist)) {
                            books.push(book);
                        }
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
                    console.log(`\nCSV Parsing Errors (${errors.length}):`, errors.slice(0, 5));
                }
                
                console.log(`Found ${books.length} books with missing covers`);
                if (options.artist) {
                    console.log(`Filtered to ${options.artist} books`);
                }
                
                let processed = 0;
                let successful = 0;
                let failed = 0;
                const failedBooks = [];
                
                // Process books up to limit
                const booksToProcess = books.slice(0, options.limit);
                console.log(`Processing ${booksToProcess.length} books...\n`);
                
                // Process in batches if specified
                const batchSize = options.batch || booksToProcess.length;
                
                for (let batchStart = 0; batchStart < booksToProcess.length; batchStart += batchSize) {
                    const batch = booksToProcess.slice(batchStart, Math.min(batchStart + batchSize, booksToProcess.length));
                    
                    if (options.batch && batchStart > 0) {
                        console.log(`\n⏸️  Waiting ${config.batchDelay/1000}s before next batch...`);
                        await new Promise(resolve => setTimeout(resolve, config.batchDelay));
                    }
                    
                    for (const book of batch) {
                        processed++;
                        console.log(`[${processed}/${booksToProcess.length}] Processing: ${book.title} by ${book.author}`);
                        console.log(`ISBN: ${book.isbn}`);
                        
                        const filepath = path.join(IMAGES_DIR, book.filename);
                        
                        // Skip if file already exists (unless in dry run mode)
                        if (!options.dryRun && fs.existsSync(filepath)) {
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
                            let coverUrl = await getCoverFromGoogleBooks(book);
                            
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
                            if (!coverAcquired && !options.dryRun) {
                                await new Promise(resolve => setTimeout(resolve, 500)); // Short delay between APIs
                                console.log(`  Trying Open Library...`);
                                coverUrl = await getCoverFromOpenLibrary(book);
                                
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
                        
                        // Rate limiting delay
                        if (processed < booksToProcess.length) {
                            const delay = failed > successful ? config.baseDelay * 2 : config.baseDelay;
                            await new Promise(resolve => setTimeout(resolve, delay));
                        }
                    }
                }
                
                console.log(`\n=== Acquisition Complete ===`);
                console.log(`Processed: ${processed} books`);
                console.log(`Successful: ${successful} covers`);
                console.log(`Failed: ${failed} attempts`);
                console.log(`Success rate: ${Math.round((successful / processed) * 100)}%`);
                
                if (failedBooks.length > 0 && !options.dryRun) {
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