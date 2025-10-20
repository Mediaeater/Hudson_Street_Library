#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const BOOKS_DIR = path.join(__dirname, '_site/books');
const IMAGES_DIR = path.join(__dirname, '_site/assets/images/books');

async function verifyCovers() {
    console.log('Verifying book cover image paths...\n');

    // Get all book page HTML files
    const bookPages = await glob('*/index.html', { cwd: BOOKS_DIR });

    let totalPages = 0;
    let pagesWithImages = 0;
    let imagesFound = 0;
    let imagesMissing = 0;
    const missingList = [];

    for (const pagePath of bookPages) {
        totalPages++;
        const fullPath = path.join(BOOKS_DIR, pagePath);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Extract image src
        const match = content.match(/src="\.\.\/\.\.\/assets\/images\/books\/([^"]+)"/);

        if (match) {
            pagesWithImages++;
            const imageName = match[1];
            const imageFullPath = path.join(IMAGES_DIR, imageName);

            if (fs.existsSync(imageFullPath)) {
                imagesFound++;
            } else {
                imagesMissing++;
                const bookName = path.dirname(pagePath);
                missingList.push({ book: bookName, image: imageName });
            }
        }
    }

    console.log(`Total book pages: ${totalPages}`);
    console.log(`Pages with image references: ${pagesWithImages}`);
    console.log(`✓ Images found: ${imagesFound}`);
    console.log(`✗ Images missing: ${imagesMissing}`);
    console.log(`\nCoverage: ${((imagesFound / totalPages) * 100).toFixed(1)}%`);

    if (missingList.length > 0) {
        console.log('\nFirst 20 missing images:');
        missingList.slice(0, 20).forEach(item => {
            console.log(`  ${item.book} → ${item.image}`);
        });
    }

    // Count actual images in directory
    const actualImages = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg'));
    console.log(`\nActual image files in directory: ${actualImages.length}`);

    // Show first few actual images for comparison
    console.log('\nSample of actual image filenames:');
    actualImages.slice(0, 10).forEach(img => console.log(`  ${img}`));
}

verifyCovers().catch(console.error);
