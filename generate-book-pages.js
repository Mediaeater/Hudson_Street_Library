#!/usr/bin/env node

/**
 * Generate individual book pages from CSV data using the book template
 * Usage: node generate-book-pages.js
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Paths
const CSV_PATH = path.join(__dirname, 'src/_data/books.csv');
const TEMPLATE_PATH = path.join(__dirname, '_site/books/templates/BOOK-TEMPLATE/index.html');
const OUTPUT_DIR = path.join(__dirname, '_site/books');

// Helper function to create URL-friendly slug
function createSlug(author, title) {
  const combined = `${author}_${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return combined;
}

// Helper function to create image filename from title and ISBN
function createImageFilename(title, author, isbn) {
  // Clean and format the filename similar to the pattern in the data
  const cleanTitle = title
    .replace(/[:\-,]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/_+/g, '_');

  const cleanAuthor = author
    .replace(/[,]/g, '')
    .replace(/\s+/g, '_');

  return `${cleanAuthor}_${cleanTitle}_${isbn}.jpg`;
}

// Helper function to format dimensions
function formatDimensions(height, width, depth) {
  const parts = [];
  if (height && height !== 'NULL' && height !== 'null') parts.push(`${height} cm (H)`);
  if (width && width !== 'NULL' && width !== 'null') parts.push(`${width} cm (W)`);
  if (depth && depth !== 'NULL' && depth !== 'null') parts.push(`${depth} cm (D)`);
  return parts.join(' × ') || 'Not specified';
}

// Helper function to check if value is NULL or empty
function isNullOrEmpty(value) {
  return !value || value === 'NULL' || value === 'null' || value.trim() === '';
}

// Helper function to extract tags as array
function getTags(tagsString) {
  if (!tagsString) return [];
  return tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
}

// Helper function to generate subject tags HTML
function generateSubjectTags(tags) {
  if (!tags || tags.length === 0) {
    return '<span class="subject-tag">Photography</span>';
  }

  // Limit to 7 tags maximum as per template comments
  const limitedTags = tags.slice(0, 7);

  return limitedTags.map(tag => {
    const tagSlug = tag.toLowerCase().replace(/\s+/g, '-');
    return `<a href="/static-demo.html?tag=${encodeURIComponent(tag)}" class="subject-tag hover:bg-teal-100">${tag}</a>`;
  }).join('\n                            ');
}

// Main function to generate book page
function generateBookPage(book, template) {
  let html = template;

  // Replace placeholders
  html = html.replace(/\[BOOK TITLE\]/g, book.title || 'Untitled');
  html = html.replace(/\[AUTHOR NAME\]/g, book.author_full_name || 'Unknown Author');
  html = html.replace(/\[AUTHOR\]/g, book.author_last || 'Unknown');

  // Image filename - use relative path from _site/books/{slug}/ to _site/assets/
  const imageFilename = createImageFilename(book.title, book.author_last, book.isbn_asin);
  // Path should be ../../assets/images/books/ from _site/books/{slug}/index.html
  html = html.replace(/src="\/assets\/images\/books\/\[FILENAME\]\.jpg"/g, `src="../../assets/images/books/${imageFilename}"`);

  // Publisher with link
  const publisherName = book.publisher || 'Not specified';
  const publisherLink = book.publisher_url
    ? `<a href="${book.publisher_url}" target="_blank" class="text-teal-700 hover:text-teal-900 underline">${publisherName}</a>`
    : publisherName;

  // Replace all publisher references
  html = html.replace(/<a href="\[PUBLISHER URL\]" target="_blank"[^>]*>\[Publisher Name\]<\/a>/g, publisherLink);
  html = html.replace(/\[Publisher Name\]/g, publisherName);

  // Publication details
  html = html.replace(/\[Date\]/g, book.publication_year || 'Not specified');
  html = html.replace(/\[ISBN\]/g, book.isbn_asin || 'Not specified');
  html = html.replace(/\[Format\]/g, book.binding || 'Not specified');
  html = html.replace(/\[Dimensions\]/g, formatDimensions(book.height_cm, book.width_cm, book.depth_cm));
  html = html.replace(/\[Number\] pages/g, book.page_count ? `${book.page_count} pages` : 'Not specified');
  html = html.replace(/\[Language\]/g, 'English'); // Default to English
  html = html.replace(/\[Edition info\]/g, book.edition_printrun || 'Not specified');

  // Description
  const description = book.description
    ? `<p>${book.description}</p>`
    : '<p>No description available.</p>';
  html = html.replace(/<p>\[First paragraph of description\]<\/p>\s*<p>\[Second paragraph if needed\]<\/p>\s*<p>\[Third paragraph if needed\]<\/p>/g, description);

  // Contributors section - only show if there are contributors
  const hasEditor = !isNullOrEmpty(book.editor);
  const hasContributors = !isNullOrEmpty(book.contributors) && book.contributors !== book.editor;
  const hasDesigner = !isNullOrEmpty(book.designer);

  if (hasEditor || hasContributors || hasDesigner) {
    let contributorsHTML = '';
    if (hasEditor) {
      contributorsHTML += `<p><span class="details-label">Editor:</span>${book.editor}</p>\n                            `;
    }
    if (hasContributors) {
      contributorsHTML += `<p><span class="details-label">Contributors:</span>${book.contributors}</p>\n                            `;
    }
    if (hasDesigner) {
      contributorsHTML += `<p><span class="details-label">Designer:</span>${book.designer}</p>\n                            `;
    }

    // Replace the contributors section
    html = html.replace(
      /<div>\s*<h3 class="detail-section-title[^>]*>Contributors<\/h3>[\s\S]*?<\/div>\s*<\/div>/,
      `<div>
                        <h3 class="detail-section-title text-lg font-semibold text-gray-800">Contributors</h3>
                        <div class="space-y-2 text-sm md:text-base">
                            ${contributorsHTML}
                        </div>
                    </div>`
    );
  } else {
    // Remove the contributors section if no contributors
    html = html.replace(
      /<!-- Contributors[\s\S]*?<\/div>\s*<\/div>\s*<!-- Summary -->/,
      '<!-- Summary -->'
    );
  }

  // Subject tags
  const tags = getTags(book.tags);
  const subjectTagsHTML = generateSubjectTags(tags);
  html = html.replace(
    /<a href="\/static-demo\.html\?tag=\[TAG\]"[^>]*>\[Tag Name\]<\/a>\s*<!-- Keep to 3-7 tags maximum -->/g,
    subjectTagsHTML
  );

  // Collection grouping
  const collection = book.collection_grouping || 'Photography';
  const collectionSlug = collection.toLowerCase().replace(/\s+/g, '-');
  html = html.replace(/\[COLLECTION-SLUG\]/g, collectionSlug);
  html = html.replace(/\[Collection Name\]/g, collection);

  // Library information
  html = html.replace(/\[Classification\]/g, book.classification || 'Photography');
  html = html.replace(/\[Date\/Status\]/g, 'Original Collection');
  html = html.replace(/\[Condition notes if special\]/g, 'Excellent');

  // Special notes (signed, first edition, etc.)
  let specialNotes = [];
  if (book.is_signed_inscribed === 'true' || book.is_signed_inscribed === '1') {
    specialNotes.push('Signed by author');
  }
  if (book.edition_printrun && book.edition_printrun.toLowerCase().includes('first')) {
    specialNotes.push('First edition');
  }
  html = html.replace(/\[Signed, First Edition, etc\.\]/g, specialNotes.join(', ') || 'None');

  // Availability status
  html = html.replace(
    /<span class="availability-badge available">Available for Viewing<\/span>/g,
    '<span class="availability-badge available">Available for Viewing</span>'
  );

  // Remove "Related Books" sections for now (these would require database queries)
  html = html.replace(
    /<!-- Related Books by Author -->[\s\S]*?<\/div>\s*<\/div>\s*<!-- Related Books by Subject/,
    '<!-- Related Books by Subject'
  );
  html = html.replace(
    /<!-- Related Books by Subject[\s\S]*?<\/div>\s*<\/div>\s*<!-- Library Information/,
    '<!-- Library Information'
  );

  return html;
}

// Main execution
async function main() {
  console.log('Starting book page generation...');
  console.log(`Reading CSV from: ${CSV_PATH}`);
  console.log(`Reading template from: ${TEMPLATE_PATH}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);

  // Read template
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  console.log('Template loaded successfully.');

  // Read and process CSV
  const books = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (row) => {
        books.push(row);
      })
      .on('end', () => {
        console.log(`\nProcessed ${books.length} books from CSV.`);

        let successCount = 0;
        let errorCount = 0;

        books.forEach((book, index) => {
          try {
            // Create slug for directory name
            const slug = createSlug(book.author_last, book.title);
            const bookDir = path.join(OUTPUT_DIR, slug);

            // Create directory if it doesn't exist
            if (!fs.existsSync(bookDir)) {
              fs.mkdirSync(bookDir, { recursive: true });
            }

            // Generate HTML
            const html = generateBookPage(book, template);

            // Write file
            const outputPath = path.join(bookDir, 'index.html');
            fs.writeFileSync(outputPath, html, 'utf-8');

            successCount++;

            // Log progress every 50 books
            if ((index + 1) % 50 === 0) {
              console.log(`Progress: ${index + 1}/${books.length} books processed...`);
            }
          } catch (error) {
            console.error(`Error processing book: ${book.title} by ${book.author_full_name}`);
            console.error(error.message);
            errorCount++;
          }
        });

        console.log('\n=== Generation Complete ===');
        console.log(`✓ Successfully generated: ${successCount} pages`);
        if (errorCount > 0) {
          console.log(`✗ Errors: ${errorCount}`);
        }
        console.log(`\nBook pages created in: ${OUTPUT_DIR}`);

        resolve();
      })
      .on('error', (error) => {
        console.error('Error reading CSV:', error);
        reject(error);
      });
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { generateBookPage, createSlug, createImageFilename };
