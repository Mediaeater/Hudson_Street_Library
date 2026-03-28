const fs = require('fs');
const path = require('path');

// Read CSV as text
const csvPath = path.join(__dirname, '../src/_data/books.csv');
let csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// New covers we just downloaded
const newCovers = {
  'The Girl Next Door': 'Prince_The_Girl_Next_Door.jpg',
  'Bibliothèque d\'un Amateur 1981-2014': 'Prince_Bibliotheque_1981_2014.jpg',
  'Grand Canyon, Inc. Percival, Everett': 'Prince_Grand_Canyon.jpg',
  'untitled (band) 2013/2014': 'Prince_Untitled_Band_2013_2014.jpg',
  'Richard Prince + Zach Sebastian': 'Prince_They_Started_It.jpg',
  'Richard prints and Zach Sebastian. They started it and will finish it zine 2 copies': 'Prince_They_Started_It.jpg',
  'Same man lp': 'Prince_Same_Man.png'
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
