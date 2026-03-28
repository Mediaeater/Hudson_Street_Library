const fs = require('fs');
const path = require('path');

// Read CSV as text
const csvPath = path.join(__dirname, '../src/_data/books.csv');
let csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// Get all Prince image files
const imagesDir = path.join(__dirname, '../src/assets/images/books');
const allFiles = fs.readdirSync(imagesDir);
const princeFiles = allFiles.filter(f =>
  f.toLowerCase().includes('prince') &&
  (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.avif'))
);

console.log(`Found ${princeFiles.length} Prince image files\n`);

// Manual mappings based on file inspection
const titleToImage = {
  'Jokes & Cartoons': 'Prince_Jokes_and_Cartoons.jpg',
  'Naked Nurses': 'RichardPrince-Naked_Nurses.jpg',
  'Richard Prince - The Gug': 'Prince_The_Fug.jpg',
  'Richard Prince Super Group': 'Richard-Prince-Super-Group-Hardcover-9783947127016_79a83c68-ec69-431c-8e50-2e679ef99f30.b27641586aedf186df22f06247c2f543.avif',
  'Cowboys': 'Prince_Cowboy.jpg',
  'New Paintings': 'Prince_Check_Paintings.jpg',
  'Purple Book': 'Prince_Bettie_Kline_Purple_Pocket_Book.jpg',
  'Spinster poems': 'Prince_The_Spinsters_Poems.jpg',
  'Super group': 'Prince_Super_Group.jpg',
  '1234': 'Prince_1234.jpg',
  'Freaks': 'Richard_Prince_Freaks.jpg',
  'Richard Prince Everyday': 'Richard_Prince_Everyday.jpg',
  'Richard Prince': 'Prince_Richard_Prince.jpg',
  'Lynn Valley 1': 'Prince_Lynn_Valley_1.jpg',
  'Yea Yea Yea - SUTCLIFFE, Stuart and Richard Prince': 'Prince_Yea_Yea_Yea_Sutcliffe.jpg',
  'The outdoor coed, topless pop fiction appreciation society': 'Prince_The_Outdoor_Coed_Topless.jpg',
  'We go to the movies alone': 'Prince_We_Go_To_The_Movies_Alone.jpg',
  'Richard prince, the karpedas collection-': 'Prince_Karpedas_Collection.jpg',
  'Richard Prince - Tiffany Paintings': 'Prince_Tiffany_Paintings.jpg',
  '1234 Instagram recordings, volume 12': 'RichardPrince-instagram-volume12.jpg',
  '1234 Instagram recordings, volume 9': 'Richardprince-instagram-volume-8.jpg',
  'Cowboys gagosian , Beverly Hills+': 'Prince_Cowboy.jpg',
  'Bibliothèque d\'un Amateur 1981-2014': 'Prince_Bibliotheque_1981-2014.jpg',
  'Canal zone yes Rasta': 'Prince_Canal_Zone_Appeal_Appendix.jpg',
  'les presses du réel': 'Prince_Les_Presses_Du_Reel.jpg',
  'The Entertainers': 'Prince_The_Entertainers.jpg',
  'Gangs': 'Prince_Gangs.jpg',
  'Early Photography 1977–87': 'Prince_Early_Photography_1977_87.jpg'
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
  // This is a simple approach - look for the title between quotes
  const match = line.match(/"Prince","Richard","Richard Prince","([^"]+)"/);
  if (!match) return line;

  const title = match[1];
  const imageFile = titleToImage[title];

  if (imageFile) {
    const newLine = line.replace(
      '/assets/images/placeholder-book-simple.svg',
      `/assets/images/books/${imageFile}`
    );
    updatedCount++;
    console.log(`✓ Updated: "${title}" -> ${imageFile}`);
    return newLine;
  } else {
    console.log(`✗ No mapping for: "${title}"`);
    return line;
  }
});

// Write back
fs.writeFileSync(csvPath, updatedLines.join('\n'));
console.log(`\nUpdated ${updatedCount} records`);
