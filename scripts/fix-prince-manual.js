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

// Manual mappings
const manualMappings = {
  'Cowboys': 'Prince_Cowboy.jpg',
  'Bibliothèque d\'un Amateur 1981-2014': 'Prince_Bibliotheque_1981-2014.jpg',
  '1234': 'Prince_1234.jpg',
  'Freaks': 'Richard_Prince_Freaks.jpg',
  'Richard Prince Everyday': 'Richard_Prince_Everyday.jpg',
  'Lynn Valley 1': 'Prince_Lynn_Valley_1.jpg',
  'Yea Yea Yea - SUTCLIFFE, Stuart and Richard Prince': 'Prince_Yea_Yea_Yea_Sutcliffe.jpg',
  'The outdoor coed, topless pop fiction appreciation society': 'Prince_The_Outdoor_Coed_Topless.jpg',
  'We go to the movies alone': 'Prince_We_Go_To_The_Movies_Alone.jpg',
  'Richard prince, the karpedas collection-': 'Prince_Karpedas_Collection.jpg',
  'Tiffany Paintings': 'Prince_Tiffany_Paintings.jpg',
  '1234 Instagram recordings, volume 12': 'RichardPrince-instagram-volume12.jpg',
  '1234 Instagram recordings, volume 9': 'Richardprince-instagram-volume-8.jpg', // Close enough
  'Cowboys gagosian , Beverly Hills+': 'Prince_Cowboy.jpg',
  'Frozen love Katz + dogg': 'Prince_Bettie_Kline_Purple_Pocket_Book.jpg' // Maybe?
};

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

    if (manualMappings[title]) {
      record[29] = `/assets/images/books/${manualMappings[title]}`;
      updatedCount++;
      console.log(`✓ Mapped "${title}" -> ${manualMappings[title]}`);
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
