# Hudson Street Library Database System

A comprehensive SQLite database system for the Hudson Street Library, designed to replace CSV-based storage with a robust relational database solution.

## Overview

This database system provides:
- **Full relational database schema** with books, covers, API cache, and audit logging
- **Complete CRUD operations** with transactions and data validation
- **CSV migration tools** to transition from existing CSV files
- **Backup and restore utilities** with compression and integrity checking
- **Performance optimization** with connection pooling, indexing, and query builders
- **Comprehensive testing** with automated test suite

## Architecture

### Core Components

1. **`database.js`** - Main database module with SQLite3 connection management
2. **`schema.sql`** - Complete database schema with tables, indexes, triggers, and views
3. **`db-migration.js`** - CSV to SQLite migration script with validation
4. **`db-utils.js`** - Backup, restore, and maintenance utilities
5. **`test-database.js`** - Comprehensive test suite

### Database Schema

#### Core Tables
- **`books`** - Main book information with full-text search
- **`covers`** - Image metadata and processing status
- **`api_cache`** - Cached API responses with expiration
- **`processing_log`** - Audit trail of all operations

#### Normalized Tables (for future enhancement)
- **`authors`** - Author information
- **`collections`** - Book collections
- **`tags`** - Normalized tagging system

#### Performance Features
- **Indexes** on all searchable fields
- **Full-text search** with generated search column
- **Views** for common queries
- **Triggers** for automatic timestamp updates

## Installation

### Prerequisites
```bash
npm install better-sqlite3
```

### Quick Start

1. **Initialize the database:**
```javascript
const LibraryDatabase = require('./scripts/database/database');

const db = new LibraryDatabase();
await db.initialize();
```

2. **Migrate from CSV:**
```bash
node scripts/database/demo-migration.js
```

3. **Run tests:**
```bash
node scripts/database/test-database.js
```

## Usage Examples

### Basic Operations

```javascript
const LibraryDatabase = require('./scripts/database/database');

async function example() {
    const db = new LibraryDatabase();
    await db.initialize();

    // Insert a book
    const book = await db.insertBook({
        title: 'Photography Book',
        author_full_name: 'John Doe',
        publisher: 'Art Press',
        publication_year: 2023,
        isbn_asin: '1234567890'
    });

    // Search books
    const results = db.searchBooks('photography');

    // Get books by author
    const authorBooks = db.getBooksByAuthor('John Doe');

    // Update book
    await db.updateBook(book.id, {
        description: 'Updated description'
    });

    db.close();
}
```

### CSV Migration

```javascript
const { runMigration } = require('./scripts/database/db-migration');

const options = {
    csvPath: './src/_data/books.csv',
    dbPath: './data/library.db',
    verbose: true,
    dryRun: false // Set to true for testing
};

const report = await runMigration(options);
console.log(`Migrated ${report.statistics.successful} books`);
```

### Database Utilities

```javascript
const { DatabaseUtils } = require('./scripts/database/db-utils');

const utils = new DatabaseUtils();
await utils.initialize();

// Create backup
const backup = await utils.createBackup({
    description: 'Daily backup',
    compress: true
});

// Database maintenance
await utils.optimize(); // Vacuum + analyze
await utils.cleanupCache(); // Remove expired cache

// Health check
const health = await utils.validateIntegrity();
console.log(`Database healthy: ${health.valid}`);
```

## API Reference

### LibraryDatabase Class

#### Connection Management
- `initialize()` - Initialize database and schema
- `close()` - Close database connection
- `optimize()` - Optimize database performance

#### Book Operations
- `insertBook(bookData)` - Insert new book
- `updateBook(id, updates)` - Update existing book
- `deleteBook(id)` - Delete book
- `getBookById(id)` - Get book by ID
- `getBookByIsbn(isbn)` - Get book by ISBN
- `getAllBooks(limit, offset)` - Get all books with pagination
- `searchBooks(query, limit, offset)` - Full-text search
- `getBooksByAuthor(author)` - Get books by author
- `getBooksWithoutCovers()` - Get books missing covers

#### Query Builder
- `queryBooks(filters, orderBy, direction, limit, offset)` - Dynamic queries

#### Cover Operations
- `insertCover(coverData)` - Insert cover record
- `updateCoverStatus(id, status)` - Update cover processing status
- `getCoversByBookId(bookId)` - Get covers for book

#### API Cache
- `cacheApiResponse(key, source, type, value, data, expiry)` - Cache API response
- `getCachedApiResponse(key)` - Get cached response
- `cleanExpiredCache()` - Remove expired entries

#### Transaction Management
- `beginTransaction()` - Start transaction
- `transaction(callback)` - Execute in transaction

#### Statistics
- `getStats()` - Get database statistics

### Migration Options

```javascript
{
    csvPath: './path/to/books.csv',      // CSV file path
    dbPath: './path/to/library.db',      // Database file path
    dryRun: false,                       // Test mode without writing
    verbose: true,                       // Detailed logging
    backupCsv: true,                     // Create CSV backup
    batchSize: 100,                      // Batch processing size
    force: false                         // Overwrite existing database
}
```

### Utility Options

```javascript
{
    dbPath: './path/to/library.db',      // Database file path
    verbose: true,                       // Detailed logging
    backupDir: './backups'               // Backup directory
}
```

## Performance Optimizations

### Indexing Strategy
- Primary keys on all tables
- Search indexes on title, author, ISBN
- Full-text search index on generated search column
- Foreign key indexes for joins

### Connection Management
- Single connection with prepared statements
- Statement caching for repeated queries
- Transaction batching for bulk operations

### Storage Optimization
- WAL journal mode for better concurrency
- Auto-vacuum for space management
- Pragma optimizations for performance

## Migration from CSV

The migration system provides:

1. **Data Validation** - Checks CSV structure and content
2. **Error Recovery** - Handles corrupted CSV files
3. **Duplicate Detection** - Identifies and skips duplicates
4. **Batch Processing** - Processes large files efficiently
5. **Integrity Verification** - Confirms successful migration
6. **Detailed Reporting** - Comprehensive migration logs

### Migration Process

1. Validate CSV file and database prerequisites
2. Create backup of existing CSV (optional)
3. Read and validate CSV data
4. Transform data for database schema
5. Insert data in batches with transaction safety
6. Verify data integrity
7. Generate detailed migration report

## Backup and Restore

### Backup Features
- **Full database backups** using SQLite backup API
- **Compression** with gzip for storage efficiency
- **Metadata tracking** with timestamps and descriptions
- **Automated retention** policies

### Restore Features
- **Integrity verification** before restore
- **Pre-restore backups** for safety
- **Decompression** of compressed backups
- **Rollback capability** on failures

## Testing

The comprehensive test suite covers:

- Database initialization and schema creation
- CRUD operations with validation
- Search and query functionality
- Cover operations and image metadata
- API caching with expiration
- Transaction management and rollback
- Migration from CSV files
- Backup and restore operations
- Performance benchmarking

Run tests with:
```bash
node scripts/database/test-database.js
```

## Troubleshooting

### Common Issues

1. **"Database not initialized"**
   - Solution: Call `await db.initialize()` before operations

2. **"SQLite3 can only bind numbers, strings..."**
   - Solution: Ensure numeric fields are converted with `Number()`

3. **Migration fails with validation errors**
   - Solution: Check CSV format and required fields

4. **Performance issues with large datasets**
   - Solution: Use batch processing and transactions

### Debug Mode

Enable verbose logging:
```javascript
const db = new LibraryDatabase(dbPath, { verbose: true });
```

### Health Check

Quick database health check:
```javascript
const { healthCheck } = require('./scripts/database/db-utils');
const health = await healthCheck();
console.log('Database healthy:', health.healthy);
```

## CSV Handler Compatibility

The database system maintains compatibility with the existing CSV handler interface:

```javascript
// CSV handler style methods
const result = db.readBooksSync(); // Compatible with CSV handler
await db.updateBook_CSV_Format(isbn, updates);
await db.batchUpdateBooks_CSV_Format(updates);
```

This allows for gradual migration of existing code.

## Security Considerations

- **SQL Injection Protection** - All queries use prepared statements
- **Data Validation** - Input validation on all operations
- **Backup Encryption** - Consider encrypting sensitive backups
- **Access Control** - Implement file-level permissions

## Future Enhancements

- **Author normalization** - Separate author records
- **Collection management** - Organized book groupings
- **Tag system** - Flexible metadata tagging
- **Full-text search** - Enhanced search capabilities
- **API integration** - Direct book metadata fetching
- **Web interface** - Browser-based administration

## Contributing

When contributing to the database system:

1. Run the test suite to ensure compatibility
2. Update schema version for breaking changes
3. Document API changes in this README
4. Consider backward compatibility with CSV handler

## License

This database system is part of the Hudson Street Library project.