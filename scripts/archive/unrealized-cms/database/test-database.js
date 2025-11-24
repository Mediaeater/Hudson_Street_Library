#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const LibraryDatabase = require('./database');
const { DatabaseMigration } = require('./db-migration');
const { DatabaseUtils, healthCheck } = require('./db-utils');

/**
 * Hudson Street Library Database Test Suite
 * Comprehensive testing of the SQLite database system
 */

class DatabaseTester {
    constructor() {
        this.testDbPath = path.join(__dirname, '../../data/test_library.db');
        this.db = null;
        this.utils = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    /**
     * Run all database tests
     */
    async runAllTests() {
        console.log('🧪 Starting Hudson Street Library Database Test Suite\n');

        try {
            // Clean up any existing test database
            await this.cleanup();

            // Run test suites
            await this.testDatabaseInitialization();
            await this.testCRUDOperations();
            await this.testSearchAndQueries();
            await this.testCoverOperations();
            await this.testApiCache();
            await this.testTransactions();
            await this.testMigration();
            await this.testUtilities();
            await this.testPerformance();

            // Generate final report
            this.generateReport();

        } catch (error) {
            console.error(`❌ Test suite failed: ${error.message}`);
            process.exit(1);
        } finally {
            await this.cleanup();
        }
    }

    /**
     * Test database initialization
     */
    async testDatabaseInitialization() {
        console.log('📋 Testing Database Initialization...');

        try {
            // Test 1: Initialize database
            this.db = new LibraryDatabase(this.testDbPath, { verbose: false });
            await this.db.initialize();
            this.pass('Database initialization');

            // Test 2: Check schema creation
            const tables = this.db.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
            const expectedTables = ['books', 'covers', 'api_cache', 'processing_log', 'authors', 'book_authors', 'collections', 'book_collections', 'tags', 'book_tags'];

            const hasAllTables = expectedTables.every(table =>
                tables.some(t => t.name === table)
            );

            if (hasAllTables) {
                this.pass('Schema creation');
            } else {
                this.fail('Schema creation', 'Missing required tables');
            }

            // Test 3: Check indexes
            const indexes = this.db.db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
            if (indexes.length > 0) {
                this.pass('Index creation');
            } else {
                this.fail('Index creation', 'No indexes found');
            }

            // Test 4: Check triggers
            const triggers = this.db.db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all();
            if (triggers.length > 0) {
                this.pass('Trigger creation');
            } else {
                this.fail('Trigger creation', 'No triggers found');
            }

            // Test 5: Check views
            const views = this.db.db.prepare("SELECT name FROM sqlite_master WHERE type='view'").all();
            const expectedViews = ['view_books_complete', 'view_books_missing_covers', 'view_recent_activity'];

            const hasAllViews = expectedViews.every(view =>
                views.some(v => v.name === view)
            );

            if (hasAllViews) {
                this.pass('View creation');
            } else {
                this.fail('View creation', 'Missing required views');
            }

        } catch (error) {
            this.fail('Database initialization', error.message);
        }

        console.log();
    }

    /**
     * Test CRUD operations
     */
    async testCRUDOperations() {
        console.log('📚 Testing CRUD Operations...');

        try {
            // Test 1: Insert book
            const testBook = {
                title: 'Test Photography Book',
                author_full_name: 'Test Author',
                author_last: 'Author',
                author_first: 'Test',
                publisher: 'Test Publisher',
                publication_year: 2023,
                isbn_asin: '1234567890',
                tags: 'photography, test',
                description: 'A test book for the database system'
            };

            const insertResult = this.db.insertBook(testBook);
            if (insertResult.success && insertResult.id) {
                this.pass('Book insertion');
                this.testBookId = insertResult.id;
            } else {
                this.fail('Book insertion', 'Failed to insert book');
                return;
            }

            // Test 2: Read book
            const retrievedBook = this.db.getBookById(this.testBookId);
            if (retrievedBook && retrievedBook.title === testBook.title) {
                this.pass('Book retrieval by ID');
            } else {
                this.fail('Book retrieval by ID', 'Retrieved book data mismatch');
            }

            // Test 3: Read book by ISBN
            const retrievedByIsbn = this.db.getBookByIsbn(testBook.isbn_asin);
            if (retrievedByIsbn && retrievedByIsbn.id === this.testBookId) {
                this.pass('Book retrieval by ISBN');
            } else {
                this.fail('Book retrieval by ISBN', 'Retrieved book data mismatch');
            }

            // Test 4: Update book
            const updateData = {
                description: 'Updated test book description',
                page_count: 200
            };

            const updateResult = this.db.updateBook(this.testBookId, updateData);
            if (updateResult.success) {
                this.pass('Book update');

                // Verify update
                const updatedBook = this.db.getBookById(this.testBookId);
                if (updatedBook.description === updateData.description && updatedBook.page_count === updateData.page_count) {
                    this.pass('Book update verification');
                } else {
                    this.fail('Book update verification', 'Updated data not reflected');
                }
            } else {
                this.fail('Book update', 'Update operation failed');
            }

            // Test 5: Insert multiple books
            const additionalBooks = [
                {
                    title: 'Another Test Book',
                    author_full_name: 'Another Author',
                    isbn_asin: '0987654321'
                },
                {
                    title: 'Third Test Book',
                    author_full_name: 'Third Author',
                    isbn_asin: '1122334455'
                }
            ];

            let multipleInsertSuccess = true;
            for (const book of additionalBooks) {
                const result = this.db.insertBook(book);
                if (!result.success) {
                    multipleInsertSuccess = false;
                    break;
                }
            }

            if (multipleInsertSuccess) {
                this.pass('Multiple book insertion');
            } else {
                this.fail('Multiple book insertion', 'Failed to insert multiple books');
            }

        } catch (error) {
            this.fail('CRUD operations', error.message);
        }

        console.log();
    }

    /**
     * Test search and query operations
     */
    async testSearchAndQueries() {
        console.log('🔍 Testing Search and Queries...');

        try {
            // Test 1: Get all books
            const allBooks = this.db.getAllBooks();
            if (allBooks.length >= 3) {
                this.pass('Get all books');
            } else {
                this.fail('Get all books', `Expected at least 3 books, got ${allBooks.length}`);
            }

            // Test 2: Search by title
            const titleSearch = this.db.searchBooks('test');
            if (titleSearch.length > 0) {
                this.pass('Search by title');
            } else {
                this.fail('Search by title', 'No results found for title search');
            }

            // Test 3: Get books by author
            const authorBooks = this.db.getBooksByAuthor('Test Author');
            if (authorBooks.length > 0) {
                this.pass('Get books by author');
            } else {
                this.fail('Get books by author', 'No books found for author');
            }

            // Test 4: Dynamic query builder
            const queryResult = this.db.queryBooks({
                author: 'Test',
                search: 'photography'
            });

            if (queryResult.length > 0) {
                this.pass('Dynamic query builder');
            } else {
                this.fail('Dynamic query builder', 'No results from dynamic query');
            }

            // Test 5: Pagination
            const paginatedResult = this.db.getAllBooks(2, 0);
            if (paginatedResult.length <= 2) {
                this.pass('Pagination');
            } else {
                this.fail('Pagination', 'Pagination limit not respected');
            }

            // Test 6: Books without covers view
            const booksWithoutCovers = this.db.getBooksWithoutCovers();
            if (Array.isArray(booksWithoutCovers)) {
                this.pass('Books without covers view');
            } else {
                this.fail('Books without covers view', 'View query failed');
            }

        } catch (error) {
            this.fail('Search and queries', error.message);
        }

        console.log();
    }

    /**
     * Test cover operations
     */
    async testCoverOperations() {
        console.log('🖼️ Testing Cover Operations...');

        try {
            // Test 1: Insert cover
            const coverData = {
                book_id: this.testBookId,
                original_url: 'https://example.com/cover.jpg',
                local_path: '/path/to/local/cover.jpg',
                filename: 'cover.jpg',
                width: 300,
                height: 400,
                file_size: 50000,
                format: 'jpg',
                status: 'complete',
                quality_score: 0.85,
                source_api: 'test'
            };

            const coverResult = this.db.insertCover(coverData);
            if (coverResult.success && coverResult.id) {
                this.pass('Cover insertion');
                this.testCoverId = coverResult.id;
            } else {
                this.fail('Cover insertion', 'Failed to insert cover');
                return;
            }

            // Test 2: Get covers by book ID
            const bookCovers = this.db.getCoversByBookId(this.testBookId);
            if (bookCovers.length > 0 && bookCovers[0].id === this.testCoverId) {
                this.pass('Get covers by book ID');
            } else {
                this.fail('Get covers by book ID', 'Cover not found');
            }

            // Test 3: Update cover status
            const statusUpdate = this.db.updateCoverStatus(this.testCoverId, 'failed', 'Test error message');
            if (statusUpdate.success) {
                this.pass('Cover status update');

                // Verify status update
                const updatedCovers = this.db.getCoversByBookId(this.testBookId);
                if (updatedCovers[0].status === 'failed') {
                    this.pass('Cover status update verification');
                } else {
                    this.fail('Cover status update verification', 'Status not updated');
                }
            } else {
                this.fail('Cover status update', 'Failed to update cover status');
            }

        } catch (error) {
            this.fail('Cover operations', error.message);
        }

        console.log();
    }

    /**
     * Test API cache operations
     */
    async testApiCache() {
        console.log('💾 Testing API Cache...');

        try {
            // Test 1: Cache API response
            const cacheKey = 'test_isbn_1234567890';
            const responseData = {
                title: 'Test Book',
                author: 'Test Author',
                isbn: '1234567890'
            };

            const cacheResult = this.db.cacheApiResponse(
                cacheKey,
                'test_api',
                'isbn_lookup',
                '1234567890',
                responseData,
                200,
                24,
                0.95
            );

            if (cacheResult.success) {
                this.pass('API response caching');
            } else {
                this.fail('API response caching', 'Failed to cache response');
            }

            // Test 2: Retrieve cached response
            const cachedResponse = this.db.getCachedApiResponse(cacheKey);
            if (cachedResponse && cachedResponse.response_data.title === responseData.title) {
                this.pass('API cache retrieval');
            } else {
                this.fail('API cache retrieval', 'Cached response not found or incorrect');
            }

            // Test 3: Cache expiration cleanup
            // Insert expired cache entry
            const expiredKey = 'expired_test_key';
            const expiredDate = new Date();
            expiredDate.setHours(expiredDate.getHours() - 25); // 25 hours ago

            this.db.db.prepare(`
                INSERT INTO api_cache (cache_key, api_source, query_type, query_value, response_data, expires_at)
                VALUES (?, 'test', 'test', 'test', '{}', ?)
            `).run(expiredKey, expiredDate.toISOString());

            const cleanedCount = this.db.cleanExpiredCache();
            if (cleanedCount > 0) {
                this.pass('Cache expiration cleanup');
            } else {
                this.fail('Cache expiration cleanup', 'No expired entries cleaned');
            }

        } catch (error) {
            this.fail('API cache operations', error.message);
        }

        console.log();
    }

    /**
     * Test transaction operations
     */
    async testTransactions() {
        console.log('🔄 Testing Transactions...');

        try {
            // Test 1: Successful transaction
            const transaction = this.db.beginTransaction();

            try {
                const book1 = this.db.insertBook({
                    title: 'Transaction Test Book 1',
                    author_full_name: 'Transaction Author',
                    isbn_asin: 'TRANS001'
                });

                const book2 = this.db.insertBook({
                    title: 'Transaction Test Book 2',
                    author_full_name: 'Transaction Author',
                    isbn_asin: 'TRANS002'
                });

                if (book1.success && book2.success) {
                    transaction.commit();
                    this.pass('Transaction commit');
                } else {
                    transaction.rollback();
                    this.fail('Transaction commit', 'Book insertion failed in transaction');
                }
            } catch (error) {
                transaction.rollback();
                this.fail('Transaction commit', error.message);
            }

            // Test 2: Transaction rollback
            const rollbackTransaction = this.db.beginTransaction();

            // Insert first book
            const firstBook = this.db.insertBook({
                title: 'Rollback Test Book',
                author_full_name: 'Rollback Author',
                isbn_asin: 'ROLLBACK001'
            });

            if (!firstBook.success) {
                rollbackTransaction.rollback();
                this.fail('Transaction rollback setup', 'Failed to insert first book');
            } else {
                // Attempt to insert duplicate ISBN
                const duplicateBook = this.db.insertBook({
                    title: 'Another Book',
                    author_full_name: 'Another Author',
                    isbn_asin: 'ROLLBACK001'  // Duplicate ISBN
                });

                if (duplicateBook.success) {
                    rollbackTransaction.rollback();
                    this.fail('Transaction rollback', 'Expected duplicate error but insertion succeeded');
                } else {
                    // Duplicate was correctly rejected, now rollback the transaction
                    rollbackTransaction.rollback();

                    // Verify rollback worked - first book should not exist
                    const rolledBackBook = this.db.getBookByIsbn('ROLLBACK001');
                    if (!rolledBackBook) {
                        this.pass('Transaction rollback');
                    } else {
                        this.fail('Transaction rollback', 'Book exists after rollback');
                    }
                }
            }

            // Test 3: Transaction wrapper
            try {
                const result = this.db.transaction(() => {
                    const book = this.db.insertBook({
                        title: 'Wrapper Test Book',
                        author_full_name: 'Wrapper Author',
                        isbn_asin: 'WRAPPER001'
                    });
                    return book;
                });

                if (result.success) {
                    this.pass('Transaction wrapper');
                } else {
                    this.fail('Transaction wrapper', 'Transaction wrapper failed');
                }
            } catch (error) {
                this.fail('Transaction wrapper', error.message);
            }

        } catch (error) {
            this.fail('Transaction operations', error.message);
        }

        console.log();
    }

    /**
     * Test migration functionality
     */
    async testMigration() {
        console.log('📦 Testing Migration...');

        try {
            // Create a test CSV file
            const testCsvPath = path.join(__dirname, '../../data/test_books.csv');
            const csvContent = `id,author_last,author_first,author_full_name,title,publisher,publication_year,isbn_asin,image_url,description
1,Doe,John,John Doe,Test Migration Book,Test Publisher,2023,MIGRATE001,https://example.com/cover1.jpg,Test description 1
2,Smith,Jane,Jane Smith,Another Migration Book,Another Publisher,2022,MIGRATE002,https://example.com/cover2.jpg,Test description 2`;

            fs.writeFileSync(testCsvPath, csvContent);

            // Test migration with dry run
            const migration = new DatabaseMigration({
                csvPath: testCsvPath,
                dbPath: path.join(__dirname, '../../data/test_migration.db'),
                dryRun: true,
                verbose: false,
                backupCsv: false
            });

            const dryRunResult = await migration.migrate();
            if (dryRunResult.success && dryRunResult.statistics.total === 2) {
                this.pass('Migration dry run');
            } else {
                this.fail('Migration dry run', 'Dry run failed or incorrect count');
            }

            // Clean up test files
            fs.unlinkSync(testCsvPath);
            const testMigrationDb = path.join(__dirname, '../../data/test_migration.db');
            if (fs.existsSync(testMigrationDb)) {
                fs.unlinkSync(testMigrationDb);
            }

        } catch (error) {
            this.fail('Migration functionality', error.message);
        }

        console.log();
    }

    /**
     * Test utility functions
     */
    async testUtilities() {
        console.log('🛠️ Testing Utilities...');

        try {
            this.utils = new DatabaseUtils(this.testDbPath, { verbose: false });
            await this.utils.initialize();

            // Test 1: Database statistics
            const stats = this.utils.getDetailedStats();
            if (stats.fileSize > 0 && stats.pageCount > 0) {
                this.pass('Database statistics');
            } else {
                this.fail('Database statistics', 'Invalid statistics returned');
            }

            // Test 2: Health check
            const health = await healthCheck(this.testDbPath);
            if (health.healthy !== undefined && health.stats) {
                this.pass('Health check');
            } else {
                this.fail('Health check', 'Health check failed');
            }

            // Test 3: Integrity validation
            const integrity = await this.utils.validateIntegrity();
            if (integrity.valid) {
                this.pass('Integrity validation');
            } else {
                this.fail('Integrity validation', 'Database integrity check failed');
            }

            // Test 4: Data consistency validation
            const consistency = await this.utils.validateDataConsistency();
            if (consistency.consistent !== undefined) {
                this.pass('Data consistency validation');
            } else {
                this.fail('Data consistency validation', 'Consistency check failed');
            }

            // Test 5: Backup creation
            const backup = await this.utils.createBackup({
                name: 'test_backup',
                description: 'Test backup'
            });

            if (backup.success && fs.existsSync(backup.backupPath)) {
                this.pass('Backup creation');

                // Clean up backup
                fs.unlinkSync(backup.backupPath);
            } else {
                this.fail('Backup creation', 'Backup file not created');
            }

        } catch (error) {
            this.fail('Utility functions', error.message);
        } finally {
            if (this.utils) {
                this.utils.close();
            }
        }

        console.log();
    }

    /**
     * Test performance
     */
    async testPerformance() {
        console.log('⚡ Testing Performance...');

        try {
            // Test 1: Benchmark queries
            const benchmarks = await this.utils.benchmarkQueries();
            if (benchmarks && Object.keys(benchmarks).length > 0) {
                this.pass('Query benchmarks');

                // Log some benchmark results
                console.log(`    📊 Sample query times:`);
                Object.entries(benchmarks).slice(0, 3).forEach(([query, stats]) => {
                    console.log(`      ${query}: ${stats.avg.toFixed(2)}ms avg`);
                });
            } else {
                this.fail('Query benchmarks', 'Benchmark failed');
            }

            // Test 2: Large dataset simulation
            const startTime = Date.now();
            const batchInserts = [];

            for (let i = 0; i < 100; i++) {
                batchInserts.push({
                    title: `Performance Test Book ${i}`,
                    author_full_name: `Author ${i}`,
                    isbn_asin: `PERF${i.toString().padStart(3, '0')}`,
                    publication_year: 2020 + (i % 4)
                });
            }

            let insertCount = 0;
            const transaction = this.db.beginTransaction();

            try {
                for (const book of batchInserts) {
                    const result = this.db.insertBook(book);
                    if (result.success) insertCount++;
                }
                transaction.commit();
            } catch (error) {
                transaction.rollback();
                throw error;
            }

            const insertTime = Date.now() - startTime;

            if (insertCount === 100 && insertTime < 5000) { // Should complete in under 5 seconds
                this.pass(`Batch insert performance (${insertCount} books in ${insertTime}ms)`);
            } else {
                this.fail('Batch insert performance', `Only inserted ${insertCount}/100 books in ${insertTime}ms`);
            }

            // Test 3: Search performance on larger dataset
            const searchStart = Date.now();
            const searchResults = this.db.searchBooks('Test');
            const searchTime = Date.now() - searchStart;

            if (searchResults.length > 0 && searchTime < 100) { // Should complete in under 100ms
                this.pass(`Search performance (${searchResults.length} results in ${searchTime}ms)`);
            } else {
                this.fail('Search performance', `Search took ${searchTime}ms`);
            }

        } catch (error) {
            this.fail('Performance testing', error.message);
        }

        console.log();
    }

    /**
     * Test helper methods
     */
    pass(testName) {
        console.log(`  ✅ ${testName}`);
        this.testResults.passed++;
    }

    fail(testName, reason) {
        console.log(`  ❌ ${testName}: ${reason}`);
        this.testResults.failed++;
        this.testResults.errors.push(`${testName}: ${reason}`);
    }

    /**
     * Generate final test report
     */
    generateReport() {
        const total = this.testResults.passed + this.testResults.failed;
        const passRate = ((this.testResults.passed / total) * 100).toFixed(1);

        console.log('📊 Test Results Summary');
        console.log('========================');
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Pass Rate: ${passRate}%`);

        if (this.testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.errors.forEach(error => {
                console.log(`  - ${error}`);
            });
        }

        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed! Database system is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the errors above.');
            process.exit(1);
        }
    }

    /**
     * Clean up test resources
     */
    async cleanup() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }

        if (this.utils) {
            this.utils.close();
            this.utils = null;
        }

        // Remove test database files
        const testFiles = [
            this.testDbPath,
            this.testDbPath + '-wal',
            this.testDbPath + '-shm',
            path.join(__dirname, '../../data/test_migration.db'),
            path.join(__dirname, '../../data/test_books.csv')
        ];

        for (const file of testFiles) {
            if (fs.existsSync(file)) {
                try {
                    fs.unlinkSync(file);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        }

        // Clean up backup directory if empty
        const backupDir = path.join(__dirname, '../../data/backups');
        if (fs.existsSync(backupDir)) {
            try {
                const files = fs.readdirSync(backupDir);
                if (files.length === 0) {
                    fs.rmdirSync(backupDir);
                }
            } catch (error) {
                // Ignore cleanup errors
            }
        }
    }
}

/**
 * Main execution
 */
if (require.main === module) {
    const tester = new DatabaseTester();
    tester.runAllTests()
        .then(() => {
            console.log('Test suite completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error(`Test suite failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = DatabaseTester;