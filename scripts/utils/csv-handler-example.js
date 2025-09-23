#!/usr/bin/env node

/**
 * CSV Handler Usage Examples
 * Demonstrates the capabilities of the enhanced CSV handler
 */

const CSVHandler = require('./csv-handler');
const path = require('path');

async function demonstrateCSVHandler() {
    console.log('📚 CSV Handler Demonstration\n');

    try {
        // 1. Read books with stats
        console.log('1. Reading books.csv with validation and cleaning...');
        const booksResult = await CSVHandler.readBooks();
        console.log(`   ✅ Loaded ${booksResult.data.length} books`);
        console.log(`   📊 Stats: ${booksResult.stats.validRows} valid, ${booksResult.stats.correctedRows} corrected, ${booksResult.stats.invalidRows} invalid`);

        if (booksResult.errors.length > 0) {
            console.log(`   ⚠️  Found ${booksResult.errors.length} warnings/errors`);
            console.log(`   First few issues:`);
            booksResult.errors.slice(0, 3).forEach((error, i) => {
                console.log(`      ${i + 1}. Row ${error.row}: ${error.message || error.warnings?.join(', ')}`);
            });
        }

        // 2. Find books without covers
        console.log('\n2. Finding books without cover images...');
        const booksWithoutCovers = await CSVHandler.findBooksWithoutCovers();
        console.log(`   📸 Found ${booksWithoutCovers.length} books without covers`);

        // 3. Search by author
        console.log('\n3. Searching for books by specific authors...');
        const tillmansBooks = await CSVHandler.getBooksByAuthor('Tillmans');
        console.log(`   🔍 Found ${tillmansBooks.length} books by authors matching "Tillmans"`);

        const abbottBooks = await CSVHandler.getBooksByAuthor('Abbott');
        console.log(`   🔍 Found ${abbottBooks.length} books by authors matching "Abbott"`);

        // 4. Demonstrate batch update (dry run)
        console.log('\n4. Demonstrating batch update capability...');
        if (tillmansBooks.length > 0) {
            const updates = tillmansBooks.slice(0, 2).map(book => ({
                identifier: book.isbn_asin || book.id,
                updates: {
                    collection_grouping: 'Photography',
                    tags: 'Photography, Contemporary Art'
                }
            }));

            console.log(`   🔄 Would update ${updates.length} Tillmans books with collection and tags`);
            console.log(`   📝 Updates to apply:`, updates[0]?.updates);
        }

        // 5. Show CSV stats
        console.log('\n5. CSV File Statistics...');
        const stats = await CSVHandler.getStats(path.join(__dirname, '../../src/_data/books.csv'));
        console.log(`   📈 Total rows: ${stats.rowCount}`);
        console.log(`   📋 Columns: ${stats.columns.length} (${stats.columns.slice(0, 5).join(', ')}...)`);
        console.log(`   💾 File size: ${Math.round(stats.fileSize / 1024)} KB`);

        // 6. Demonstrate error recovery
        console.log('\n6. Testing error recovery with malformed data...');
        const testData = [
            { id: '1', title: 'Test Book', author_full_name: 'Test Author', isbn_asin: '1234567890' },
            { id: '2', title: 'Another Book', author_full_name: '', isbn_asin: 'INVALID_ISBN' },
            { id: '', title: '', author_full_name: 'No Title Author', isbn_asin: '' }
        ];

        const testPath = '/tmp/test-books.csv';
        const writeResult = await CSVHandler.write(testPath, testData);

        if (writeResult.success) {
            console.log(`   ✅ Successfully wrote test CSV`);

            const readResult = await CSVHandler.read(testPath);
            console.log(`   📊 Read back: ${readResult.data.length} records with ${readResult.errors.length} issues`);

            readResult.errors.forEach((error, i) => {
                console.log(`      Issue ${i + 1}: Row ${error.row} - ${error.message || error.warnings?.join(', ')}`);
            });
        }

        console.log('\n✨ CSV Handler demonstration completed successfully!');

    } catch (error) {
        console.error('❌ Error during demonstration:', error.message);
    }
}

// Run demonstration if called directly
if (require.main === module) {
    demonstrateCSVHandler().catch(console.error);
}

module.exports = { demonstrateCSVHandler };