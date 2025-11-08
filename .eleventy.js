// .eleventy.js - Updated for new src directory structure
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");
const Image = require("@11ty/eleventy-img");
const CSVHandler = require("./scripts/utils/csv-handler");

module.exports = function(eleventyConfig) {
  console.log("--- Running Eleventy configuration ---");
  
  // Disable reserved data property checking to allow custom collections
  eleventyConfig.setFreezeReservedData(false);

  // --- Load CSV Data ---
  const csvPath = path.join(__dirname, "src/_data/books.csv");
  let bookData = [];

  try {
    console.log(`--- Attempting to read CSV: ${csvPath}`);
    if (fs.existsSync(csvPath)) {
      const csvResult = CSVHandler.readBooksSync(csvPath);
      bookData = csvResult.data;

      console.log(`--- Parsed ${bookData.length} records from ${csvPath}`);
      console.log(`--- CSV stats: ${csvResult.stats.validRows} valid, ${csvResult.stats.correctedRows} corrected, ${csvResult.stats.invalidRows} invalid`);

      if (csvResult.errors.length > 0) {
        console.log(`--- CSV had ${csvResult.errors.length} warnings/errors`);
        csvResult.errors.slice(0, 3).forEach(error => {
          console.log(`    Row ${error.row}: ${error.message || error.warnings?.join(', ')}`);
        });
      }
    } else {
      console.error(`--- CSV file does not exist: ${csvPath}`);
    }
  } catch (err) {
    console.error(`--- Error parsing CSV: ${csvPath}`, err);
  }

  // --- Add Data Globally ---
  eleventyConfig.addGlobalData("books", bookData);
  console.log(`--- Added 'books' global data with ${bookData.length} items.`);

  // --- Add Slugify Filter ---
  eleventyConfig.addFilter("slugify", function(str) {
    if (!str) return "";
    return slugify(str, {
      lower: true,
      strict: true,
      remove: /["]/g,
    });
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