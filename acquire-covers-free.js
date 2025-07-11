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

// FREE API Keys (get these from respective services)
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY || ''; // Free from Google Cloud Console
const DPLA_API_KEY = process.env.DPLA_API_KEY || ''; // Free from dp.la
const EUROPEANA_API_KEY = process.env.EUROPEANA_API_KEY || ''; // Free from europeana.eu

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Read command line arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 50;

console.log(`🚀 Starting FREE book cover acquisition (limit: ${limit})`);
console.log('📚 Using only free APIs - no costs involved!\n');

// Helper function for HTTP requests
function httpRequest(url) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const request = protocol.get(url, {
            headers: { 
                'User-Agent': USER_AGENT,
                'Accept': 'application/json,image/*'
            },
            timeout: 10000
        }, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                httpRequest(new URL(res.headers.location, url).toString())
                    .then(resolve)
                    .catch(reject);
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
                } else if (res.statusCode === 404) {
                    resolve(null);
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

// Download image
async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const file = fs.createWriteStream(filepath);
        const request = protocol.get(url, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 30000
        }, (response) => {
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
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            reject(err);
        });
    });
}

// 1. Open Library (FREE, no key needed)
async function getCoverFromOpenLibrary(isbn, book) {
    try {
        // Try ISBN first if available
        if (isbn && isbn.length >= 9) {
            const coverUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
            // Test if exists by trying to download
            const testPath = path.join(IMAGES_DIR, 'test.jpg');
            try {
                await downloadImage(coverUrl, testPath);
                fs.unlinkSync(testPath);
                return coverUrl;
            } catch (e) {
                // Continue to try search API
            }
        }
        
        // Try searching by title and author
        if (book && (book.title || book.author)) {
            const query = encodeURIComponent(`${book.title || ''} ${book.author || ''}`.trim());
            const searchUrl = `https://openlibrary.org/search.json?q=${query}&limit=1`;
            
            const searchResults = await httpRequest(searchUrl);
            if (searchResults && searchResults.docs && searchResults.docs.length > 0) {
                const doc = searchResults.docs[0];
                
                // Try to get cover by various IDs
                if (doc.cover_i) {
                    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
                } else if (doc.isbn && doc.isbn.length > 0) {
                    return `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
                } else if (doc.oclc && doc.oclc.length > 0) {
                    return `https://covers.openlibrary.org/b/oclc/${doc.oclc[0]}-L.jpg`;
                } else if (doc.lccn && doc.lccn.length > 0) {
                    return `https://covers.openlibrary.org/b/lccn/${doc.lccn[0]}-L.jpg`;
                }
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// 2. Google Books (FREE with optional API key)
async function getCoverFromGoogleBooks(isbn, book) {
    try {
        const apiKeyParam = GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : '';
        let data = null;
        
        // Try ISBN first if available and valid
        if (isbn && isbn.length >= 9) {
            const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}${apiKeyParam}`;
            data = await httpRequest(apiUrl);
        }
        
        // If no results with ISBN, try various search strategies
        if (!data || !data.items || data.items.length === 0) {
            // Try exact title and author in quotes
            const exactQuery = encodeURIComponent(`intitle:"${book.title}" inauthor:"${book.author}"`);
            let apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${exactQuery}${apiKeyParam}&maxResults=3`;
            data = await httpRequest(apiUrl);
            
            // If still no results, try broader search
            if (!data || !data.items || data.items.length === 0) {
                const generalQuery = encodeURIComponent(`${book.title} ${book.author}`);
                apiUrl = `https://www.googleapis.com/books/v1/volumes?q=${generalQuery}${apiKeyParam}&maxResults=3`;
                data = await httpRequest(apiUrl);
            }
            
            // If we have multiple results, try to find best match
            if (data && data.items && data.items.length > 1) {
                const titleLower = book.title.toLowerCase();
                const authorLower = book.author.toLowerCase();
                
                // Find best match by title and author similarity
                const bestMatch = data.items.find(item => {
                    const volumeInfo = item.volumeInfo || {};
                    const itemTitle = (volumeInfo.title || '').toLowerCase();
                    const itemAuthors = (volumeInfo.authors || []).join(' ').toLowerCase();
                    
                    return itemTitle.includes(titleLower) || titleLower.includes(itemTitle) ||
                           itemAuthors.includes(authorLower) || authorLower.includes(itemAuthors);
                });
                
                if (bestMatch) {
                    data.items = [bestMatch];
                }
            }
        }
        
        if (data && data.items && data.items.length > 0) {
            const bookData = data.items[0];
            if (bookData.volumeInfo && bookData.volumeInfo.imageLinks) {
                const links = bookData.volumeInfo.imageLinks;
                // Get highest quality available
                const imageUrl = links.extraLarge || links.large || links.medium || 
                               links.small || links.thumbnail || links.smallThumbnail;
                
                // Remove zoom parameter and ensure https
                if (imageUrl) {
                    return imageUrl.replace('&zoom=1', '').replace('http:', 'https:');
                }
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 3. Archive.org (FREE, no key needed)
async function getCoverFromArchive(isbn, book) {
    try {
        let results = null;
        
        // Try ISBN search first if available
        if (isbn && isbn.length >= 9) {
            const searchUrl = `https://archive.org/advancedsearch.php?q=isbn:${isbn}&fl=identifier,title&output=json&rows=1`;
            results = await httpRequest(searchUrl);
        }
        
        // If no ISBN results, try multiple search strategies
        if (!results || !results.response || results.response.numFound === 0) {
            // Try exact title and author
            const exactQuery = encodeURIComponent(`title:"${book.title}" AND creator:"${book.author}"`);
            let searchUrl = `https://archive.org/advancedsearch.php?q=${exactQuery}&fl=identifier,title,creator&output=json&rows=3`;
            results = await httpRequest(searchUrl);
            
            // If no results, try title and author without quotes
            if (!results || !results.response || results.response.numFound === 0) {
                const query = encodeURIComponent(`title:(${book.title}) AND creator:(${book.author})`);
                searchUrl = `https://archive.org/advancedsearch.php?q=${query}&fl=identifier,title,creator&output=json&rows=3`;
                results = await httpRequest(searchUrl);
            }
            
            // Last resort: general text search
            if (!results || !results.response || results.response.numFound === 0) {
                const generalQuery = encodeURIComponent(`${book.title} ${book.author}`);
                searchUrl = `https://archive.org/advancedsearch.php?q=${generalQuery}&fl=identifier,title,creator&output=json&rows=3`;
                results = await httpRequest(searchUrl);
            }
        }
        
        if (results && results.response && results.response.docs && results.response.docs.length > 0) {
            // Try each result until we find one with a cover
            for (const doc of results.response.docs) {
                const identifier = doc.identifier;
                
                // Get item metadata
                const metadataUrl = `https://archive.org/metadata/${identifier}`;
                const metadata = await httpRequest(metadataUrl);
                
                // Look for cover image
                if (metadata && metadata.files) {
                    // Priority order for cover files
                    const coverFile = metadata.files.find(f => 
                        f.name.toLowerCase().includes('cover') && 
                        (f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.png'))
                    ) || metadata.files.find(f => 
                        f.format === 'JPEG Thumb' ||
                        f.format === 'Item Tile' ||
                        (f.name.includes('thumb') && f.name.endsWith('.jpg'))
                    );
                    
                    if (coverFile) {
                        return `https://archive.org/download/${identifier}/${encodeURIComponent(coverFile.name)}`;
                    }
                }
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 4. HathiTrust (FREE, no key needed for basic access)
async function getCoverFromHathiTrust(isbn, book) {
    try {
        let data = null;
        
        // Try ISBN first if available
        if (isbn && isbn.length >= 9) {
            const apiUrl = `https://catalog.hathitrust.org/api/volumes/brief/isbn/${isbn}.json`;
            data = await httpRequest(apiUrl);
        }
        
        // If no ISBN results, try title/author search
        if (!data || !data.items || data.items.length === 0) {
            // HathiTrust doesn't have a direct title/author search API for covers
            // But we can try the full catalog search
            const query = encodeURIComponent(`${book.title} ${book.author}`);
            const searchUrl = `https://catalog.hathitrust.org/api/volumes/full/json/${query}`;
            
            try {
                const searchData = await httpRequest(searchUrl);
                if (searchData && searchData.items && searchData.items.length > 0) {
                    data = searchData;
                }
            } catch (e) {
                // Search might fail, that's ok
            }
        }
        
        if (data && data.items && data.items.length > 0) {
            const htid = data.items[0].htid;
            // HathiTrust thumbnail URL pattern
            return `https://babel.hathitrust.org/cgi/imgsrv/cover?id=${htid};width=400`;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 5. Direct publisher URLs (FREE)
function getPublisherDirectUrl(book) {
    const publisher = book.publisher?.toLowerCase() || '';
    const isbn = book.isbn;
    
    // Steidl
    if (publisher.includes('steidl')) {
        return `https://steidl.de/Books/${isbn}`;
    }
    
    // Aperture
    if (publisher.includes('aperture')) {
        return `https://aperture.org/wp-content/uploads/${isbn}.jpg`;
    }
    
    // MACK
    if (publisher.includes('mack')) {
        return `https://mackbooks.co.uk/cdn/shop/products/${isbn}.jpg`;
    }
    
    // Phaidon
    if (publisher.includes('phaidon')) {
        return `https://www.phaidon.com/resource//${isbn}.jpg`;
    }
    
    return null;
}

// 6. DPLA - Digital Public Library of America (FREE with key)
async function getCoverFromDPLA(isbn, book) {
    if (!DPLA_API_KEY) return null;
    
    try {
        // Build more specific query
        let query = '';
        if (book.title && book.author) {
            // Try exact phrase search first
            query = `"${book.title}" AND "${book.author}"`;
        } else if (book.title) {
            query = `"${book.title}"`;
        } else if (book.author) {
            query = `"${book.author}"`;
        }
        
        const encodedQuery = encodeURIComponent(query);
        const apiUrl = `https://api.dp.la/v2/items?q=${encodedQuery}&sourceResource.type=image&api_key=${DPLA_API_KEY}&page_size=5`;
        const data = await httpRequest(apiUrl);
        
        if (data && data.docs && data.docs.length > 0) {
            // Look for best match with cover image
            for (const doc of data.docs) {
                if (doc.object) {
                    // Check if it's likely a book cover
                    const sourceResource = doc.sourceResource || {};
                    const title = (sourceResource.title || '').toLowerCase();
                    const description = (sourceResource.description || '').toLowerCase();
                    
                    // Prefer items that mention "cover" or match our book
                    if (title.includes('cover') || description.includes('cover') ||
                        title.includes(book.title.toLowerCase()) || 
                        (sourceResource.creator && sourceResource.creator.toString().toLowerCase().includes(book.author.toLowerCase()))) {
                        return doc.object;
                    }
                }
            }
            
            // If no specific cover match, return first with object
            if (data.docs[0].object) {
                return data.docs[0].object;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// 7. Europeana (FREE with key)
async function getCoverFromEuropeana(isbn, book) {
    if (!EUROPEANA_API_KEY) return null;
    
    try {
        // Build structured query
        let query = '';
        if (book.title && book.author) {
            query = `(title:"${book.title}" OR what:"${book.title}") AND (who:"${book.author}" OR creator:"${book.author}")`;
        } else if (book.title) {
            query = `title:"${book.title}" OR what:"${book.title}"`;
        } else if (book.author) {
            query = `who:"${book.author}" OR creator:"${book.author}"`;
        }
        
        const encodedQuery = encodeURIComponent(query);
        const apiUrl = `https://api.europeana.eu/record/v2/search.json?query=${encodedQuery}&qf=TYPE:IMAGE&qf=MIME_TYPE:image/jpeg&rows=5&wskey=${EUROPEANA_API_KEY}`;
        const data = await httpRequest(apiUrl);
        
        if (data && data.items && data.items.length > 0) {
            // Look for best quality image
            for (const item of data.items) {
                // Prefer items with larger previews
                if (item.edmPreview && item.edmPreview.length > 0) {
                    // Check if it might be a book cover
                    const title = (item.title || []).join(' ').toLowerCase();
                    const dcDescription = (item.dcDescription || []).join(' ').toLowerCase();
                    
                    if (title.includes('cover') || title.includes('couverture') || 
                        dcDescription.includes('cover') || dcDescription.includes('book') ||
                        title.includes(book.title.toLowerCase())) {
                        return item.edmPreview[0];
                    }
                }
            }
            
            // Return first available preview if no specific match
            if (data.items[0].edmPreview && data.items[0].edmPreview.length > 0) {
                return data.items[0].edmPreview[0];
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Clean filename
function cleanFilename(str) {
    return str.replace(/[^a-zA-Z0-9.-]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '')
              .substring(0, 100);
}

// Clean and normalize search query
function normalizeSearchQuery(str) {
    return str
        .replace(/[^\w\s'-]/g, ' ')  // Keep only alphanumeric, spaces, apostrophes, hyphens
        .replace(/\s+/g, ' ')         // Normalize multiple spaces
        .trim()
        .toLowerCase();
}

// Parse CSV
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
        
        const hasImage = imageUrl && imageUrl.trim() !== '' && 
                         imageUrl.trim() !== '""' && 
                         imageUrl.trim().toLowerCase() !== '"null"' && 
                         imageUrl.trim().toLowerCase() !== 'null';
        
        if (!hasImage) {
            const cleanISBN = isbn.replace(/"/g, '').trim();
            candidates.push({
                title: title.replace(/"/g, '').trim() || 'Unknown Title',
                author: author.replace(/"/g, '').trim() || 'Unknown Author',
                publisher: publisher.replace(/"/g, '').trim(),
                isbn: cleanISBN,
                hasValidISBN: /^\d{9,13}[\dX]?$/.test(cleanISBN.replace(/-/g, '')),
                filename: cleanFilename(`${author.replace(/"/g, '')}_${title.replace(/"/g, '')}_${cleanISBN || 'noISBN'}`) + '.jpg'
            });
        }
    }
    
    return candidates;
}

// Main acquisition function using only FREE APIs
async function acquireCovers() {
    const candidates = findCandidates();
    console.log(`📚 Found ${candidates.length} books needing covers`);
    
    // Show statistics about ISBN availability
    const withISBN = candidates.filter(c => c.hasValidISBN).length;
    const withoutISBN = candidates.length - withISBN;
    console.log(`   📖 Books with valid ISBN: ${withISBN}`);
    console.log(`   📚 Books without ISBN: ${withoutISBN} (will use title/author search)`);
    
    const booksToProcess = candidates.slice(0, limit);
    console.log(`🎯 Processing ${booksToProcess.length} books with FREE APIs...\n`);
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    const apiStats = {};
    
    for (const book of booksToProcess) {
        processed++;
        console.log(`[${processed}/${booksToProcess.length}] ${book.title} by ${book.author}`);
        console.log(`   ISBN: ${book.isbn || 'No ISBN'}`);
        
        const filepath = path.join(IMAGES_DIR, book.filename);
        
        if (fs.existsSync(filepath)) {
            console.log(`   ✅ Already exists`);
            successful++;
            continue;
        }
        
        try {
            let coverUrl = null;
            let source = '';
            
            // Try each FREE API in order - all now support title/author search
            const apis = [
                { name: 'Open Library', fn: () => getCoverFromOpenLibrary(book.isbn, book) },
                { name: 'Google Books', fn: () => getCoverFromGoogleBooks(book.isbn, book) },
                { name: 'Archive.org', fn: () => getCoverFromArchive(book.isbn, book) },
                { name: 'HathiTrust', fn: () => getCoverFromHathiTrust(book.isbn, book) },
                { name: 'Publisher Direct', fn: () => getPublisherDirectUrl(book) },
                { name: 'DPLA', fn: () => getCoverFromDPLA(book.isbn, book) },
                { name: 'Europeana', fn: () => getCoverFromEuropeana(book.isbn, book) }
            ];
            
            for (const api of apis) {
                if (!coverUrl) {
                    try {
                        console.log(`   🔍 Trying ${api.name}...`);
                        coverUrl = await api.fn();
                        if (coverUrl) {
                            source = api.name;
                            apiStats[api.name] = (apiStats[api.name] || 0) + 1;
                            break;
                        }
                    } catch (e) {
                        // Continue to next API
                    }
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
            
            if (coverUrl) {
                await downloadImage(coverUrl, filepath);
                console.log(`   ✅ Downloaded from ${source} (FREE)`);
                successful++;
            } else {
                console.log(`   ❌ No cover found`);
                failed++;
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            failed++;
        }
        
        if (processed < booksToProcess.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }
    
    const successRate = Math.round((successful / processed) * 100);
    console.log(`\n🎉 Acquisition Complete (100% FREE):`);
    console.log(`   Processed: ${processed} books`);
    console.log(`   Successful: ${successful} covers`);
    console.log(`   Failed: ${failed} attempts`);
    console.log(`   Success rate: ${successRate}%`);
    
    if (Object.keys(apiStats).length > 0) {
        console.log(`\n📊 API Usage (all free):`);
        Object.entries(apiStats).forEach(([api, count]) => {
            console.log(`   ${api}: ${count} covers`);
        });
    }
    
    console.log(`\n💰 Total cost: $0.00`);
    
    if (failed > 0) {
        console.log(`\n💡 To improve coverage (still free):`);
        if (!GOOGLE_API_KEY) console.log(`   - Get free Google Books API key: https://console.cloud.google.com`);
        if (!DPLA_API_KEY) console.log(`   - Get free DPLA API key: https://dp.la/developers`);
        if (!EUROPEANA_API_KEY) console.log(`   - Get free Europeana API key: https://pro.europeana.eu/page/apis`);
    }
}

// Run the acquisition
acquireCovers().catch(console.error);