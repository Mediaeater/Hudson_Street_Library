const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config();

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const DELAY_MS = 1000; // 1 second between API calls
const USER_AGENT = 'Hudson Street Library Cover Acquisition Tool';

// API Keys (set via environment variables)
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || '';
const LIBRARY_THING_KEY = process.env.LIBRARY_THING_API_KEY || '';

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read command line arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 50;

console.log(`🚀 Starting enhanced book cover acquisition (limit: ${limit})`);
if (GOOGLE_API_KEY) console.log('✅ Google Books API key detected');
if (LIBRARY_THING_KEY) console.log('✅ LibraryThing API key detected');

// Enhanced HTTPS request with redirect following
function httpsGetWithRedirects(url, redirectCount = 0) {
    return new Promise((resolve, reject) => {
        if (redirectCount > 5) {
            reject(new Error('Too many redirects'));
            return;
        }

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
                const redirectUrl = new URL(res.headers.location, url).toString();
                console.log(`   → Following redirect to: ${redirectUrl}`);
                httpsGetWithRedirects(redirectUrl, redirectCount + 1)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        // Try to parse as JSON first
                        resolve(JSON.parse(data));
                    } catch (e) {
                        // If not JSON, return raw data
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

// Enhanced download function with redirect support
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
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                file.close();
                fs.unlinkSync(filepath);
                const redirectUrl = new URL(response.headers.location, url).toString();
                downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
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
                    // Verify file size
                    const stats = fs.statSync(filepath);
                    if (stats.size < 1000) {
                        fs.unlinkSync(filepath);
                        reject(new Error('Image too small, likely invalid'));
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

// Enhanced Open Library API with better image URL handling
async function getCoverFromOpenLibrary(isbn) {
    try {
        // Try multiple ISBN formats
        const isbns = [isbn, isbn.replace(/-/g, '')];
        
        for (const testIsbn of isbns) {
            try {
                // First try the covers API directly
                const coverUrl = `https://covers.openlibrary.org/b/isbn/${testIsbn}-L.jpg`;
                const testResponse = await httpsGetWithRedirects(coverUrl);
                
                // If we get a response, the cover exists
                return coverUrl;
            } catch (error) {
                // Try the data API
                const apiUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${testIsbn}&format=json&jscmd=data`;
                const data = await httpsGetWithRedirects(apiUrl);
                
                const bookKey = `ISBN:${testIsbn}`;
                if (data[bookKey] && data[bookKey].cover) {
                    return data[bookKey].cover.large || data[bookKey].cover.medium || data[bookKey].cover.small;
                }
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// Enhanced Google Books API with API key support
async function getCoverFromGoogleBooks(isbn) {
    try {
        const apiKeyParam = GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : '';
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${apiKeyParam}`;
        const data = await httpsGetWithRedirects(apiUrl);
        
        if (data.items && data.items.length > 0) {
            const book = data.items[0];
            if (book.volumeInfo && book.volumeInfo.imageLinks) {
                // Get the highest quality available
                const links = book.volumeInfo.imageLinks;
                const imageUrl = links.extraLarge || links.large || links.medium || 
                               links.small || links.thumbnail || links.smallThumbnail;
                
                // Remove edge curl parameter for cleaner images
                return imageUrl ? imageUrl.replace('&edge=curl', '') : null;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// New: LibraryThing API
async function getCoverFromLibraryThing(isbn) {
    if (!LIBRARY_THING_KEY) return null;
    
    try {
        // LibraryThing uses a different approach
        const coverUrl = `https://covers.librarything.com/devkey/${LIBRARY_THING_KEY}/large/isbn/${isbn}`;
        
        // Test if image exists
        const response = await httpsGetWithRedirects(coverUrl);
        return coverUrl;
    } catch (error) {
        return null;
    }
}

// New: Try alternative identifiers
async function tryAlternativeIdentifiers(book) {
    // Try searching by title and author if ISBN fails
    if (!book.isbn || book.isbn.length < 10) {
        try {
            const query = encodeURIComponent(`${book.title} ${book.author}`);
            const apiKeyParam = GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : '';
            const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${query}${apiKeyParam}&maxResults=1`;
            
            const data = await httpsGetWithRedirects(apiUrl);
            
            if (data.items && data.items.length > 0) {
                const book = data.items[0];
                if (book.volumeInfo && book.volumeInfo.imageLinks) {
                    const links = book.volumeInfo.imageLinks;
                    return links.thumbnail || links.smallThumbnail;
                }
            }
        } catch (error) {
            return null;
        }
    }
    return null;
}

// Function to clean filename
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
    const yearIndex = headers.indexOf('publication_year');
    
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
        const year = columns[yearIndex] || '';
        
        // Check if missing image
        const hasImage = imageUrl && imageUrl.trim() !== '' && 
                         imageUrl.trim() !== '""' && 
                         imageUrl.trim().toLowerCase() !== '"null"' && 
                         imageUrl.trim().toLowerCase() !== 'null';
        
        // Clean ISBN
        const cleanISBN = isbn.replace(/"/g, '').trim();
        
        // Include books with problematic ISBNs for alternative search
        if (!hasImage) {
            candidates.push({
                title: title.replace(/"/g, '').trim() || 'Unknown Title',
                author: author.replace(/"/g, '').trim() || 'Unknown Author',
                publisher: publisher.replace(/"/g, '').trim(),
                year: year.replace(/"/g, '').trim(),
                isbn: cleanISBN,
                hasValidISBN: /^\d{9,13}[\dX]?$/.test(cleanISBN.replace(/-/g, '')),
                filename: cleanFilename(`${author.replace(/"/g, '')}_${title.replace(/"/g, '')}_${cleanISBN || 'noISBN'}`) + '.jpg'
            });
        }
    }
    
    return candidates;
}

// Enhanced acquisition function with multiple APIs and fallbacks
async function acquireCovers() {
    const candidates = findCandidates();
    console.log(`📚 Found ${candidates.length} books needing covers`);
    
    // Prioritize books with valid ISBNs
    const sortedCandidates = candidates.sort((a, b) => {
        if (a.hasValidISBN && !b.hasValidISBN) return -1;
        if (!a.hasValidISBN && b.hasValidISBN) return 1;
        return 0;
    });
    
    const booksToProcess = sortedCandidates.slice(0, limit);
    console.log(`🎯 Processing ${booksToProcess.length} books...\n`);
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    
    for (const book of booksToProcess) {
        processed++;
        console.log(`[${processed}/${booksToProcess.length}] ${book.title} by ${book.author}`);
        console.log(`   ISBN: ${book.isbn || 'No ISBN'} | Publisher: ${book.publisher || 'Unknown'}`);
        
        const filepath = path.join(IMAGES_DIR, book.filename);
        
        // Skip if file already exists
        if (fs.existsSync(filepath)) {
            console.log(`   ✅ Already exists`);
            successful++;
            continue;
        }
        
        try {
            let coverUrl = null;
            let source = '';
            
            if (book.hasValidISBN) {
                // Try Open Library first
                coverUrl = await getCoverFromOpenLibrary(book.isbn);
                source = 'Open Library';
                
                // Try Google Books
                if (!coverUrl) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    coverUrl = await getCoverFromGoogleBooks(book.isbn);
                    source = 'Google Books';
                }
                
                // Try LibraryThing
                if (!coverUrl && LIBRARY_THING_KEY) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    coverUrl = await getCoverFromLibraryThing(book.isbn);
                    source = 'LibraryThing';
                }
            }
            
            // Try alternative search for books without valid ISBNs
            if (!coverUrl) {
                await new Promise(resolve => setTimeout(resolve, 500));
                coverUrl = await tryAlternativeIdentifiers(book);
                source = 'Google Books (Title/Author search)';
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
    
    // Suggest next steps
    if (failed > 0) {
        console.log(`\n💡 Suggestions for failed covers:`);
        console.log(`   - Set GOOGLE_BOOKS_API_KEY environment variable for better rate limits`);
        console.log(`   - Get LibraryThing API key for rare book coverage`);
        console.log(`   - Consider manual acquisition for high-value titles`);
    }
}

// Run the acquisition
acquireCovers().catch(console.error);