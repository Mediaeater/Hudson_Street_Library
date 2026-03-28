const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// Read CSV
const csvPath = path.join(__dirname, '../src/_data/books.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, {
  columns: false,
  skip_empty_lines: true,
  relax_quotes: true,
  escape: '"',
  quote: '"'
});

// Get all Prince image files
const imagesDir = path.join(__dirname, '../src/assets/images/books');
const allFiles = fs.readdirSync(imagesDir);
const princeFiles = allFiles.filter(f =>
  f.toLowerCase().includes('prince') &&
  (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.avif'))
);

console.log(`Found ${princeFiles.length} Prince image files`);

// Map titles to filenames
const titleToFile = {};
princeFiles.forEach(file => {
  titleToFile[file.toLowerCase()] = file;
});

let updatedCount = 0;

// Update records
records.forEach((record, idx) => {
  if (idx === 0) return; // Skip header

  const lastName = record[1];
  const firstName = record[2];
  const title = record[4];
  const imageUrl = record[29];

  if (lastName === 'Prince' && firstName === 'Richard') {
    // Skip if already has a proper image
    if (imageUrl && !imageUrl.includes('placeholder')) {
      return;
    }

    // Try to match with existing files
    const normalizedTitle = title
      .replace(/\s+/g, '_')
      .replace(/[^\w_]/g, '')
      .replace(/_+/g, '_');

    // Try different patterns
    const patterns = [
      `prince_${normalizedTitle.toLowerCase()}.jpg`,
      `prince_richard_${normalizedTitle.toLowerCase()}.jpg`,
      `richard_prince_${normalizedTitle.toLowerCase()}.jpg`,
      `richardprince_${normalizedTitle.toLowerCase()}.jpg`,
    ];

    let matchedFile = null;
    for (const pattern of patterns) {
      if (titleToFile[pattern]) {
        matchedFile = titleToFile[pattern];
        break;
      }
    }

    // Also try partial matches
    if (!matchedFile) {
      const titleWords = normalizedTitle.toLowerCase().split('_').filter(w => w.length > 3);
      for (const file of princeFiles) {
        const fileLower = file.toLowerCase();
        if (titleWords.every(word => fileLower.includes(word))) {
          matchedFile = file;
          break;
        }
      }
    }

    if (matchedFile) {
      record[29] = `/assets/images/books/${matchedFile}`;
      updatedCount++;
      console.log(`✓ Matched "${title}" -> ${matchedFile}`);
    } else {
      console.log(`✗ No match for "${title}"`);
    }
  }
});

// Write back
const output = stringify(records, {
  quote: '"',
  escape: '"',
  quoted: true
});

fs.writeFileSync(csvPath, output);
console.log(`\nUpdated ${updatedCount} image URLs`);
