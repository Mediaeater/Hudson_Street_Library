/**
 * Hudson Street Library - Static API
 * Works with JSON files, no server needed!
 */

// Cache for loaded data
let booksCache = null;
let collectionsCache = null;

/**
 * Load JSON data
 */
async function loadJSON(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return await response.json();
  } catch (error) {
    console.error(`Error loading ${path}:`, error);
    return null;
  }
}

/**
 * Get all books (with caching)
 */
async function fetchBooks(options = {}) {
  // Load books if not cached
  if (!booksCache) {
    booksCache = await loadJSON('data/books.json') || [];
  }
  
  let books = [...booksCache];
  
  // Apply search filter
  if (options.search) {
    const search = options.search.toLowerCase();
    books = books.filter(book => 
      book.title?.toLowerCase().includes(search) ||
      book.author_first_name?.toLowerCase().includes(search) ||
      book.author_last_name?.toLowerCase().includes(search) ||
      book.publisher?.toLowerCase().includes(search) ||
      book.subjects?.some(s => s.toLowerCase().includes(search)) ||
      book.summary?.toLowerCase().includes(search)
    );
  }
  
  // Apply category filter
  if (options.category) {
    books = books.filter(book => 
      book.subjects?.some(s => s.toLowerCase().includes(options.category.toLowerCase()))
    );
  }
  
  // Apply sorting
  if (options.sort === 'title') {
    books.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (options.sort === '-date_added' || options.sort === 'recent') {
    books.reverse(); // Assuming last in array are newest
  }
  
  // Apply pagination
  const page = options.page || 1;
  const limit = options.limit || 20;
  const start = (page - 1) * limit;
  const paginatedBooks = books.slice(start, start + limit);
  
  return {
    data: paginatedBooks,
    total: books.length,
    page: page,
    totalPages: Math.ceil(books.length / limit)
  };
}

/**
 * Get recent books
 */
async function fetchRecentlyAdded(limit = 50) {
  const recent = await loadJSON('data/recent-books.json');
  return recent ? recent.slice(0, limit) : [];
}

/**
 * Get book by ID
 */
async function fetchBookById(id) {
  if (!booksCache) {
    booksCache = await loadJSON('data/books.json') || [];
  }
  return booksCache.find(book => book.id === parseInt(id));
}

/**
 * Get all collections
 */
async function fetchCollections() {
  if (!collectionsCache) {
    collectionsCache = await loadJSON('data/collections.json') || [];
  }
  return collectionsCache;
}

/**
 * Search books (simple implementation)
 */
async function searchBooks(query) {
  return fetchBooks({ search: query });
}

/**
 * Get books by subject/category
 */
async function fetchBooksBySubject(subject) {
  return fetchBooks({ category: subject });
}

/**
 * Initialize static API (optional)
 */
async function initializeStaticAPI() {
  // Preload data for better performance
  booksCache = await loadJSON('data/books.json');
  collectionsCache = await loadJSON('data/collections.json');
  console.log('Static API initialized:', {
    books: booksCache?.length || 0,
    collections: collectionsCache?.length || 0
  });
}

// Export functions for use in other scripts
window.StaticAPI = {
  fetchBooks,
  fetchRecentlyAdded,
  fetchBookById,
  fetchCollections,
  searchBooks,
  fetchBooksBySubject,
  initialize: initializeStaticAPI
};