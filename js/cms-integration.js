/**
 * Hudson Street Library - CMS Integration
 * This script loads data from the CMS and populates the website pages
 */

// Make sure we have the API and renderer available
if (!window.HSL_API || !window.HSL_RENDER) {
  console.error('HSL_API or HSL_RENDER not available. Make sure api.js and render-utils.js are loaded first.');
}

const API = window.HSL_API || {};
const RENDER = window.HSL_RENDER || {};

/**
 * Initialize the collections page
 */
async function initCollectionsPage() {
  const collectionsGrid = document.getElementById('collections-grid');
  if (!collectionsGrid) return;
  
  // Show loading indicator
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) loadingIndicator.classList.remove('hidden');
  
  try {
    // Fetch collections from the CMS
    const collections = await API.fetchCollections();
    
    // Clear existing content
    collectionsGrid.innerHTML = '';
    
    if (collections.length > 0) {
      // Render each collection
      collections.forEach(collection => {
        const collectionHtml = RENDER.renderCollectionCard(collection);
        collectionsGrid.insertAdjacentHTML('beforeend', collectionHtml);
      });
      
      // Re-initialize the category filter
      initCategoryFilter();
    } else {
      collectionsGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-12">No collections found.</p>';
    }
  } catch (error) {
    console.error('Error initializing collections page:', error);
    collectionsGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-12">Error loading collections. Please try again later.</p>';
  } finally {
    // Hide loading indicator
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
  }
}

/**
 * Initialize a specific collection page
 * @param {string} slug - Collection slug from the URL
 */
async function initCollectionPage(slug) {
  const itemGrid = document.getElementById('item-grid');
  const collectionTitle = document.querySelector('h1.text-4xl');
  const collectionDescription = document.querySelector('p.text-base.sm\\:text-lg.text-gray-600');
  
  if (!itemGrid) return;
  
  try {
    // Show a loading message
    itemGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-12">Loading collection...</p>';
    
    // Fetch collection from the CMS
    const collection = await API.fetchCollectionBySlug(slug);
    
    if (!collection) {
      itemGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-12">Collection not found.</p>';
      return;
    }
    
    // Update page title and description
    if (collectionTitle) collectionTitle.textContent = collection.collection_name;
    if (collectionDescription && collection.description) {
      collectionDescription.innerHTML = collection.description;
    }
    
    // Update document title
    document.title = `${collection.collection_name} | Hudson Street Library Curated Collection`;
    
    // Clear the grid
    itemGrid.innerHTML = '';
    
    // Check if the collection has books
    if (collection.books && collection.books.length > 0) {
      // Render each book
      collection.books.forEach(book => {
        const bookHtml = RENDER.renderBookCard(book);
        itemGrid.insertAdjacentHTML('beforeend', bookHtml);
      });
    } else {
      // Show a message if there are no books
      document.getElementById('no-items-message')?.classList.remove('hidden');
    }
    
  } catch (error) {
    console.error('Error initializing collection page:', error);
    itemGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-12">Error loading collection. Please try again later.</p>';
  }
}

/**
 * Initialize the book detail page
 * @param {string} id - Book ID from the URL
 */
async function initBookPage(id) {
  const bookContainer = document.getElementById('book-detail');
  if (!bookContainer) return;
  
  try {
    // Show a loading message
    bookContainer.innerHTML = '<p class="text-center text-gray-500 py-12">Loading book details...</p>';
    
    // Fetch book from the CMS
    const book = await API.fetchBookById(id);
    
    if (!book) {
      bookContainer.innerHTML = '<p class="text-center text-gray-500 py-12">Book not found.</p>';
      return;
    }
    
    // Update document title
    document.title = `${book.title} | Hudson Street Library`;
    
    // Render the book detail
    const bookHtml = RENDER.renderBookDetail(book);
    bookContainer.innerHTML = bookHtml;
    
  } catch (error) {
    console.error('Error initializing book page:', error);
    bookContainer.innerHTML = '<p class="text-center text-gray-500 py-12">Error loading book details. Please try again later.</p>';
  }
}

/**
 * Initialize the recently added page
 */
async function initRecentlyAddedPage() {
  const recentGrid = document.getElementById('recent-grid');
  if (!recentGrid) return;
  
  try {
    // Show a loading message
    recentGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-12">Loading recent additions...</p>';
    
    // Fetch recently added books from the CMS
    const recentBooks = await API.fetchRecentlyAdded(20);
    
    // Clear the grid
    recentGrid.innerHTML = '';
    
    if (recentBooks.length > 0) {
      // Render each book
      recentBooks.forEach(book => {
        const bookHtml = RENDER.renderBookCard(book);
        recentGrid.insertAdjacentHTML('beforeend', bookHtml);
      });
    } else {
      recentGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-12">No recent additions found.</p>';
    }
    
  } catch (error) {
    console.error('Error initializing recently added page:', error);
    recentGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-12">Error loading recent additions. Please try again later.</p>';
  }
}

/**
 * Initialize the category filter on the collections page
 */
function initCategoryFilter() {
  const categoryFilter = document.getElementById('filter-category');
  const collectionsGrid = document.getElementById('collections-grid');
  
  if (!categoryFilter || !collectionsGrid) return;
  
  categoryFilter.addEventListener('change', function() {
    const selectedCategory = this.value;
    const collections = collectionsGrid.querySelectorAll('.collection-item');
    
    collections.forEach(collection => {
      if (selectedCategory === 'all' || collection.dataset.category === selectedCategory) {
        collection.style.display = '';
      } else {
        collection.style.display = 'none';
      }
    });
  });
}

/**
 * Get URL parameters
 * @param {string} name - Name of the parameter
 * @returns {string|null} Parameter value or null
 */
function getUrlParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

/**
 * Get the current page slug from the URL
 * @returns {string|null} Page slug or null
 */
function getPageSlug() {
  const path = window.location.pathname;
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  
  // Remove .html extension
  return filename.replace('.html', '');
}

/**
 * Initialize the appropriate page based on the current URL
 */
function initPage() {
  const path = window.location.pathname;
  
  if (path.includes('collection-explore.html') || path.includes('curated-collections.html')) {
    // Collections page
    initCollectionsPage();
  } else if (path.includes('collections/')) {
    // Single collection page
    const slug = getPageSlug();
    if (slug) {
      initCollectionPage(slug);
    }
  } else if (path.includes('books/')) {
    // Book detail page
    const id = getPageSlug();
    if (id) {
      initBookPage(id);
    }
  } else if (path.includes('recently-added.html')) {
    // Recently added page
    initRecentlyAddedPage();
  }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', initPage);