#!/usr/bin/env node

/**
 * Simple Integration Test for Consolidated Modules
 *
 * Tests that the migration was successful and all modules are working together
 */

console.log('🧪 Testing Consolidated Module Integration...\n');

let passed = 0;
let failed = 0;

function test(name, testFn) {
    try {
        const result = testFn();
        if (result) {
            console.log(`✅ ${name}`);
            passed++;
        } else {
            console.log(`❌ ${name}`);
            failed++;
        }
    } catch (error) {
        console.log(`❌ ${name} - Error: ${error.message}`);
        failed++;
    }
}

// Test image-core module
test('image-core module loads', () => {
    const { generateStandardFilename, IMAGE_CONFIG } = require('./utils/image-core');
    return typeof generateStandardFilename === 'function' && typeof IMAGE_CONFIG === 'object';
});

test('generateStandardFilename works', () => {
    const { generateStandardFilename } = require('./utils/image-core');
    const testBook = { author_last: 'Test', title: 'Book', isbn_asin: '123' };
    const filename = generateStandardFilename(testBook);
    return filename === 'Test_Book_123.jpg';
});

// Test logger module
test('logger module loads', () => {
    const { getGlobalLogger } = require('./utils/logger');
    return typeof getGlobalLogger === 'function';
});

test('logger creates instance', () => {
    const { getGlobalLogger } = require('./utils/logger');
    const logger = getGlobalLogger({ level: 'error' }); // Use error level to minimize output
    return logger && typeof logger.info === 'function';
});

// Test config module
test('config module loads', () => {
    const config = require('./config/image-config');
    return config && config.directories && config.validation;
});

test('config has expected structure', () => {
    const { directories, validation, naming } = require('./config/image-config');
    return directories.csvPath && validation.minSize && naming.pattern;
});

// Test file imports in main scripts
test('cover-utils.js imports are clean', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../cover-utils.js');
    const content = fs.readFileSync(filePath, 'utf8');
    // Check for imports without duplicates
    const imageCoreCounts = (content.match(/require\('\.\/scripts\/utils\/image-core'\)/g) || []).length;
    const loggerCounts = (content.match(/require\('\.\/scripts\/utils\/logger'\)/g) || []).length;
    return imageCoreCounts === 1 && loggerCounts === 1;
});

test('acquire-covers.js imports are clean', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../acquire-covers.js');
    const content = fs.readFileSync(filePath, 'utf8');
    // Check for imports without duplicates
    const imageCoreCounts = (content.match(/require\('\.\/scripts\/utils\/image-core'\)/g) || []).length;
    const loggerCounts = (content.match(/require\('\.\/scripts\/utils\/logger'\)/g) || []).length;
    return imageCoreCounts === 1 && loggerCounts === 1;
});

// Summary
console.log(`\n📊 Integration Test Results:`);
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);

if (failed === 0) {
    console.log('  🎉 All integration tests passed!');
    console.log('\n✅ Module consolidation is working correctly');
} else {
    console.log('  ⚠️ Some tests failed - check the migration');
    process.exit(1);
}