const fs = require('fs');
const https = require('https');
const path = require('path');

// Load API key from .env
require('dotenv').config();
const GOOGLE_API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

if (!GOOGLE_API_KEY) {
    console.error('ERROR: GOOGLE_BOOKS_API_KEY not found in .env file');
    process.exit(1);
}

const booksCSV = fs.readFileSync('./src/_data/books.csv', 'utf-8');
const lines = booksCSV.split('\n');

// Create directory if it doesn't exist
const musicDir = './src/assets/images/music';
if (!fs.existsSync(musicDir)) {
    fs.mkdirSync(musicDir, { recursive: true });
}

const booksWithISBN = [];

// Parse CSV and find music books with valid ISBNs that don't have covers yet
for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            fields.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    fields.push(current.trim());

    const id = parseInt(fields[0]);
    if (id >= 1440 && id <= 1484) {
        const title = fields[4] || '';
        const isbn = fields[13] || '';

        if (isbn && isbn !== 'NULL' && isbn !== '' && isbn !== 'NA') {
            const cleanISBN = isbn.replace(/[-\s]/g, '');
            const safeTitle = title
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_')
                .substring(0, 50);

            const filename = `music_${id}_${safeTitle}.jpg`;
            const filepath = path.join(musicDir, filename);

            // Only add if we don't already have the cover
            if (!fs.existsSync(filepath)) {
                booksWithISBN.push({
                    id,
                    title,
                    isbn: cleanISBN,
                    filename
                });
            }
        }
    }
}

console.log(`Found ${booksWithISBN.length} music books without covers`);
console.log(`Using Google Books API with key: ${GOOGLE_API_KEY.substring(0, 10)}...\n`);

// Function to search Google Books API
function searchGoogleBooks(isbn) {
    return new Promise((resolve, reject) => {
        const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&key=${GOOGLE_API_KEY}`;

        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => data += chunk);
            response.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.items && json.items[0] && json.items[0].volumeInfo) {
                        const imageLinks = json.items[0].volumeInfo.imageLinks;
                        if (imageLinks) {
                            // Prefer larger images
                            const imageUrl = imageLinks.extraLarge ||
                                           imageLinks.large ||
                                           imageLinks.medium ||
                                           imageLinks.thumbnail ||
                                           imageLinks.smallThumbnail;
                            if (imageUrl) {
                                // Google Books returns http:// URLs, upgrade to https://
                                resolve(imageUrl.replace('http://', 'https://'));
                                return;
                            }
                        }
                    }
                    resolve(null);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', reject);
    });
}

// Function to download image
function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    if (buffer.length > 1024) {
                        fs.writeFileSync(filepath, buffer);
                        resolve(buffer.length);
                    } else {
                        resolve(0);
                    }
                });
            } else {
                resolve(0);
            }
        }).on('error', () => resolve(0));
    });
}

// Process all books
async function downloadAll() {
    let successCount = 0;

    for (const book of booksWithISBN) {
        console.log(`\nSearching: ${book.title.substring(0, 70)}`);
        console.log(`ISBN: ${book.isbn}`);

        try {
            // Search Google Books for cover URL
            const imageUrl = await searchGoogleBooks(book.isbn);

            if (!imageUrl) {
                console.log(`  ✗ No cover found in Google Books`);
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }

            console.log(`  → Found cover URL: ${imageUrl.substring(0, 60)}...`);

            // Download the image
            const filepath = path.join(musicDir, book.filename);
            const size = await downloadImage(imageUrl, filepath);

            if (size > 0) {
                console.log(`  ✓ Downloaded: ${(size / 1024).toFixed(1)}KB`);
                successCount++;
            } else {
                console.log(`  ✗ Download failed or image too small`);
            }

            // Rate limiting - Google Books allows 1000 requests per 100 seconds
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.log(`  ✗ Error: ${error.message}`);
        }
    }

    console.log(`\n✓ Successfully downloaded ${successCount} out of ${booksWithISBN.length} cover images from Google Books`);
}

downloadAll();
