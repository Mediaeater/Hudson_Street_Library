#!/usr/bin/env node

/**
 * Clean up small cover images
 * Removes images below the minimum size threshold
 * Useful for cleaning up small responsive image variants
 */

const { IMAGE_CONFIG } = require('../utils/image-core');
const path = require('path');
const fs = require('fs');

const IMAGES_DIR = path.join(__dirname, 'src/assets/images/books');

// Colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

function print(text, color = 'reset') {
    console.log(`${colors[color]}${text}${colors.reset}`);
}

function cleanSmallCovers() {
    print('\n=== Cleaning Small Cover Images ===\n', 'cyan');

    if (!fs.existsSync(IMAGES_DIR)) {
        print('Images directory does not exist!', 'red');
        return;
    }

    const imageFiles = fs.readdirSync(IMAGES_DIR)
        .filter(file => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(file).toLowerCase()));

    print(`Scanning ${imageFiles.length} images...`, 'dim');

    const smallCovers = [];
    const byType = {
        responsiveVariants: [],
        mainCovers: []
    };

    for (const file of imageFiles) {
        const filepath = path.join(IMAGES_DIR, file);
        const stats = fs.statSync(filepath);

        if (stats.size < IMAGE_CONFIG.validation.minSize) {
            const coverInfo = {
                filename: file,
                filepath: filepath,
                size: stats.size
            };

            smallCovers.push(coverInfo);

            // Categorize: responsive variants have patterns like -128w, -300w, -500w
            if (file.match(/-\d+w\.(jpg|jpeg|png|webp)$/i)) {
                byType.responsiveVariants.push(coverInfo);
            } else {
                byType.mainCovers.push(coverInfo);
            }
        }
    }

    print(`\nFound ${smallCovers.length} covers below ${IMAGE_CONFIG.validation.minSize} bytes`, 'yellow');
    print(`  - Responsive variants: ${byType.responsiveVariants.length}`, 'dim');
    print(`  - Main covers: ${byType.mainCovers.length}`, 'dim');
    print('', 'reset');

    if (smallCovers.length === 0) {
        print('No small covers found. All images are above the minimum size threshold.', 'green');
        return;
    }

    // Show what will be deleted
    print('Files to be deleted:', 'cyan');
    smallCovers.forEach(cover => {
        print(`  ${cover.filename} (${cover.size} bytes)`, 'dim');
    });
    print('', 'reset');

    // Delete files
    let deleted = 0;
    let errors = 0;

    for (const cover of smallCovers) {
        try {
            fs.unlinkSync(cover.filepath);
            deleted++;
            print(`✓ Deleted: ${cover.filename}`, 'green');
        } catch (error) {
            errors++;
            print(`✗ Error deleting ${cover.filename}: ${error.message}`, 'red');
        }
    }

    // Print summary
    print('\n=== Summary ===\n', 'cyan');
    print(`Total small covers found: ${smallCovers.length}`, 'white');
    print(`Successfully deleted: ${deleted}`, 'green');
    print(`Errors: ${errors}`, errors > 0 ? 'red' : 'dim');
    print('', 'reset');

    if (byType.mainCovers.length > 0) {
        print(`⚠️  WARNING: ${byType.mainCovers.length} main covers were deleted (not responsive variants)`, 'yellow');
        print('These books may need their covers re-acquired:', 'yellow');
        byType.mainCovers.forEach(cover => {
            print(`  ${cover.filename}`, 'dim');
        });
        print('', 'reset');
    }
}

cleanSmallCovers();
