const path = require('path');
const fs = require('fs');
const LibraryDatabase = require('./database');
const CSVHandler = require('../utils/csv-handler');

/**
 * Hudson Street Library Database Migration Script
 * Migrates data from CSV files to SQLite database
 * Includes validation, backup, and integrity checking
 */

class DatabaseMigration {
    constructor(options = {}) {
        this.options = {
            csvPath: options.csvPath || path.join(__dirname, '../../src/_data/books.csv'),
            dbPath: options.dbPath || path.join(__dirname, '../../data/library.db'),
            backupCsv: options.backupCsv !== false, // Default to true
            dryRun: options.dryRun || false,
            batchSize: options.batchSize || 100,
            verbose: options.verbose || false,
            ...options
        };

        this.db = null;
        this.migrationId = null;
        this.stats = {
            total: 0,
            successful: 0,
            failed: 0,
            skipped: 0,
            duplicates: 0,
            errors: []
        };
    }

    /**
     * Main migration process
     */
    async migrate() {
        const startTime = Date.now();
        this.migrationId = `migration_${new Date().toISOString().replace(/[:.]/g, '-')}`;

        try {
            this.log('Starting CSV to SQLite migration...', 'info');

            // Step 1: Validate prerequisites
            await this.validatePrerequisites();

            // Step 2: Initialize database
            await this.initializeDatabase();

            // Step 3: Create CSV backup if requested
            if (this.options.backupCsv) {
                await this.createCsvBackup();
            }

            // Step 4: Read and validate CSV data
            const csvData = await this.readCsvData();

            // Step 5: Migrate data to database
            await this.migrateData(csvData);

            // Step 6: Verify data integrity
            await this.verifyIntegrity(csvData);

            // Step 7: Generate migration report
            const duration = Date.now() - startTime;
            const report = this.generateReport(duration);

            this.log('Migration completed successfully!', 'success');
            return report;

        } catch (error) {
            this.log(`Migration failed: ${error.message}`, 'error');
            await this.rollbackOnError();
            throw error;
        } finally {
            if (this.db) {
                this.db.close();
            }
        }
    }

    /**
     * Validate prerequisites for migration
     */
    async validatePrerequisites() {
        this.log('Validating prerequisites...', 'info');

        // Check if CSV file exists
        if (!fs.existsSync(this.options.csvPath)) {
            throw new Error(`CSV file not found: ${this.options.csvPath}`);
        }

        // Check CSV file size and format
        const csvStats = fs.statSync(this.options.csvPath);
        if (csvStats.size === 0) {
            throw new Error('CSV file is empty');
        }

        // Ensure database directory exists
        const dbDir = path.dirname(this.options.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            this.log(`Created database directory: ${dbDir}`, 'info');
        }

        // Check if database already exists and has data
        if (fs.existsSync(this.options.dbPath)) {
            const tempDb = new LibraryDatabase(this.options.dbPath, { verbose: false });

            try {
                await tempDb.initialize();

                // Check if tables exist before getting stats
                const tables = tempDb.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
                console.log('Existing tables:', tables.map(t => t.name));

                if (tables.some(t => t.name === 'books')) {
                    const stats = tempDb.getStats();

                    if (stats.books.total > 0) {
                        const proceed = await this.confirmOverwrite(stats.books.total);
                        if (!proceed) {
                            throw new Error('Migration cancelled by user');
                        }
                    }
                } else {
                    console.log('Books table not found in database, will be created during migration');
                }
            } catch (error) {
                console.error('Error checking existing database:', error.message);
                // Continue with migration if database check fails
            } finally {
                tempDb.close();
            }
        }

        this.log('Prerequisites validated successfully', 'success');
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        this.log('Initializing database...', 'info');

        this.db = new LibraryDatabase(this.options.dbPath, {
            verbose: this.options.verbose
        });

        await this.db.initialize();

        // Log migration start
        this.db.logOperation(
            'migration',
            'csv_import',
            'books',
            null,
            this.migrationId,
            null,
            { csvPath: this.options.csvPath, options: this.options },
            'started',
            null,
            null,
            this.options.csvPath,
            this.migrationId
        );

        this.log('Database initialized successfully', 'success');
    }

    /**
     * Create backup of CSV file
     */
    async createCsvBackup() {
        this.log('Creating CSV backup...', 'info');

        const backupPath = this.options.csvPath.replace('.csv', `_backup_${this.migrationId}.csv`);
        fs.copyFileSync(this.options.csvPath, backupPath);

        this.log(`CSV backup created: ${backupPath}`, 'success');
        return backupPath;
    }

    /**
     * Read and validate CSV data
     */
    async readCsvData() {
        this.log('Reading CSV data...', 'info');

        const result = await CSVHandler.readBooks(this.options.csvPath);

        this.stats.total = result.data.length;
        this.log(`Read ${this.stats.total} books from CSV`, 'info');

        if (result.errors.length > 0) {
            this.log(`CSV validation warnings: ${result.errors.length}`, 'warn');
            result.errors.forEach(error => {
                if (error.type === 'error') {
                    this.stats.errors.push(`Row ${error.row}: ${error.message}`);
                }
            });
        }

        // Additional validation
        await this.validateCsvData(result.data);

        return result.data;
    }

    /**
     * Validate CSV data structure and content
     */
    async validateCsvData(books) {
        this.log('Validating CSV data structure...', 'info');

        const requiredFields = ['title', 'author_full_name'];
        const issues = [];

        books.forEach((book, index) => {
            // Check required fields
            requiredFields.forEach(field => {
                if (!book[field] || book[field].trim() === '') {
                    issues.push(`Row ${index + 1}: Missing required field '${field}'`);
                }
            });

            // Check for potential duplicates
            if (book.isbn_asin && book.isbn_asin.trim()) {
                const duplicates = books.filter((b, i) =>
                    i !== index &&
                    b.isbn_asin &&
                    b.isbn_asin.trim() === book.isbn_asin.trim()
                );

                if (duplicates.length > 0) {
                    issues.push(`Row ${index + 1}: Duplicate ISBN ${book.isbn_asin}`);
                }
            }

            // Validate year
            if (book.publication_year) {
                const year = parseInt(book.publication_year);
                if (isNaN(year) || year < 1400 || year > new Date().getFullYear() + 2) {
                    issues.push(`Row ${index + 1}: Invalid publication year '${book.publication_year}'`);
                }
            }
        });

        if (issues.length > 0) {
            this.log(`Found ${issues.length} data validation issues`, 'warn');
            this.stats.errors.push(...issues);

            // If too many errors, abort
            if (issues.length > this.stats.total * 0.1) { // More than 10% errors
                throw new Error(`Too many validation errors (${issues.length}). Please fix CSV data first.`);
            }
        }

        this.log('CSV data validation completed', 'success');
    }

    /**
     * Migrate data to database
     */
    async migrateData(books) {
        this.log(`Migrating ${books.length} books to database...`, 'info');

        if (this.options.dryRun) {
            this.log('DRY RUN MODE - No data will be written', 'warn');
            this.stats.successful = books.length;
            return;
        }

        const batches = this.createBatches(books, this.options.batchSize);
        let processedBooks = 0;

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchId = `${this.migrationId}_batch_${batchIndex + 1}`;

            this.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} books)`, 'info');

            const transaction = this.db.beginTransaction();

            try {
                for (const book of batch) {
                    await this.migrateBook(book, batchId);
                    processedBooks++;

                    // Show progress for large migrations
                    if (processedBooks % 50 === 0 || processedBooks === books.length) {
                        const progress = ((processedBooks / books.length) * 100).toFixed(1);
                        this.log(`Progress: ${processedBooks}/${books.length} (${progress}%)`, 'info');
                    }
                }

                transaction.commit();
                this.log(`Batch ${batchIndex + 1} completed successfully`, 'success');

            } catch (error) {
                transaction.rollback();
                this.log(`Batch ${batchIndex + 1} failed: ${error.message}`, 'error');
                this.stats.errors.push(`Batch ${batchIndex + 1}: ${error.message}`);
                throw error;
            }
        }

        this.log('Data migration completed', 'success');
    }

    /**
     * Migrate a single book
     */
    async migrateBook(book, batchId) {
        try {
            // Check for existing book with same ISBN
            if (book.isbn_asin && book.isbn_asin.trim()) {
                const existing = this.db.getBookByIsbn(book.isbn_asin.trim());
                if (existing) {
                    this.stats.duplicates++;
                    this.stats.skipped++;
                    this.log(`Skipped duplicate ISBN: ${book.isbn_asin}`, 'warn');
                    return;
                }
            }

            // Prepare book data for database
            const bookData = this.prepareBookData(book);

            // Insert book
            const result = this.db.insertBook(bookData);

            if (result.success) {
                this.stats.successful++;

                // If book has image URL, create cover record
                if (bookData.image_url && bookData.image_url.trim()) {
                    await this.createCoverRecord(result.id, bookData.image_url);
                }
            } else {
                this.stats.failed++;
                this.stats.errors.push(`Failed to insert book: ${book.title} - ${result.error}`);
            }

        } catch (error) {
            this.stats.failed++;
            this.stats.errors.push(`Error migrating book "${book.title}": ${error.message}`);
            this.log(`Error migrating book "${book.title}": ${error.message}`, 'error');
        }
    }

    /**
     * Prepare book data for database insertion
     */
    prepareBookData(csvBook) {
        return {
            author_last: csvBook.author_last || '',
            author_first: csvBook.author_first || '',
            author_full_name: csvBook.author_full_name || '',
            title: csvBook.title || '',
            publisher: csvBook.publisher || '',
            publication_year: csvBook.publication_year ? parseInt(csvBook.publication_year) : null,
            height_cm: csvBook.height_cm ? parseFloat(csvBook.height_cm) : null,
            width_cm: csvBook.width_cm ? parseFloat(csvBook.width_cm) : null,
            depth_cm: csvBook.depth_cm ? parseFloat(csvBook.depth_cm) : null,
            binding: csvBook.binding || '',
            page_count: csvBook.page_count ? parseInt(csvBook.page_count) : null,
            edition_printrun: csvBook.edition_printrun || '',
            isbn_asin: csvBook.isbn_asin || '',
            editor: csvBook.editor || '',
            contributors: csvBook.contributors || '',
            is_signed_inscribed: this.parseBoolean(csvBook.is_signed_inscribed),
            designer: csvBook.designer || '',
            description: csvBook.description || '',
            artist_url: csvBook.artist_url || '',
            publisher_url: csvBook.publisher_url || '',
            collection_grouping: csvBook.collection_grouping || '',
            tags: csvBook.tags || '',
            classification: csvBook.classification || '',
            bisac: csvBook.bisac || '',
            ddc: csvBook.ddc || '',
            location: csvBook.location || 'Hudson Street Library, NYC',
            accession_no: csvBook.accession_no || '',
            image_url: csvBook.image_url || ''
        };
    }

    /**
     * Create cover record for book with image URL
     */
    async createCoverRecord(bookId, imageUrl) {
        try {
            const coverData = {
                book_id: bookId,
                original_url: imageUrl,
                status: 'pending',
                source_api: 'csv_import'
            };

            const result = this.db.insertCover(coverData);
            this.log(`Created cover record for book ${bookId}`, 'debug');

        } catch (error) {
            this.log(`Failed to create cover record for book ${bookId}: ${error.message}`, 'warn');
        }
    }

    /**
     * Verify data integrity after migration
     */
    async verifyIntegrity(originalData) {
        this.log('Verifying data integrity...', 'info');

        if (this.options.dryRun) {
            this.log('Skipping integrity verification in dry run mode', 'info');
            return;
        }

        const dbStats = this.db.getStats();
        const expectedCount = originalData.length - this.stats.skipped;

        // Check record count
        if (dbStats.books.total !== expectedCount) {
            const msg = `Record count mismatch: expected ${expectedCount}, got ${dbStats.books.total}`;
            this.stats.errors.push(msg);
            this.log(msg, 'error');
        }

        // Sample verification - check a few random records
        const sampleSize = Math.min(10, originalData.length);
        const samples = this.getRandomSample(originalData, sampleSize);

        for (const sample of samples) {
            if (sample.isbn_asin) {
                const dbBook = this.db.getBookByIsbn(sample.isbn_asin);
                if (!dbBook) {
                    const msg = `Missing book in database: ${sample.title} (ISBN: ${sample.isbn_asin})`;
                    this.stats.errors.push(msg);
                    this.log(msg, 'error');
                } else {
                    // Verify key fields match
                    if (dbBook.title !== sample.title) {
                        const msg = `Title mismatch for ISBN ${sample.isbn_asin}: CSV="${sample.title}", DB="${dbBook.title}"`;
                        this.stats.errors.push(msg);
                        this.log(msg, 'error');
                    }
                }
            }
        }

        if (this.stats.errors.length === 0) {
            this.log('Data integrity verification passed', 'success');
        } else {
            this.log(`Data integrity verification found ${this.stats.errors.length} issues`, 'warn');
        }
    }

    /**
     * Generate migration report
     */
    generateReport(duration) {
        const report = {
            migrationId: this.migrationId,
            timestamp: new Date().toISOString(),
            duration: {
                ms: duration,
                formatted: this.formatDuration(duration)
            },
            csvFile: this.options.csvPath,
            databaseFile: this.options.dbPath,
            options: this.options,
            statistics: { ...this.stats },
            databaseStats: this.db ? this.db.getStats() : null,
            success: this.stats.failed === 0 && this.stats.errors.length === 0
        };

        // Save report to file
        const reportPath = path.join(path.dirname(this.options.dbPath), `migration_report_${this.migrationId}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        this.log(`Migration report saved: ${reportPath}`, 'info');

        // Log summary
        this.logSummary(report);

        return report;
    }

    /**
     * Log migration summary
     */
    logSummary(report) {
        this.log('\n=== MIGRATION SUMMARY ===', 'info');
        this.log(`Migration ID: ${report.migrationId}`, 'info');
        this.log(`Duration: ${report.duration.formatted}`, 'info');
        this.log(`Total Records: ${report.statistics.total}`, 'info');
        this.log(`Successful: ${report.statistics.successful}`, 'success');
        this.log(`Failed: ${report.statistics.failed}`, report.statistics.failed > 0 ? 'error' : 'info');
        this.log(`Skipped: ${report.statistics.skipped}`, 'info');
        this.log(`Duplicates: ${report.statistics.duplicates}`, 'info');
        this.log(`Errors: ${report.statistics.errors.length}`, report.statistics.errors.length > 0 ? 'error' : 'info');

        if (report.databaseStats) {
            this.log(`Database Books: ${report.databaseStats.books.total}`, 'info');
            this.log(`Database Covers: ${report.databaseStats.covers.total}`, 'info');
        }

        this.log('========================\n', 'info');
    }

    /**
     * Rollback on error
     */
    async rollbackOnError() {
        this.log('Rolling back migration due to error...', 'warn');

        if (this.db) {
            try {
                // Log migration failure
                this.db.logOperation(
                    'migration',
                    'csv_import',
                    'books',
                    null,
                    this.migrationId,
                    null,
                    { error: this.stats.errors },
                    'failed',
                    null,
                    null,
                    this.options.csvPath,
                    this.migrationId
                );

                // In a real scenario, you might want to delete all inserted records
                // For now, we'll just log the failure
                this.log('Error logged to database', 'info');

            } catch (logError) {
                this.log(`Failed to log error: ${logError.message}`, 'error');
            }
        }
    }

    /**
     * Utility Methods
     */

    /**
     * Create batches from array
     */
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Get random sample from array
     */
    getRandomSample(array, size) {
        const shuffled = [...array].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, size);
    }

    /**
     * Parse boolean from CSV string
     */
    parseBoolean(value) {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'string') {
            const lower = value.toLowerCase().trim();
            return lower === 'true' || lower === '1' || lower === 'yes';
        }
        return false;
    }

    /**
     * Format duration in human readable format
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Confirm overwrite of existing database
     */
    async confirmOverwrite(existingBookCount) {
        if (this.options.force) {
            return true;
        }

        this.log(`Database already contains ${existingBookCount} books.`, 'warn');
        this.log('Migration will overwrite existing data.', 'warn');

        // In a real CLI, you'd prompt the user
        // For now, return true if not in interactive mode
        return true;
    }

    /**
     * Logging with levels
     */
    log(message, level = 'info') {
        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            warn: '\x1b[33m',    // Yellow
            error: '\x1b[31m',   // Red
            debug: '\x1b[37m'    // White
        };

        const reset = '\x1b[0m';
        const timestamp = new Date().toISOString();
        const color = colors[level] || colors.info;

        if (this.options.verbose || level !== 'debug') {
            console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${reset}`);
        }
    }
}

/**
 * CLI interface
 */
async function runMigration(options = {}) {
    const migration = new DatabaseMigration(options);
    return await migration.migrate();
}

/**
 * Main execution if run directly
 */
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        dryRun: args.includes('--dry-run'),
        force: args.includes('--force'),
        backupCsv: !args.includes('--no-backup')
    };

    // Parse custom CSV path
    const csvIndex = args.findIndex(arg => arg === '--csv');
    if (csvIndex >= 0 && args[csvIndex + 1]) {
        options.csvPath = args[csvIndex + 1];
    }

    // Parse custom DB path
    const dbIndex = args.findIndex(arg => arg === '--db');
    if (dbIndex >= 0 && args[dbIndex + 1]) {
        options.dbPath = args[dbIndex + 1];
    }

    runMigration(options)
        .then(report => {
            console.log('\nMigration completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error(`\nMigration failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { DatabaseMigration, runMigration };