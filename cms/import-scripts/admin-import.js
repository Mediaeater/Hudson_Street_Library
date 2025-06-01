// Admin import script - simplified version
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const API_URL = 'http://localhost:8055';
const CSV_FILE = path.resolve(__dirname, '../data/books-formatted.csv');

// Admin credentials
const ADMIN_EMAIL = 'admin@hudsonstreetlibrary.org';
const ADMIN_PASSWORD = 'HudsonLibrary123!';

async function getAccessToken() {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });
  
  const data = await response.json();
  return data.data.access_token;
}

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

async function createBook(book, token) {
  const bookData = {
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
    subjects: book['Subject Classifications'] ? book['Subject Classifications'].split(',').map(s => s.trim()).filter(s => s) : [],
    location: book['Location'] || 'Hudson Street Library, NYC',
    price: book['Price'] ? parseFloat(book['Price'].replace(/[$,]/g, '')) || 0 : 0
  };

  const response = await fetch(`${API_URL}/items/books`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(bookData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText);
  }

  return await response.json();
}

async function main() {
  try {
    console.log('Getting access token...');
    const token = await getAccessToken();
    
    console.log('Reading CSV file...');
    const books = await parseCSV(CSV_FILE);
    console.log(`Found ${books.length} books`);

    let success = 0;
    let errors = 0;

    // Import books one by one
    for (let i = 0; i < books.length; i++) {
      const book = books[i];
      
      if (!book['Title'] || book['Title'].trim() === '') {
        continue;
      }

      try {
        await createBook(book, token);
        success++;
        
        if (success % 50 === 0) {
          console.log(`Progress: ${success} books imported...`);
        }
      } catch (error) {
        errors++;
        console.error(`Error with "${book['Title']}": ${error.message.substring(0, 100)}`);
        
        // If we get permission errors, something is wrong with setup
        if (error.message.includes('permission')) {
          console.log('\nPermission error detected. Please check Directus setup.');
          break;
        }
      }
    }

    console.log(`\nImport completed!`);
    console.log(`Success: ${success} books`);
    console.log(`Errors: ${errors}`);

  } catch (error) {
    console.error('Fatal error:', error.message);
  }
}

main();