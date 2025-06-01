// Direct import script using admin authentication
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const API_URL = 'http://localhost:8055';
const EMAIL = 'admin@hudsonstreetlibrary.org';
const PASSWORD = 'HudsonLibrary123!';
const CSV_FILE = path.resolve(__dirname, '../data/books-formatted.csv');

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
    price: price
  };
}

// Main import function using fetch
async function importBooks() {
  try {
    console.log('Starting direct book import...');
    
    // Authenticate and get access token
    console.log('Authenticating with Directus...');
    const authResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: EMAIL,
        password: PASSWORD
      })
    });

    if (!authResponse.ok) {
      throw new Error(`Authentication failed: ${authResponse.statusText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.data.access_token;
    console.log('Authentication successful!');

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
        
        const response = await fetch(`${API_URL}/items/books`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(formattedBook)
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }

        imported++;
        
        if (imported % 10 === 0) {
          console.log(`Imported ${imported} books...`);
        }
      } catch (error) {
        errors++;
        console.error(`Error importing book "${book['Title']}":`, error.message);
        if (errors > 10) {
          console.log('Too many errors, stopping import...');
          break;
        }
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