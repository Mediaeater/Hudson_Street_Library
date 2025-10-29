const fs = require('fs');
const https = require('https');
const path = require('path');

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

console.log(`Found ${booksWithISBN.length} music books without covers\n`);

// Function to download image
function downloadImage(url, filepath, book) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    // Check if it's a real image (more than 1KB)
                    if (buffer.length > 1024) {
                        fs.writeFileSync(filepath, buffer);
                        console.log(`✓ Downloaded: ${book.title.substring(0, 60)} (${(buffer.length / 1024).toFixed(1)}KB)`);
                        resolve(true);
                    } else {
                        console.log(`✗ Too small: ${book.title.substring(0, 60)}`);
                        resolve(false);
                    }
                });
            } else {
                console.log(`✗ Status ${response.statusCode}: ${book.title.substring(0, 60)}`);
                resolve(false);
            }
        }).on('error', (err) => {
            console.log(`✗ Failed: ${book.title.substring(0, 60)} - ${err.message}`);
            resolve(false);
        });
    });
}

// Download images sequentially
async function downloadAll() {
    let successCount = 0;

    for (const book of booksWithISBN) {
        console.log(`\nTrying: ${book.title.substring(0, 70)}`);
        console.log(`ISBN: ${book.isbn}`);

        // Try LibraryThing's cover CDN endpoints
        const urls = [
            `https://covers.librarything.com/devkey/large/isbn/${book.isbn}`,
            `https://www.librarything.com/coverimages.php?isbn=${book.isbn}`,
        ];

        const filepath = path.join(musicDir, book.filename);

        let success = false;
        for (let i = 0; i < urls.length; i++) {
            console.log(`  Attempt ${i + 1}/${urls.length}: ${urls[i].substring(0, 60)}...`);
            success = await downloadImage(urls[i], filepath, book);
            if (success) break;

            // Small delay between attempts
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (success) successCount++;

        // Add a delay between books to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`\n✓ Successfully downloaded ${successCount} out of ${booksWithISBN.length} cover images from LibraryThing`);
}

downloadAll();
