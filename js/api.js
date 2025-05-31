/**
 * Hudson Street Library - API Connector
 * This module provides functions to interact with the Directus CMS API
 */

// Configuration
const API_URL = 'http://localhost:8055'; // Change to production URL when deployed
const API_ENDPOINT = `${API_URL}/items`;
const ASSETS_ENDPOINT = `${API_URL}/assets`;

/**
 * Fetch all collections from the CMS
 * @returns {Promise<Array>} Array of collection objects
 */
async function fetchCollections() {
  try {
    const response = await fetch(`${API_ENDPOINT}/collections?fields=*,cover_image.*&sort=sort_order`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
}

/**
 * Fetch a specific collection by slug
 * @param {string} slug - Collection slug
 * @returns {Promise<Object|null>} Collection object or null if not found
 */
async function fetchCollectionBySlug(slug) {
  try {
    const response = await fetch(`${API_ENDPOINT}/collections?filter[slug][_eq]=${slug}&fields=*,books.*,cover_image.*`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error(`Error fetching collection ${slug}:`, error);
    return null;
  }
}

/**
 * Fetch books from the CMS
 * @param {Object} options - Query options
 * @param {string} [options.filter] - Filter query
 * @param {string} [options.sort] - Sort query
 * @param {number} [options.limit] - Limit number of results
 * @param {number} [options.page] - Page number
 * @returns {Promise<Array>} Array of book objects
 */
async function fetchBooks(options = {}) {
  try {
    let url = `${API_ENDPOINT}/books?fields=*,cover_image.*,collections.*`;
    
    if (options.filter) url += `&filter=${encodeURIComponent(options.filter)}`;
    if (options.sort) url += `&sort=${options.sort}`;
    if (options.limit) url += `&limit=${options.limit}`;
    if (options.page) url += `&page=${options.page}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching books:', error);
    return [];
  }
}

/**
 * Fetch a specific book by ID
 * @param {string} id - Book ID
 * @returns {Promise<Object|null>} Book object or null if not found
 */
async function fetchBookById(id) {
  try {
    const response = await fetch(`${API_ENDPOINT}/books/${id}?fields=*,cover_image.*,additional_images.*,collections.*`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error(`Error fetching book ${id}:`, error);
    return null;
  }
}

/**
 * Fetch recently added books from the CMS
 * @param {number} limit - Number of books to fetch
 * @returns {Promise<Array>} Array of book objects
 */
async function fetchRecentlyAdded(limit = 10) {
  try {
    const response = await fetch(`${API_ENDPOINT}/books?sort=-date_added&limit=${limit}&fields=*,cover_image.*`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching recently added books:', error);
    return [];
  }
}

/**
 * Fetch new acquisitions from the CMS
 * @param {number} limit - Number of acquisitions to fetch
 * @returns {Promise<Array>} Array of acquisition objects with related book data
 */
async function fetchNewAcquisitions(limit = 10) {
  try {
    const response = await fetch(`${API_ENDPOINT}/new_acquisitions?sort=-acquisition_date&limit=${limit}&fields=*,book.*,book.cover_image.*`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching new acquisitions:', error);
    return [];
  }
}

/**
 * Get the full URL for an asset/image
 * @param {string} id - Asset ID
 * @param {Object} [options] - Image options
 * @param {number} [options.width] - Width in pixels
 * @param {number} [options.height] - Height in pixels
 * @param {string} [options.fit] - Fit mode (cover, contain, inside, outside)
 * @param {string} [options.format] - Image format (jpg, png, webp)
 * @param {number} [options.quality] - Image quality (1-100)
 * @returns {string} Full asset URL
 */
function getAssetUrl(id, options = {}) {
  if (!id) return '';
  
  let url = `${ASSETS_ENDPOINT}/${id}`;
  const params = [];
  
  if (options.width) params.push(`width=${options.width}`);
  if (options.height) params.push(`height=${options.height}`);
  if (options.fit) params.push(`fit=${options.fit}`);
  if (options.format) params.push(`format=${options.format}`);
  if (options.quality) params.push(`quality=${options.quality}`);
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return url;
}

// Export all functions
window.HSL_API = {
  fetchCollections,
  fetchCollectionBySlug,
  fetchBooks,
  fetchBookById,
  fetchRecentlyAdded,
  fetchNewAcquisitions,
  getAssetUrl
};