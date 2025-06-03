// .eleventy.js (Alternative Data Loading - FINAL ATTEMPT)
const { parse } = require("csv-parse/sync");
const fs = require("fs");
const path = require("path"); // Need path module
const slugify = require("slugify");

module.exports = function(eleventyConfig) {
  console.log("--- DEBUG: [ALT CONFIG] Running .eleventy.js configuration ---"); // Log start

  // --- Load CSV Data Directly ---
  const csvPath = path.join(__dirname, "_data/books.csv"); // Get absolute path
  let bookData = []; // Initialize empty array

  try {
    console.log(`--- DEBUG: [ALT CONFIG] Attempting to read CSV: ${csvPath}`);
    if (fs.existsSync(csvPath)) { // Check if file exists
      const contents = fs.readFileSync(csvPath, "utf8");
      if (contents && contents.trim().length > 0) { // Check if contents not empty
        bookData = parse(contents, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
        console.log(`--- DEBUG: [ALT CONFIG] Directly Parsed ${bookData.length} records from ${csvPath}`);
      } else {
         console.error(`--- DEBUG: [ALT CONFIG] CSV file is empty or only whitespace: ${csvPath}`);
      }
    } else {
       console.error(`--- DEBUG: [ALT CONFIG] CSV file does not exist: ${csvPath}`);
    }
  } catch (err) {
    console.error(`--- DEBUG: [ALT CONFIG] Error Directly Parsing CSV: ${csvPath}`, err);
  }

  // --- Add Data Globally ---
  // Make the loaded data available to templates under the name 'books'
  eleventyConfig.addGlobalData("books", bookData);
  console.log(`--- DEBUG: [ALT CONFIG] Added 'books' global data with ${bookData.length} items.`);


  // --- Add Slugify Filter ---
  eleventyConfig.addFilter("slugify", function(str) {
    if (!str) return "";
    return slugify(str, {
      lower: true,
      strict: true,
      remove: /["]/g,
    });
  });

  // --- Passthrough Copy ---
  eleventyConfig.addPassthroughCopy("imgs");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("collections");
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("collection-explore.html");
  eleventyConfig.addPassthroughCopy("recently_added.html");


  // --- Define Input/Output Directories and Engines ---
  return {
    dir: {
      input: ".",
      output: "_site",
      includes: "_includes",
      layouts: "_includes/layouts",
      data: "_data" // Still good practice to define
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    templateFormats: [ "njk", "html", "liquid" ]
  };
};
console.log("--- DEBUG: [ALT CONFIG] Finished .eleventy.js configuration ---"); // Log end