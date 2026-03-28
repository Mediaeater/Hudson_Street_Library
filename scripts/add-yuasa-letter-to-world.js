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
  author_last: 'Yuasa',
  author_first: 'Megumi',
  author_full_name: 'Megumi Yuasa',
  title: 'Letter to the World',
  publisher: 'Ortuzar / Gomide&Co',
  publication_year: '2026',
  height_cm: '',
  width_cm: '',
  depth_cm: '',
  binding: 'Softcover',
  page_count: '',
  edition_printrun: 'First edition',
  isbn_asin: '9798234001054',
  editor: '',
  contributors: 'Essay by Karen Tei Yamashita. Design by Zachary Fischman',
  is_signed_inscribed: 'false',
  designer: 'Zachary Fischman',
  description: `<p>Exhibition catalog published for "Letter to the World," the inaugural U.S. solo exhibition of Japanese-Brazilian sculptor Megumi Yuasa at Ortuzar, New York (March 5–April 11, 2026). This fully illustrated catalog surveys six decades of practice, featuring approximately thirty works spanning from the early 1970s to 2025 across ceramic, metal, and stone mediums. Published in collaboration between Ortuzar and Gomide&Co, the volume includes a major essay by novelist and historian Karen Tei Yamashita reflecting on her fifty-year friendship with the artist.</p>

<p>Born in São Paulo in 1938 to Japanese immigrant parents, Megumi Yuasa developed a distinct sculptural language exploring the interconnection between matter, body, and the universe. His philosophy—"Everything is made from everything. Everything depends on everything"—manifests in works that range from compact early ceramic constructions to vertically oriented mixed-media sculptures investigating balance, suspension, and gravity. Working primarily with clay, Yuasa creates organic forms that blur boundaries between the natural and constructed, the solid and ethereal.</p>

<p>The exhibition and catalog trace Yuasa's evolution from early ceramic works like *Nuvem [Cloud]* (c. 1975) and *Tropical* (1980) through *Personagem Sensível [Sensible Character]* (1988) and his Espássaro and Árvores [Trees] series, culminating in *Elegia a Nova Iorque [Elegy to New York]* (2025), a new work created during his New York residency. These pieces demonstrate his continued investigation into clay's expressive possibilities and his engagement with themes of transformation, temporality, and the relationship between human presence and natural forces.</p>

<p>Karen Tei Yamashita's essay draws on five decades of friendship with Yuasa, providing intimate perspective on his artistic development and philosophy. The fully illustrated catalog documents each work in the exhibition, offering comprehensive visual access to this important survey. Published March 2026 by Ortuzar (5 White Street, New York) in collaboration with Gomide&Co (São Paulo). Design by Zachary Fischman. This publication marks a significant documentation of Yuasa's work for American audiences, introducing his six-decade practice to new collectors and scholars.</p>`,
  artist_url: 'https://www.ortuzar.com/artists/megumi-yuasa',
  publisher_url: 'https://www.ortuzar.com/exhibitions/megumi-yuasa',
  collection_grouping: '',
  tags: 'Art, Sculpture, Ceramics, Japanese-Brazilian Art, Contemporary Art',
  classification: 'Art',
  bisac: '',
  lcc: '',
  location: 'Hudson Street Library, NYC',
  accession_no: '2026-03-28',
  featured: 'false',
  image_url: '',
  price: '',
  weight_g: '',
  language: 'English',
  num_images: '',
  notes: 'Exhibition catalog for Ortuzar, New York (March 5–April 11, 2026). Published by Ortuzar in collaboration with Gomide&Co, São Paulo. ISBN: 979-8-234-00105-4. Essay by novelist and historian Karen Tei Yamashita on her fifty-year friendship with the artist. Design by Zachary Fischman. Fully illustrated catalog surveying six decades of work (1970s-2025) in ceramic, metal, and stone. Megumi Yuasa (b. 1938, São Paulo) is Japanese-Brazilian sculptor known for organic ceramic forms exploring matter, body, and universe. First U.S. solo exhibition.',
  custom_page_url: ''
};

// Add to records
records.push(newBook);

// Write updated CSV
fs.writeFileSync('src/_data/books.csv', stringify(records, { header: true, quoted: true }));

console.log('✅ Added Megumi Yuasa "Letter to the World" (ID:', nextId, ')');
console.log('📚 Title:', newBook.title);
console.log('👤 Author:', newBook.author_full_name);
console.log('📅 Year:', newBook.publication_year);
console.log('📖 ISBN:', newBook.isbn_asin);
console.log('⚠️  Cover image needed');
