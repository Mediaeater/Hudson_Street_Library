#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');

async function checkMissingCovers() {
  try {
    // Read books CSV
    const csvContent = await fs.readFile(path.join(__dirname, '../src/_data/books.csv'), 'utf8');
    const books = parse(csvContent, { columns: true });
    
    console.log(`Total books in CSV: ${books.length}`);
    
    // Get all image files in books directory
    const imageDir = path.join(__dirname, '../src/assets/images/books');
    const imageFiles = await fs.readdir(imageDir);
    console.log(`Total image files: ${imageFiles.length}`);
    
    // Create a set of image filenames without extensions
    const imageBasenames = new Set();
    imageFiles.forEach(file => {
      const basename = path.parse(file).name;
      imageBasenames.add(basename.toLowerCase());
    });
    
    // Check each book for a matching image
    const missing = [];
    const found = [];
    
    for (const book of books) {
      // Try different naming patterns
      const possibleNames = [
        // Pattern 1: LastName_FirstName-Title
        `${book.author_last}_${book.author_first}-${book.title}`.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase(),
        // Pattern 2: ISBN
        book.isbn?.toLowerCase(),
        // Pattern 3: Just title
        book.title?.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase(),
        // Pattern 4: ID
        book.id?.toString()
      ].filter(Boolean);
      
      let hasImage = false;
      for (const name of possibleNames) {
        if (imageBasenames.has(name)) {
          hasImage = true;
          break;
        }
      }
      
      if (hasImage) {
        found.push(book);
      } else {
        missing.push(book);
      }
    }
    
    console.log(`\nAnalysis Results:`);
    console.log(`Books with images: ${found.length}`);
    console.log(`Books missing images: ${missing.length}`);
    
    if (missing.length > 0) {
      console.log(`\nFirst 10 missing books:`);
      missing.slice(0, 10).forEach(book => {
        console.log(`- ${book.title} by ${book.author_full_name} (ISBN: ${book.isbn || 'no ISBN'})`);
      });
      
      // Save missing books to file
      const missingFile = path.join(__dirname, 'missing-covers.json');
      await fs.writeFile(missingFile, JSON.stringify(missing, null, 2));
      console.log(`\nFull list saved to: ${missingFile}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkMissingCovers();