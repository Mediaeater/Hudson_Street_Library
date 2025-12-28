// .eleventy.js - Updated for new src directory structure
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const Image = require("@11ty/eleventy-img");
const CSVHandler = require("./lib/csv-handler");
// Note: eleventy-plugin-tailwindcss disabled due to Eleventy v3 incompatibility
// CSS is built separately via passthrough copy
// const eleventyTailwind = require("eleventy-plugin-tailwindcss");

const { exec } = require("child_process");

module.exports = function(eleventyConfig) {
  console.log("--- Running Eleventy configuration ---");

  // Add a build event to trigger the cover acquisition script
  eleventyConfig.on("beforeBuild", () => {
    console.log("--- Acquiring book covers ---");
    exec("node acquire-covers.js --limit 10 --strict", (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });
  });

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
      const bookData = await CSVHandler.readBooks(csvPath);
      console.log(`--- Parsed ${bookData.length} records from ${csvPath}`);
      return bookData;
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
  eleventyConfig.addPassthroughCopy({"data": "data"});

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