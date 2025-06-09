const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const DELAY_MS = 1500; // Increased delay for better API success
const USER_AGENT = 'Hudson Street Library Digital Collection Tool';

// Read command line arguments
const args = process.argv.slice(2);
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 30;

console.log(`🎯 Starting high-priority book cover acquisition (limit: ${limit})`);

// Enhanced HTTPS function with better error handling
function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, {
            headers: { 
                'User-Agent': USER_AGENT,
                'Accept': 'application/json, text/html, */*'
            },
            timeout: 15000
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

// Enhanced image download with better error handling
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const httpsUrl = url.replace(/^http:/, 'https:');
        const file = fs.createWriteStream(filepath);
        
        const request = https.get(httpsUrl, {
            headers: { 'User-Agent': USER_AGENT },
            timeout: 20000
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

// Enhanced Open Library with better ISBN handling
async function getCoverFromOpenLibrary(isbn) {
    try {
        // Try both ISBN formats
        const cleanISBN = isbn.replace(/-/g, '');
        const apiUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${cleanISBN}&format=json&jscmd=data`;
        const data = await httpsGet(apiUrl);
        
        const bookKey = `ISBN:${cleanISBN}`;
        if (data[bookKey] && data[bookKey].cover) {
            const cover = data[bookKey].cover;
            return cover.large || cover.medium || cover.small;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Enhanced Google Books with better parameters
async function getCoverFromGoogleBooks(isbn) {
    try {
        const cleanISBN = isbn.replace(/-/g, '');
        const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanISBN}&maxResults=1`;
        const data = await httpsGet(apiUrl);
        
        if (data.items && data.items.length > 0) {
            const book = data.items[0];
            if (book.volumeInfo && book.volumeInfo.imageLinks) {
                const images = book.volumeInfo.imageLinks;
                return images.large || images.medium || images.thumbnail || images.smallThumbnail;
            }
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Try WorldCat as additional source
async function getCoverFromWorldCat(isbn) {
    try {
        const cleanISBN = isbn.replace(/-/g, '');
        // WorldCat's cover API
        const coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanISBN}-L.jpg`;
        
        // Test if the image exists by attempting a HEAD request
        return new Promise((resolve) => {
            const request = https.request(coverUrl, { method: 'HEAD' }, (res) => {
                if (res.statusCode === 200) {
                    resolve(coverUrl);
                } else {
                    resolve(null);
                }
            });
            request.on('error', () => resolve(null));
            request.on('timeout', () => {
                request.destroy();
                resolve(null);
            });
            request.setTimeout(5000);
            request.end();
        });
    } catch (error) {
        return null;
    }
}

function cleanFilename(str) {
    return str.replace(/[^a-zA-Z0-9.-]/g, '_')
              .replace(/_+/g, '_')
              .replace(/^_|_$/g, '')
              .substring(0, 100);
}

function isValidISBN(isbn) {
    const clean = isbn.replace(/[^0-9X]/g, '');
    return /^[0-9]{10}$/.test(clean) || /^[0-9]{13}$/.test(clean) || /^[0-9]{9}X$/.test(clean);
}

function calculatePriority(title, author, publisher, year, isbn) {
    let score = 0;
    
    const yearNum = parseInt(year);
    if (yearNum >= 2015) score += 30;
    else if (yearNum >= 2010) score += 20;
    else if (yearNum >= 2000) score += 10;
    
    const majorPublishers = ['Steidl', 'Aperture', 'Phaidon', 'Thames & Hudson', 'MOMA', 'Hatje Cantz', 'Damiani'];
    if (majorPublishers.some(pub => publisher.toLowerCase().includes(pub.toLowerCase()))) {
        score += 25;
    }
    
    if (/^978[0-9]{10}$/.test(isbn.replace(/-/g, ''))) {
        score += 15;
    } else if (/^[0-9]{9}[0-9X]$/.test(isbn.replace(/-/g, ''))) {
        score += 10;
    }
    
    return score;
}

function getExistingFiles() {
    try {
        return new Set(fs.readdirSync(IMAGES_DIR).map(f => f.toLowerCase()));
    } catch (error) {
        return new Set();
    }
}

function findHighPriorityTargets() {
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
    const existingFiles = getExistingFiles();
    
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
        
        const cleanISBN = isbn.replace(/"/g, '').trim();
        const cleanTitle = title.replace(/"/g, '').trim();
        const cleanAuthor = author.replace(/"/g, '').trim();
        const cleanPublisher = publisher.replace(/"/g, '').trim();
        const cleanYear = year.replace(/"/g, '').trim();
        
        if (!hasImage && isValidISBN(cleanISBN)) {
            const filename = cleanFilename(`${cleanAuthor}_${cleanTitle}_${cleanISBN}`) + '.jpg';
            
            if (!existingFiles.has(filename.toLowerCase())) {
                const priority = calculatePriority(cleanTitle, cleanAuthor, cleanPublisher, cleanYear, cleanISBN);
                
                candidates.push({
                    title: cleanTitle,
                    author: cleanAuthor,
                    publisher: cleanPublisher,
                    year: cleanYear,
                    isbn: cleanISBN,
                    filename: filename,
                    priority: priority
                });
            }
        }
    }
    
    return candidates.sort((a, b) => b.priority - a.priority);
}

async function acquireHighPriorityCovers() {
    const allCandidates = findHighPriorityTargets();
    console.log(`📚 Found ${allCandidates.length} high-priority targets`);
    
    const candidates = allCandidates.slice(0, limit);
    console.log(`🎯 Processing top ${candidates.length} high-priority books...\n`);
    
    if (candidates.length === 0) {
        console.log('🎉 No high-priority targets found!');
        return;
    }
    
    let processed = 0;
    let successful = 0;
    let failed = 0;
    
    for (const book of candidates) {
        processed++;
        console.log(`[${processed}/${candidates.length}] ${book.title} by ${book.author}`);
        console.log(`   Publisher: ${book.publisher} (${book.year})`);
        console.log(`   ISBN: ${book.isbn} | Priority: ${book.priority}`);
        
        const filepath = path.join(IMAGES_DIR, book.filename);
        
        try {
            let coverUrl = null;
            let source = '';
            
            // Try Open Library first
            coverUrl = await getCoverFromOpenLibrary(book.isbn);
            if (coverUrl) {
                source = 'Open Library';
            } else {
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Try Google Books
                coverUrl = await getCoverFromGoogleBooks(book.isbn);
                if (coverUrl) {
                    source = 'Google Books';
                } else {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Try WorldCat
                    coverUrl = await getCoverFromWorldCat(book.isbn);
                    if (coverUrl) {
                        source = 'WorldCat';
                    }
                }
            }
            
            if (coverUrl) {
                await downloadImage(coverUrl, filepath);
                console.log(`   ✅ Downloaded from ${source}`);
                successful++;
            } else {
                console.log(`   ❌ No cover found in any source`);
                failed++;
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            failed++;
        }
        
        if (processed < candidates.length) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }
    
    const successRate = Math.round((successful / processed) * 100);
    console.log(`\n🎉 High-Priority Acquisition Complete:`);
    console.log(`   Processed: ${processed} books`);
    console.log(`   Successful: ${successful} covers`);
    console.log(`   Failed: ${failed} attempts`);
    console.log(`   Success rate: ${successRate}%`);
    console.log(`   Remaining high-priority targets: ${allCandidates.length - processed}`);
    
    if (successful > 0) {
        console.log(`\n📂 New covers saved to: ${IMAGES_DIR}`);
        console.log(`💡 Run image optimization to generate variants`);
    }
}

acquireHighPriorityCovers().catch(console.error);