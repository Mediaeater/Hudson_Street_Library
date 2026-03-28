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
  author_last: 'Kelley',
  author_first: 'Mike',
  author_full_name: 'Mike Kelley',
  title: 'NONMEMORY',
  publisher: 'Hauser & Wirth Publishers',
  publication_year: '2024',
  height_cm: '29.2',
  width_cm: '21.6',
  depth_cm: '',
  binding: 'Softcover',
  page_count: '216',
  edition_printrun: '',
  isbn_asin: '9783906915845',
  editor: '',
  contributors: 'Text by Jay Ezra Nayssan and Mike Kelley. Introduction by Mike Kelley Foundation for the Arts. Conversations with Kelly Akashi, Meriem Bennani, Beatriz Cortez, Raúl de Nieves, Olivia Erlanger, Lauren Halsey, Max Hooper Schneider, Kathryn Andrews, Miriam Ben Salah, Daniela Lieja Quintanar, Ceci Moss, Ruba Katrib, Jova Lynne, and Mary Clare Stevens',
  is_signed_inscribed: 'false',
  designer: '',
  description: `<p>Exhibition catalog documenting "NONMEMORY" at Hauser & Wirth Los Angeles (2023-2024), presenting works by Mike Kelley alongside seven contemporary artists: Kelly Akashi, Meriem Bennani, Beatriz Cortez, Raúl de Nieves, Olivia Erlanger, Lauren Halsey, and Max Hooper Schneider. This collaborative presentation explores "the 'non-memory' of the various institutional spaces or built environments" encountered throughout these artists' practices, building upon Kelley's foundational concept and influential essay "Architectural Non-memory Replaced with Psychic Reality."</p>

<p>Mike Kelley (1954-2012) was one of the most influential American artists of his generation, known for his provocative investigations into American vernacular culture, repressed memory, psychological trauma, and institutional critique. Working across sculpture, installation, performance, video, drawing, and critical writing, Kelley challenged high/low cultural distinctions through his use of craft materials, stuffed animals, found objects, and references to popular entertainment. His work examined how cultural institutions—educational systems, religious organizations, entertainment venues—shape and often damage individual psychology and collective memory.</p>

<p>"Architectural Non-memory Replaced with Psychic Reality," Kelley's seminal essay included in this volume, theorizes how institutional architecture produces collective amnesia while simultaneously encoding psychological experiences in built space. The seven contemporary artists featured alongside Kelley—each working with installation, sculpture, video, and mixed media—extend his investigations into institutional memory and architectural psychology. Their conversations with curators and scholars explore connections between physical spaces and psychic states, examining how contemporary artists continue to interrogate the relationship between built environments and buried memories.</p>

<p>Published by Hauser & Wirth Publishers in October 2024. Softcover, 29.2 × 21.6 cm, 216 pages. Text contributions by Jay Ezra Nayssan and Mike Kelley, with introduction by the Mike Kelley Foundation for the Arts. Features extensive conversations between the seven contemporary artists and curators including Kathryn Andrews, Miriam Ben Salah, Daniela Lieja Quintanar, Ceci Moss, Ruba Katrib, Jova Lynne, and Mary Clare Stevens. Mike Kelley's work is held in major collections including MoMA, Whitney Museum, Tate, Centre Pompidou, and Los Angeles County Museum of Art.</p>`,
  artist_url: '',
  publisher_url: 'https://shop.hauserwirth.com/products/nonmemory-mike-kelley-with-kelly-akashi-meriem-bennani-beatriz-cortez-raul-de-nieves-olivia-erlanger-lauren-halsey-max-hooper-schneider',
  collection_grouping: '',
  tags: 'Art, Contemporary Art, Installation, Mike Kelley',
  classification: 'Art',
  bisac: '',
  lcc: '',
  location: 'Hudson Street Library, NYC',
  accession_no: 'October 2024', // Older date format to keep off Recently Added
  featured: 'false',
  image_url: '/assets/images/books/kelley_mike_nonmemory_9783906915845.jpg',
  price: '',
  weight_g: '',
  language: 'English',
  num_images: '',
  notes: 'Exhibition catalog for Hauser & Wirth Los Angeles (2023-2024). Features Mike Kelley with Kelly Akashi, Meriem Bennani, Beatriz Cortez, Raúl de Nieves, Olivia Erlanger, Lauren Halsey, and Max Hooper Schneider. Published October 2024. Format: 29.2 × 21.6 cm, 216 pages, softcover. ISBN: 978-3-906915-84-5. Includes Kelley\'s foundational essay "Architectural Non-memory Replaced with Psychic Reality." Text by Jay Ezra Nayssan and Mike Kelley. Introduction by Mike Kelley Foundation for the Arts. Mike Kelley (1954-2012) was influential American artist known for institutional critique and cultural psychology investigations.',
  custom_page_url: ''
};

// Add to records
records.push(newBook);

// Write updated CSV
fs.writeFileSync('src/_data/books.csv', stringify(records, { header: true, quoted: true }));

console.log('✅ Added Mike Kelley NONMEMORY (ID:', nextId, ')');
console.log('📚 Title:', newBook.title);
console.log('👤 Author:', newBook.author_full_name);
console.log('📅 Year:', newBook.publication_year);
console.log('📖 ISBN:', newBook.isbn_asin);
console.log('📍 Accession:', newBook.accession_no, '(will not appear in Recently Added)');
