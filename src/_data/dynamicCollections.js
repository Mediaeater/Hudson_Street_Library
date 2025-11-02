// dynamicCollections.js
// Generates dynamic collections based on tags/categories with date-prioritized representative images

const fs = require('fs');
const path = require('path');
const CSVHandler = require('../../scripts/utils/csv-handler');

module.exports = function() {
  console.log('--- Generating dynamic collections ---');

  // Load books data
  const csvPath = path.join(__dirname, 'books.csv');
  let books = [];

  try {
    if (fs.existsSync(csvPath)) {
      const csvResult = CSVHandler.readBooksSync(csvPath);
      books = csvResult.data;
      console.log(`--- Loaded ${books.length} books for collection generation`);
    } else {
      console.error('--- books.csv not found');
      return [];
    }
  } catch (err) {
    console.error('--- Error reading books CSV:', err);
    return [];
  }

  // Load collection definitions
  const collectionsPath = path.join(__dirname, 'libraryCollections.json');
  let collectionDefinitions = { collections: [] };

  try {
    if (fs.existsSync(collectionsPath)) {
      const data = fs.readFileSync(collectionsPath, 'utf8');
      collectionDefinitions = JSON.parse(data);
      console.log(`--- Loaded ${collectionDefinitions.collections.length} collection definitions`);
    }
  } catch (err) {
    console.error('--- Error reading libraryCollections.json:', err);
    return [];
  }

  // Helper function to check if a book matches collection keywords
  function matchesCollection(book, keywords) {
    if (!keywords || keywords.length === 0) return false;

    const searchFields = [
      book.tags?.toLowerCase() || '',
      book.classification?.toLowerCase() || '',
      book.collection_grouping?.toLowerCase() || '',
      book.description?.toLowerCase() || ''
    ].join(' ');

    return keywords.some(keyword =>
      searchFields.includes(keyword.toLowerCase())
    );
  }

  // Helper function to get a sortable date value
  function getBookDate(book) {
    // Priority: accession_no > publication_year
    if (book.accession_no) {
      // If accession_no is a number, use it directly
      const accessionNum = parseInt(book.accession_no);
      if (!isNaN(accessionNum)) return accessionNum;
    }

    // Fall back to publication year
    const year = parseInt(book.publication_year);
    return !isNaN(year) ? year : 0;
  }

  // Process each collection
  const enrichedCollections = collectionDefinitions.collections.map(collection => {
    // Find all books matching this collection
    const matchedBooks = books.filter(book =>
      matchesCollection(book, collection.keywords)
    );

    // Sort by date (newest first)
    const sortedBooks = matchedBooks.sort((a, b) => {
      return getBookDate(b) - getBookDate(a);
    });

    // Find first book with an image
    const bookWithImage = sortedBooks.find(book =>
      book.image_url &&
      book.image_url !== 'NULL' &&
      book.image_url.trim() !== ''
    );

    // Get the most recent book's date
    const mostRecentDate = sortedBooks.length > 0 ? getBookDate(sortedBooks[0]) : 0;

    // Fallback: Check for collection-specific image directory
    let representativeImage = bookWithImage?.image_url || collection.image;

    // If no image found from books, check collection-specific directories
    if (!bookWithImage) {
      // Try multiple directory name variations
      const possibleDirs = [
        collection.slug,                                    // e.g., "queering-the-collection"
        collection.id,                                      // e.g., "queering-the-collection"
        collection.slug.split('-')[0],                     // e.g., "queering"
        collection.category,                                // e.g., "photography"
        collection.name.toLowerCase().replace(/\s+/g, '-')  // alternative slug format
      ];

      // Also check common variations
      if (collection.slug.includes('queer')) possibleDirs.push('queer');
      if (collection.slug.includes('black')) possibleDirs.push('black-photographers');
      if (collection.slug.includes('collage')) possibleDirs.push('collage');
      if (collection.slug.includes('nyc')) possibleDirs.push('nyc');

      for (const dirName of possibleDirs) {
        const collectionImageDir = path.join(__dirname, '..', 'assets', 'images', dirName);
        try {
          if (fs.existsSync(collectionImageDir)) {
            const imageFiles = fs.readdirSync(collectionImageDir)
              .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
              .sort(); // Use first image alphabetically

            if (imageFiles.length > 0) {
              representativeImage = `/assets/images/${dirName}/${imageFiles[0]}`;
              break; // Found an image, stop searching
            }
          }
        } catch (err) {
          // Directory doesn't exist or can't be read, try next
          continue;
        }
      }
    }

    // Build enriched collection object
    return {
      ...collection,
      bookCount: matchedBooks.length,
      representativeImage: representativeImage,
      representativeBook: bookWithImage ? {
        id: bookWithImage.id,
        title: bookWithImage.title,
        author: bookWithImage.author_full_name,
        year: bookWithImage.publication_year
      } : null,
      lastUpdated: mostRecentDate,
      hasBooks: matchedBooks.length > 0,
      hasImage: !!bookWithImage || representativeImage !== collection.image
    };
  });

  // Sort collections by most recent activity (lastUpdated descending)
  const sortedCollections = enrichedCollections.sort((a, b) => {
    return b.lastUpdated - a.lastUpdated;
  });

  // Log statistics
  const withImages = sortedCollections.filter(c => c.hasImage).length;
  const withBooks = sortedCollections.filter(c => c.hasBooks).length;

  console.log(`--- Dynamic collections generated:`);
  console.log(`    Total: ${sortedCollections.length}`);
  console.log(`    With books: ${withBooks}`);
  console.log(`    With images: ${withImages}`);
  console.log(`--- Top 3 most recent collections:`);
  sortedCollections.slice(0, 3).forEach((c, i) => {
    console.log(`    ${i + 1}. ${c.name} - ${c.bookCount} books, last: ${c.lastUpdated}`);
  });

  return sortedCollections;
};
