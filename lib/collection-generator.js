/**
 * Collection Page Generator
 *
 * Generates secure, static HTML pages for book collections with built-in
 * XSS protection, CSP headers, and clean separation of concerns.
 *
 * @module collection-generator
 * @author Hudson Street Library
 * @version 1.0.0
 */

/**
 * Configuration object for template generation
 * Centralizes all template settings and security parameters
 */
const CONFIG = {
  // Font Awesome CDN with Subresource Integrity
  fontAwesome: {
    url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    integrity: 'sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==',
    crossorigin: 'anonymous'
  },

  // Content Security Policy directives
  csp: {
    'default-src': "'self'",
    'style-src': "'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
    'font-src': "'self' https://cdnjs.cloudflare.com",
    'img-src': "'self' data:",
    'script-src': "'self'",
    'connect-src': "'self'"
  },

  // Default collection metadata
  defaults: {
    title: 'Book Collection',
    description: 'A curated collection of books.',
    backLinkText: 'Back to All Collections',
    backLinkUrl: '/collection-explore.html'
  },

  // Grid layout configuration
  grid: {
    columns: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    gap: 'gap-6 md:gap-8',
    aspectRatio: 'aspect-[3/4]'
  }
};

/**
 * HTML Security Utilities
 * Provides functions for escaping user-generated content to prevent XSS attacks
 */
const SecurityUtils = {
  /**
   * Escapes HTML special characters to prevent XSS injection
   *
   * @param {string} text - Raw text that may contain HTML characters
   * @returns {string} Escaped text safe for HTML insertion
   *
   * @example
   * escapeHtml('<script>alert("xss")</script>')
   * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
   */
  escapeHtml(text) {
    if (!text) return '';

    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    return String(text).replace(/[&<>"'/]/g, (char) => map[char]);
  },

  /**
   * Escapes text for safe use in HTML attributes
   * More restrictive than general HTML escaping
   *
   * @param {string} text - Text to be used in an attribute
   * @returns {string} Escaped text safe for attribute values
   *
   * @example
   * escapeAttribute('value with "quotes"')
   * // Returns: 'value with &quot;quotes&quot;'
   */
  escapeAttribute(text) {
    if (!text) return '';
    return this.escapeHtml(text).replace(/\n/g, '&#10;').replace(/\r/g, '&#13;');
  },

  /**
   * Sanitizes URLs to prevent javascript: and data: protocol attacks
   *
   * @param {string} url - URL to sanitize
   * @returns {string} Safe URL or empty string if dangerous
   *
   * @example
   * sanitizeUrl('javascript:alert(1)')
   * // Returns: ''
   *
   * sanitizeUrl('/books/example')
   * // Returns: '/books/example'
   */
  sanitizeUrl(url) {
    if (!url) return '';

    const urlString = String(url).trim();

    // Block dangerous protocols
    const dangerousProtocols = /^(javascript|data|vbscript):/i;
    if (dangerousProtocols.test(urlString)) {
      return '';
    }

    // Allow relative URLs, http, and https
    return urlString;
  },

  /**
   * Validates and sanitizes image paths
   *
   * @param {string} imagePath - Path to image file
   * @returns {string} Safe image path or placeholder
   */
  sanitizeImagePath(imagePath) {
    if (!imagePath) return '/assets/images/placeholder.jpg';

    const sanitized = this.sanitizeUrl(imagePath);
    if (!sanitized) return '/assets/images/placeholder.jpg';

    // Validate it looks like an image path
    const validImagePattern = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (!validImagePattern.test(sanitized)) {
      return '/assets/images/placeholder.jpg';
    }

    return sanitized;
  },

  /**
   * Generates CSP meta tag content from policy object
   *
   * @param {Object} policy - CSP directives object
   * @returns {string} CSP header value
   */
  generateCSP(policy) {
    return Object.entries(policy)
      .map(([directive, value]) => `${directive} ${value}`)
      .join('; ');
  }
};

/**
 * Template Generation Functions
 * Modular functions for building different parts of the HTML template
 */
const TemplateBuilder = {
  /**
   * Generates HTML head section with security headers and metadata
   *
   * @param {Object} options - Page metadata
   * @param {string} options.title - Page title
   * @param {string} options.collectionName - Name of the collection
   * @returns {string} HTML head section
   */
  buildHead({ title, collectionName }) {
    const safeTitle = SecurityUtils.escapeHtml(title);
    const safeName = SecurityUtils.escapeHtml(collectionName);
    const cspContent = SecurityUtils.generateCSP(CONFIG.csp);

    return `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${cspContent}">
    <meta name="X-Content-Type-Options" content="nosniff">
    <meta name="X-Frame-Options" content="DENY">
    <meta name="X-XSS-Protection" content="1; mode=block">
    <meta name="Referrer-Policy" content="strict-origin-when-cross-origin">

    <title>${safeTitle} | Hudson Street Library</title>
    <meta name="description" content="${safeName} collection at Hudson Street Library">

    <link rel="stylesheet" href="/assets/css/styles.css">
    <link rel="stylesheet"
          href="${CONFIG.fontAwesome.url}"
          integrity="${CONFIG.fontAwesome.integrity}"
          crossorigin="${CONFIG.fontAwesome.crossorigin}">

    <style>
        .item-card {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .item-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.07);
        }

        .line-divider {
            position: relative;
            padding-bottom: 8px;
            margin-bottom: 16px;
        }
        .line-divider::after {
            content: '';
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            bottom: 0;
            width: 60px;
            height: 1px;
            background: #0f766e;
        }

        .hero-image-container {
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }
    </style>
</head>`;
  },

  /**
   * Generates site header with navigation
   *
   * @returns {string} HTML header section
   */
  buildHeader() {
    return `<header class="sticky top-0 w-full bg-white z-50 py-4 shadow-md">
    <div class="container mx-auto px-6">
        <div class="flex justify-between items-center">
            <a href="/" class="text-xl sm:text-2xl font-bold tracking-tight text-teal-900">HUDSON STREET LIBRARY</a>
            <nav id="main-nav" class="hidden md:flex space-x-6 lg:space-x-8 items-center text-neutral-700 text-sm lg:text-base">
                <a href="/#about" class="nav-item hover:text-teal-700">About</a>
                <a href="/collection-explore.html" class="nav-item hover:text-teal-700 font-semibold text-teal-700">Collections</a>
                <a href="/static-demo/" class="nav-item hover:text-teal-700">Search</a>
                <a href="/#publications" class="nav-item hover:text-teal-700">Publications</a>
                <a href="/collections/recently_added.html" class="nav-item hover:text-teal-700">News</a>
                <a href="/#contact" class="nav-item hover:text-teal-700">Contact</a>
            </nav>
            <button class="md:hidden focus:outline-none text-teal-800"
                    aria-label="Toggle menu"
                    aria-controls="mobile-nav-menu"
                    aria-expanded="false">
                <i class="fas fa-bars text-xl"></i>
            </button>
        </div>
    </div>
    <!-- Mobile Nav Structure -->
    <nav id="mobile-nav-menu" class="hidden md:hidden absolute top-full left-0 right-0 bg-white shadow-lg px-6 py-4 space-y-3 flex-col z-40">
         <a href="/#about" class="block py-2 text-neutral-700 hover:text-teal-700">About</a>
         <a href="/collection-explore.html" class="block py-2 text-neutral-700 hover:text-teal-700 font-semibold text-teal-700">Collections</a>
         <a href="/static-demo/" class="block py-2 text-neutral-700 hover:text-teal-700">Search</a>
         <a href="/#publications" class="block py-2 text-neutral-700 hover:text-teal-700">Publications</a>
         <a href="/collections/recently_added.html" class="block py-2 text-neutral-700 hover:text-teal-700">News</a>
         <a href="/#contact" class="block py-2 text-neutral-700 hover:text-teal-700">Contact</a>
    </nav>
</header>`;
  },

  /**
   * Generates collection page header with title and description
   *
   * @param {Object} options - Collection metadata
   * @param {string} options.collectionName - Display name of collection
   * @param {string} options.description - Collection description
   * @param {string} options.backLinkUrl - URL for back navigation
   * @param {string} options.backLinkText - Text for back link
   * @returns {string} HTML collection header section
   */
  buildCollectionHeader({ collectionName, description, backLinkUrl, backLinkText }) {
    const safeName = SecurityUtils.escapeHtml(collectionName);
    const safeDescription = SecurityUtils.escapeHtml(description);
    const safeBackUrl = SecurityUtils.sanitizeUrl(backLinkUrl || CONFIG.defaults.backLinkUrl);
    const safeBackText = SecurityUtils.escapeHtml(backLinkText || CONFIG.defaults.backLinkText);

    return `<div class="max-w-3xl mx-auto text-center mb-12 md:mb-16">
    <h1 class="text-4xl sm:text-5xl font-bold title-font mb-4 text-gray-900">${safeName}</h1>
    <div class="line-divider inline-block"></div>
    <p class="text-base sm:text-lg text-gray-600 leading-relaxed mt-4">
        ${safeDescription}
    </p>
    <div class="mt-8">
        <a href="${safeBackUrl}" class="text-sm text-teal-700 hover:text-teal-900 transition-colors">
            <i class="fas fa-arrow-left mr-1"></i> ${safeBackText}
        </a>
    </div>
</div>`;
  },

  /**
   * Generates a single book card for the grid
   *
   * @param {Object} book - Book data object
   * @param {string} book.title - Book title
   * @param {string} book.slug - URL slug for book detail page
   * @param {string} book.imagePath - Path to cover image
   * @param {string} book.publisher - Publisher name
   * @param {string} book.year - Publication year
   * @param {string} book.author - Author name
   * @returns {string} HTML book card
   */
  buildBookCard(book) {
    const safeTitle = SecurityUtils.escapeHtml(book.title);
    const safeSlug = SecurityUtils.sanitizeUrl(book.slug);
    const safeImage = SecurityUtils.sanitizeImagePath(book.imagePath);
    const safePublisher = SecurityUtils.escapeHtml(book.publisher);
    const safeYear = SecurityUtils.escapeHtml(book.year);
    const safeAuthor = SecurityUtils.escapeHtml(book.author);

    // Build metadata line (publisher + year)
    const metadata = [safePublisher, safeYear].filter(Boolean).join(' • ');

    return `<article class="item-card group bg-white rounded-lg overflow-hidden border border-gray-100">
    <a href="${safeSlug}" class="block">
        <div class="relative overflow-hidden ${CONFIG.grid.aspectRatio} bg-gray-200">
            <img src="${safeImage}"
                 alt="${safeTitle}"
                 class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                 loading="lazy">
        </div>
        <div class="p-3 sm:p-4">
            <h3 class="text-base font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
                ${safeTitle}
            </h3>
            ${metadata ? `<p class="text-sm text-gray-500 mt-1 truncate">${metadata}</p>` : ''}
            ${safeAuthor ? `<p class="text-xs text-gray-400 mt-1">${safeAuthor}</p>` : ''}
        </div>
    </a>
</article>`;
  },

  /**
   * Generates the book grid section
   *
   * @param {Array<Object>} books - Array of book objects
   * @returns {string} HTML grid with all book cards
   */
  buildBookGrid(books) {
    if (!Array.isArray(books) || books.length === 0) {
      return `<div class="text-center py-12">
    <p class="text-gray-500">No books found in this collection.</p>
</div>`;
    }

    const bookCards = books.map(book => this.buildBookCard(book)).join('\n\n                ');

    return `<div id="item-grid" class="${CONFIG.grid.columns} ${CONFIG.grid.gap} grid">

                ${bookCards}

            </div>`;
  },

  /**
   * Generates site footer
   *
   * @returns {string} HTML footer section
   */
  buildFooter() {
    return `<footer class="bg-gray-900 text-gray-300 py-8 mt-20">
    <div class="container mx-auto px-6 text-center">
        <p class="text-sm">
            &copy; ${new Date().getFullYear()} Hudson Street Library. All rights reserved.
        </p>
    </div>
</footer>`;
  }
};

/**
 * Main Generator Class
 * Orchestrates the generation of complete collection pages
 */
class CollectionGenerator {
  /**
   * Creates a new collection generator instance
   *
   * @param {Object} config - Optional configuration overrides
   */
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this.security = SecurityUtils;
    this.builder = TemplateBuilder;
  }

  /**
   * Generates a complete HTML page for a book collection
   *
   * @param {Object} data - Collection page data
   * @param {string} data.collectionName - Display name for the collection
   * @param {string} data.description - Collection description text
   * @param {Array<Object>} data.books - Array of book objects
   * @param {string} [data.permalink] - Permalink for the page
   * @param {string} [data.backLinkUrl] - Custom back link URL
   * @param {string} [data.backLinkText] - Custom back link text
   * @returns {string} Complete HTML document
   *
   * @example
   * const generator = new CollectionGenerator();
   * const html = generator.generatePage({
   *   collectionName: 'Richard Prince',
   *   description: 'Publications by and about Richard Prince',
   *   books: [
   *     {
   *       title: 'Folksongs',
   *       slug: '/books/prince_folksongs/',
   *       imagePath: '/assets/images/books/prince_folksongs.jpg',
   *       publisher: 'Fulton Ryder',
   *       year: '2025',
   *       author: 'Richard Prince'
   *     }
   *   ]
   * });
   */
  generatePage(data) {
    const {
      collectionName,
      description,
      books = [],
      permalink = '',
      backLinkUrl,
      backLinkText
    } = data;

    // Validate required fields
    if (!collectionName) {
      throw new Error('collectionName is required');
    }
    if (!description) {
      throw new Error('description is required');
    }

    // Build page sections
    const frontMatter = permalink ? `---\npermalink: ${permalink}\n---\n` : '';
    const head = this.builder.buildHead({
      title: collectionName,
      collectionName
    });
    const header = this.builder.buildHeader();
    const collectionHeader = this.builder.buildCollectionHeader({
      collectionName,
      description,
      backLinkUrl,
      backLinkText
    });
    const bookGrid = this.builder.buildBookGrid(books);
    const footer = this.builder.buildFooter();

    // Assemble complete page
    return `${frontMatter}<!DOCTYPE html>
<html lang="en">
${head}
<body class="bg-gray-50 text-gray-800">

    ${header}

    <main>
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">

            <!-- Collection Header -->
            ${collectionHeader}

            <!-- Grid for Items -->
            ${bookGrid}

        </div>
    </main>

    ${footer}

</body>
</html>`;
  }

  /**
   * Convenience method to generate a page and return as buffer
   * Useful for writing directly to files
   *
   * @param {Object} data - Collection page data
   * @returns {Buffer} HTML content as buffer
   */
  generatePageBuffer(data) {
    const html = this.generatePage(data);
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Validates book object structure
   *
   * @param {Object} book - Book object to validate
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateBook(book) {
    const required = ['title', 'slug'];
    const missing = required.filter(field => !book[field]);

    if (missing.length > 0) {
      throw new Error(`Book missing required fields: ${missing.join(', ')}`);
    }

    return true;
  }

  /**
   * Validates complete collection data structure
   *
   * @param {Object} data - Collection data to validate
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  validateCollectionData(data) {
    if (!data.collectionName) {
      throw new Error('collectionName is required');
    }
    if (!data.description) {
      throw new Error('description is required');
    }
    if (data.books && Array.isArray(data.books)) {
      data.books.forEach((book, index) => {
        try {
          this.validateBook(book);
        } catch (error) {
          throw new Error(`Invalid book at index ${index}: ${error.message}`);
        }
      });
    }

    return true;
  }
}

/**
 * Utility function to create a generator instance
 *
 * @param {Object} config - Optional configuration
 * @returns {CollectionGenerator} New generator instance
 */
function createGenerator(config) {
  return new CollectionGenerator(config);
}

/**
 * Quick generation function for simple use cases
 *
 * @param {Object} data - Collection data
 * @returns {string} Generated HTML
 */
function generateCollectionPage(data) {
  const generator = new CollectionGenerator();
  return generator.generatePage(data);
}

// Export for CommonJS
module.exports = {
  CollectionGenerator,
  SecurityUtils,
  TemplateBuilder,
  CONFIG,
  createGenerator,
  generateCollectionPage
};

// Export for ES6 modules (if using .mjs or with "type": "module")
if (typeof exports !== 'undefined') {
  exports.CollectionGenerator = CollectionGenerator;
  exports.SecurityUtils = SecurityUtils;
  exports.TemplateBuilder = TemplateBuilder;
  exports.CONFIG = CONFIG;
  exports.createGenerator = createGenerator;
  exports.generateCollectionPage = generateCollectionPage;
}
