/**
 * Hudson Street Library - Data Validation Helpers
 * 
 * This module provides specialized validation and cleaning functions
 * for library book data, including:
 * - ISBN validation
 * - Library of Congress call number validation
 * - Author name normalization
 * - Subject heading standardization
 */

/**
 * Validate ISBN-10 or ISBN-13
 * @param {string} isbn - The ISBN to validate
 * @returns {boolean} Whether it's a valid ISBN
 */
function validateISBN(isbn) {
  // Remove hyphens, spaces, etc.
  const cleanIsbn = isbn.replace(/[^0-9Xx]/g, '');
  
  // ISBN-10 validation
  if (cleanIsbn.length === 10) {
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanIsbn[i]) * (10 - i);
    }
    
    // Check digit (last digit)
    const lastChar = cleanIsbn[9].toUpperCase();
    const checkDigit = lastChar === 'X' ? 10 : parseInt(lastChar);
    
    return (sum + checkDigit) % 11 === 0;
  }
  
  // ISBN-13 validation
  if (cleanIsbn.length === 13) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanIsbn[i]) * (i % 2 === 0 ? 1 : 3);
    }
    
    const checkDigit = parseInt(cleanIsbn[12]);
    const calculatedCheck = (10 - (sum % 10)) % 10;
    
    return checkDigit === calculatedCheck;
  }
  
  return false;
}

/**
 * Check if a string is a Library of Congress call number
 * @param {string} callNumber - The call number to check
 * @returns {boolean} Whether it matches the LoC format
 */
function isLoCCallNumber(callNumber) {
  // Basic LoC call number pattern: 1-3 letters followed by numbers and optional decimals/cutters
  const locPattern = /^[A-Z]{1,3}\d+(\.\d+)?(\s*\.[A-Z]\d+)?/i;
  return locPattern.test(callNumber.trim());
}

/**
 * Parse and normalize author names
 * @param {Object} data - The book data object
 * @returns {Object} Object with normalized author_first_name and author_last_name
 */
function normalizeAuthorName(data) {
  // Start with any existing author fields
  let firstName = data.author_first_name || data['Author First Name'] || '';
  let lastName = data.author_last_name || data['Author Last Name'] || '';
  
  // If we already have both names, return them
  if (firstName && lastName) {
    return { author_first_name: firstName, author_last_name: lastName };
  }
  
  // Try to parse from a full author field
  const fullAuthor = data.author || data.Author || '';
  
  if (fullAuthor) {
    // Check for "LastName, FirstName" format
    if (fullAuthor.includes(',')) {
      const parts = fullAuthor.split(',').map(p => p.trim());
      lastName = parts[0];
      firstName = parts[1];
    } 
    // Check for "FirstName LastName" format
    else {
      const parts = fullAuthor.trim().split(' ');
      if (parts.length >= 2) {
        firstName = parts.slice(0, -1).join(' ');
        lastName = parts[parts.length - 1];
      } else {
        // Single name, assume it's a last name
        lastName = fullAuthor;
      }
    }
  }
  
  return { 
    author_first_name: firstName,
    author_last_name: lastName
  };
}

/**
 * Clean and standardize a publication date
 * @param {string} date - The date string to clean
 * @returns {string} ISO format date (YYYY-MM-DD) or null if invalid
 */
function cleanPublicationDate(date) {
  if (!date) return null;
  
  // Trim and normalize the date string
  const dateStr = date.toString().trim();
  
  // Handle year-only format (common in books)
  if (/^\d{4}$/.test(dateStr)) {
    return `${dateStr}-01-01`;
  }
  
  // Try to parse the date
  try {
    const parsedDate = new Date(dateStr);
    
    // Check if the date is valid
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
  } catch (e) {
    // Date parsing failed
  }
  
  // Handle common year ranges like "1990-1995"
  const yearRangeMatch = dateStr.match(/^(\d{4})-(\d{4})$/);
  if (yearRangeMatch) {
    // Use the first year in the range
    return `${yearRangeMatch[1]}-01-01`;
  }
  
  // Handle "c. 1990" or "circa 1990" format
  const circaMatch = dateStr.match(/(?:c\.?|circa)\s*(\d{4})/i);
  if (circaMatch) {
    return `${circaMatch[1]}-01-01`;
  }
  
  // Could not parse the date
  return null;
}

/**
 * Standardize subjects according to Library of Congress standard subject headings
 * @param {Array|string} subjects - Subjects to standardize
 * @returns {Array} Array of standardized subject headings
 */
function standardizeSubjects(subjects) {
  if (!subjects) return [];
  
  // Convert string to array if needed
  const subjectArray = typeof subjects === 'string' 
    ? subjects.split(/[,;]/).map(s => s.trim())
    : subjects;
  
  // Standardize each subject
  return subjectArray
    .filter(s => s && s.trim() !== '')
    .map(subject => {
      // Capitalize first letter of each word
      return subject.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    });
}

/**
 * Clean and validate dimensions
 * @param {string} dimensions - The dimensions string
 * @returns {string} Cleaned dimensions string
 */
function cleanDimensions(dimensions) {
  if (!dimensions) return '';
  
  // Remove HTML tags
  let cleaned = dimensions.replace(/<[^>]*>/g, '');
  
  // Standardize format: height × width (cm/mm)
  // Replace various symbols with proper multiplication sign
  cleaned = cleaned.replace(/[xX*]/g, ' × ');
  
  // Add unit if missing
  if (!cleaned.includes('cm') && !cleaned.includes('mm')) {
    cleaned = cleaned + ' cm';
  }
  
  return cleaned.trim();
}

module.exports = {
  validateISBN,
  isLoCCallNumber,
  normalizeAuthorName,
  cleanPublicationDate,
  standardizeSubjects,
  cleanDimensions
};