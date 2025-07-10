const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config();

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const DELAY_MS = 2000; // 2 seconds between API calls (more respectful)
const BATCH_DELAY_MS = 30000; // 30 seconds between batches
const BATCH_SIZE = 25; // Process 25 books per batch
const USER_AGENT = 'Hudson Street Library Cover Acquisition Tool (Educational/Non-commercial)';

// FREE API Keys
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
const DPLA_API_KEY = process.env.DPLA_API_KEY || '';

// Track API usage
let apiCalls = {
    google: 0,
    dpla: 0,
    archive: 0,
    total: 0
};

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read command line arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 50;
const startIndex = args.indexOf('--start');
const start = startIndex !== -1 ? parseInt(args[startIndex + 1]) : 0;

console.log(`🚀 Starting respectful book cover acquisition`);
console.log(`📚 Processing ${limit} books starting from index ${start}`);
console.log(`⏱️  Using ${DELAY_MS/1000}s delays between calls, ${BATCH_DELAY_MS/1000}s between batches`);
console.log(`📦 Batch size: ${BATCH_SIZE} books\n`);

// Helper function for HTTP requests with retry
async function httpRequest(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            return await new Promise((resolve, reject) => {
                const urlObj = new URL(url);
                const protocol = urlObj.protocol === 'https:' ? https : http;
                
                const request = protocol.get(url, {
                    headers: { 
                        'User-Agent': USER_AGENT,
                        'Accept': 'application/json,image/*'
                    },
                    timeout: 15000
                }, (res) => {
                    // Handle redirects
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        httpRequest(new URL(res.headers.location, url).toString())
                            .then(resolve)
                            .catch(reject);
                        return;
                    }

                    // Handle rate limiting
                    if (res.statusCode === 429) {
                        console.log(`   ⚠️  Rate limited, waiting ${(i + 1) * 10} seconds...`);
                        setTimeout(() => reject(new Error('Rate limited')), (i + 1) * 10000);
                        return;
                    }

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
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, (i + 1) * 5000));
        }
    }
}

// Download image function
async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const file = fs.createWriteStream(filepath);
        const request = protocol.get(url, {
            headers: { 
                'User-Agent': USER_AGENT,
                'Accept': 'image/*'
            },
            timeout: 30000
        }, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlinkSync(filepath);
                downloadImage(new URL(response.headers.location, url).toString(), filepath)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(filepath);
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    const stats = fs.statSync(filepath);
                    if (stats.size < 1000) {
                        fs.unlinkSync(filepath);
                        reject(new Error('Image too small'));
                    } else {
                        resolve();
                    }
                });
            });
        });

        request.on('error', (err) => {
            file.close();
            fs.unlinkSync(filepath);
            reject(err);
        });

        file.on('error', (err) => {
            fs.unlinkSync(filepath);
            reject(err);
        });
    });
}

// Google Books API (FREE with limits)
async function getCoverFromGoogleBooks(book) {
    try {
        apiCalls.google++;
        apiCalls.total++;
        
        let query = '';
        if (book.isbn && book.isbn.length >= 10) {
            query = `isbn:${book.isbn}`;
        } else {
            query = `intitle:"${book.title}" inauthor:"${book.author}"`;
        }
        
        const apiKeyParam = GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : '';
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${apiKeyParam}&maxResults=1`;
        
        const data = await httpRequest(apiUrl);
        
        if (data.items && data.items.length > 0) {
            const imageLinks = data.items[0].volumeInfo?.imageLinks;
            if (imageLinks) {
                return imageLinks.thumbnail?.replace('&edge=curl', '') || 
                       imageLinks.smallThumbnail?.replace('&edge=curl', '');
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// DPLA API (FREE with key)
async function getCoverFromDPLA(book) {
    if (!DPLA_API_KEY) return null;
    
    try {
        apiCalls.dpla++;
        apiCalls.total++;
        
        const query = book.isbn || `${book.title} ${book.author}`;
        const apiUrl = `https://api.dp.la/v2/items?q=${encodeURIComponent(query)}&api_key=${DPLA_API_KEY}&page_size=1`;
        
        const data = await httpRequest(apiUrl);
        
        if (data.docs && data.docs.length > 0) {
            const doc = data.docs[0];
            if (doc.object) {
                return doc.object;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Archive.org (FREE, no key needed)
async function getCoverFromArchive(book) {
    try {
        apiCalls.archive++;
        apiCalls.total++;
        
        const query = book.isbn || `${book.title} ${book.author}`;
        const apiUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}&fl=identifier,title&rows=1&output=json`;
        
        const data = await httpRequest(apiUrl);
        
        if (data.response && data.response.docs && data.response.docs.length > 0) {
            const identifier = data.response.docs[0].identifier;
            return `https://archive.org/services/img/${identifier}`;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Clean filename function
function cleanFilename(str) {
    return str.replace(/[^a-zA-Z0-9.-]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '')
              .substring(0, 100);
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
    const publisherIndex = headers.indexOf('publisher');
    
    const candidates = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        
        const imageUrl = columns[imageUrlIndex] || '';
        const isbn = columns[isbnIndex] || '';
        const title = columns[titleIndex] || '';
        const author = columns[authorIndex] || '';
        const publisher = columns[publisherIndex] || '';
        
        // Check if missing image
        const hasImage = imageUrl && imageUrl.trim() !== '' && 
                         imageUrl.trim() !== '""' && 
                         imageUrl.trim().toLowerCase() !== '"null"' && 
                         imageUrl.trim().toLowerCase() !== 'null';
        
        if (!hasImage) {
            candidates.push({
                index: i,
                title: title.replace(/"/g, '').trim() || 'Unknown Title',
                author: author.replace(/"/g, '').trim() || 'Unknown Author',
                publisher: publisher.replace(/"/g, '').trim(),
                isbn: isbn.replace(/"/g, '').trim(),
                filename: cleanFilename(`${author.replace(/"/g, '')}_${title.replace(/"/g, '')}_${isbn.replace(/"/g, '') || 'noISBN'}`) + '.jpg'
            });
        }
    }
    
    return candidates;
}

// Main acquisition function
async function acquireCovers() {
    const candidates = findCandidates();
    console.log(`📚 Found ${candidates.length} books needing covers\n`);
    
    // Apply start offset and limit
    const booksToProcess = candidates.slice(start, start + limit);
    console.log(`🎯 Processing books ${start + 1} to ${start + booksToProcess.length} of ${candidates.length}\n`);
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process in batches
    for (let batchStart = 0; batchStart < booksToProcess.length; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, booksToProcess.length);
        const batch = booksToProcess.slice(batchStart, batchEnd);
        const batchNumber = Math.floor(batchStart / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(booksToProcess.length / BATCH_SIZE);
        
        console.log(`\n📦 Batch ${batchNumber}/${totalBatches} (${batch.length} books)`);
        console.log('─'.repeat(50));
        
        for (const book of batch) {
            processed++;
            const globalIndex = start + batchStart + batch.indexOf(book) + 1;
            console.log(`[${globalIndex}/${candidates.length}] ${book.title} by ${book.author}`);
            console.log(`   ISBN: ${book.isbn || 'No ISBN'}`);
            
            const filepath = path.join(IMAGES_DIR, book.filename);
            
            // Skip if file already exists
            if (fs.existsSync(filepath)) {
                console.log(`   ✅ Already exists`);
                skipped++;
                continue;
            }
            
            let coverUrl = null;
            let source = '';
            
            try {
                // Try Google Books first
                coverUrl = await getCoverFromGoogleBooks(book);
                source = 'Google Books (FREE)';
                
                // Try DPLA if no cover found
                if (!coverUrl && DPLA_API_KEY) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    coverUrl = await getCoverFromDPLA(book);
                    source = 'DPLA (FREE)';
                }
                
                // Try Archive.org
                if (!coverUrl) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    coverUrl = await getCoverFromArchive(book);
                    source = 'Archive.org (FREE)';
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
            
            // Rate limiting delay between books
            if (processed < booksToProcess.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        }
        
        // Batch delay (except for last batch)
        if (batchEnd < booksToProcess.length) {
            console.log(`\n⏱️  Waiting ${BATCH_DELAY_MS/1000} seconds before next batch...`);
            console.log(`📊 API calls so far: Google: ${apiCalls.google}, DPLA: ${apiCalls.dpla}, Archive: ${apiCalls.archive}`);
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
        }
    }
    
    const successRate = processed > 0 ? Math.round((successful / (processed - skipped)) * 100) : 0;
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎉 Acquisition Complete (100% FREE):`);
    console.log(`   Processed: ${processed} books`);
    console.log(`   Successful: ${successful} covers`);
    console.log(`   Failed: ${failed} attempts`);
    console.log(`   Skipped: ${skipped} (already exist)`);
    console.log(`   Success rate: ${successRate}% (of attempted)`);
    
    console.log(`\n📊 API Usage (all free):`);
    console.log(`   Google Books: ${apiCalls.google} calls`);
    console.log(`   DPLA: ${apiCalls.dpla} calls`);
    console.log(`   Archive.org: ${apiCalls.archive} calls`);
    console.log(`   Total API calls: ${apiCalls.total}`);
    
    console.log(`\n💰 Total cost: $0.00`);
    
    if (start + processed < candidates.length) {
        console.log(`\n💡 To continue from where you left off:`);
        console.log(`   node acquire-covers-respectful.js --start ${start + processed} --limit ${limit}`);
    }
}

// Run the acquisition
acquireCovers().catch(console.error);