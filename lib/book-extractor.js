/**
 * BookExtractor - Robust HTML parsing for book metadata extraction
 *
 * Uses cheerio for reliable DOM traversal and extraction of book data
 * from HTML files. Includes fallback strategies and comprehensive validation.
 *
 * @module lib/book-extractor
 */

const cheerio = require('cheerio');
const fs = require('fs').promises;
const path = require('path');

/**
 * Configuration constants for extraction behavior
 */
const CONFIG = {
  // Description length limits
  DESCRIPTION_MAX_LENGTH: 500,
  DESCRIPTION_MIN_LENGTH: 10,

  // Year validation bounds
  MIN_VALID_YEAR: 1800,
  MAX_VALID_YEAR: new Date().getFullYear() + 2,

  // Image file extensions to search for
  VALID_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],

  // Common cover image filenames
  COVER_IMAGE_NAMES: [
    'cover',
    'front',
    'thumbnail',
    'image',
    'book',
    'photo'
  ],

  // HTML selectors priority order
  SELECTORS: {
    title: [
      'h1.title',
      'h1',
      '.book-title',
      'title',
      '[itemprop="name"]',
      'meta[property="og:title"]'
    ],
    publisher: [
      '.publisher',
      '[itemprop="publisher"]',
      'meta[name="publisher"]',
      '.imprint'
    ],
    description: [
      '.description',
      '[itemprop="description"]',
      'meta[name="description"]',
      'meta[property="og:description"]',
      '.summary',
      '.synopsis',
      'p'
    ],
    image: [
      'img.cover',
      'img[itemprop="image"]',
      'meta[property="og:image"]',
      '.book-cover img',
      'img'
    ]
  }
};

/**
 * BookExtractor class for parsing HTML and extracting book metadata
 */
class BookExtractor {
  /**
   * Create a new BookExtractor instance
   * @param {Object} options - Configuration options
   * @param {boolean} options.debug - Enable debug logging
   */
  constructor(options = {}) {
    this.debug = options.debug || false;
  }

  /**
   * Extract book metadata from an HTML file
   *
   * @param {string} htmlPath - Absolute path to HTML file
   * @param {string} bookDir - Absolute path to book directory
   * @returns {Promise<Object>} Extracted book metadata
   * @throws {Error} If HTML file cannot be read or parsed
   */
  async extractFromFile(htmlPath, bookDir) {
    try {
      const htmlContent = await fs.readFile(htmlPath, 'utf-8');
      return await this.extractFromHTML(htmlContent, bookDir, htmlPath);
    } catch (error) {
      throw new Error(`Failed to read HTML file ${htmlPath}: ${error.message}`);
    }
  }

  /**
   * Extract book metadata from HTML content
   *
   * @param {string} htmlContent - Raw HTML content
   * @param {string} bookDir - Absolute path to book directory
   * @param {string} htmlPath - Original HTML file path (for context)
   * @returns {Promise<Object>} Extracted book metadata
   */
  async extractFromHTML(htmlContent, bookDir, htmlPath = '') {
    const $ = cheerio.load(htmlContent);
    const dirName = path.basename(bookDir);

    const metadata = {
      title: await this.extractTitle($, dirName),
      publisher: this.extractPublisher($),
      year: this.extractYear($),
      description: this.extractDescription($),
      coverImage: await this.extractCoverImage($, bookDir, htmlPath)
    };

    if (this.debug) {
      console.log(`Extracted metadata for ${dirName}:`, metadata);
    }

    return metadata;
  }

  /**
   * Extract book title using multiple strategies
   *
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {string} dirName - Directory name as fallback
   * @returns {Promise<string>} Extracted or formatted title
   */
  async extractTitle($, dirName) {
    try {
      // Try each selector in priority order
      for (const selector of CONFIG.SELECTORS.title) {
        const element = $(selector).first();

        if (element.length) {
          let title;

          // Handle meta tags differently
          if (selector.startsWith('meta')) {
            title = element.attr('content');
          } else {
            title = element.text();
          }

          if (title) {
            title = this.cleanText(title);
            if (title.length > 0) {
              return title;
            }
          }
        }
      }

      // Fallback to formatted directory name
      return this.formatDirectoryName(dirName);
    } catch (error) {
      if (this.debug) {
        console.warn(`Title extraction failed, using directory name: ${error.message}`);
      }
      return this.formatDirectoryName(dirName);
    }
  }

  /**
   * Extract publisher information
   *
   * @param {CheerioStatic} $ - Cheerio instance
   * @returns {string|null} Publisher name or null
   */
  extractPublisher($) {
    try {
      for (const selector of CONFIG.SELECTORS.publisher) {
        const element = $(selector).first();

        if (element.length) {
          let publisher;

          if (selector.startsWith('meta')) {
            publisher = element.attr('content');
          } else {
            publisher = element.text();
          }

          if (publisher) {
            publisher = this.cleanText(publisher);
            if (publisher.length > 0) {
              return publisher;
            }
          }
        }
      }

      return null;
    } catch (error) {
      if (this.debug) {
        console.warn(`Publisher extraction failed: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Extract and validate publication year
   *
   * @param {CheerioStatic} $ - Cheerio instance
   * @returns {number|null} Valid year or null
   */
  extractYear($) {
    try {
      // Search for year patterns in common locations
      const yearPatterns = [
        /\b(19|20)\d{2}\b/g,  // 4-digit years starting with 19 or 20
        /©\s*(\d{4})/g,        // Copyright years
        /published\s+in\s+(\d{4})/gi
      ];

      const searchElements = [
        $('meta[name="date"]').attr('content'),
        $('meta[property="article:published_time"]').attr('content'),
        $('.date').text(),
        $('.year').text(),
        $('.publication-date').text(),
        $('body').text()
      ].filter(Boolean);

      const foundYears = new Set();

      for (const text of searchElements) {
        for (const pattern of yearPatterns) {
          const matches = text.matchAll(pattern);
          for (const match of matches) {
            const year = parseInt(match[1] || match[0], 10);
            if (this.isValidYear(year)) {
              foundYears.add(year);
            }
          }
        }
      }

      if (foundYears.size > 0) {
        // Return the most recent valid year
        return Math.max(...foundYears);
      }

      return null;
    } catch (error) {
      if (this.debug) {
        console.warn(`Year extraction failed: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Extract and format book description
   *
   * @param {CheerioStatic} $ - Cheerio instance
   * @returns {string|null} Formatted description or null
   */
  extractDescription($) {
    try {
      for (const selector of CONFIG.SELECTORS.description) {
        const element = $(selector).first();

        if (element.length) {
          let description;

          if (selector.startsWith('meta')) {
            description = element.attr('content');
          } else if (selector === 'p') {
            // For paragraph tags, get first substantial paragraph
            const paragraphs = $('p').toArray();
            for (const p of paragraphs) {
              const text = $(p).text();
              if (text.length >= CONFIG.DESCRIPTION_MIN_LENGTH) {
                description = text;
                break;
              }
            }
          } else {
            description = element.text();
          }

          if (description) {
            description = this.cleanText(description);

            if (description.length >= CONFIG.DESCRIPTION_MIN_LENGTH) {
              return this.truncateDescription(description);
            }
          }
        }
      }

      return null;
    } catch (error) {
      if (this.debug) {
        console.warn(`Description extraction failed: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Extract cover image path using multiple strategies
   *
   * @param {CheerioStatic} $ - Cheerio instance
   * @param {string} bookDir - Book directory path
   * @param {string} htmlPath - HTML file path
   * @returns {Promise<string|null>} Relative image path or null
   */
  async extractCoverImage($, bookDir, htmlPath) {
    try {
      // Strategy 1: Extract from HTML img tags and meta tags
      for (const selector of CONFIG.SELECTORS.image) {
        const element = $(selector).first();

        if (element.length) {
          let imgSrc;

          if (selector.startsWith('meta')) {
            imgSrc = element.attr('content');
          } else {
            imgSrc = element.attr('src') || element.attr('data-src');
          }

          if (imgSrc && await this.isValidImagePath(imgSrc, bookDir, htmlPath)) {
            return this.normalizeImagePath(imgSrc, bookDir, htmlPath);
          }
        }
      }

      // Strategy 2: Search for common cover image filenames
      const imageFiles = await this.findImageFiles(bookDir);
      const coverImage = this.findCoverImageByName(imageFiles);

      if (coverImage) {
        return coverImage;
      }

      // Strategy 3: Use first valid image file found
      if (imageFiles.length > 0) {
        return imageFiles[0];
      }

      return null;
    } catch (error) {
      if (this.debug) {
        console.warn(`Cover image extraction failed: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * Find all image files in a directory
   *
   * @param {string} dirPath - Directory to search
   * @returns {Promise<string[]>} Array of relative image paths
   */
  async findImageFiles(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      const imageFiles = [];

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (CONFIG.VALID_IMAGE_EXTENSIONS.includes(ext)) {
          imageFiles.push(file);
        }
      }

      return imageFiles;
    } catch (error) {
      if (this.debug) {
        console.warn(`Failed to read directory ${dirPath}: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Find cover image by matching common naming patterns
   *
   * @param {string[]} imageFiles - Array of image filenames
   * @returns {string|null} Matched cover image filename or null
   */
  findCoverImageByName(imageFiles) {
    for (const coverName of CONFIG.COVER_IMAGE_NAMES) {
      const match = imageFiles.find(file =>
        path.basename(file, path.extname(file)).toLowerCase().includes(coverName)
      );

      if (match) {
        return match;
      }
    }

    return null;
  }

  /**
   * Validate if an image path is accessible
   *
   * @param {string} imgPath - Image path to validate
   * @param {string} bookDir - Book directory path
   * @param {string} htmlPath - HTML file path for relative resolution
   * @returns {Promise<boolean>} True if valid and accessible
   */
  async isValidImagePath(imgPath, bookDir, htmlPath) {
    try {
      // Skip external URLs
      if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
        return false;
      }

      // Skip data URLs
      if (imgPath.startsWith('data:')) {
        return false;
      }

      const resolvedPath = this.resolveImagePath(imgPath, bookDir, htmlPath);
      await fs.access(resolvedPath);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve image path to absolute path
   *
   * @param {string} imgPath - Image path from HTML
   * @param {string} bookDir - Book directory path
   * @param {string} htmlPath - HTML file path
   * @returns {string} Absolute path to image
   */
  resolveImagePath(imgPath, bookDir, htmlPath) {
    if (path.isAbsolute(imgPath)) {
      return imgPath;
    }

    // If HTML path provided, resolve relative to HTML file
    if (htmlPath) {
      const htmlDir = path.dirname(htmlPath);
      return path.resolve(htmlDir, imgPath);
    }

    // Otherwise resolve relative to book directory
    return path.resolve(bookDir, imgPath);
  }

  /**
   * Normalize image path to be relative to book directory
   *
   * @param {string} imgPath - Image path from HTML
   * @param {string} bookDir - Book directory path
   * @param {string} htmlPath - HTML file path
   * @returns {string} Relative path from book directory
   */
  normalizeImagePath(imgPath, bookDir, htmlPath) {
    const absolutePath = this.resolveImagePath(imgPath, bookDir, htmlPath);
    return path.relative(bookDir, absolutePath);
  }

  /**
   * Format directory name into readable title
   *
   * @param {string} dirName - Directory name
   * @returns {string} Formatted title
   */
  formatDirectoryName(dirName) {
    return dirName
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  }

  /**
   * Clean and normalize extracted text
   *
   * @param {string} text - Raw text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();
  }

  /**
   * Truncate description to maximum length at word boundary
   *
   * @param {string} description - Full description text
   * @returns {string} Truncated description
   */
  truncateDescription(description) {
    if (description.length <= CONFIG.DESCRIPTION_MAX_LENGTH) {
      return description;
    }

    const truncated = description.slice(0, CONFIG.DESCRIPTION_MAX_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > CONFIG.DESCRIPTION_MIN_LENGTH) {
      return truncated.slice(0, lastSpace) + '...';
    }

    return truncated + '...';
  }

  /**
   * Validate if a year is within acceptable bounds
   *
   * @param {number} year - Year to validate
   * @returns {boolean} True if valid
   */
  isValidYear(year) {
    return Number.isInteger(year) &&
           year >= CONFIG.MIN_VALID_YEAR &&
           year <= CONFIG.MAX_VALID_YEAR;
  }
}

/**
 * Helper function to create extractor and extract from file
 *
 * @param {string} htmlPath - Absolute path to HTML file
 * @param {string} bookDir - Absolute path to book directory
 * @param {Object} options - Extractor options
 * @returns {Promise<Object>} Extracted metadata
 */
async function extractBookMetadata(htmlPath, bookDir, options = {}) {
  const extractor = new BookExtractor(options);
  return await extractor.extractFromFile(htmlPath, bookDir);
}

/**
 * Helper function to extract from HTML content directly
 *
 * @param {string} htmlContent - Raw HTML content
 * @param {string} bookDir - Absolute path to book directory
 * @param {Object} options - Extractor options
 * @returns {Promise<Object>} Extracted metadata
 */
async function extractFromHTML(htmlContent, bookDir, options = {}) {
  const extractor = new BookExtractor(options);
  return await extractor.extractFromHTML(htmlContent, bookDir);
}

module.exports = {
  BookExtractor,
  extractBookMetadata,
  extractFromHTML,
  CONFIG
};
