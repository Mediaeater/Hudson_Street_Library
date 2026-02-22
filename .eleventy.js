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

  // --- Filter books by same author (excluding current book) ---
  eleventyConfig.addFilter("otherBooksByAuthor", function(books, authorLast, currentId) {
    if (!books || !authorLast) return [];
    return books.filter(b =>
      b.author_last === authorLast && String(b.id) !== String(currentId)
    ).slice(0, 12);
  });

  // --- Count books by author ---
  eleventyConfig.addFilter("countByAuthor", function(books, authorLast, currentId) {
    if (!books || !authorLast) return 0;
    return books.filter(b =>
      b.author_last === authorLast && String(b.id) !== String(currentId)
    ).length;
  });

  // --- Parse accession date to sortable format ---
  function parseAccessionDate(dateStr) {
    if (!dateStr) return null;

    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }

    // Handle formats like "October 29, 2025" or "December 2024"
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    // Handle just year "2025"
    if (/^20\d{2}$/.test(dateStr)) {
      return new Date(`${dateStr}-01-01`);
    }

    return null;
  }

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