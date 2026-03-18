const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const csvPath = path.join(__dirname, '../src/_data/books.csv');

// Read existing CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

// Get next ID
const maxId = Math.max(...records.map(r => parseInt(r.id)));
let nextId = maxId + 1;

// Books to add
const booksToAdd = [
  {
    author_last: 'Ethridge',
    author_first: 'Roe',
    author_full_name: 'Roe Ethridge',
    title: '321',
    publisher: 'MACK',
    publication_year: '2021',
    height_cm: '21',
    width_cm: '16.5',
    binding: 'Softcover',
    pages: '64',
    isbn_asin: '9781913620509',
    edition_printrun: 'Limited edition zine',
    description: 'Visual journal documenting Ethridge\'s month in Paris during spring 2021, between commissions. Paris was drained of tourists and under curfew. Ethridge walked the city thinking about NFTs and Eugène Atget, producing this distinctive visual journal of an in-between moment.',
    classification: 'Individual Photographer Monograph',
    tags: 'Photography, Art, Paris, Documentary',
    accession_no: '2021',
    location: 'Hudson Street Library',
    image_url: '/assets/images/books/ethridge_roe_321_9781913620509.jpg'
  },
  {
    author_last: 'Ethridge',
    author_first: 'Roe',
    author_full_name: 'Roe Ethridge',
    title: 'American Spirit',
    publisher: 'Karma',
    publication_year: '2017',
    height_cm: '32.4',
    width_cm: '24.1',
    binding: 'Softcover',
    pages: '72',
    isbn_asin: '9781942607670',
    description: 'An unabashedly gorgeous collection of mountainous vistas and meta-advertising spreads that riff on the name of the eponymous cigarette brand. Wide-open views of Western peaks are interspersed with close-shot portraits, still lifes and consumer imagery, a Manifest Destiny atlas for the post-internet era. Features twenty-six pages devoted to pictures of Ethridge\'s drive through the Rocky Mountains in January 2017, with landscapes grouped according to the three-day period over which they were taken: January 19th, 20th, and 21st, the days before, during, and after the Presidential Inauguration.',
    classification: 'Individual Photographer Monograph',
    tags: 'Photography, Landscape, American Photography, Conceptual Photography',
    accession_no: '2017',
    location: 'Hudson Street Library',
    image_url: '/assets/images/books/ethridge_roe_american_spirit_9781942607670.jpg'
  },
  {
    author_last: 'Ethridge',
    author_first: 'Roe',
    author_full_name: 'Roe Ethridge',
    title: 'Beach Umbrella',
    publisher: 'Polychronic',
    publication_year: '2020',
    height_cm: '30.2',
    width_cm: '25',
    binding: 'Softcover',
    pages: '36',
    edition_printrun: 'Signed by the artist, includes sheet of stickers',
    is_signed_inscribed: 'true',
    description: 'Photographs of discarded beach umbrellas at Rockaway Beach, New York, captured over four Mondays in July and August 2020. Positioned against the sun, shot from beneath, and cropped to the point of near abstraction, the umbrellas fill each image from edge to edge with vibrant color. Also includes photographs of sunflowers from a public school garden in Clinton Hill, Brooklyn, and images from a fashion story with model Maryel Sousa.',
    classification: 'Individual Photographer Monograph',
    tags: 'Photography, Beach, Rockaway, New York, Abstract Photography',
    accession_no: '2020',
    location: 'Hudson Street Library',
    image_url: '/assets/images/books/ethridge_roe_beach_umbrella.jpg'
  },
  {
    author_last: 'Ethridge',
    author_first: 'Roe',
    author_full_name: 'Roe Ethridge',
    title: 'County Line',
    publisher: 'Self-published',
    publication_year: '2005',
    height_cm: '25',
    width_cm: '20',
    binding: 'Softcover',
    pages: '36',
    edition_printrun: 'Reissued in In the Beginning (2026)',
    description: 'Turns to the liminal spaces of Queens and Nassau County, abstracting the language of the strip mall into a concrete-poetry of word-photographs that sit against other images evoking the blurry edges of the suburban sprawl. One of three formative self-published books from 2004-05.',
    notes: 'Originally self-published in 2005. Reissued as part of the three-volume set "In the Beginning" by Loose Joints in 2026.',
    classification: 'Individual Photographer Monograph',
    tags: 'Photography, Suburban, Queens, New York, Conceptual Photography',
    accession_no: '2005',
    location: 'Hudson Street Library',
    image_url: '/assets/images/books/ethridge_roe_county_line.jpg'
  },
  {
    author_last: 'Ethridge',
    author_first: 'Roe',
    author_full_name: 'Roe Ethridge',
    title: 'Double Hysterical Historical',
    publisher: '',
    publication_year: '2005',
    binding: 'Softcover',
    description: '',
    classification: 'Individual Photographer Monograph',
    tags: 'Photography',
    accession_no: '2005',
    location: 'Hudson Street Library',
    image_url: '/assets/images/books/ethridge_roe_double_hysterical_historical.jpg'
  },
  {
    author_last: 'Ethridge',
    author_first: 'Roe',
    author_full_name: 'Roe Ethridge',
    title: 'Le Luxe',
    publisher: 'MACK',
    publication_year: '2012',
    binding: 'Hardcover',
    pages: '206',
    isbn_asin: '9781907946080',
    edition_printrun: 'Second edition, signed',
    is_signed_inscribed: 'true',
    description: 'Le Luxe encompasses Ethridge\'s practice from the past decade, plumbing his diverse image inventories from personal images and magazine commissions to an archive of online screen shots. The title references the French expression "C\'est pas du luxe," exploring the paradox of luxury as both superfluous and essential to existence. Includes a significant narrative thread: Ethridge\'s five-year documentation (2005-2010) of a Manhattan building adjacent to the World Trade Centre.',
    notes: 'Second edition released in 2012. Hardcover with embossed binding.',
    classification: 'Individual Photographer Monograph',
    tags: 'Photography, Art, Conceptual Photography',
    accession_no: '2012',
    location: 'Hudson Street Library',
    image_url: '/assets/images/books/ethridge_roe_le_luxe_9781907946080.jpg'
  },
  {
    author_last: 'Ethridge',
    author_first: 'Roe',
    author_full_name: 'Roe Ethridge',
    title: 'Orange Grove',
    publisher: 'Self-published',
    publication_year: '2004',
    height_cm: '25',
    width_cm: '20',
    binding: 'Softcover',
    pages: '16',
    edition_printrun: 'Booklet, reissued in In the Beginning (2026)',
    description: 'Distills photographs made in a dilapidated Florida orchard into a study of slow collapse, a familiar symbol of American plenty quietly withering on the tree. One of three formative self-published books from 2004-05.',
    notes: 'Originally self-published in 2004. Reissued as part of the three-volume set "In the Beginning" by Loose Joints in 2026.',
    classification: 'Individual Photographer Monograph',
    tags: 'Photography, Florida, Landscape, American Photography',
    accession_no: '2004',
    location: 'Hudson Street Library',
    image_url: '/assets/images/books/ethridge_roe_orange_grove.jpg'
  },
  {
    author_last: 'Ethridge',
    author_first: 'Roe',
    author_full_name: 'Roe Ethridge',
    title: 'Spare Bedroom',
    publisher: 'Self-published',
    publication_year: '2004',
    height_cm: '26',
    width_cm: '21',
    binding: 'Hardcover',
    pages: '80',
    isbn_asin: '9780975398302',
    edition_printrun: 'Limited edition of 1000 copies, reissued in In the Beginning (2026)',
    description: 'Begins Ethridge\'s career-long practice of jumbling and juxtaposing the commercial and the personal, in which an early commission for a furniture company unravels into a jagged mix of domestic scenes, catalogue imagery and loosely staged interiors. Nearly forty photographs evolved from a commission for Roy McMakin furniture makers.',
    notes: 'Originally self-published in 2004. Reissued as part of the three-volume set "In the Beginning" by Loose Joints in 2026.',
    classification: 'Individual Photographer Monograph',
    tags: 'Photography, Domestic, Commercial Photography, Art',
    accession_no: '2004',
    location: 'Hudson Street Library',
    image_url: '/assets/images/books/ethridge_roe_spare_bedroom_9780975398302.jpg'
  }
];

// Add books
booksToAdd.forEach(bookData => {
  const newBook = {
    id: nextId.toString(),
    author_last: bookData.author_last || '',
    author_first: bookData.author_first || '',
    author_full_name: bookData.author_full_name || '',
    title: bookData.title || '',
    publisher: bookData.publisher || '',
    publication_year: bookData.publication_year || '',
    height_cm: bookData.height_cm || '',
    width_cm: bookData.width_cm || '',
    depth_cm: bookData.depth_cm || '',
    binding: bookData.binding || '',
    pages: bookData.pages || '',
    edition_printrun: bookData.edition_printrun || '',
    isbn_asin: bookData.isbn_asin || '',
    lccn: bookData.lccn || '',
    oclc: bookData.oclc || '',
    is_signed_inscribed: bookData.is_signed_inscribed || 'false',
    editor: bookData.editor || '',
    description: bookData.description || '',
    author_url: bookData.author_url || '',
    publisher_url: bookData.publisher_url || '',
    classification: bookData.classification || '',
    tags: bookData.tags || '',
    contributors: bookData.contributors || '',
    designer: bookData.designer || '',
    notes: bookData.notes || '',
    collection_grouping: bookData.collection_grouping || '',
    location: bookData.location || '',
    accession_no: bookData.accession_no || '',
    image_url: bookData.image_url || '',
    custom_page_url: bookData.custom_page_url || '',
    number_of_photographs: bookData.number_of_photographs || '',
    number_of_illustrations: bookData.number_of_illustrations || '',
    related_urls: bookData.related_urls || '',
    price: '' // Never include price per memory instructions
  };

  records.push(newBook);
  console.log(`✅ Added: ${bookData.title} (ID: ${nextId})`);
  nextId++;
});

// Convert back to CSV
const output = stringify(records, { header: true, quoted: true });

// Write back to file
fs.writeFileSync(csvPath, output, 'utf-8');

console.log(`\n✅ Successfully added ${booksToAdd.length} books to CSV`);
