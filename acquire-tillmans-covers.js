const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const DELAY_MS = 1000;
const USER_AGENT = 'Hudson Street Library Cover Acquisition Tool';

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

console.log(`🚀 Starting Wolfgang Tillmans book cover search`);

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
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        
        request.on('error', reject);
    });
}

// Download image
async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        const file = fs.createWriteStream(filepath);
        protocol.get(url, {
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
                        resolve(filepath);
                    }
                });
            });
        });
        
        file.on('error', err => {
            fs.unlinkSync(filepath);
            reject(err);
        });
    });
}

// Search APIs for Tillmans books
async function searchForTillmansCovers() {
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    const tillmansBooks = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        const authorLast = columns[headers.indexOf('author_last')] || '';
        const authorFull = columns[headers.indexOf('author_full_name')] || '';
        
        if (authorLast.toLowerCase().includes('tillmans') || 
            authorFull.toLowerCase().includes('wolfgang tillmans')) {
            
            tillmansBooks.push({
                id: columns[headers.indexOf('id')],
                title: columns[headers.indexOf('title')]?.replace(/"/g, '').trim(),
                author: authorFull.replace(/"/g, '').trim(),
                isbn: columns[headers.indexOf('isbn_asin')]?.replace(/"/g, '').trim(),
                publisher: columns[headers.indexOf('publisher')]?.replace(/"/g, '').trim(),
                year: columns[headers.indexOf('publication_year')]?.replace(/"/g, '').trim()
            });
        }
    }
    
    console.log(`📚 Found ${tillmansBooks.length} Wolfgang Tillmans books\n`);
    
    let successful = 0;
    let failed = 0;
    
    for (const book of tillmansBooks) {
        console.log(`\n🔍 Searching for: ${book.title}`);
        console.log(`   ISBN: ${book.isbn || 'No ISBN'}`);
        console.log(`   Publisher: ${book.publisher || 'Unknown'}`);
        console.log(`   Year: ${book.year || 'Unknown'}`);
        
        const filename = `Tillmans_Wolfgang-${book.title.replace(/[^a-zA-Z0-9]/g, '_')}_${book.isbn || book.id}.jpg`;
        const filepath = path.join(IMAGES_DIR, filename);
        
        if (fs.existsSync(filepath)) {
            console.log(`   ✅ Already exists`);
            successful++;
            continue;
        }
        
        try {
            let coverUrl = null;
            let source = '';
            
            // Try Google Books with enhanced search
            if (!coverUrl) {
                try {
                    const query = encodeURIComponent(`"Wolfgang Tillmans" "${book.title}"`);
                    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;
                    const data = await httpRequest(url);
                    
                    if (data.items && data.items.length > 0) {
                        for (const item of data.items) {
                            const imageLinks = item.volumeInfo?.imageLinks;
                            if (imageLinks) {
                                coverUrl = imageLinks.extraLarge || imageLinks.large || 
                                         imageLinks.medium || imageLinks.thumbnail;
                                if (coverUrl) {
                                    coverUrl = coverUrl.replace('http:', 'https:');
                                    source = 'Google Books';
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {}
            }
            
            // Try Open Library with ISBN if available
            if (!coverUrl && book.isbn && /^\d{9,13}[\dX]?$/.test(book.isbn.replace(/-/g, ''))) {
                try {
                    const url = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
                    const response = await httpRequest(url).catch(() => null);
                    if (response) {
                        coverUrl = url;
                        source = 'Open Library';
                    }
                } catch (e) {}
            }
            
            // Try Archive.org
            if (!coverUrl) {
                try {
                    const query = encodeURIComponent(`"Wolfgang Tillmans" AND "${book.title}"`);
                    const url = `https://archive.org/advancedsearch.php?q=${query}&fl=identifier,title&output=json&rows=5`;
                    const data = await httpRequest(url);
                    
                    if (data.response && data.response.docs.length > 0) {
                        for (const doc of data.response.docs) {
                            const coverCheck = `https://archive.org/services/img/${doc.identifier}`;
                            try {
                                await httpRequest(coverCheck);
                                coverUrl = coverCheck;
                                source = 'Archive.org';
                                break;
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
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
        
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
    
    console.log(`\n🎉 Wolfgang Tillmans Cover Search Complete:`);
    console.log(`   Total books: ${tillmansBooks.length}`);
    console.log(`   Successful: ${successful}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Success rate: ${Math.round((successful / tillmansBooks.length) * 100)}%`);
}

// Run the search
searchForTillmansCovers().catch(console.error);