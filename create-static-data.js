// Create static JSON files from CSV
const fs = require('fs');

// Read the CSV file
const csvContent = fs.readFileSync('cms/data/books-formatted.csv', 'utf-8');
const lines = csvContent.split('\n');
const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

const books = [];

// Parse CSV manually
for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  
  // Simple CSV parsing (handles basic cases)
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let char of lines[i]) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  // Create book object
  const book = { id: books.length + 1 };
  headers.forEach((header, index) => {
    const value = values[index] || '';
    
    switch(header) {
      case 'Title':
        book.title = value;
        break;
      case 'Author First Name':
        book.author_first_name = value;
        break;
      case 'Author Last Name':
        book.author_last_name = value;
        break;
      case 'Publisher':
        book.publisher = value;
        break;
      case 'ISBN':
        book.isbn = value;
        break;
      case 'Price':
        book.price = parseFloat(value.replace(/[$,]/g, '')) || 0;
        break;
      case 'Summary/Description':
        book.summary = value;
        break;
      case 'Subject Classifications':
        book.subjects = value ? value.split(',').map(s => s.trim()) : [];
        break;
    }
  });
  
  if (book.title) {
    books.push(book);
  }
}

// Create data directory
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
}

// Save all books
fs.writeFileSync('data/books.json', JSON.stringify(books, null, 2));
console.log(`Created data/books.json with ${books.length} books`);

// Save recent 50 books
const recentBooks = books.slice(-50).reverse();
fs.writeFileSync('data/recent-books.json', JSON.stringify(recentBooks, null, 2));
console.log('Created data/recent-books.json');

// Create collections data
const collections = [
  { id: 1, name: 'NYC Photobooks', slug: 'nyc-photobooks', category: 'photography' },
  { id: 2, name: 'Fashion Photography', slug: 'fashion-photography', category: 'fashion' },
  { id: 3, name: 'Art Books', slug: 'art-books', category: 'art' },
  { id: 4, name: 'Music Photobooks', slug: 'music-photobooks', category: 'music' },
  { id: 5, name: 'Ephemera', slug: 'ephemera', category: 'ephemera' }
];
fs.writeFileSync('data/collections.json', JSON.stringify(collections, null, 2));
console.log('Created data/collections.json');