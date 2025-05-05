// Import script for loading books from a CSV file into Directus
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { createDirectus, rest, createItem, updateItem, readItems } = require('@directus/sdk');

// Configuration
const API_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const API_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN;
const CSV_FILE = path.resolve(__dirname, '../data/books.csv');

// Create Directus client
const directus = createDirectus(API_URL)
  .with(rest({ credentials: 'include' }));

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
  return {
    status: 'published',
    author_last_name: book['Author Last Name'],
    author_first_name: book['Author First Name'],
    title: book['Title'],
    publisher: book['Publisher'],
    publication_date: book['Publication Date'],
    dimensions: book['Physical Dimensions'],
    physical_description: book['Additional Book Details'],
    edition: book['Edition Information'],
    isbn: book['ISBN'],
    contributors: book['Contributors/Editors'],
    summary: book['Summary/Description'],
    subjects: book['Subject Classifications'] ? book['Subject Classifications'].split(',').map(s => s.trim()) : [],
    location: book['Location'] || 'Hudson Street Library, NYC',
    price: parseFloat(book['Price']) || 0,
    // No image handling in this basic script
    date_added: new Date().toISOString()
  };
}

// Import books into Directus
async function importBooks() {
  try {
    console.log('Authenticating with Directus...');
    // Authenticate
    if (!API_TOKEN) {
      throw new Error('DIRECTUS_ADMIN_TOKEN is required');
    }
    
    // Create authentication headers
    const headers = {
      'Authorization': `Bearer ${API_TOKEN}`
    };
    
    console.log('Reading CSV file...');
    const books = await parseCSV(CSV_FILE);
    console.log(`Found ${books.length} books in CSV`);
    
    // Process each book
    for (const [index, book] of books.entries()) {
      try {
        const formattedBook = formatBookData(book);
        
        // Check if the book already exists by ISBN
        const existingBooks = await directus.request(
          readItems('books', {
            filter: { isbn: { _eq: formattedBook.isbn } },
            limit: 1
          }),
          { headers }
        );
        
        if (existingBooks && existingBooks.length > 0) {
          console.log(`Updating existing book: ${formattedBook.title}`);
          await directus.request(
            updateItem('books', existingBooks[0].id, formattedBook),
            { headers }
          );
        } else {
          console.log(`Creating new book: ${formattedBook.title}`);
          await directus.request(
            createItem('books', formattedBook),
            { headers }
          );
        }
        
        // Log progress
        if ((index + 1) % 10 === 0 || index === books.length - 1) {
          console.log(`Processed ${index + 1}/${books.length} books`);
        }
      } catch (error) {
        console.error(`Error processing book "${book.Title}":`, error.message);
      }
    }
    
    console.log('Book import completed successfully!');
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

// Execute import
importBooks();