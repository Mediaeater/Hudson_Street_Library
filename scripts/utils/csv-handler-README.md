# Enhanced CSV Handler for Hudson Street Library

## Overview

The enhanced CSV handler provides a unified, robust interface for all CSV operations across the Hudson Street Library project. It includes validation, error recovery, and specific optimizations for the books.csv structure.

## Features

### Core Functionality
- **Unified Interface**: Single point of access for all CSV operations
- **Error Recovery**: Handles corrupted CSV files gracefully
- **Data Validation**: Validates and cleans data automatically
- **Backup Creation**: Automatically creates backups before writing
- **Books.csv Optimization**: Specialized methods for the library's data structure

### Key Methods

#### Reading Operations
```javascript
// Async reading with full error handling
const result = await CSVHandler.readBooks();
console.log(`Loaded ${result.data.length} books`);
console.log(`Stats: ${result.stats.validRows} valid, ${result.stats.correctedRows} corrected`);

// Synchronous reading (for Eleventy)
const result = CSVHandler.readBooksSync();

// Generic CSV reading
const result = await CSVHandler.read('path/to/file.csv');
```

#### Writing Operations
```javascript
// Write with automatic backup and validation
const writeResult = await CSVHandler.write('books.csv', booksData);
if (writeResult.success) {
    console.log(`Backup created: ${writeResult.backup}`);
}
```

#### Book-Specific Operations
```javascript
// Find books without covers
const missingCovers = await CSVHandler.findBooksWithoutCovers();

// Search by author
const tillmansBooks = await CSVHandler.getBooksByAuthor('Tillmans');

// Update single book
const updateResult = await CSVHandler.updateBook('9781234567890', {
    image_url: '/assets/images/books/cover.jpg',
    collection_grouping: 'Photography'
});

// Batch update multiple books
const batchResult = await CSVHandler.batchUpdateBooks([
    { identifier: 'isbn1', updates: { image_url: 'path1.jpg' } },
    { identifier: 'isbn2', updates: { image_url: 'path2.jpg' } }
]);
```

### Data Validation & Cleaning

The handler automatically:
- Removes extra whitespace
- Handles various null representations (`NULL`, `null`, `undefined`, `''`)
- Fixes common encoding issues
- Validates ISBN/ASIN formats
- Validates publication years
- Ensures required fields exist
- Standardizes author name formatting

### Error Recovery

When encountering corrupted CSV files, the handler:
1. Attempts line-by-line recovery
2. Skips problematic lines
3. Reports detailed error information
4. Returns as much valid data as possible

## Updated Modules

The following modules have been updated to use the enhanced CSV handler:

1. **acquire-covers.js** - Uses `readBooks()` for better error handling
2. **check-missing-covers.js** - Simplified using the unified interface
3. **image-pipeline.js** - Uses enhanced read/write with backup creation
4. **fix-csv-formatting.js** - Leverages built-in validation and cleaning
5. **.eleventy.js** - Uses `readBooksSync()` for synchronous loading

## Benefits

### Consistency
- All modules use the same CSV parsing logic
- Consistent error handling across the project
- Standardized data validation

### Reliability
- Automatic backup creation prevents data loss
- Error recovery maintains uptime
- Data validation prevents corruption

### Performance
- Efficient batch operations
- Stream processing for large files
- Optimized books.csv handling

### Maintainability
- Single point of maintenance for CSV operations
- Clear API with comprehensive documentation
- Extensive error reporting

## Usage Examples

See `csv-handler-example.js` for comprehensive usage examples and demonstrations of all features.

## Error Handling

All methods return detailed error information:

```javascript
{
    data: [...],           // Successfully processed records
    errors: [              // Array of issues found
        {
            row: 42,
            type: 'warning',
            warnings: ['Invalid ISBN format: ABC123']
        }
    ],
    stats: {
        totalRows: 1306,
        validRows: 1305,
        invalidRows: 0,
        correctedRows: 1250
    }
}
```

## Configuration

The handler includes a schema for books.csv validation:

```javascript
const BOOKS_SCHEMA = {
    required: ['id', 'title', 'author_full_name'],
    optional: ['author_last', 'author_first', 'publisher', 'publication_year', 'isbn_asin', 'image_url', 'description'],
    defaults: {
        // Default values for missing fields
    }
};
```

This ensures data consistency and provides fallback values for missing information.