#!/usr/bin/env node
/**
 * Test Script for Image Cache System
 *
 * Tests the image cache functionality with various scenarios
 */

const fs = require('fs');
const path = require('path');
const {
    getCache,
    cacheImage,
    lookupCachedImage,
    shouldDownloadImage,
    getCacheStats,
    clearImageCache,
    validateImageCache,
    _resetCache
} = require('./image-cache');

// Test configuration
const TEST_CONFIG = {
    testDir: path.join(__dirname, '../../temp/cache-test'),
    testImage: path.join(__dirname, '../../src/assets/images/placeholder-book.svg'),
    mockBookData: {
        title: 'Test Book',
        author_last: 'TestAuthor',
        author_first: 'Test',
        isbn_asin: '1234567890'
    }
};

/**
 * Setup test environment
 */
async function setupTests() {
    console.log('Setting up test environment...');

    // Reset cache for clean testing
    _resetCache();

    // Create test directory
    if (!fs.existsSync(TEST_CONFIG.testDir)) {
        fs.mkdirSync(TEST_CONFIG.testDir, { recursive: true });
    }

    // Create a test image file if placeholder doesn't exist
    if (!fs.existsSync(TEST_CONFIG.testImage)) {
        console.warn('Placeholder image not found, creating test file...');
        const testImagePath = path.join(TEST_CONFIG.testDir, 'test-image.jpg');
        fs.writeFileSync(testImagePath, 'fake image data for testing');
        TEST_CONFIG.testImage = testImagePath;
    }

    console.log('Test environment ready\n');
}

/**
 * Test cache initialization
 */
async function testInitialization() {
    console.log('🧪 Testing cache initialization...');

    try {
        const cache = await getCache({
            cacheFile: path.join(TEST_CONFIG.testDir, 'test-cache.json')
        });

        console.log('✅ Cache initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Cache initialization failed:', error.message);
        return false;
    }
}

/**
 * Test adding images to cache
 */
async function testAddImage() {
    console.log('\n🧪 Testing image addition to cache...');

    try {
        const imageData = {
            url: 'https://example.com/test-cover.jpg',
            localPath: TEST_CONFIG.testImage,
            bookData: TEST_CONFIG.mockBookData
        };

        const cacheKey = await cacheImage(imageData, {
            validate: false,
            tags: ['test', 'book-cover'],
            source: 'test-suite'
        });

        console.log('✅ Image added to cache with key:', cacheKey);
        return cacheKey;
    } catch (error) {
        console.error('❌ Failed to add image to cache:', error.message);
        return null;
    }
}

/**
 * Test cache lookups
 */
async function testLookups(cacheKey) {
    console.log('\n🧪 Testing cache lookups...');

    const tests = [
        {
            name: 'Lookup by cache key',
            params: { id: cacheKey }
        },
        {
            name: 'Lookup by ISBN',
            params: { isbn: TEST_CONFIG.mockBookData.isbn_asin }
        },
        {
            name: 'Lookup by filename',
            params: { filename: path.basename(TEST_CONFIG.testImage) }
        },
        {
            name: 'Lookup by URL',
            params: { url: 'https://example.com/test-cover.jpg' }
        },
        {
            name: 'Lookup by book data',
            params: { bookData: TEST_CONFIG.mockBookData }
        }
    ];

    let passedTests = 0;

    for (const test of tests) {
        try {
            const result = await lookupCachedImage(test.params);
            if (result) {
                console.log(`✅ ${test.name}: Found entry`);
                passedTests++;
            } else {
                console.log(`❌ ${test.name}: No entry found`);
            }
        } catch (error) {
            console.error(`❌ ${test.name}: Error -`, error.message);
        }
    }

    console.log(`Lookup tests: ${passedTests}/${tests.length} passed`);
    return passedTests === tests.length;
}

/**
 * Test download recommendations
 */
async function testDownloadRecommendations() {
    console.log('\n🧪 Testing download recommendations...');

    const tests = [
        {
            name: 'Existing cached image',
            request: {
                url: 'https://example.com/test-cover.jpg',
                bookData: TEST_CONFIG.mockBookData
            },
            expectedShouldDownload: false
        },
        {
            name: 'New image request',
            request: {
                url: 'https://example.com/new-cover.jpg',
                bookData: {
                    title: 'New Book',
                    author_last: 'NewAuthor',
                    isbn_asin: '9876543210'
                }
            },
            expectedShouldDownload: true
        }
    ];

    let passedTests = 0;

    for (const test of tests) {
        try {
            const recommendation = await shouldDownloadImage(test.request);

            if (recommendation.shouldDownload === test.expectedShouldDownload) {
                console.log(`✅ ${test.name}: Correct recommendation (${recommendation.reason})`);
                passedTests++;
            } else {
                console.log(`❌ ${test.name}: Incorrect recommendation`);
            }
        } catch (error) {
            console.error(`❌ ${test.name}: Error -`, error.message);
        }
    }

    console.log(`Download recommendation tests: ${passedTests}/${tests.length} passed`);
    return passedTests === tests.length;
}

/**
 * Test cache statistics
 */
async function testStatistics() {
    console.log('\n🧪 Testing cache statistics...');

    try {
        const stats = await getCacheStats();

        console.log('Cache Statistics:');
        console.log(`- Total entries: ${stats.cache.totalEntries}`);
        console.log(`- Total size: ${stats.cache.totalSize} bytes`);
        console.log(`- Hit rate: ${stats.performance.hitRate}%`);
        console.log(`- Cache hits: ${stats.performance.hits}`);
        console.log(`- Cache misses: ${stats.performance.misses}`);

        if (stats.cache.totalEntries > 0) {
            console.log('✅ Statistics generated successfully');
            return true;
        } else {
            console.log('⚠️  No cache entries found for statistics');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to get statistics:', error.message);
        return false;
    }
}

/**
 * Test cache validation
 */
async function testValidation() {
    console.log('\n🧪 Testing cache validation...');

    try {
        const validation = await validateImageCache();

        console.log('Validation Results:');
        console.log(`- Total entries: ${validation.statistics.total}`);
        console.log(`- Valid entries: ${validation.statistics.valid}`);
        console.log(`- Invalid entries: ${validation.statistics.invalid}`);
        console.log(`- Missing files: ${validation.statistics.missing}`);

        if (validation.errors.length > 0) {
            console.log('Errors found:');
            validation.errors.forEach(error => console.log(`  - ${error}`));
        }

        if (validation.warnings.length > 0) {
            console.log('Warnings found:');
            validation.warnings.forEach(warning => console.log(`  - ${warning}`));
        }

        console.log('✅ Cache validation completed');
        return true;
    } catch (error) {
        console.error('❌ Cache validation failed:', error.message);
        return false;
    }
}

/**
 * Test cache clearing
 */
async function testCacheClear() {
    console.log('\n🧪 Testing cache clearing...');

    try {
        const statsBefore = await getCacheStats();
        const entriesBefore = statsBefore.cache.totalEntries;

        await clearImageCache({ backup: true });

        const statsAfter = await getCacheStats();
        const entriesAfter = statsAfter.cache.totalEntries;

        if (entriesAfter === 0 && entriesBefore > 0) {
            console.log(`✅ Cache cleared successfully (${entriesBefore} → ${entriesAfter} entries)`);
            return true;
        } else {
            console.log('❌ Cache clearing did not work as expected');
            return false;
        }
    } catch (error) {
        console.error('❌ Cache clearing failed:', error.message);
        return false;
    }
}

/**
 * Cleanup test environment
 */
async function cleanupTests() {
    console.log('\n🧹 Cleaning up test environment...');

    try {
        // Remove test directory and files
        if (fs.existsSync(TEST_CONFIG.testDir)) {
            fs.rmSync(TEST_CONFIG.testDir, { recursive: true, force: true });
        }

        console.log('✅ Cleanup completed');
    } catch (error) {
        console.warn('⚠️  Cleanup warning:', error.message);
    }
}

/**
 * Run all tests
 */
async function runAllTests() {
    console.log('🚀 Starting Image Cache Test Suite\n');

    const results = [];

    try {
        await setupTests();

        // Run tests in sequence
        results.push(['Initialization', await testInitialization()]);

        const cacheKey = await testAddImage();
        if (cacheKey) {
            results.push(['Add Image', true]);
            results.push(['Lookups', await testLookups(cacheKey)]);
            results.push(['Download Recommendations', await testDownloadRecommendations()]);
            results.push(['Statistics', await testStatistics()]);
            results.push(['Validation', await testValidation()]);
            results.push(['Cache Clear', await testCacheClear()]);
        } else {
            results.push(['Add Image', false]);
        }

    } catch (error) {
        console.error('💥 Test suite failed with error:', error.message);
    } finally {
        await cleanupTests();
    }

    // Print summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');

    const passed = results.filter(([, result]) => result).length;
    const total = results.length;

    results.forEach(([testName, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${testName}`);
    });

    console.log(`\nTotal: ${passed}/${total} tests passed`);

    if (passed === total) {
        console.log('🎉 All tests passed! Image cache system is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Please review the output above.');
    }

    process.exit(passed === total ? 0 : 1);
}

// Run tests if called directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Test suite crashed:', error);
        process.exit(1);
    });
}

module.exports = {
    runAllTests,
    setupTests,
    cleanupTests
};