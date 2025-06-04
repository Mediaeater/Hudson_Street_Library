// Convert CSV to JSON for static hosting
const fs = require('fs');
const csv = require('csv-parser');

const results = [];

// Read the formatted CSV
fs.createReadStream('cms/data/books-formatted.csv')
  .pipe(csv())
  .on('data', (row) => {
    // Convert to clean JSON format
    const book = {
      id: results.length + 1,
      title: row['Title'] || '',
      author_first_name: row['Author First Name'] || '',
      author_last_name: row['Author Last Name'] || '',
      publisher: row['Publisher'] || '',
      publication_date: row['Publication Date'] || '',
      isbn: row['ISBN'] || '',
      price: row['Price'] ? parseFloat(row['Price'].replace(/[$,]/g, '')) || 0 : 0,
      location: row['Location'] || 'Hudson Street Library, NYC',
      subjects: row['Subject Classifications'] ? 
        row['Subject Classifications'].split(',').map(s => s.trim()).filter(s => s) : [],
      summary: row['Summary/Description'] || '',
      physical_description: row['Additional Book Details'] || '',
      dimensions: row['Physical Dimensions'] || ''
    };
    
    if (book.title) {
      results.push(book);
    }
  })
  .on('end', () => {
    // Save as JSON
    fs.writeFileSync('data/books.json', JSON.stringify(results, null, 2));
    console.log(`Converted ${results.length} books to JSON`);
    
    // Create a smaller recent books file
    const recentBooks = results.slice(-50).reverse();
    fs.writeFileSync('data/recent-books.json', JSON.stringify(recentBooks, null, 2));
    
    // Create search index (titles and authors only for smaller size)
    const searchIndex = results.map(book => ({
      id: book.id,
      title: book.title,
      author: `${book.author_first_name} ${book.author_last_name}`.trim()
    }));
    fs.writeFileSync('data/search-index.json', JSON.stringify(searchIndex, null, 2));
    
    console.log('Created data/books.json, data/recent-books.json, and data/search-index.json');
  });