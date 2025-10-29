const fs = require('fs');

// Read the books CSV to get music book IDs
const booksCSV = fs.readFileSync('./src/_data/books.csv', 'utf-8');
const lines = booksCSV.split('\n');

// Find Music Photobooks (IDs 1440-1484)
const musicBooks = [];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(/^(\d+),/);
    if (!match) continue;

    const id = parseInt(match[1]);
    if (id >= 1440 && id <= 1484) {
        // Parse the CSV line to get title and author
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

        const title = fields[4] || '';
        const authorFull = fields[3] || '';
        const year = fields[6] || '';

        musicBooks.push({
            id,
            title,
            author: authorFull,
            year
        });
    }
}

console.log(`Found ${musicBooks.length} music books`);

// Sort books alphabetically by title
musicBooks.sort((a, b) => a.title.localeCompare(b.title));

// Generate HTML for the music-photobooks.html page
const bookHTML = musicBooks.map((book, index) => {
    // Create a safe filename from title (lowercase, replace spaces with underscores, remove special chars)
    const safeTitle = book.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
    const imageFilename = `music_${book.id}_${safeTitle}.jpg`;

    let displayTitle = book.title;
    if (book.author && book.author.trim()) {
        displayTitle += ` by ${book.author}`;
    }

    return `                <!-- === START: Music Book ${index + 1} === -->
                <article class="item-card group bg-white rounded-lg overflow-hidden border border-gray-100">
                    <a href="/books/Music_${book.id}" class="block">
                        <div class="relative overflow-hidden aspect-[3/4] bg-gray-200">
                            <img src="/assets/images/music/${imageFilename}"
                                 alt="${displayTitle}"
                                 class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                 onload="this.style.display='block'"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
                            <div class="absolute inset-0 flex items-center justify-center" style="display:none">
                                <span class="text-gray-400 text-sm font-medium text-center px-2">Music Book</span>
                            </div>
                        </div>
                        <div class="p-3 sm:p-4">
                            <h3 class="text-base font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">
                                ${book.title}
                            </h3>
                            <p class="text-sm text-gray-500 mt-1 truncate">${book.author || 'Music Photography'}</p>
                        </div>
                    </a>
                </article>
                <!-- === END: Music Book ${index + 1} === -->`;
}).join('\n\n');

// Write the HTML blocks to a file
fs.writeFileSync('./music-books-html.txt', bookHTML);

console.log('\n✓ Generated HTML blocks saved to music-books-html.txt');
console.log('\nFirst 10 book titles:');
musicBooks.slice(0, 10).forEach((book, index) => {
    console.log(`  ${index + 1}. ${book.title}`);
});
