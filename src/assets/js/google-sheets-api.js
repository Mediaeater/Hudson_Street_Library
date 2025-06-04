/**
 * Hudson Street Library - Google Sheets API
 * Free alternative to Directus using Google Sheets as backend
 */

// Google Sheets Configuration
const SHEETS_CONFIG = {
  // Your Google Sheet ID (from the URL)
  spreadsheetId: 'YOUR_SPREADSHEET_ID', // Replace with your sheet ID
  
  // API Key (get from Google Cloud Console)
  apiKey: 'YOUR_API_KEY', // Replace with your API key
  
  // Sheet names
  sheets: {
    books: 'Books',
    collections: 'Collections'
  }
};

// Base URL for Google Sheets API
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

/**
 * Fetch data from Google Sheets
 */
async function fetchFromSheet(sheetName, range = 'A:Z') {
  try {
    const url = `${SHEETS_API_BASE}/${SHEETS_CONFIG.spreadsheetId}/values/${sheetName}!${range}?key=${SHEETS_CONFIG.apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    return [];
  }
}

/**
 * Convert sheet rows to book objects
 */
function rowsToBooks(rows) {
  if (rows.length < 2) return []; // Need header row + data
  
  const headers = rows[0];
  const books = [];
  
  // Map headers to our field names
  const fieldMap = {
    'Author, Last': 'author_last_name',
    'Author, First': 'author_first_name',
    'Title': 'title',
    'Publisher': 'publisher',
    'Date': 'publication_date',
    'Size': 'dimensions',
    'Information; Notes ; Condition': 'physical_description',
    'Edition/Printrun': 'edition',
    'ISBN': 'isbn',
    'Contributors': 'contributors',
    'Summary': 'summary',
    'Subject classification, tags': 'subjects',
    'Location': 'location',
    'Price': 'price',
    'Image': 'image_url'
  };
  
  // Convert each row to a book object
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const book = { id: i };
    
    headers.forEach((header, index) => {
      const fieldName = fieldMap[header];
      if (fieldName && row[index]) {
        if (fieldName === 'price') {
          book[fieldName] = parseFloat(row[index].replace(/[$,]/g, '')) || 0;
        } else if (fieldName === 'subjects') {
          book[fieldName] = row[index].split(',').map(s => s.trim()).filter(s => s);
        } else {
          book[fieldName] = row[index];
        }
      }
    });
    
    // Only add if book has a title
    if (book.title) {
      books.push(book);
    }
  }
  
  return books;
}

/**
 * Fetch all books from Google Sheets
 */
async function fetchBooksFromSheets(options = {}) {
  const rows = await fetchFromSheet(SHEETS_CONFIG.sheets.books);
  let books = rowsToBooks(rows);
  
  // Apply filters
  if (options.filter) {
    // Simple text search in title and author
    const searchTerm = options.filter.toLowerCase();
    books = books.filter(book => 
      (book.title && book.title.toLowerCase().includes(searchTerm)) ||
      (book.author_first_name && book.author_first_name.toLowerCase().includes(searchTerm)) ||
      (book.author_last_name && book.author_last_name.toLowerCase().includes(searchTerm))
    );
  }
  
  // Apply sorting
  if (options.sort === '-date_added') {
    books.reverse(); // Assuming latest entries are at bottom
  } else if (options.sort === 'title') {
    books.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }
  
  // Apply limit
  if (options.limit) {
    books = books.slice(0, options.limit);
  }
  
  return books;
}

/**
 * Search books by various criteria
 */
async function searchBooks(query) {
  const allBooks = await fetchBooksFromSheets();
  const searchTerm = query.toLowerCase();
  
  return allBooks.filter(book => {
    return Object.values(book).some(value => 
      value && value.toString().toLowerCase().includes(searchTerm)
    );
  });
}

/**
 * Get recently added books (last N entries)
 */
async function getRecentBooks(limit = 10) {
  const rows = await fetchFromSheet(SHEETS_CONFIG.sheets.books);
  const books = rowsToBooks(rows);
  
  // Get last N books (assuming they're the most recent)
  return books.slice(-limit).reverse();
}

// Make functions available globally
window.GoogleSheetsAPI = {
  configure: (spreadsheetId, apiKey) => {
    SHEETS_CONFIG.spreadsheetId = spreadsheetId;
    SHEETS_CONFIG.apiKey = apiKey;
  },
  fetchBooks: fetchBooksFromSheets,
  searchBooks: searchBooks,
  getRecentBooks: getRecentBooks,
  fetchFromSheet: fetchFromSheet
};