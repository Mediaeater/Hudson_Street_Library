/**
 * Hudson Street Library - Rendering Utilities
 * This module provides helper functions to render components from CMS data
 */

// Make sure we have the API available
if (!window.HSL_API) {
  console.error('HSL_API not available. Make sure api.js is loaded first.');
}

const API = window.HSL_API || {};

/**
 * Render a collection card
 * @param {Object} collection - Collection data from CMS
 * @returns {string} HTML for collection card
 */
function renderCollectionCard(collection) {
  const imageUrl = collection.cover_image 
    ? API.getAssetUrl(collection.cover_image.id, { width: 300, height: 225, fit: 'cover' })
    : '';
  
  const categoryClass = collection.category 
    ? `${collection.category}-bg` 
    : 'photography-bg';
    
  return `
    <a href="collections/${collection.slug}.html" class="collection-item group block bg-white rounded-lg overflow-hidden border border-gray-100" data-category="${collection.category || 'photography'}">
      <div class="relative overflow-hidden aspect-[4/3]">
        ${imageUrl 
          ? `<img src="${imageUrl}" alt="${collection.collection_name}" class="w-full h-full object-cover">`
          : `<div class="collection-cover-placeholder ${categoryClass} absolute inset-0 flex items-center justify-center p-4 text-center">
              <span class="text-base font-medium">${collection.collection_name}</span>
            </div>`
        }
        <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300"></div>
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
          ${collection.collection_name}
        </h3>
        <p class="text-sm text-gray-500 mt-1">${collection.short_description || ''}</p>
      </div>
    </a>
  `;
}

/**
 * Render a book card
 * @param {Object} book - Book data from CMS
 * @returns {string} HTML for book card
 */
function renderBookCard(book) {
  const imageUrl = book.cover_image 
    ? API.getAssetUrl(book.cover_image.id, { width: 300, height: 400, fit: 'cover' })
    : '';
    
  const publicationYear = book.publication_date 
    ? new Date(book.publication_date).getFullYear() 
    : '';
    
  return `
    <article class="item-card group bg-white rounded-lg overflow-hidden border border-gray-100">
      <a href="../books/${book.id}.html" class="block">
        <div class="relative overflow-hidden aspect-[3/4] bg-gray-200">
          ${imageUrl 
            ? `<img src="${imageUrl}" alt="${book.title} by ${book.author_first_name} ${book.author_last_name}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">`
            : `<div class="w-full h-full flex items-center justify-center bg-gray-200">
                <span class="text-gray-400">${book.title}</span>
              </div>`
          }
        </div>
        <div class="p-3 sm:p-4">
          <h3 class="text-base font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
            ${book.title}
          </h3>
          <p class="text-sm text-gray-500 mt-1 truncate">${book.author_first_name || ''} ${book.author_last_name || ''}</p>
          <p class="text-xs text-gray-400 mt-1">${publicationYear}</p>
        </div>
      </a>
    </article>
  `;
}

/**
 * Render a new acquisition card
 * @param {Object} acquisition - Acquisition data from CMS with nested book
 * @returns {string} HTML for acquisition card
 */
function renderAcquisitionCard(acquisition) {
  if (!acquisition.book) return '';
  
  const book = acquisition.book;
  const imageUrl = book.cover_image 
    ? API.getAssetUrl(book.cover_image.id, { width: 300, height: 400, fit: 'cover' })
    : '';
    
  const acquisitionDate = acquisition.acquisition_date 
    ? new Date(acquisition.acquisition_date).toLocaleDateString()
    : '';
    
  return `
    <article class="item-card group bg-white rounded-lg overflow-hidden border border-gray-100">
      <a href="../books/${book.id}.html" class="block">
        <div class="relative overflow-hidden aspect-[3/4] bg-gray-200">
          ${imageUrl 
            ? `<img src="${imageUrl}" alt="${book.title} by ${book.author_first_name} ${book.author_last_name}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">`
            : `<div class="w-full h-full flex items-center justify-center bg-gray-200">
                <span class="text-gray-400">${book.title}</span>
              </div>`
          }
          ${acquisition.featured ? `<div class="absolute top-0 right-0 bg-amber-500 text-white px-2 py-1 text-xs font-medium">Featured</div>` : ''}
        </div>
        <div class="p-3 sm:p-4">
          <h3 class="text-base font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
            ${book.title}
          </h3>
          <p class="text-sm text-gray-500 mt-1 truncate">${book.author_first_name || ''} ${book.author_last_name || ''}</p>
          <p class="text-xs text-gray-400 mt-1">Added: ${acquisitionDate}</p>
        </div>
      </a>
    </article>
  `;
}

/**
 * Render a detailed book view
 * @param {Object} book - Book data from CMS
 * @returns {string} HTML for detailed book view
 */
function renderBookDetail(book) {
  const imageUrl = book.cover_image 
    ? API.getAssetUrl(book.cover_image.id, { width: 600, height: 800, fit: 'inside' })
    : '';
    
  const publicationYear = book.publication_date 
    ? new Date(book.publication_date).getFullYear() 
    : '';
    
  const additionalImages = book.additional_images && book.additional_images.length > 0
    ? book.additional_images.map(img => 
      `<div class="mb-4">
        <img src="${API.getAssetUrl(img.id, { width: 600 })}" 
             alt="Additional image for ${book.title}" 
             class="w-full rounded shadow-sm">
      </div>`
    ).join('')
    : '';
    
  return `
    <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-sm overflow-hidden p-6 md:p-8">
      <div class="flex flex-col md:flex-row gap-8">
        <div class="md:w-1/3 flex-shrink-0">
          ${imageUrl 
            ? `<img src="${imageUrl}" alt="${book.title} by ${book.author_first_name} ${book.author_last_name}" class="w-full rounded shadow-md">`
            : `<div class="w-full aspect-[3/4] flex items-center justify-center bg-gray-200 rounded shadow-md">
                <span class="text-gray-400">No image available</span>
              </div>`
          }
        </div>
        
        <div class="md:w-2/3">
          <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">${book.title}</h1>
          <h2 class="text-xl text-gray-700 mb-4">${book.author_first_name || ''} ${book.author_last_name || ''}</h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm">
            ${book.publisher ? `<div><span class="font-semibold">Publisher:</span> ${book.publisher}</div>` : ''}
            ${book.publication_date ? `<div><span class="font-semibold">Publication Date:</span> ${book.publication_date}</div>` : ''}
            ${book.edition ? `<div><span class="font-semibold">Edition:</span> ${book.edition}</div>` : ''}
            ${book.isbn ? `<div><span class="font-semibold">ISBN:</span> ${book.isbn}</div>` : ''}
            ${book.dimensions ? `<div><span class="font-semibold">Dimensions:</span> ${book.dimensions}</div>` : ''}
            ${book.physical_description ? `<div><span class="font-semibold">Physical Description:</span> ${book.physical_description}</div>` : ''}
          </div>
          
          ${book.summary ? `
            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">Description</h3>
              <div class="text-gray-700 text-sm leading-relaxed">
                ${book.summary}
              </div>
            </div>
          ` : ''}
          
          ${book.subjects && book.subjects.length > 0 ? `
            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">Subjects</h3>
              <div class="flex flex-wrap gap-2">
                ${book.subjects.map(subject => 
                  `<span class="bg-gray-100 text-gray-800 px-2 py-1 rounded-md text-xs">${subject}</span>`
                ).join('')}
              </div>
            </div>
          ` : ''}
          
          ${book.contributors ? `
            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">Contributors</h3>
              <p class="text-gray-700 text-sm">${book.contributors}</p>
            </div>
          ` : ''}
          
          ${book.collections && book.collections.length > 0 ? `
            <div class="mb-6">
              <h3 class="text-lg font-semibold mb-2">Collections</h3>
              <div class="flex flex-wrap gap-2">
                ${book.collections.map(collection => 
                  `<a href="../collections/${collection.slug}.html" 
                      class="bg-teal-50 text-teal-700 px-3 py-1 rounded-md text-sm hover:bg-teal-100 transition-colors">
                     ${collection.collection_name}
                   </a>`
                ).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
      
      ${additionalImages ? `
        <div class="mt-12">
          <h3 class="text-xl font-semibold mb-4 text-gray-800">Additional Images</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${additionalImages}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Export all functions
window.HSL_RENDER = {
  renderCollectionCard,
  renderBookCard,
  renderAcquisitionCard,
  renderBookDetail
};