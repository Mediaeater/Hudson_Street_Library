// .eleventy.js - Updated for new src directory structure
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const Image = require("@11ty/eleventy-img");
const CSVHandler = require("./scripts/utils/csv-handler");
// Note: eleventy-plugin-tailwindcss disabled due to Eleventy v3 incompatibility
// CSS is built separately via passthrough copy
// const eleventyTailwind = require("eleventy-plugin-tailwindcss");

const { exec } = require("child_process");

// --- Parse accession date to sortable format ---
// SECURITY: Hardened against ReDoS (OWASP: Input Validation)
// - Limits input length to prevent processing oversized strings
// - Validates character whitelist before any parsing
// - Uses strict regex for each known format (no arbitrary Date.parse fallback)
// - Validates month names explicitly (V8 Date is too lenient)
// - Validates date ranges to reject nonsensical values
const VALID_MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

function parseAccessionDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  // Limit length to prevent DoS via oversized input
  const MAX_DATE_LENGTH = 50;
  const cleaned = dateStr.trim().slice(0, MAX_DATE_LENGTH);
  if (cleaned.length === 0) return null;

  // Character whitelist: only digits, hyphens, spaces, commas, forward slashes, letters
  if (!/^[0-9\-\/\s,A-Za-z]+$/.test(cleaned)) {
    return null;
  }

  // Handle YYYY-MM-DD format (most common in this dataset)
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [year, month, day] = cleaned.split('-').map(Number);
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
      return null;
    }
    return new Date(Date.UTC(year, month - 1, day));
  }

  // Handle year-only: "2025", "1998", etc.
  if (/^(19|20)\d{2}$/.test(cleaned)) {
    const year = parseInt(cleaned, 10);
    if (year >= 1900 && year <= 2100) {
      return new Date(Date.UTC(year, 0, 1));
    }
    return null;
  }

  // Handle "Month Day, Year" (e.g., "October 29, 2025")
  if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(cleaned)) {
    // Validate month name explicitly -- V8 Date is too lenient with partial matches
    const monthWord = cleaned.split(' ')[0].toLowerCase();
    if (!VALID_MONTHS.includes(monthWord)) {
      return null;
    }
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      if (year >= 1900 && year <= 2100) {
        return parsed;
      }
    }
    return null;
  }

  // Handle "Month Year" (e.g., "December 2024")
  if (/^[A-Za-z]+ \d{4}$/.test(cleaned)) {
    // Validate month name explicitly
    const monthWord = cleaned.split(' ')[0].toLowerCase();
    if (!VALID_MONTHS.includes(monthWord)) {
      return null;
    }
    const parsed = new Date(cleaned);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      if (year >= 1900 && year <= 2100) {
        return parsed;
      }
    }
    return null;
  }

  // No fallback to arbitrary Date.parse -- reject unrecognized formats
  return null;
}

module.exports = function(eleventyConfig) {
  console.log("--- Running Eleventy configuration ---");

  // Cover acquisition removed from build for performance
  // Run manually when needed: node scripts/covers/acquire-covers.js --limit 50
  // This saves 15+ seconds on every build and avoids rate limiting
  //
  // To re-enable in development only, uncomment:
  // eleventyConfig.on("beforeBuild", () => {
  //   if (process.env.NODE_ENV !== 'production') {
  //     console.log("--- Acquiring book covers ---");
  //     exec("node scripts/covers/acquire-covers.js --limit 10 --strict", (error, stdout, stderr) => {
  //       if (error) {
  //         console.error(`exec error: ${error}`);
  //         return;
  //       }
  //       console.log(`stdout: ${stdout}`);
  //       console.error(`stderr: ${stderr}`);
  //     });
  //   }
  // });

  // Tailwind CSS plugin disabled - incompatible with Eleventy v3
  // CSS files are copied via passthrough copy below
  // eleventyConfig.addPlugin(eleventyTailwind, {
  //   src: "src/assets/css/input.css",
  //   dest: "_site/assets/css",
  //   keepFolderStructure: false,
  //   minify: true,
  // });

  // Disable reserved data property checking to allow custom collections
  eleventyConfig.setFreezeReservedData(false);

  // --- Load CSV Data ---
  eleventyConfig.addGlobalData("books", async () => {
    const csvPath = path.join(__dirname, "src/_data/books.csv");
    try {
      console.log(`--- Attempting to read CSV: ${csvPath}`);
      const result = await CSVHandler.readBooks(csvPath);
      console.log(`--- Parsed ${result.data.length} records from ${csvPath}`);
      return result.data;
    } catch (err) {
      console.error(`--- Error parsing CSV: ${csvPath}`, err);
      return [];
    }
  });

  // --- Add Slugify Filter ---
  eleventyConfig.addFilter("slugify", function(str) {
    if (!str) return "";
    return slugify(str, {
      lower: true,
      strict: true,
      remove: /["]/g,
    });
  });

  // --- Sort One Picture Book volumes by volume number ---
  eleventyConfig.addFilter("sortByVolume", function(books) {
    if (!Array.isArray(books)) return books;

    return books.sort((a, b) => {
      // Extract volume number from title (e.g., "One Picture Book Two Vol 52: ..." -> 52)
      const volRegex = /Vol (\d+)/i;
      const matchA = a.title?.match(volRegex);
      const matchB = b.title?.match(volRegex);

      if (!matchA && !matchB) return 0;
      if (!matchA) return 1;
      if (!matchB) return -1;

      const volA = parseInt(matchA[1], 10);
      const volB = parseInt(matchB[1], 10);

      // Sort descending (higher volume numbers first)
      return volB - volA;
    });
  });

  // --- Filter books by same author (excluding current book) ---
  eleventyConfig.addFilter("otherBooksByAuthor", function(books, authorLast, currentId) {
    if (!books || !authorLast) return [];

    // Get unique books that either match author_last OR have author's name in title
    const matchedBooks = books.filter(b => {
      if (String(b.id) === String(currentId)) return false;

      // Match by author last name
      if (b.author_last === authorLast) return true;

      // Match by author name in title (skip short names like "Ma" to avoid false positives)
      if (authorLast.length >= 4 && b.title && b.title.toLowerCase().includes(authorLast.toLowerCase())) return true;

      return false;
    });

    return matchedBooks.slice(0, 12);
  });

  // --- Find related books based on metadata (collection_grouping, tags, classification) ---
  eleventyConfig.addFilter("relatedBooks", function(books, currentBook, limit = 12) {
    if (!books || !currentBook) return [];

    const currentId = String(currentBook.id);

    // Pre-process current book's tags for faster comparison
    const currentTags = currentBook.tags
      ? currentBook.tags.toLowerCase().split(',').map(t => t.trim())
      : [];
    const currentTagsSet = new Set(currentTags);

    // Broad categories that shouldn't dominate scoring
    const broadCategories = new Set(['photography', 'art', 'magazines']);

    const scored = [];
    const authorCounts = {}; // Track books per author to ensure diversity

    // Process each book
    for (let i = 0; i < books.length; i++) {
      const b = books[i];

      // Skip current book
      if (String(b.id) === currentId) continue;

      let score = 0;

      // Same collection_grouping (reduced score for broad categories)
      if (currentBook.collection_grouping &&
          b.collection_grouping &&
          b.collection_grouping === currentBook.collection_grouping) {
        const isBroad = broadCategories.has(currentBook.collection_grouping.toLowerCase());
        score += isBroad ? 3 : 10; // Only +3 for broad categories, +10 for specific
      }

      // Overlapping tags (+2 points per matching tag, skip very common ones)
      if (currentTags.length > 0 && b.tags) {
        const bookTags = b.tags.toLowerCase().split(',').map(t => t.trim());
        let overlap = 0;
        for (let j = 0; j < bookTags.length; j++) {
          const tag = bookTags[j];
          // Skip overly broad tags like "photography" alone
          if (currentTagsSet.has(tag) && !broadCategories.has(tag)) {
            overlap++;
          }
        }
        if (overlap > 0) {
          score += overlap * 2;
        }
      }

      // Same classification (+3 points)
      if (currentBook.classification &&
          b.classification &&
          b.classification === currentBook.classification) {
        score += 3;
      }

      // Same publisher (+2 points)
      if (currentBook.publisher &&
          b.publisher &&
          b.publisher === currentBook.publisher) {
        score += 2;
      }

      // Same author (fallback, +1 point)
      if (currentBook.author_last &&
          b.author_last &&
          b.author_last === currentBook.author_last) {
        score += 1;
      }

      // Only keep books with score >= 4 (minimum threshold)
      if (score >= 4) {
        scored.push({ book: b, score, author: b.author_last });
      }
    }

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);

    // Filter for diversity - limit to 2 books per author in related section
    const diverseResults = [];
    for (const item of scored) {
      const author = item.author || 'unknown';
      authorCounts[author] = (authorCounts[author] || 0) + 1;

      if (authorCounts[author] <= 2) {
        diverseResults.push(item.book);
      }

      if (diverseResults.length >= limit) break;
    }

    return diverseResults;
  });

  // --- Count books by author ---
  eleventyConfig.addFilter("countByAuthor", function(books, authorLast, currentId) {
    if (!books || !authorLast) return 0;

    return books.filter(b => {
      if (String(b.id) === String(currentId)) return false;

      // Match by author last name
      if (b.author_last === authorLast) return true;

      // Match by author name in title (skip short names like "Ma" to avoid false positives)
      if (authorLast.length >= 4 && b.title && b.title.toLowerCase().includes(authorLast.toLowerCase())) return true;

      return false;
    }).length;
  });

  // --- Filter books by accession date ---
  // Returns books sorted by accession date (most recent first)
  eleventyConfig.addFilter("recentlyAdded", function(books, limit) {
    if (!books) return [];

    // Filter books with valid accession dates and parse them
    const booksWithDates = books.map(b => ({
      ...b,
      parsedDate: parseAccessionDate(b.accession_no)
    })).filter(b => b.parsedDate !== null);

    // Sort by featured first, then by parsed date (descending - most recent first)
    const sorted = booksWithDates.sort((a, b) => {
      // Featured books come first
      const aFeatured = a.featured === 'true' || a.featured === true;
      const bFeatured = b.featured === 'true' || b.featured === true;

      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;

      // Within same featured status, sort by date
      return b.parsedDate - a.parsedDate;
    });

    // Return limited or all
    return limit ? sorted.slice(0, limit) : sorted;
  });

  // --- Filter books by accession date (simple chronological, no featured sorting) ---
  // For cataloging/accessioning changelog
  eleventyConfig.addFilter("recentlyAccessioned", function(books, limit) {
    if (!books) return [];

    // Filter books with valid accession dates and parse them
    const booksWithDates = books.map(b => ({
      ...b,
      parsedDate: parseAccessionDate(b.accession_no)
    })).filter(b => b.parsedDate !== null);

    // Sort purely by date (descending - most recent first)
    const sorted = booksWithDates.sort((a, b) => {
      return b.parsedDate - a.parsedDate;
    });

    // Return limited or all
    return limit ? sorted.slice(0, limit) : sorted;
  });

  // --- Format accession date for display ---
  eleventyConfig.addFilter("formatAccessionDate", function(dateStr) {
    if (!dateStr) return '';

    // If already in readable format, return as-is
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Format YYYY-MM-DD to "Month DD, YYYY"
    // Parse as UTC to avoid timezone issues
    const parts = dateStr.split('-');
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (isNaN(date.getTime())) return dateStr;

    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    return date.toLocaleDateString('en-US', options);
  });

  // --- Remove trailing slash from URLs ---
  eleventyConfig.addFilter("removeTrailingSlash", function(url) {
    if (!url) return '';
    return url.replace(/\/$/, '');
  });

  // --- Generate cover image path from book data ---
  // Matches the naming convention used by acquire-covers.js
  eleventyConfig.addFilter("generateCoverPath", function(book) {
    if (!book) return '/assets/images/placeholder-book.svg';

    // If book already has a valid image_url, use it
    if (book.image_url &&
        book.image_url !== 'NULL' &&
        book.image_url !== '' &&
        book.image_url !== null &&
        book.image_url !== 'null') {
      return book.image_url;
    }

    // Generate cover path using same logic as acquire-covers.js
    const authorLast = (book.author_last || 'Unknown').replace(/[^a-zA-Z0-9.-]/g, '_');
    const title = (book.title || 'Untitled').replace(/[^a-zA-Z0-9.-]/g, '_');
    const isbn = (book.isbn_asin || '').replace(/[^a-zA-Z0-9.-]/g, '_').replace(/[-\s]/g, '');

    let filename;
    if (isbn && isbn !== 'NULL' && isbn !== '' && isbn !== 'null') {
      filename = `${authorLast}_${title}_${isbn}`;
    } else {
      filename = `${authorLast}_${title}_NULL`;
    }

    // Sanitize and truncate
    const sanitized = filename
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 100);

    return `/assets/images/books/${sanitized}.jpg`;
  });

  // --- Image Processing Function ---
  async function imageShortcode(src, alt, sizes = "100vw", className = "") {
    let metadata = await Image(src, {
      widths: [300, 600, 900, 1200],
      formats: ["webp", "jpeg"],
      outputDir: "./_site/assets/images/optimized/",
      urlPath: "/assets/images/optimized/",
      filenameFormat: function (id, src, width, format, options) {
        const extension = path.extname(src);
        const name = path.basename(src, extension);
        return `${name}-${width}w.${format}`;
      }
    });

    let imageAttributes = {
      alt,
      sizes,
      loading: "lazy",
      decoding: "async",
      class: className
    };

    return Image.generateHTML(metadata, imageAttributes);
  }

  // --- Add Image Shortcode ---
  eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
  eleventyConfig.addLiquidShortcode("image", imageShortcode);

  // --- Thumbnail Generator Function ---
  async function thumbnailShortcode(src, alt, className = "thumbnail") {
    let metadata = await Image(src, {
      widths: [150, 300],
      formats: ["webp", "jpeg"],
      outputDir: "./_site/assets/images/thumbnails/",
      urlPath: "/assets/images/thumbnails/",
      filenameFormat: function (id, src, width, format, options) {
        const extension = path.extname(src);
        const name = path.basename(src, extension);
        return `${name}-thumb-${width}w.${format}`;
      }
    });

    let imageAttributes = {
      alt,
      loading: "lazy",
      decoding: "async",
      class: className
    };

    return Image.generateHTML(metadata, imageAttributes);
  }

  // --- Add Thumbnail Shortcode ---
  eleventyConfig.addNunjucksAsyncShortcode("thumbnail", thumbnailShortcode);

  // --- Passthrough Copy for assets ---
  // Copy entire assets directory (images, js, css)
  eleventyConfig.addPassthroughCopy("src/assets");

  // Copy data files for search functionality
  eleventyConfig.addPassthroughCopy({"src/_data/books.csv": "cms/data/books.csv"});
  eleventyConfig.addPassthroughCopy({"src/_data/libraryCollections.json": "cms/data/libraryCollections.json"});
  eleventyConfig.addPassthroughCopy({"src/_data/news.json": "cms/data/news.json"});
  eleventyConfig.addPassthroughCopy({"data": "data"});

  // Favicon files
  eleventyConfig.addPassthroughCopy({"src/favicon.ico": "favicon.ico"});
  eleventyConfig.addPassthroughCopy({"src/favicon-16x16.png": "favicon-16x16.png"});
  eleventyConfig.addPassthroughCopy({"src/favicon-32x32.png": "favicon-32x32.png"});
  eleventyConfig.addPassthroughCopy({"src/apple-touch-icon.png": "apple-touch-icon.png"});
  eleventyConfig.addPassthroughCopy({"src/android-chrome-192x192.png": "android-chrome-192x192.png"});
  eleventyConfig.addPassthroughCopy({"src/android-chrome-512x512.png": "android-chrome-512x512.png"});

  // Copy CNAME for GitHub Pages
  eleventyConfig.addPassthroughCopy("CNAME");

  // Copy .nojekyll to prevent Jekyll processing
  eleventyConfig.addPassthroughCopy(".nojekyll");

  // --- Ignore admin directory for static builds ---
  eleventyConfig.ignores.add("src/admin/**");

  // --- Define Input/Output Directories ---
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data"
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    templateFormats: ["njk", "html", "liquid", "md"]
  };
};

// Export internal functions for testing
module.exports.parseAccessionDate = parseAccessionDate;