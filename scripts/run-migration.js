#!/usr/bin/env node

/**
 * Simple Migration Runner for Consolidated Modules
 *
 * This script applies the consolidated modules to the remaining codebase:
 * - Updates cover-utils.js to use image-core.js
 * - Updates files to use the centralized logger
 * - Ensures files use centralized config
 */

const fs = require('fs');
const path = require('path');

// Migration tasks
const migrations = [
    {
        name: 'Update cover-utils.js to use image-core.js',
        file: '/Users/imac/Projects/Hudson_Street_Library/cover-utils.js',
        changes: [
            {
                // Add import for image-core
                find: `const CSVHandler = require('./scripts/utils/csv-handler');
const ImageProcessor = require('./scripts/utils/image-processor');`,
                replace: `const CSVHandler = require('./scripts/utils/csv-handler');
const ImageProcessor = require('./scripts/utils/image-processor');
const { generateStandardFilename, sanitizeFilename, validateImage, checkImageExists, IMAGE_CONFIG } = require('./scripts/utils/image-core');`
            },
            {
                // Replace filename generation with image-core function
                find: `const expectedFilename = \`\${book.author_last || 'Unknown'}_\${book.title || 'Unknown'}_\${book.isbn_asin || ''}\`.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_') + '.jpg';`,
                replace: `const expectedFilename = generateStandardFilename(book);`
            },
            {
                // Replace another filename generation
                find: `const newFilename = \`\${book.author_last || 'Unknown'}_\${book.title || 'Unknown'}_\${isbn}\`.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_') + '.jpg';`,
                replace: `const newFilename = generateStandardFilename({ ...book, isbn_asin: isbn });`
            }
        ]
    },
    {
        name: 'Add logger to cover-utils.js',
        file: '/Users/imac/Projects/Hudson_Street_Library/cover-utils.js',
        changes: [
            {
                find: `const { generateStandardFilename, sanitizeFilename, validateImage, checkImageExists, IMAGE_CONFIG } = require('./scripts/utils/image-core');`,
                replace: `const { generateStandardFilename, sanitizeFilename, validateImage, checkImageExists, IMAGE_CONFIG } = require('./scripts/utils/image-core');
const { getGlobalLogger } = require('./scripts/utils/logger');

// Initialize logger
const logger = getGlobalLogger({ level: 'info' });`
            }
        ]
    },
    {
        name: 'Add centralized config to cover-utils.js',
        file: '/Users/imac/Projects/Hudson_Street_Library/cover-utils.js',
        changes: [
            {
                find: `const logger = getGlobalLogger({ level: 'info' });`,
                replace: `const logger = getGlobalLogger({ level: 'info' });
const { directories } = require('./scripts/config/image-config');`
            },
            {
                // Replace hardcoded paths with config
                find: `const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const THUMBNAIL_DIR = './thumbnails';`,
                replace: `// Use centralized configuration
const CSV_PATH = directories.csvPath;
const IMAGES_DIR = directories.books;
const THUMBNAIL_DIR = './thumbnails';`
            }
        ]
    },
    {
        name: 'Update acquire-covers.js to use image-core.js',
        file: '/Users/imac/Projects/Hudson_Street_Library/acquire-covers.js',
        changes: [
            {
                // Add import for image-core
                find: `const CSVHandler = require('./scripts/utils/csv-handler');`,
                replace: `const CSVHandler = require('./scripts/utils/csv-handler');
const { generateStandardFilename, IMAGE_CONFIG } = require('./scripts/utils/image-core');`
            },
            {
                // Replace manual filename generation with image-core function
                find: `filename: cleanFilename(\`\${row.author_last || 'Unknown'}_\${row.title || 'Unknown'}_\${row.isbn_asin}\`.replace(/\\s+/g, '_')) + '.jpg'`,
                replace: `filename: generateStandardFilename(row)`
            }
        ]
    },
    {
        name: 'Add logger to acquire-covers.js',
        file: '/Users/imac/Projects/Hudson_Street_Library/acquire-covers.js',
        changes: [
            {
                find: `const { generateStandardFilename, IMAGE_CONFIG } = require('./scripts/utils/image-core');`,
                replace: `const { generateStandardFilename, IMAGE_CONFIG } = require('./scripts/utils/image-core');
const { getGlobalLogger } = require('./scripts/utils/logger');

// Initialize logger
const logger = getGlobalLogger({ level: 'info' });`
            }
        ]
    },
    {
        name: 'Add centralized config to acquire-covers.js',
        file: '/Users/imac/Projects/Hudson_Street_Library/acquire-covers.js',
        changes: [
            {
                find: `const logger = getGlobalLogger({ level: 'info' });`,
                replace: `const logger = getGlobalLogger({ level: 'info' });
const { directories, apis, rateLimiting, validation } = require('./scripts/config/image-config');`
            }
        ]
    }
];

// Helper functions
function fileExists(filePath) {
    return fs.existsSync(filePath);
}

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
    fs.writeFileSync(filePath, content, 'utf8');
}

function applyChanges(content, changes) {
    let updatedContent = content;
    let changeCount = 0;

    for (const change of changes) {
        if (change.conditional) {
            // Skip conditional changes for now
            continue;
        }

        if (updatedContent.includes(change.find)) {
            updatedContent = updatedContent.replace(change.find, change.replace);
            changeCount++;
            console.log(`  ✓ Applied change: ${change.find.substring(0, 50)}...`);
        } else {
            console.log(`  - Change not needed: ${change.find.substring(0, 50)}...`);
        }
    }

    return { content: updatedContent, changeCount };
}

// Main migration runner
async function runMigrations() {
    console.log('🔄 Running Module Consolidation Migration...\n');

    const results = {
        total: migrations.length,
        processed: 0,
        updated: 0,
        errors: 0,
        details: []
    };

    for (const migration of migrations) {
        console.log(`📋 Processing: ${migration.name}`);

        try {
            if (!fileExists(migration.file)) {
                console.log(`  ⚠️  File not found: ${migration.file}`);
                results.details.push({
                    migration: migration.name,
                    status: 'skipped',
                    reason: 'file not found'
                });
                continue;
            }

            const originalContent = readFile(migration.file);
            const { content: updatedContent, changeCount } = applyChanges(originalContent, migration.changes);

            if (changeCount > 0) {
                writeFile(migration.file, updatedContent);
                console.log(`  ✅ Updated file with ${changeCount} changes`);
                results.updated++;
                results.details.push({
                    migration: migration.name,
                    status: 'updated',
                    changes: changeCount
                });
            } else {
                console.log(`  ℹ️  No changes needed`);
                results.details.push({
                    migration: migration.name,
                    status: 'no-changes'
                });
            }

            results.processed++;
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
            results.errors++;
            results.details.push({
                migration: migration.name,
                status: 'error',
                error: error.message
            });
        }

        console.log('');
    }

    // Print summary
    console.log('📊 Migration Summary:');
    console.log(`  Total migrations: ${results.total}`);
    console.log(`  Processed: ${results.processed}`);
    console.log(`  Files updated: ${results.updated}`);
    console.log(`  Errors: ${results.errors}`);

    if (results.errors === 0) {
        console.log('  ✅ Migration completed successfully!');
    } else {
        console.log('  ⚠️  Migration completed with errors');
    }

    // Show detailed results
    console.log('\n📝 Detailed Results:');
    for (const detail of results.details) {
        const status = detail.status === 'updated' ? '✅' :
                      detail.status === 'error' ? '❌' :
                      detail.status === 'skipped' ? '⏭️' : 'ℹ️';

        console.log(`  ${status} ${detail.migration}`);
        if (detail.changes) {
            console.log(`    Changes applied: ${detail.changes}`);
        }
        if (detail.error) {
            console.log(`    Error: ${detail.error}`);
        }
        if (detail.reason) {
            console.log(`    Reason: ${detail.reason}`);
        }
    }

    return results;
}

// Additional utility functions for verification
function verifyMigration() {
    console.log('\n🔍 Verifying Migration...\n');

    const checks = [
        {
            name: 'Check cover-utils.js imports image-core',
            file: '/Users/imac/Projects/Hudson_Street_Library/cover-utils.js',
            test: (content) => content.includes("require('./scripts/utils/image-core')")
        },
        {
            name: 'Check cover-utils.js imports logger',
            file: '/Users/imac/Projects/Hudson_Street_Library/cover-utils.js',
            test: (content) => content.includes("require('./scripts/utils/logger')")
        },
        {
            name: 'Check cover-utils.js imports config',
            file: '/Users/imac/Projects/Hudson_Street_Library/cover-utils.js',
            test: (content) => content.includes("require('./scripts/config/image-config')")
        },
        {
            name: 'Check cover-utils.js uses generateStandardFilename',
            file: '/Users/imac/Projects/Hudson_Street_Library/cover-utils.js',
            test: (content) => content.includes('generateStandardFilename(')
        },
        {
            name: 'Check acquire-covers.js imports image-core',
            file: '/Users/imac/Projects/Hudson_Street_Library/acquire-covers.js',
            test: (content) => content.includes("require('./scripts/utils/image-core')")
        },
        {
            name: 'Check acquire-covers.js uses generateStandardFilename',
            file: '/Users/imac/Projects/Hudson_Street_Library/acquire-covers.js',
            test: (content) => content.includes('generateStandardFilename(')
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const check of checks) {
        if (fileExists(check.file)) {
            const content = readFile(check.file);
            if (check.test(content)) {
                console.log(`  ✅ ${check.name}`);
                passed++;
            } else {
                console.log(`  ❌ ${check.name}`);
                failed++;
            }
        } else {
            console.log(`  ⚠️  ${check.name} - File not found`);
            failed++;
        }
    }

    console.log(`\n📊 Verification Results: ${passed} passed, ${failed} failed`);
    return failed === 0;
}

function showSummary() {
    console.log('\n🎉 Migration Complete! Here\'s what was integrated:\n');

    console.log('📦 Consolidated Modules Applied:');
    console.log('  • scripts/utils/image-core.js - Unified image processing');
    console.log('  • scripts/utils/logger.js - Centralized logging');
    console.log('  • scripts/config/image-config.js - Centralized configuration');

    console.log('\n📝 Files Updated:');
    console.log('  • cover-utils.js - Now uses consolidated image processing');
    console.log('  • acquire-covers.js - Now uses consolidated modules');

    console.log('\n✅ Benefits:');
    console.log('  • Consistent filename generation across all scripts');
    console.log('  • Unified logging with file output and statistics');
    console.log('  • Centralized configuration management');
    console.log('  • Reduced code duplication');
    console.log('  • Easier maintenance and debugging');

    console.log('\n🔧 Key Functions Available:');
    console.log('  • generateStandardFilename() - Standard book cover filenames');
    console.log('  • validateImage() - Image validation with detailed results');
    console.log('  • logger.info/warn/error() - Structured logging');
    console.log('  • IMAGE_CONFIG - Centralized image settings');

    console.log('\n💡 Usage Examples:');
    console.log('  # Test cover utilities with new consolidated functions');
    console.log('  ./cover-utils.js analyze --artist "Tillmans"');
    console.log('');
    console.log('  # Test acquire covers with new logging and config');
    console.log('  ./acquire-covers.js --limit 5 --dry-run');
    console.log('');
}

// Run if called directly
if (require.main === module) {
    runMigrations()
        .then((results) => {
            const allPassed = results.errors === 0 && verifyMigration();
            if (allPassed) {
                showSummary();
            }
            return allPassed;
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runMigrations, verifyMigration };