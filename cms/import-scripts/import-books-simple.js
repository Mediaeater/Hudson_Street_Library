// Simple import script for loading books from CSV into Directus
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createDirectus, rest, authentication, createItem, readItems } = require('@directus/sdk');

// Configuration
const API_URL = 'http://localhost:8055';
const EMAIL = 'admin@hudsonstreetlibrary.org';
const PASSWORD = 'HudsonLibrary123!';
const CSV_FILE = path.resolve(__dirname, '../data/books-formatted.csv');

// Create Directus client with authentication
const directus = createDirectus(API_URL)
  .with(authentication())
  .with(rest());

// Helper function to parse CSV data
async function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

// Format book data for Directus
function formatBookData(book) {
  // Clean up the price
  let price = 0;
  if (book['Price']) {
    price = parseFloat(book['Price'].replace(/[$,]/g, '')) || 0;
  }

  return {
    status: 'published',
    author_last_name: book['Author Last Name'] || '',
    author_first_name: book['Author First Name'] || '',
    title: book['Title'] || '',
    publisher: book['Publisher'] || '',
    publication_date: book['Publication Date'] || '',
    dimensions: book['Physical Dimensions'] || '',
    physical_description: book['Additional Book Details'] || '',
    edition: book['Edition Information'] || '',
    isbn: book['ISBN'] || '',
    contributors: book['Contributors/Editors'] || '',
    summary: book['Summary/Description'] || '',
    subjects: book['Subject Classifications'] ? book['Subject Classifications'].split(',').map(s => s.trim()) : [],
    location: book['Location'] || 'Hudson Street Library, NYC',
    price: price,
    date_added: new Date().toISOString()
  };
}

// Main import function
async function importBooks() {
  try {
    console.log('Starting book import...');
    
    // Authenticate
    console.log('Authenticating with Directus...');
    await directus.login(EMAIL, PASSWORD);
    console.log('Authentication successful!');

    // Check if books collection exists
    console.log('Checking books collection...');
    const existingBooks = await directus.request(readItems('books', { limit: 1 }));
    console.log(`Found ${existingBooks.length} existing books`);

    // Parse CSV file
    console.log('Reading CSV file...');
    const books = await parseCSV(CSV_FILE);
    console.log(`Found ${books.length} books in CSV`);

    // Import books
    let imported = 0;
    let errors = 0;
    
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      
      // Skip empty rows
      if (!book['Title']) {
        continue;
      }

      try {
        const formattedBook = formatBookData(book);
        await directus.request(createItem('books', formattedBook));
        imported++;
        
        if (imported % 10 === 0) {
          console.log(`Imported ${imported} books...`);
        }
      } catch (error) {
        errors++;
        console.error(`Error importing book "${book['Title']}":`, error.message);
      }
    }

    console.log(`\nImport complete!`);
    console.log(`Successfully imported: ${imported} books`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importBooks();