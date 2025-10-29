const fs = require('fs');

// Read the original Matsuda CSV to get full titles
const matsudaCSV = fs.readFileSync('/Users/m/Downloads/Matsuda Catalogs - Sheet1.csv', 'utf-8');
const matsudaLines = matsudaCSV.split('\n').slice(2); // Skip header rows

// Parse Matsuda CSV to extract full titles
const matsudaData = [];
matsudaLines.forEach((line) => {
    if (!line.trim() || line.trim().startsWith(',,,')) return;

    // Split by commas but handle quoted fields
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
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

    const series = fields[3] || '';
    if (!series || !series.includes('Nicole times')) return;

    const fullTitle = fields[5] || ''; // The actual collection title
    const year = fields[13] || '';
    const photographer = fields[9] || '';

    matsudaData.push({
        series,
        fullTitle,
        year,
        photographer
    });
});

// Read the books CSV to get IDs
const booksCSV = fs.readFileSync('./src/_data/books.csv', 'utf-8');
const lines = booksCSV.split('\n');

// Find Matsuda catalogs (IDs 1404-1439)
const matsudaCatalogs = [];

for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(/^(\d+),/);
    if (!match) continue;

    const id = parseInt(match[1]);
    if (id >= 1404 && id <= 1439) {
        const index = id - 1404;
        const data = matsudaData[index] || {};

        matsudaCatalogs.push({
            id,
            series: data.series || 'Nicole Times',
            fullTitle: data.fullTitle || '',
            year: data.year || '',
            photographer: data.photographer || ''
        });
    }
}

console.log(`Found ${matsudaCatalogs.length} Matsuda catalogs`);

// Sort catalogues by year in descending order (newest first)
matsudaCatalogs.sort((a, b) => {
    const yearA = parseInt(a.year) || 0;
    const yearB = parseInt(b.year) || 0;

    // Sort by year descending (newest first)
    if (yearB !== yearA) {
        return yearB - yearA;
    }

    // If same year, sort by volume number
    const volMatchA = a.series.match(/vol\.\s*(\d+)/i);
    const volMatchB = b.series.match(/vol\.\s*(\d+)/i);
    const volA = volMatchA ? parseInt(volMatchA[1]) : 0;
    const volB = volMatchB ? parseInt(volMatchB[1]) : 0;

    return volB - volA;
});

// Generate HTML for the matsuda-fashion-catalogs.html page
const catalogHTML = matsudaCatalogs.map((cat, index) => {
    // Extract volume number from series field
    const volMatch = cat.series.match(/vol\.\s*(\d+)/i);
    const volNum = volMatch ? parseInt(volMatch[1]) : (index + 1);
    const volumeText = volMatch ? `Vol.${volMatch[1]}` : `Vol.${volNum}`;

    const imageFilename = `matsuda_vol_${volNum.toString().padStart(2, '0')}.jpg`;

    const year = cat.year || '199X';

    // Build title: "Year - Nicole Times Vol.XX Full Collection Name"
    let displayTitle = `${year} - Nicole Times ${volumeText}`;

    // If we have a full collection title, add it
    if (cat.fullTitle && cat.fullTitle.trim()) {
        displayTitle += ` ${cat.fullTitle}`;
    }

    return `                <!-- === START: Matsuda Catalogue ${volNum} === -->
                <article class="item-card group bg-white rounded-lg overflow-hidden border border-gray-100">
                    <a href="/books/Matsuda_${cat.id}" class="block">
                        <div class="relative overflow-hidden aspect-[3/4] bg-gray-200 flex items-center justify-center">
                            <span class="text-gray-400 text-lg font-medium">Vol.${volNum}</span>
                        </div>
                        <div class="p-3 sm:p-4">
                            <h3 class="text-base font-semibold text-gray-800 group-hover:text-teal-600 transition-colors">
                                ${displayTitle}
                            </h3>
                            <p class="text-sm text-gray-500 mt-1 truncate">Matsuda Catalogue</p>
                        </div>
                    </a>
                </article>
                <!-- === END: Matsuda Catalogue ${volNum} === -->`;
}).join('\n\n');

// Write the HTML blocks to a file
fs.writeFileSync('./matsuda-catalog-html.txt', catalogHTML);

console.log('\n✓ Generated HTML blocks saved to matsuda-catalog-html.txt');
console.log('\nCatalog titles:');
matsudaCatalogs.forEach((cat, index) => {
    const volNum = index + 1;
    const volMatch = cat.series.match(/vol\.\s*(\d+)/i);
    const volumeText = volMatch ? `Vol.${volMatch[1]}` : `Vol.${volNum}`;
    const year = cat.year || '199X';
    let displayTitle = `${year} - Nicole Times ${volumeText}`;
    if (cat.fullTitle && cat.fullTitle.trim()) {
        displayTitle += ` ${cat.fullTitle}`;
    }
    console.log(`  ${volNum}. ${displayTitle}`);
});
