const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const csv = fs.readFileSync('src/_data/books.csv', 'utf-8');
const records = parse(csv, { columns: true });

// Get next ID
const lastId = Math.max(...records.map(r => parseInt(r.id)));
const nextId = lastId + 1;

// Create new book record
const newBook = {
  id: nextId.toString(),
  author_last: 'Ledare',
  author_first: 'Leigh',
  author_full_name: 'Leigh Ledare',
  title: 'Double Bind',
  publisher: 'A.R.T. Press',
  publication_year: '2015',
  height_cm: '22.9',  // 9 inches
  width_cm: '15.2',   // 6 inches
  depth_cm: '',
  binding: 'Softcover',
  page_count: '264',
  edition_printrun: 'First edition',
  isbn_asin: '9780923183509',
  editor: 'Alejandro Cesarco',
  contributors: 'Conversation between Leigh Ledare and Rhea Anastas. Introduction by Rhea Anastas. Preface by Leigh Ledare. Edited by Alejandro Cesarco, assisted by Kylie Gilchrist',
  is_signed_inscribed: 'false',
  designer: 'Kristian Henson (HWGL)',
  description: `<p>Extended conversation between artist Leigh Ledare and art historian Rhea Anastas exploring Ledare's "Double Bind" installation, presented at The Box (Los Angeles, 2012) and Mitchell-Innes & Nash (New York, 2014). The publication documents their dialogue provoked by viewing the work, examining key concepts that structure both this project and Ledare's broader practice. Arranged in six thematic sections—viewing, systemic conditions, enactment, installation and mass media, genealogy, and affect—the book models "affective criticism" that responds across intimate and collective scales of artwork and viewership.</p>

<p>Ledare's "Double Bind" installation presents nearly one thousand photographs of the artist's ex-wife: half taken by Ledare, half by her current husband, according to a script conceived by Ledare and enacted by all three participants. These photographs are juxtaposed with a large collection of appropriated mass-media materials, creating overlaying comparative structures that investigate contradictions within cultural, psychological, and sexual dimensions of intimacy and heterosexual relationships. The work explores how personal relationships and representations exist within larger systemic and ideological frameworks.</p>

<p>The book features installation photography created exclusively by Ledare for publication, documenting the 2014 Mitchell-Innes & Nash exhibition. Anastas's introduction and Ledare's preface frame the dialogue, which unfolds as critical examination of the viewing experience and theoretical implications of the work. A chronology of "Double Bind" exhibitions and publications provides documentary context for the project's development across multiple iterations. The conversation format allows both participants to test ideas about social and aesthetic experience within an unfolding exchange.</p>

<p>Published by A.R.T. Press (A.rt R.esources T.ransfer) in 2015. Softcover, 6 × 9 inches, 264 pages. ISBN: 978-0-923183-50-9. Edited by Alejandro Cesarco with assistance from Kylie Gilchrist. Design by Kristian Henson (HWGL). Rhea Anastas is art historian and Professor at University of California, Irvine. Leigh Ledare's work examines social structures, intimacy, and representation through photography, installation, and conceptual practice. A Brooklyn Rail excerpt from the book appeared in February 2016.</p>`,
  artist_url: '',
  publisher_url: 'https://www.artresourcestransfer.org/press/leigh-ledare-rhea-anastas-double-bind',
  collection_grouping: '',
  tags: 'Art, Photography, Critical Theory, Contemporary Art',
  classification: 'Art',
  bisac: '',
  lcc: '',
  location: 'Hudson Street Library, NYC',
  accession_no: 'November 2015', // Older date format to keep off Recently Added
  featured: 'false',
  image_url: '',
  price: '',
  weight_g: '',
  language: 'English',
  num_images: '',
  notes: 'Published by A.R.T. Press (A.rt R.esources T.ransfer), 2015. Softcover, 6 × 9 inches (15.2 × 22.9 cm), 264 pages. ISBN: 978-0-923183-50-9. Conversation between artist Leigh Ledare and art historian Rhea Anastas about Ledare\'s "Double Bind" installation. Edited by Alejandro Cesarco, assisted by Kylie Gilchrist. Design by Kristian Henson (HWGL). Documents installations at The Box, Los Angeles (2012) and Mitchell-Innes & Nash, New York (2014). Features over 1,000 photographs of artist\'s ex-wife (split between Ledare and her current husband) plus mass-media materials. Six thematic sections: viewing, systemic conditions, enactment, installation and mass media, genealogy, and affect. Introduction by Anastas, preface by Ledare, chronology of exhibitions.',
  custom_page_url: ''
};

// Add to records
records.push(newBook);

// Write updated CSV
fs.writeFileSync('src/_data/books.csv', stringify(records, { header: true, quoted: true }));

console.log('✅ Added Leigh Ledare "Double Bind" (ID:', nextId, ')');
console.log('📚 Title:', newBook.title);
console.log('👤 Authors:', newBook.author_full_name, '& Rhea Anastas');
console.log('📅 Year:', newBook.publication_year);
console.log('📖 ISBN:', newBook.isbn_asin);
console.log('📍 Accession:', newBook.accession_no, '(will not appear in Recently Added)');
console.log('⚠️  Cover image needed');
