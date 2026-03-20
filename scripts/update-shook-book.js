#!/usr/bin/env node
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const CSV_PATH = 'src/_data/books.csv';

// Read CSV
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

// Find and update the Melissa Shook book (ID 1758)
const book = records.find(r => r.id === '1758');

if (!book) {
    console.error('Book ID 1758 not found');
    process.exit(1);
}

console.log('Current record:');
console.log(`  Title: ${book.title}`);
console.log(`  Description length: ${book.description?.length || 0} chars`);

// Update with enriched information
book.description = `Complete series of 192 daily self-portraits photographed by Melissa Shook (1939-2020) in her Lower East Side apartment from December 1972 to August 1973. Shot in medium format black and white, the project titled "To Prove That I Exist" stands at the forefront of conceptual feminist art from this formative period. The photographs capture Shook in a variety of intimate, irreverent poses that reject the tradition of female portraiture made from a male perspective, documenting the mundanity of everyday existence: nursing her ailing toe on the couch, sitting at the kitchen table with a friend, hair wrapped in a towel post-shower, dancing with her daughter. Often includes her daughter and friends who populate her sphere. Shook pioneered diaristic approaches to photography that intertwined the personal and social, exploring identity, time, motherhood, and gender through daily documentation. Published posthumously as her first monograph. Nominated for First PhotoBook Award, Paris Photo–Aperture PhotoBook Awards 2024. Work held in major collections including MoMA, The Metropolitan Museum of Art, Nelson-Atkins Museum of Art, and Moderna Museet Stockholm.`;

book.contributors = 'Essay by Sally Stein';
book.num_images = '198'; // 198 duotone plates per sources
book.notes = 'First monograph by American artist Melissa Shook (1939-2020). Posthumous publication. Contains 198 duotone plates. Nominated for First PhotoBook Award, Paris Photo–Aperture PhotoBook Awards 2024. Artist studied at Bard College and Art Students League of New York, based in Chelsea, Massachusetts. Project started as personal challenge to take self-portrait every day for a year.';
book.artist_url = 'http://www.melissashook.com/selfportraits';
book.publisher_url = 'https://tbwbooks.com/products/daily-self-portraits-1972-1973';

console.log('\nUpdated record:');
console.log(`  Description length: ${book.description.length} chars`);
console.log(`  Contributors: ${book.contributors}`);
console.log(`  Number of images: ${book.num_images}`);
console.log(`  Notes length: ${book.notes.length} chars`);

// Write back
const headers = Object.keys(records[0]);
const output = stringify(records, { header: true, columns: headers });
fs.writeFileSync(CSV_PATH, output);

console.log('\n✅ Book record updated successfully');
