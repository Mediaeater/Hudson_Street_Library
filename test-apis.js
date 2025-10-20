#!/usr/bin/env node

/**
 * Book Cover API Testing Script
 *
 * Tests all 4 book cover APIs to verify they are working correctly:
 * - Google Books
 * - Open Library
 * - WorldCat
 * - LibraryThing
 *
 * Usage: node test-apis.js
 */

const { BookAPIClient } = require('./scripts/utils/book-api-client.js');

// Test configuration
const TEST_BOOKS = [
    {
        isbn: '9781891024368',
        title: 'Portraits',
        author: 'Wolfgang Tillmans',
        description: 'Art photography book'
    },
    {
        isbn: '9780143039433',
        title: '1984',
        author: 'George Orwell',
        description: 'Classic novel (backup test)'
    }
];

const TEST_BOOK = TEST_BOOKS[0];

// Helper function to format timing
function formatTime(ms) {
    return `${(ms / 1000).toFixed(2)}s`;
}

// Helper function to check if image URL is accessible
async function checkImageAccessibility(url) {
    const https = require('https');

    return new Promise((resolve) => {
        const options = {
            method: 'HEAD',
            headers: {
                'User-Agent': 'Hudson Street Library Cover Acquisition Tool'
            },
            timeout: 10000
        };

        const req = https.request(url, options, (res) => {
            resolve({
                accessible: res.statusCode === 200 || res.statusCode === 302,
                statusCode: res.statusCode
            });
        });

        req.on('error', () => {
            resolve({ accessible: false, error: true });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ accessible: false, timeout: true });
        });

        req.end();
    });
}

// Test individual API
async function testAPI(apiName, testFunc, client) {
    const startTime = Date.now();

    try {
        const result = await testFunc();
        const duration = Date.now() - startTime;

        if (result.found && result.imageUrl) {
            // Check if image URL is accessible
            const urlCheck = await checkImageAccessibility(result.imageUrl);

            if (urlCheck.accessible) {
                console.log(`\x1b[32m✓\x1b[0m ${apiName}: Working (found cover, ${formatTime(duration)})`);
                console.log(`  URL: ${result.imageUrl}`);

                if (result.metadata) {
                    const meta = result.metadata;
                    if (meta.title) console.log(`  Title: ${meta.title}`);
                    if (meta.authors) console.log(`  Authors: ${Array.isArray(meta.authors) ? meta.authors.join(', ') : meta.authors}`);
                }

                return {
                    status: 'success',
                    duration,
                    imageUrl: result.imageUrl,
                    metadata: result.metadata
                };
            } else {
                const reason = urlCheck.timeout ? 'Image URL timeout' :
                              urlCheck.error ? 'Image URL error' :
                              `Image URL inaccessible (HTTP ${urlCheck.statusCode})`;

                console.log(`\x1b[33m⚠\x1b[0m ${apiName}: URL found but not accessible (${formatTime(duration)})`);
                console.log(`  URL: ${result.imageUrl}`);
                console.log(`  Reason: ${reason}`);

                return {
                    status: 'partial',
                    duration,
                    imageUrl: result.imageUrl,
                    reason
                };
            }
        } else {
            const reason = result.reason || result.error || 'No cover found';
            console.log(`\x1b[31m✗\x1b[0m ${apiName}: Failed (${formatTime(duration)})`);
            console.log(`  Reason: ${reason}`);

            return {
                status: 'failed',
                duration,
                reason
            };
        }

    } catch (error) {
        const duration = Date.now() - startTime;
        console.log(`\x1b[31m✗\x1b[0m ${apiName}: Failed (${formatTime(duration)})`);
        console.log(`  Error: ${error.message}`);

        return {
            status: 'error',
            duration,
            error: error.message
        };
    }
}

// Main test function
async function runTests() {
    console.log('\n' + '='.repeat(70));
    console.log('BOOK COVER API TESTING');
    console.log('='.repeat(70));
    console.log(`\nTest book: ${TEST_BOOK.title} by ${TEST_BOOK.author}`);
    console.log(`ISBN: ${TEST_BOOK.isbn}`);
    console.log(`Description: ${TEST_BOOK.description}`);
    console.log('\n' + '-'.repeat(70) + '\n');

    const client = new BookAPIClient({
        cache: { enabled: false }, // Disable cache for testing
        request: { timeout: 15000 }
    });

    const results = {};

    // Test Google Books
    console.log('Testing Google Books API...\n');
    results.googleBooks = await testAPI(
        'Google Books',
        () => client.searchGoogleBooks(TEST_BOOK, { strict: false }),
        client
    );
    console.log('');

    // Test Open Library
    console.log('Testing Open Library API...\n');
    results.openLibrary = await testAPI(
        'Open Library',
        () => client.searchOpenLibrary(TEST_BOOK),
        client
    );
    console.log('');

    // Test WorldCat
    console.log('Testing WorldCat API...\n');
    results.worldCat = await testAPI(
        'WorldCat',
        () => client.searchWorldCat(TEST_BOOK),
        client
    );
    console.log('');

    // Test LibraryThing
    console.log('Testing LibraryThing API...\n');

    // Check if API key is configured
    if (!process.env.LIBRARY_THING_API_KEY) {
        console.log(`\x1b[33m⚠\x1b[0m LibraryThing: Skipped (API key not configured)`);
        console.log(`  Set LIBRARY_THING_API_KEY environment variable to test`);
        results.libraryThing = {
            status: 'skipped',
            reason: 'API key not configured'
        };
    } else {
        results.libraryThing = await testAPI(
            'LibraryThing',
            () => client.searchLibraryThing(TEST_BOOK),
            client
        );
    }
    console.log('');

    // Print summary
    console.log('-'.repeat(70));
    console.log('\nSUMMARY');
    console.log('-'.repeat(70) + '\n');

    const statuses = {
        success: 0,
        partial: 0,
        failed: 0,
        error: 0,
        skipped: 0
    };

    Object.entries(results).forEach(([api, result]) => {
        statuses[result.status]++;
    });

    const totalTested = statuses.success + statuses.partial + statuses.failed + statuses.error;
    const totalAPIs = Object.keys(results).length;
    const workingAPIs = statuses.success;

    console.log(`Total APIs tested: ${totalTested}/${totalAPIs}`);
    console.log(`\x1b[32mWorking:\x1b[0m ${statuses.success}`);
    if (statuses.partial > 0) console.log(`\x1b[33mPartial:\x1b[0m ${statuses.partial}`);
    if (statuses.failed > 0) console.log(`\x1b[31mFailed:\x1b[0m ${statuses.failed}`);
    if (statuses.error > 0) console.log(`\x1b[31mErrors:\x1b[0m ${statuses.error}`);
    if (statuses.skipped > 0) console.log(`\x1b[33mSkipped:\x1b[0m ${statuses.skipped}`);

    console.log('');

    // Average response time (only for tested APIs)
    const avgTime = Object.values(results)
        .filter(r => r.duration)
        .reduce((sum, r) => sum + r.duration, 0) / totalTested;

    if (totalTested > 0) {
        console.log(`Average response time: ${formatTime(avgTime)}`);
    }

    // Recommendations
    console.log('\nRECOMMENDATIONS');
    console.log('-'.repeat(70) + '\n');

    const workingAPIs_list = Object.entries(results)
        .filter(([_, r]) => r.status === 'success')
        .map(([api, _]) => api);

    const partialAPIs = Object.entries(results)
        .filter(([_, r]) => r.status === 'partial')
        .map(([api, _]) => api);

    const failedAPIs = Object.entries(results)
        .filter(([_, r]) => r.status === 'failed' || r.status === 'error')
        .map(([api, _]) => api);

    if (workingAPIs_list.length > 0) {
        console.log(`\x1b[32m✓\x1b[0m Fully functional APIs (${workingAPIs_list.length}):`);
        workingAPIs_list.forEach(api => console.log(`  - ${api}`));
        console.log('');
    }

    if (partialAPIs.length > 0) {
        console.log(`\x1b[33m⚠\x1b[0m Partially working APIs (${partialAPIs.length}):`);
        partialAPIs.forEach(api => {
            console.log(`  - ${api}: ${results[api].reason}`);
        });
        console.log('');
    }

    if (failedAPIs.length > 0) {
        console.log(`\x1b[31m✗\x1b[0m Non-functional APIs (${failedAPIs.length}):`);
        failedAPIs.forEach(api => {
            const reason = results[api].reason || results[api].error;
            console.log(`  - ${api}: ${reason}`);

            // Add special notes
            if (api === 'worldCat' && reason.includes('ENOTFOUND')) {
                console.log(`    Note: WorldCat cover service endpoint may have changed or requires authentication`);
            }
            if (api === 'openLibrary' && reason.includes('No cover')) {
                console.log(`    Note: Open Library may not have this specific book; try common ISBN for verification`);
            }
        });
        console.log('');
    }

    if (statuses.skipped > 0) {
        console.log(`\x1b[33m⚠\x1b[0m Skipped APIs: Configuration required`);
        Object.entries(results)
            .filter(([_, r]) => r.status === 'skipped')
            .forEach(([api, r]) => console.log(`  - ${api}: ${r.reason}`));
        console.log('');
    }

    // Priority order recommendation
    if (workingAPIs_list.length > 0) {
        const sortedBySpeed = workingAPIs_list
            .map(api => ({ api, duration: results[api].duration }))
            .sort((a, b) => a.duration - b.duration);

        console.log('Recommended API priority order (fastest first):');
        sortedBySpeed.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.api} (${formatTime(item.duration)})`);
        });
    }

    console.log('\n' + '='.repeat(70) + '\n');

    // Exit code based on results
    if (workingAPIs > 0) {
        process.exit(0); // Success if at least one API works
    } else if (statuses.skipped === totalAPIs) {
        process.exit(2); // All skipped
    } else {
        process.exit(1); // Failure if no APIs work
    }
}

// Run tests
runTests().catch(error => {
    console.error('\n\x1b[31mFatal error:\x1b[0m', error.message);
    console.error(error.stack);
    process.exit(1);
});
