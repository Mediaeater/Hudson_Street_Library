/**
 * HTML Generator
 *
 * Generates secure, accessible HTML for the Richard Prince collection page.
 * Implements proper escaping, ARIA attributes, and semantic markup.
 *
 * @module lib/html-generator
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 *
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for HTML insertion
 */
export function escapeHTML(text) {
  if (!text) return '';

  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return String(text).replace(/[&<>"']/g, char => map[char]);
}

/**
 * Escapes text for safe use in HTML attributes
 *
 * @param {string} text - Text to escape
 * @returns {string} Escaped text safe for attribute values
 */
export function escapeAttribute(text) {
  if (!text) return '';

  return escapeHTML(text)
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;')
    .replace(/\t/g, '&#9;');
}

/**
 * Truncates text to specified length with ellipsis
 *
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum character length
 * @returns {string} Truncated text
 */
export function truncateText(text, maxLength = 200) {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Find last space before maxLength to avoid cutting words
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Formats a year value for display
 *
 * @param {number|null} year - Year to format
 * @returns {string} Formatted year or 'Year unknown'
 */
export function formatYear(year) {
  return year ? String(year) : 'Year unknown';
}

/**
 * Generates HTML for a single book card
 *
 * @param {Object} book - Book data
 * @param {number} book.id - Book ID
 * @param {string} book.title - Book title
 * @param {string} book.publisher - Publisher name
 * @param {number|null} book.publication_year - Publication year
 * @param {string} book.description - Book description
 * @param {string} book.image_url - Cover image path
 * @param {string} book.isbn_asin - ISBN/ASIN
 * @returns {string} HTML string for book card
 */
export function generateBookCard(book) {
  const title = escapeHTML(book.title);
  const publisher = escapeHTML(book.publisher);
  const year = formatYear(book.publication_year);
  const description = escapeHTML(book.description);
  const truncatedDesc = truncateText(description, 200);
  const imageUrl = escapeAttribute(book.image_url);
  const imageAlt = escapeAttribute(`Cover of ${book.title} by Richard Prince`);

  return `    <article class="book-card" data-book-id="${book.id}">
      <div class="book-card__image-container">
        <img
          src="${imageUrl}"
          alt="${imageAlt}"
          class="book-card__image"
          loading="lazy"
          decoding="async"
        />
      </div>
      <div class="book-card__content">
        <h3 class="book-card__title">${title}</h3>
        <div class="book-card__meta">
          <span class="book-card__publisher">${publisher}</span>
          <span class="book-card__year" aria-label="Published in ${escapeAttribute(year)}">${year}</span>
        </div>
        ${description ? `<p class="book-card__description">${truncatedDesc}</p>` : ''}
      </div>
    </article>`;
}

/**
 * Generates complete HTML page for Richard Prince collection
 *
 * @param {Object[]} books - Array of book objects
 * @param {Object} options - Generation options
 * @param {string} options.title - Page title
 * @param {string} options.description - Page description
 * @returns {string} Complete HTML document
 */
export function generateCollectionPage(books, options = {}) {
  const {
    title = 'Richard Prince Collection',
    description = 'A curated collection of publications by and about Richard Prince.',
  } = options;

  const bookCount = books.length;
  const currentDate = new Date().toISOString().split('T')[0];

  // Generate book cards
  const bookCards = books.map(book => generateBookCard(book)).join('\n\n');

  return `---
layout: layouts/collection.njk
title: ${escapeAttribute(title)}
description: ${escapeAttribute(description)}
eleventyNavigation:
  key: Richard Prince
  parent: Collections
  order: 10
---

<div class="collection-header">
  <h1 class="collection-title">Richard Prince</h1>
  <p class="collection-meta">${bookCount} ${bookCount === 1 ? 'book' : 'books'}</p>
  <p class="collection-description">${escapeHTML(description)}</p>
</div>

<div class="collection-grid" role="list" aria-label="Richard Prince books">
${bookCards}
</div>

<footer class="collection-footer">
  <p class="text-sm text-gray-600">
    Last updated: <time datetime="${currentDate}">${currentDate}</time>
  </p>
  <p class="text-sm text-gray-600">
    Generated from library database
  </p>
</footer>
`;
}

/**
 * Validates HTML structure (basic sanity checks)
 *
 * @param {string} html - HTML content to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateHTML(html) {
  const errors = [];

  // Check for required frontmatter
  if (!html.startsWith('---')) {
    errors.push('Missing frontmatter delimiter');
  }

  // Check for required sections
  if (!html.includes('collection-header')) {
    errors.push('Missing collection header section');
  }

  if (!html.includes('collection-grid')) {
    errors.push('Missing collection grid section');
  }

  // Check for basic structure
  const openDivs = (html.match(/<div/g) || []).length;
  const closeDivs = (html.match(/<\/div>/g) || []).length;

  if (openDivs !== closeDivs) {
    errors.push(`Mismatched div tags: ${openDivs} opening, ${closeDivs} closing`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
