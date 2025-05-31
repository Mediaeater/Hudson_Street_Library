/**
 * Hudson Street Library - Google Sheets Book Import Script
 * 
 * This script imports book data from a Google Sheets document into the Directus CMS.
 * It handles authentication, data retrieval, validation, cleaning, and batch processing.
 */

const { google } = require('googleapis');
const { createDirectus, rest, createItem, updateItem, readItems } = require('@directus/sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration 
const GOOGLE_SHEETS_CONFIG = {
  spreadsheetId: process.env.GOOGLE_SHEETS_ID || '1YdWfpc0JV3jr3lCio-8sLOreDlQuX3Pts7q-t-KRgH0',
  range: process.env.GOOGLE_SHEETS_RANGE || 'Books!A2:Z1000', // Start from A2 to skip header row
  keyFile: process.env.GOOGLE_SHEETS_KEY_FILE || path.join(__dirname, 'credentials.json')
};

const DIRECTUS_CONFIG = {
  url: process.env.DIRECTUS_URL || 'http://localhost:8055',
  token: process.env.DIRECTUS_ADMIN_TOKEN,
  batchSize: parseInt(process.env.IMPORT_BATCH_SIZE || '25', 10)
};

const LOG_FILE = path.join(__dirname, 'import-log.json');

// Create Directus client
const directus = createDirectus(DIRECTUS_CONFIG.url)
  .with(rest({ credentials: 'include' }));

/**
 * Authenticate with Google Sheets API
 */
async function authenticateGoogleSheets() {
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: GOOGLE_SHEETS_CONFIG.keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: client });
  } catch (error) {
    throw new Error(`Google Sheets authentication failed: ${error.message}`);
  }
}

/**
 * Retrieve book data from Google Sheets
 */
async function fetchBooksFromSheets(sheets) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
      range: GOOGLE_SHEETS_CONFIG.range,
    });

    const rows = response.data.values;
    
    if (!rows || rows.length === 0) {
      throw new Error('No data found in the spreadsheet');
    }
    
    // Get column headers from the first row of the sheet
    const headerRow = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEETS_CONFIG.spreadsheetId,
      range: 'Books!A1:Z1',
    });
    
    const headers = headerRow.data.values[0];
    
    // Convert rows to objects with column headers as keys
    return rows.map(row => {
      const book = {};
      headers.forEach((header, index) => {
        if (index < row.length) {
          book[header] = row[index];
        } else {
          book[header] = '';
        }
      });
      return book;
    });
  } catch (error) {
    throw new Error(`Error fetching data from Google Sheets: ${error.message}`);
  }
}

/**
 * Validate and clean book data
 */
function validateAndCleanBookData(books) {
  const validBooks = [];
  const invalidBooks = [];
  
  books.forEach(book => {
    // Create a copy for cleaning
    const cleanedBook = { ...book };
    let isValid = true;
    const validationErrors = [];
    
    // Required fields validation
    if (!cleanedBook.Title || cleanedBook.Title.trim() === '') {
      isValid = false;
      validationErrors.push('Title is required');
    }
    
    // Clean and normalize fields
    
    // Author names - handle variations in format
    if (cleanedBook['Author Last Name'] && cleanedBook['Author First Name']) {
      // Already in the correct format
    } else if (cleanedBook.Author && typeof cleanedBook.Author === 'string') {
      // Try to split "LastName, FirstName" format
      const authorParts = cleanedBook.Author.split(',').map(part => part.trim());
      if (authorParts.length === 2) {
        cleanedBook['Author Last Name'] = authorParts[0];
        cleanedBook['Author First Name'] = authorParts[1];
      } else {
        // Try to split "FirstName LastName" format
        const nameParts = cleanedBook.Author.trim().split(' ');
        if (nameParts.length >= 2) {
          cleanedBook['Author First Name'] = nameParts.slice(0, -1).join(' ');
          cleanedBook['Author Last Name'] = nameParts[nameParts.length - 1];
        } else {
          cleanedBook['Author Last Name'] = cleanedBook.Author;
          cleanedBook['Author First Name'] = '';
        }
      }
    }
    
    // Publication Date formatting
    if (cleanedBook['Publication Date']) {
      // Handle different date formats
      let pubDate = cleanedBook['Publication Date'].trim();
      
      // If it's just a year
      if (/^\d{4}$/.test(pubDate)) {
        cleanedBook['Publication Date'] = `${pubDate}-01-01`;
      }
      
      // Try to parse the date and format it
      try {
        const date = new Date(pubDate);
        if (!isNaN(date.getTime())) {
          cleanedBook['Publication Date'] = date.toISOString().split('T')[0];
        }
      } catch (e) {
        validationErrors.push(`Invalid publication date format: ${pubDate}`);
      }
    }
    
    // Dimensions formatting
    if (cleanedBook['Physical Dimensions'] || cleanedBook['Dimensions']) {
      const dimensions = cleanedBook['Physical Dimensions'] || cleanedBook['Dimensions'];
      // Remove any HTML or odd characters
      cleanedBook['Dimensions'] = dimensions.replace(/<[^>]*>/g, '').trim();
    }
    
    // Subjects - handle arrays or comma-separated lists
    if (cleanedBook['Subject Classifications'] || cleanedBook['Subjects']) {
      const subjects = cleanedBook['Subject Classifications'] || cleanedBook['Subjects'];
      if (typeof subjects === 'string') {
        cleanedBook['Subjects'] = subjects.split(',').map(s => s.trim());
      } else if (Array.isArray(subjects)) {
        cleanedBook['Subjects'] = subjects;
      }
    }
    
    // ISBN/Call Number validation
    if (cleanedBook['ISBN']) {
      // Clean ISBN/Call Number (remove hyphens, spaces, etc.)
      cleanedBook['ISBN'] = cleanedBook['ISBN'].replace(/[^0-9xX]/g, '');
    }
    
    // Price validation and formatting
    if (cleanedBook['Price']) {
      // Remove currency symbols and convert to number
      const price = cleanedBook['Price'].toString().replace(/[^0-9.]/g, '');
      cleanedBook['Price'] = parseFloat(price) || 0;
    }
    
    // Map to the Directus schema structure
    const formattedBook = {
      status: 'published',
      author_last_name: cleanedBook['Author Last Name'] || '',
      author_first_name: cleanedBook['Author First Name'] || '',
      title: cleanedBook['Title'],
      publisher: cleanedBook['Publisher'] || '',
      publication_date: cleanedBook['Publication Date'] || null,
      dimensions: cleanedBook['Dimensions'] || cleanedBook['Physical Dimensions'] || '',
      physical_description: cleanedBook['Additional Book Details'] || cleanedBook['Physical Description'] || '',
      edition: cleanedBook['Edition Information'] || cleanedBook['Edition'] || '',
      isbn: cleanedBook['ISBN'] || cleanedBook['Call Number'] || '',
      contributors: cleanedBook['Contributors/Editors'] || cleanedBook['Contributors'] || '',
      summary: cleanedBook['Summary/Description'] || cleanedBook['Description'] || '',
      subjects: cleanedBook['Subjects'] || [],
      location: cleanedBook['Location'] || 'Hudson Street Library, NYC',
      price: cleanedBook['Price'] || 0,
      date_added: new Date().toISOString()
    };
    
    if (isValid) {
      validBooks.push({
        original: book,
        formatted: formattedBook,
        warnings: validationErrors.length > 0 ? validationErrors : null
      });
    } else {
      invalidBooks.push({
        original: book,
        errors: validationErrors
      });
    }
  });
  
  return { validBooks, invalidBooks };
}

/**
 * Import books into Directus CMS in batches
 */
async function importBooksToCMS(validBooks) {
  const importResults = {
    created: [],
    updated: [],
    failed: [],
    totalProcessed: 0
  };
  
  // Set up the authentication headers
  const headers = {
    'Authorization': `Bearer ${DIRECTUS_CONFIG.token}`
  };
  
  // Process books in batches
  const batches = [];
  for (let i = 0; i < validBooks.length; i += DIRECTUS_CONFIG.batchSize) {
    batches.push(validBooks.slice(i, i + DIRECTUS_CONFIG.batchSize));
  }
  
  console.log(`Processing ${validBooks.length} books in ${batches.length} batches`);
  
  for (const [batchIndex, batch] of batches.entries()) {
    console.log(`Processing batch ${batchIndex + 1}/${batches.length}...`);
    
    for (const [bookIndex, bookData] of batch.entries()) {
      try {
        // Check if the book already exists by title and author
        const existingBooks = await directus.request(
          readItems('books', {
            filter: {
              _and: [
                { title: { _eq: bookData.formatted.title } },
                { author_last_name: { _eq: bookData.formatted.author_last_name } }
              ]
            },
            limit: 1
          }),
          { headers }
        );
        
        if (existingBooks && existingBooks.length > 0) {
          const existingBook = existingBooks[0];
          console.log(`Updating existing book: ${bookData.formatted.title}`);
          
          await directus.request(
            updateItem('books', existingBook.id, bookData.formatted),
            { headers }
          );
          
          importResults.updated.push({
            id: existingBook.id,
            title: bookData.formatted.title,
            warnings: bookData.warnings
          });
        } else {
          console.log(`Creating new book: ${bookData.formatted.title}`);
          
          const newBook = await directus.request(
            createItem('books', bookData.formatted),
            { headers }
          );
          
          importResults.created.push({
            id: newBook.id,
            title: bookData.formatted.title,
            warnings: bookData.warnings
          });
        }
        
        importResults.totalProcessed++;
        
        // Log progress
        if ((bookIndex + 1) % 5 === 0 || bookIndex === batch.length - 1) {
          console.log(`Batch ${batchIndex + 1}: Processed ${bookIndex + 1}/${batch.length} books`);
        }
      } catch (error) {
        console.error(`Error importing book "${bookData.formatted.title}":`, error.message);
        
        importResults.failed.push({
          title: bookData.formatted.title,
          error: error.message,
          data: bookData
        });
      }
    }
  }
  
  return importResults;
}

/**
 * Log the import results to a file
 */
function logImportResults(results, invalidBooks) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const logData = {
    timestamp,
    summary: {
      totalBooks: results.totalProcessed + invalidBooks.length,
      validBooks: results.totalProcessed,
      invalidBooks: invalidBooks.length,
      created: results.created.length,
      updated: results.updated.length,
      failed: results.failed.length
    },
    created: results.created,
    updated: results.updated,
    failed: results.failed,
    invalidBooks
  };
  
  fs.writeFileSync(
    LOG_FILE.replace('.json', `-${timestamp}.json`),
    JSON.stringify(logData, null, 2)
  );
  
  return logData.summary;
}

/**
 * Main import function
 */
async function importBooksFromSheets() {
  console.log('Starting book import from Google Sheets...');
  
  try {
    // 1. Authenticate with Google Sheets
    console.log('Authenticating with Google Sheets...');
    const sheets = await authenticateGoogleSheets();
    
    // 2. Fetch data from the spreadsheet
    console.log('Fetching book data from Google Sheets...');
    const booksFromSheets = await fetchBooksFromSheets(sheets);
    console.log(`Retrieved ${booksFromSheets.length} books from spreadsheet`);
    
    // 3. Validate and clean the data
    console.log('Validating and cleaning book data...');
    const { validBooks, invalidBooks } = validateAndCleanBookData(booksFromSheets);
    console.log(`Validated ${validBooks.length} books (${invalidBooks.length} invalid)`);
    
    // 4. Import valid books to Directus CMS
    console.log('Importing books to Directus CMS...');
    const importResults = await importBooksToCMS(validBooks);
    
    // 5. Log the results
    console.log('Logging import results...');
    const summary = logImportResults(importResults, invalidBooks);
    
    // 6. Display summary
    console.log('\nImport completed successfully!');
    console.log('Summary:');
    console.log(` - Total books processed: ${summary.totalBooks}`);
    console.log(` - Valid books: ${summary.validBooks}`);
    console.log(` - Created: ${summary.created}`);
    console.log(` - Updated: ${summary.updated}`);
    console.log(` - Failed: ${summary.failed}`);
    console.log(` - Invalid (skipped): ${summary.invalidBooks}`);
    console.log(`\nDetailed import log saved to: ${LOG_FILE}`);
    
  } catch (error) {
    console.error('Error during import process:', error);
    process.exit(1);
  }
}

// Execute import if script is run directly
if (require.main === module) {
  importBooksFromSheets();
}

module.exports = {
  importBooksFromSheets,
  validateAndCleanBookData,
  fetchBooksFromSheets
};