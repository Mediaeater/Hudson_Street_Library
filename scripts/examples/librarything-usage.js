#!/usr/bin/env node

/**
 * LibraryThing API Usage Example
 *
 * This example demonstrates how to use the enhanced BookAPIClient
 * with LibraryThing integration.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const { BookAPIClient } = require('../utils/book-api-client');

async function exampleUsage() {
    // Create a new API client
    const client = new BookAPIClient();

    // Example book to search for
    const book = {
        title: "The Hobbit",
        author: "J.R.R. Tolkien",
        isbn: "9780547928227"
    };

    console.log(`Searching for: "${book.title}" by ${book.author}`);

    try {
        // Search using LibraryThing specifically
        console.log('\\n1. LibraryThing-only search:');
        const libraryThingResult = await client.searchLibraryThing(book);

        if (libraryThingResult.found) {
            console.log(`   ✅ Found: ${libraryThingResult.imageUrl}`);
        } else {
            console.log(`   ❌ Not found: ${libraryThingResult.reason}`);
        }

        // Search using all APIs with LibraryThing prioritized
        console.log('\\n2. Full search with LibraryThing priority:');
        const fullResult = await client.findBookCover(book, {
            apis: ['libraryThing', 'googleBooks', 'openLibrary', 'worldCat'],
            strict: false
        });

        if (fullResult.found) {
            console.log(`   ✅ Found via: ${fullResult.source}`);
            console.log(`   📷 Image URL: ${fullResult.imageUrl}`);

            // Optional: Download the image
            // const imagePath = await client.downloadImage(
            //     fullResult.imageUrl,
            //     book,
            //     { outputDir: './covers', dryRun: true }
            // );
            // console.log(`   💾 Would save to: ${imagePath}`);
        } else {
            console.log(`   ❌ Not found: ${fullResult.reason}`);
        }

        // Show statistics
        console.log('\\n3. Client Statistics:');
        const stats = client.getStats();
        console.log(`   • Requests made: ${stats.requests}`);
        console.log(`   • Cache hits: ${stats.cacheHits}`);
        console.log(`   • Errors: ${stats.errors}`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Configuration examples
function showConfigExamples() {
    console.log('\\n📋 Configuration Examples:');

    console.log('\\n// Custom API priority order:');
    console.log(`const result = await client.findBookCover(book, {
    apis: ['libraryThing', 'googleBooks'],  // Only use these two
    strict: true                           // Require author/title match
});`);

    console.log('\\n// Rate limiting configuration:');
    console.log(`const client = new BookAPIClient({
    rateLimit: {
        minInterval: 2000,    // 2 seconds between requests
        maxConcurrent: 1      // Only 1 request at a time
    }
});`);

    console.log('\\n// Caching configuration:');
    console.log(`const client = new BookAPIClient({
    cache: {
        enabled: true,
        maxAge: 7200000,      // 2 hours
        maxEntries: 500       // Store up to 500 results
    }
});`);
}

if (require.main === module) {
    console.log('🔍 LibraryThing API Usage Example');
    console.log('═'.repeat(40));

    exampleUsage()
        .then(() => {
            showConfigExamples();
            console.log('\\n✅ Example complete!');
        })
        .catch(error => {
            console.error('\\n❌ Example failed:', error.message);
        });
}

module.exports = { exampleUsage, showConfigExamples };