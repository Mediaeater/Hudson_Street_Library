// .eleventy.js - Updated for new src directory structure
const { parse } = require("csv-parse/sync");
const fs = require("fs");
const path = require("path");
const slugify = require("slugify");

module.exports = function(eleventyConfig) {
  console.log("--- Running Eleventy configuration ---");

  // --- Load CSV Data ---
  const csvPath = path.join(__dirname, "src/_data/books.csv");
  let bookData = [];

  try {
    console.log(`--- Attempting to read CSV: ${csvPath}`);
    if (fs.existsSync(csvPath)) {
      const contents = fs.readFileSync(csvPath, "utf8");
      if (contents && contents.trim().length > 0) {
        bookData = parse(contents, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        console.log(`--- Parsed ${bookData.length} records from ${csvPath}`);
      } else {
        console.error(`--- CSV file is empty: ${csvPath}`);
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

  // --- Passthrough Copy for assets ---
  // Copy entire assets directory (images, js, css)
  eleventyConfig.addPassthroughCopy("src/assets");
  
  // Copy CNAME for GitHub Pages
  eleventyConfig.addPassthroughCopy("CNAME");
  
  // Copy .nojekyll to prevent Jekyll processing
  eleventyConfig.addPassthroughCopy(".nojekyll");

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