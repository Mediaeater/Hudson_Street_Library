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

// Parse CSV and find music books with valid ISBNs
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

            booksWithISBN.push({
                id,
                title,
                isbn: cleanISBN,
                filename: `music_${id}_${safeTitle}.jpg`
            });
        }
    }
}

console.log(`Found ${booksWithISBN.length} music books with valid ISBNs\n`);

// Function to download image
function downloadImage(url, filepath, book) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                const file = fs.createWriteStream(filepath);
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    console.log(`✓ Downloaded: ${book.title.substring(0, 60)}`);
                    resolve(true);
                });
            } else if (response.statusCode === 404) {
                console.log(`✗ Not found: ${book.title.substring(0, 60)}`);
                resolve(false);
            } else {
                console.log(`✗ Error ${response.statusCode}: ${book.title.substring(0, 60)}`);
                resolve(false);
            }
        }).on('error', (err) => {
            console.log(`✗ Failed: ${book.title.substring(0, 60)} - ${err.message}`);
            resolve(false);
        });
    });
}

// Download images sequentially to avoid overwhelming the server
async function downloadAll() {
    let successCount = 0;

    for (const book of booksWithISBN) {
        const url = `https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`;
        const filepath = path.join(musicDir, book.filename);

        // Skip if file already exists
        if (fs.existsSync(filepath)) {
            console.log(`⊙ Already exists: ${book.title.substring(0, 60)}`);
            successCount++;
            continue;
        }

        const success = await downloadImage(url, filepath, book);
        if (success) successCount++;

        // Add a small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✓ Successfully downloaded ${successCount} out of ${booksWithISBN.length} cover images`);
}

downloadAll();
