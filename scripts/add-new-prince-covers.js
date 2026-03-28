const fs = require('fs');
const path = require('path');

// Read CSV as text
const csvPath = path.join(__dirname, '../src/_data/books.csv');
let csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// New covers we just downloaded
const newCovers = {
  'The Magic Castle': 'Prince_The_Magic_Castle.jpg',
  'Second House': 'Prince_Second_House.jpg',
  'The Hippie Drawings': 'Prince_The_Hippie_Drawings.jpg',
  'Special Guest': 'Prince_Special_Guest.jpg',
  'Protest Paintings': 'Prince_Protest_Paintings.jpg'
};

let updatedCount = 0;

// Process each line
const updatedLines = lines.map((line, idx) => {
  if (idx === 0 || !line.includes('"Prince","Richard"')) {
    return line;
  }

  // Only process lines with placeholders
  if (!line.includes('placeholder-book-simple.svg')) {
    return line;
  }

  // Try to extract title (field 5, 0-indexed field 4)
  const match = line.match(/"Prince","Richard","Richard Prince","([^"]+)"/);
  if (!match) return line;

  const title = match[1];
  const imageFile = newCovers[title];

  if (imageFile) {
    const newLine = line.replace(
      '/assets/images/placeholder-book-simple.svg',
      `/assets/images/books/${imageFile}`
    );
    updatedCount++;
    console.log(`✓ Updated: "${title}" -> ${imageFile}`);
    return newLine;
  }

  return line;
});

// Write back
fs.writeFileSync(csvPath, updatedLines.join('\n'));
console.log(`\nUpdated ${updatedCount} records with new cover images`);
