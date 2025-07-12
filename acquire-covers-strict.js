#!/usr/bin/env node

/**
 * STRICT Book Cover Acquisition Script
 * Only downloads covers when there's a HIGH CONFIDENCE match
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios');
const dotenv = require('dotenv').config({ quiet: true });

// Configuration
const BOOKS_CSV = './src/_data/books.csv';
const COVERS_DIR = './src/assets/images/books';
const DELAY_BETWEEN_CALLS = 2000;
const DELAY_BETWEEN_BATCHES = 30000;
const BATCH_SIZE = 25;
const DEFAULT_LIMIT = 50;

// Strict matching thresholds
const AUTHOR_MATCH_THRESHOLD = 0.8; // 80% similarity required
const TITLE_MATCH_THRESHOLD = 0.8;   // 80% similarity required

// Calculate string similarity (Levenshtein distance based)
function similarity(s1, s2) {
    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();
    
    if (s1 === s2) return 1.0;
    
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

// Verify if API result matches our book
function verifyMatch(book, apiResult) {
    const { title: bookTitle, author: bookAuthor } = book;
    const { title: apiTitle, authors: apiAuthors } = apiResult;
    
    // Check title similarity
    const titleSimilarity = similarity(bookTitle, apiTitle || '');
    if (titleSimilarity < TITLE_MATCH_THRESHOLD) {
        return { match: false, reason: `Title mismatch: "${bookTitle}" vs "${apiTitle}" (${Math.round(titleSimilarity * 100)}% similar)` };
    }
    
    // Check author similarity
    if (!apiAuthors || apiAuthors.length === 0) {
        return { match: false, reason: 'No authors in API result' };
    }
    
    // Check if any API author matches our author
    let bestAuthorMatch = 0;
    let matchedAuthor = '';
    
    for (const apiAuthor of apiAuthors) {
        const authorSimilarity = similarity(bookAuthor, apiAuthor);
        if (authorSimilarity > bestAuthorMatch) {
            bestAuthorMatch = authorSimilarity;
            matchedAuthor = apiAuthor;
        }
    }
    
    if (bestAuthorMatch < AUTHOR_MATCH_THRESHOLD) {
        return { 
            match: false, 
            reason: `Author mismatch: "${bookAuthor}" vs "${matchedAuthor}" (${Math.round(bestAuthorMatch * 100)}% similar)` 
        };
    }
    
    return { match: true, confidence: (titleSimilarity + bestAuthorMatch) / 2 };
}

// API configurations with strict validation
const apis = {
    google: {
        name: 'Google Books',
        cost: 'FREE',
        url: (isbn) => `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
        urlByTitle: (title, author) => `https://www.googleapis.com/books/v1/volumes?q="${encodeURIComponent(title)}"+inauthor:"${encodeURIComponent(author)}"`,
        extractResult: (data) => {
            if (!data.items || !data.items[0]) return null;
            
            const item = data.items[0];
            const info = item.volumeInfo;
            
            return {
                title: info.title,
                authors: info.authors || [],
                coverUrl: info.imageLinks ? (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail) : null
            };
        }
    }
};

async function downloadImage(url, filepath) {
    try {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            timeout: 30000
        });
        
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });
    } catch (error) {
        throw error;
    }
}

async function tryDownloadCover(book, apiName) {
    const api = apis[apiName];
    const { title, author, isbn } = book;
    
    try {
        let url, response, result;
        
        // Try by ISBN first if available
        if (isbn && isbn !== 'No ISBN') {
            url = api.url(isbn);
            response = await axios.get(url, { timeout: 10000 });
            result = api.extractResult(response.data);
            
            if (result && result.coverUrl) {
                // For ISBN searches, we trust the result more but still verify
                const verification = verifyMatch(book, result);
                if (verification.match || verification.confidence > 0.7) {
                    const filename = `${author.replace(/[^a-zA-Z0-9.-]/g, '_')}_${title.replace(/[^a-zA-Z0-9.-]/g, '_')}_${isbn.replace(/[^a-zA-Z0-9.-]/g, '_')}.jpg`.substring(0, 200);
                    const filepath = path.join(COVERS_DIR, filename);
                    
                    await downloadImage(result.coverUrl, filepath);
                    return { 
                        success: true, 
                        api: api.name, 
                        filename,
                        confidence: verification.confidence || 0.9
                    };
                }
            }
        }
        
        // Try by title/author
        if (title && author) {
            url = api.urlByTitle(title, author);
            response = await axios.get(url, { timeout: 10000 });
            result = api.extractResult(response.data);
            
            if (result && result.coverUrl) {
                // Strict verification for title/author searches
                const verification = verifyMatch(book, result);
                
                if (verification.match) {
                    const filename = `${author.replace(/[^a-zA-Z0-9.-]/g, '_')}_${title.replace(/[^a-zA-Z0-9.-]/g, '_')}_${isbn.replace(/[^a-zA-Z0-9.-]/g, '_') || 'noISBN'}.jpg`.substring(0, 200);
                    const filepath = path.join(COVERS_DIR, filename);
                    
                    await downloadImage(result.coverUrl, filepath);
                    return { 
                        success: true, 
                        api: api.name, 
                        filename,
                        confidence: verification.confidence,
                        apiTitle: result.title,
                        apiAuthors: result.authors
                    };
                } else {
                    return { 
                        success: false, 
                        reason: verification.reason,
                        apiTitle: result.title,
                        apiAuthors: result.authors
                    };
                }
            }
        }
        
        return { success: false, reason: 'No results found' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function acquireCovers(startIndex = 0, limit = DEFAULT_LIMIT) {
    console.log('🚀 Starting STRICT book cover acquisition');
    console.log(`📚 Processing ${limit} books starting from index ${startIndex}`);
    console.log(`⏱️  Using ${DELAY_BETWEEN_CALLS/1000}s delays between calls, ${DELAY_BETWEEN_BATCHES/1000}s between batches`);
    console.log(`🎯 Requiring ${Math.round(AUTHOR_MATCH_THRESHOLD * 100)}% author match and ${Math.round(TITLE_MATCH_THRESHOLD * 100)}% title match`);
    console.log(`📦 Batch size: ${BATCH_SIZE} books\n`);
    
    // Read all books
    const allBooks = [];
    await new Promise((resolve, reject) => {
        fs.createReadStream(BOOKS_CSV)
            .pipe(csv())
            .on('data', (row) => {
                allBooks.push({
                    title: row.title || 'Unknown Title',
                    author: row.author_full_name || 'Unknown Author',
                    isbn: row.isbn_asin || 'No ISBN',
                    publisher: row.publisher || ''
                });
            })
            .on('end', resolve)
            .on('error', reject);
    });
    
    // Filter books needing covers
    const booksNeedingCovers = allBooks.filter(book => {
        const filename = `${book.author.replace(/[^a-zA-Z0-9.-]/g, '_')}_${book.title.replace(/[^a-zA-Z0-9.-]/g, '_')}_${book.isbn.replace(/[^a-zA-Z0-9.-]/g, '_') || 'noISBN'}.jpg`.substring(0, 200);
        const coverPath = path.join(COVERS_DIR, filename);
        return !fs.existsSync(coverPath);
    });
    
    console.log(`📚 Found ${booksNeedingCovers.length} books needing covers\n`);
    
    const endIndex = Math.min(startIndex + limit, booksNeedingCovers.length);
    const booksToProcess = booksNeedingCovers.slice(startIndex, endIndex);
    
    if (booksToProcess.length === 0) {
        console.log('✅ No books to process in this range');
        return;
    }
    
    console.log(`🎯 Processing books ${startIndex + 1} to ${endIndex} of ${booksNeedingCovers.length}\n`);
    
    let stats = {
        processed: 0,
        successful: 0,
        failed: 0,
        skipped: 0,
        rejected: 0
    };
    
    // Process in batches
    const numBatches = Math.ceil(booksToProcess.length / BATCH_SIZE);
    
    for (let batchNum = 0; batchNum < numBatches; batchNum++) {
        const batchStart = batchNum * BATCH_SIZE;
        const batchEnd = Math.min(batchStart + BATCH_SIZE, booksToProcess.length);
        const batch = booksToProcess.slice(batchStart, batchEnd);
        
        console.log(`\n📦 Batch ${batchNum + 1}/${numBatches} (${batch.length} books)`);
        console.log('─'.repeat(50));
        
        for (let i = 0; i < batch.length; i++) {
            const book = batch[i];
            const globalIndex = startIndex + batchStart + i;
            
            console.log(`[${globalIndex + 1}/${booksNeedingCovers.length}] ${book.title} by ${book.author}`);
            console.log(`   ISBN: ${book.isbn}`);
            
            // Check if cover already exists (in case of duplicate entries)
            const filename = `${book.author.replace(/[^a-zA-Z0-9.-]/g, '_')}_${book.title.replace(/[^a-zA-Z0-9.-]/g, '_')}_${book.isbn.replace(/[^a-zA-Z0-9.-]/g, '_') || 'noISBN'}.jpg`.substring(0, 200);
            const coverPath = path.join(COVERS_DIR, filename);
            
            if (fs.existsSync(coverPath)) {
                console.log(`   ✅ Already exists`);
                stats.skipped++;
                continue;
            }
            
            // Try Google Books (only free API for now)
            const result = await tryDownloadCover(book, 'google');
            
            if (result.success) {
                console.log(`   ✅ Downloaded from ${result.api} (${Math.round(result.confidence * 100)}% confidence)`);
                if (result.apiTitle) {
                    console.log(`      Matched: "${result.apiTitle}" by ${result.apiAuthors.join(', ')}`);
                }
                stats.successful++;
            } else if (result.reason && result.reason.includes('mismatch')) {
                console.log(`   ❌ REJECTED: ${result.reason}`);
                if (result.apiTitle) {
                    console.log(`      Found: "${result.apiTitle}" by ${result.apiAuthors ? result.apiAuthors.join(', ') : 'Unknown'}`);
                }
                stats.rejected++;
            } else {
                console.log(`   ❌ No cover found`);
                stats.failed++;
            }
            
            stats.processed++;
            
            // Rate limiting
            if (i < batch.length - 1) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_CALLS));
            }
        }
        
        // Delay between batches
        if (batchNum < numBatches - 1) {
            console.log(`\n⏱️  Waiting ${DELAY_BETWEEN_BATCHES/1000} seconds before next batch...`);
            console.log(`📊 Progress: ${stats.successful} downloaded, ${stats.rejected} rejected, ${stats.failed} not found`);
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
        }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Acquisition Complete:');
    console.log(`   Processed: ${stats.processed} books`);
    console.log(`   Successful: ${stats.successful} covers`);
    console.log(`   Rejected: ${stats.rejected} (poor matches)`);
    console.log(`   Failed: ${stats.failed} (not found)`);
    console.log(`   Skipped: ${stats.skipped} (already exist)`);
    
    if (stats.successful > 0) {
        console.log(`   Success rate: ${Math.round(stats.successful / (stats.successful + stats.failed + stats.rejected) * 100)}%`);
    }
    
    console.log(`\n💡 To continue from where you left off:`);
    console.log(`   node acquire-covers-strict.js --start ${endIndex} --limit ${limit}`);
}

// Parse command line arguments
const args = process.argv.slice(2);
let startIndex = 0;
let limit = DEFAULT_LIMIT;

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--start' && args[i + 1]) {
        startIndex = parseInt(args[i + 1]) || 0;
    }
    if (args[i] === '--limit' && args[i + 1]) {
        limit = parseInt(args[i + 1]) || DEFAULT_LIMIT;
    }
}

// Run acquisition
acquireCovers(startIndex, limit).catch(console.error);