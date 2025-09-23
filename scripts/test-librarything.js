#!/usr/bin/env node

/**
 * Test script for LibraryThing API integration
 */

const path = require('path');
const { BookAPIClient } = require('./utils/book-api-client');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function testLibraryThingIntegration() {
    console.log('🧪 Testing LibraryThing API Integration');
    console.log('═'.repeat(50));

    // Check if API key is configured
    const apiKey = process.env.LIBRARY_THING_API_KEY;
    if (!apiKey || apiKey.includes('your-')) {
        console.log('❌ LibraryThing API key not configured in .env file');
        console.log('   Please run: node scripts/setup-env.js');
        return;
    }

    console.log('✓ LibraryThing API key found');

    // Create client
    const client = new BookAPIClient();

    // Test books with known ISBNs
    const testBooks = [
        {
            title: 'The Great Gatsby',
            author: 'F. Scott Fitzgerald',
            isbn: '9780743273565'
        },
        {
            title: '1984',
            author: 'George Orwell',
            isbn: '9780451524935'
        },
        {
            title: 'To Kill a Mockingbird',
            author: 'Harper Lee',
            isbn: '9780061120084'
        }
    ];

    console.log('\\n🔍 Testing LibraryThing search for sample books...');

    for (const book of testBooks) {
        console.log(`\\n📖 Testing: "${book.title}" by ${book.author} (ISBN: ${book.isbn})`);

        try {
            const result = await client.searchLibraryThing(book);

            if (result.found) {
                console.log(`   ✅ Found: ${result.source}`);
                console.log(`   📷 Image URL: ${result.imageUrl}`);
                if (result.metadata) {
                    console.log(`   📝 Metadata available: ${Object.keys(result.metadata).join(', ')}`);
                }
            } else {
                console.log(`   ❌ Not found: ${result.reason || result.error}`);
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
    }

    console.log('\\n📊 Testing complete search with LibraryThing priority...');

    // Test full search with LibraryThing first
    const testBook = testBooks[0];
    try {
        const result = await client.findBookCover(testBook, {
            apis: ['libraryThing', 'googleBooks', 'openLibrary'],
            strict: false
        });

        console.log(`\\n🎯 Full search result for "${testBook.title}":`);
        if (result.found) {
            console.log(`   ✅ Found via: ${result.source}`);
            console.log(`   📷 Image URL: ${result.imageUrl}`);
        } else {
            console.log(`   ❌ Not found: ${result.reason}`);
        }
    } catch (error) {
        console.log(`   ❌ Full search error: ${error.message}`);
    }

    // Show client statistics
    console.log('\\n📈 Client Statistics:');
    const stats = client.getStats();
    console.log(`   • Total requests: ${stats.requests}`);
    console.log(`   • Cache hits: ${stats.cacheHits}`);
    console.log(`   • Errors: ${stats.errors}`);
    console.log(`   • Cache size: ${stats.cache.size}/${stats.cache.maxEntries}`);

    console.log('\\n✅ LibraryThing integration test complete!');
}

// Run the test
if (require.main === module) {
    testLibraryThingIntegration().catch(error => {
        console.error('\\n❌ Test failed:', error.message);
        process.exit(1);
    });
}

module.exports = { testLibraryThingIntegration };