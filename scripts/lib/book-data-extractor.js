/**
 * Book Data Extractor
 *
 * Parses CSV book data and extracts Richard Prince books with proper
 * type coercion, validation, and error handling.
 *
 * @module lib/book-data-extractor
 */

import { parse } from 'csv-parse/sync';

/**
 * Represents a book record with all relevant fields
 * @typedef {Object} Book
 * @property {number} id - Unique book ID
 * @property {string} author_full_name - Full author name
 * @property {string} title - Book title
 * @property {string} publisher - Publisher name
 * @property {number|null} publication_year - Year of publication
 * @property {string} isbn_asin - ISBN or ASIN
 * @property {string} description - Book description
 * @property {string} image_url - Path to cover image
 * @property {string} tags - Comma-separated tags
 * @property {string} binding - Binding type
 * @property {number|null} page_count - Number of pages
 */

/**
 * Parses CSV content into an array of objects
 *
 * @param {string} csvContent - Raw CSV file content
 * @returns {Object[]} Array of parsed book records
 * @throws {Error} If CSV parsing fails
 */
export function parseCSV(csvContent) {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle UTF-8 BOM if present
      relax_column_count: true, // Be lenient with column count variations
    });
    return records;
  } catch (error) {
    throw new Error(`CSV parsing failed: ${error.message}`);
  }
}

/**
 * Safely converts a string to a number, returning null for invalid values
 *
 * @param {string|number} value - Value to convert
 * @returns {number|null} Converted number or null
 */
function safeParseInt(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalizes a string field by trimming and handling empty values
 *
 * @param {string} value - String value to normalize
 * @returns {string} Normalized string
 */
function normalizeString(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

/**
 * Filters records to include only Richard Prince books
 *
 * @param {Object[]} records - All book records
 * @returns {Object[]} Filtered Richard Prince records
 */
export function filterPrinceBooks(records) {
  return records.filter(record => {
    const authorName = normalizeString(record.author_full_name);
    return authorName === 'Richard Prince';
  });
}

/**
 * Transforms a raw CSV record into a properly typed Book object
 *
 * @param {Object} record - Raw CSV record
 * @returns {Book} Typed book object
 */
export function transformBookRecord(record) {
  return {
    id: safeParseInt(record.id),
    author_full_name: normalizeString(record.author_full_name),
    title: normalizeString(record.title),
    publisher: normalizeString(record.publisher),
    publication_year: safeParseInt(record.publication_year),
    isbn_asin: normalizeString(record.isbn_asin),
    description: normalizeString(record.description),
    image_url: normalizeString(record.image_url),
    tags: normalizeString(record.tags),
    binding: normalizeString(record.binding),
    page_count: safeParseInt(record.page_count),
  };
}

/**
 * Sorts books by publication year (descending) and title (ascending)
 *
 * @param {Book[]} books - Array of books to sort
 * @returns {Book[]} Sorted array
 */
export function sortBooks(books) {
  return [...books].sort((a, b) => {
    // Sort by year descending (newest first), with null years at end
    const yearA = a.publication_year ?? -Infinity;
    const yearB = b.publication_year ?? -Infinity;

    if (yearB !== yearA) {
      return yearB - yearA;
    }

    // If years are equal, sort by title ascending
    return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
  });
}

/**
 * Validates that a book record has required fields
 *
 * @param {Book} book - Book to validate
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validateBook(book) {
  const errors = [];

  if (!book.title) {
    errors.push(`Book ID ${book.id}: Missing title`);
  }

  if (!book.author_full_name) {
    errors.push(`Book ID ${book.id}: Missing author name`);
  }

  if (!book.image_url) {
    errors.push(`Book ID ${book.id} (${book.title}): Missing cover image URL`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Complete extraction pipeline: parse, filter, transform, validate, and sort
 *
 * @param {string} csvContent - Raw CSV content
 * @returns {Promise<{books: Book[], errors: string[]}>}
 */
export async function extractPrinceBooks(csvContent) {
  try {
    // Parse CSV
    const records = parseCSV(csvContent);

    // Filter for Richard Prince books
    const princeRecords = filterPrinceBooks(records);

    // Transform records
    const books = princeRecords.map(transformBookRecord);

    // Validate books and collect errors
    const allErrors = [];
    const validBooks = books.filter(book => {
      const { valid, errors } = validateBook(book);
      if (!valid) {
        allErrors.push(...errors);
      }
      return valid;
    });

    // Sort books
    const sortedBooks = sortBooks(validBooks);

    return {
      books: sortedBooks,
      errors: allErrors
    };
  } catch (error) {
    throw new Error(`Book extraction failed: ${error.message}`);
  }
}
