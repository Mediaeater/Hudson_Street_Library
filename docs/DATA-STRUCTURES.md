# Hudson Street Library - Data Structures Documentation

## Table of Contents

1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [CSV Data Format](#csv-data-format)
4. [JSON Data Structures](#json-data-structures)
5. [Data Validation Rules](#data-validation-rules)
6. [Data Relationships](#data-relationships)
7. [Sample Data Examples](#sample-data-examples)
8. [Data Migration Procedures](#data-migration-procedures)

---

## Overview

The Hudson Street Library uses a dual-storage approach for maximum flexibility:

- **SQLite Database**: Primary data store with relational structure, transactions, and performance optimization
- **CSV Files**: Legacy format maintained for backward compatibility and simple data exports
- **JSON Responses**: API response format for external integrations and cache storage

### Storage Locations

```
/data/
  library.db              # SQLite database (primary)
  library.db.backup-*     # Automated database backups

/src/_data/
  books.csv               # CSV export (legacy/backup)
  books_backup_*.csv      # CSV migration backups
```

---

## Database Schema

### Core Tables

#### 1. Books Table

The primary table storing all book information.

```sql
CREATE TABLE books (
    -- Primary Key
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Author Information
    author_last TEXT DEFAULT '',
    author_first TEXT DEFAULT '',
    author_full_name TEXT NOT NULL DEFAULT '',

    -- Book Details
    title TEXT NOT NULL,
    publisher TEXT DEFAULT '',
    publication_year INTEGER,

    -- Physical Dimensions
    height_cm REAL,
    width_cm REAL,
    depth_cm REAL,

    -- Binding and Content
    binding TEXT DEFAULT '',              -- e.g., "Hardcover", "Softcover", "Spiral"
    page_count INTEGER,
    edition_printrun TEXT DEFAULT '',     -- e.g., "1st edition", "Limited 500 copies"

    -- Identifiers
    isbn_asin TEXT DEFAULT '',            -- ISBN-10, ISBN-13, or ASIN
    editor TEXT DEFAULT '',
    contributors TEXT DEFAULT '',

    -- Special Attributes
    is_signed_inscribed BOOLEAN DEFAULT FALSE,
    designer TEXT DEFAULT '',

    -- Content
    description TEXT DEFAULT '',

    -- URLs
    artist_url TEXT DEFAULT '',
    publisher_url TEXT DEFAULT '',

    -- Classification
    collection_grouping TEXT DEFAULT '',  -- e.g., "Photography"
    tags TEXT DEFAULT '',                 -- Comma-separated tags
    classification TEXT DEFAULT '',
    bisac TEXT DEFAULT '',                -- BISAC subject code
    ddc TEXT DEFAULT '',                  -- Dewey Decimal Classification

    -- Location
    location TEXT DEFAULT 'Hudson Street Library, NYC',
    accession_no TEXT DEFAULT '',

    -- Image
    image_url TEXT DEFAULT '',

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,

    -- Full-Text Search (Generated Column)
    search_text TEXT GENERATED ALWAYS AS (
        LOWER(title || ' ' ||
              COALESCE(author_full_name, '') || ' ' ||
              COALESCE(author_first, '') || ' ' ||
              COALESCE(author_last, '') || ' ' ||
              COALESCE(publisher, '') || ' ' ||
              COALESCE(tags, '') || ' ' ||
              COALESCE(description, '') || ' ' ||
              COALESCE(isbn_asin, ''))
    ) STORED
);
```

**Field Details:**

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| `author_last` | TEXT | DEFAULT '' | Author's last name |
| `author_first` | TEXT | DEFAULT '' | Author's first name |
| `author_full_name` | TEXT | NOT NULL, DEFAULT '' | Full author name for display |
| `title` | TEXT | NOT NULL | Book title (required) |
| `publisher` | TEXT | DEFAULT '' | Publisher name |
| `publication_year` | INTEGER | NULL | Year published (YYYY format) |
| `height_cm` | REAL | NULL | Height in centimeters |
| `width_cm` | REAL | NULL | Width in centimeters |
| `depth_cm` | REAL | NULL | Depth/thickness in centimeters |
| `binding` | TEXT | DEFAULT '' | Binding type |
| `page_count` | INTEGER | NULL | Number of pages |
| `edition_printrun` | TEXT | DEFAULT '' | Edition information |
| `isbn_asin` | TEXT | UNIQUE (when not empty) | ISBN or ASIN |
| `is_signed_inscribed` | BOOLEAN | DEFAULT FALSE | Signed/inscribed flag |
| `description` | TEXT | DEFAULT '' | Full book description |
| `tags` | TEXT | DEFAULT '' | Comma-separated tags |
| `search_text` | TEXT | GENERATED, STORED | Searchable text (auto-generated) |

#### 2. Covers Table

Stores image metadata and processing status for book covers.

```sql
CREATE TABLE covers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,

    -- Image Information
    original_url TEXT,                    -- Source URL
    local_path TEXT,                      -- Path on disk
    filename TEXT,

    -- Image Properties
    width INTEGER,
    height INTEGER,
    file_size INTEGER,                    -- Size in bytes
    format TEXT,                          -- jpg, png, webp, etc.

    -- Processing Status
    status TEXT DEFAULT 'pending',        -- pending, processing, complete, failed, missing
    error_message TEXT,

    -- Quality Metrics
    quality_score REAL,                   -- 0-1 scale
    has_isbn_visible BOOLEAN DEFAULT FALSE,
    has_text_overlay BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,

    -- API Source Information
    source_api TEXT,                      -- google_books, open_library, manual, etc.
    api_response_data TEXT,               -- JSON response for debugging

    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);
```

**Status Values:**
- `pending`: Image queued for processing
- `processing`: Currently being processed
- `complete`: Successfully processed and available
- `failed`: Processing failed (see error_message)
- `missing`: No image available

#### 3. API Cache Table

Caches responses from external APIs to reduce redundant requests.

```sql
CREATE TABLE api_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Cache Key Components
    cache_key TEXT UNIQUE NOT NULL,       -- Composite key for lookups
    api_source TEXT NOT NULL,             -- google_books, open_library, isbn_db, etc.
    query_type TEXT NOT NULL,             -- isbn_lookup, title_search, cover_search
    query_value TEXT NOT NULL,            -- The actual query (ISBN, title, etc.)

    -- Cache Data
    response_data TEXT NOT NULL,          -- JSON response
    http_status INTEGER,

    -- Cache Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    hit_count INTEGER DEFAULT 0,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Response Quality
    is_successful BOOLEAN DEFAULT TRUE,
    confidence_score REAL                 -- 0-1 scale for match quality
);
```

**Cache Key Format:** `{api_source}:{query_type}:{query_value}`

Example: `google_books:isbn_lookup:9783869304311`

#### 4. Processing Log Table

Audit trail for all database operations.

```sql
CREATE TABLE processing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Operation Details
    operation_type TEXT NOT NULL,         -- insert, update, delete, migration, backup
    operation_category TEXT NOT NULL,     -- book, cover, api, maintenance

    -- Target Information
    target_table TEXT,
    target_id INTEGER,
    target_identifier TEXT,               -- ISBN, book title, etc.

    -- Operation Data
    old_values TEXT,                      -- JSON of previous values
    new_values TEXT,                      -- JSON of new values

    -- Result
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, partial
    error_message TEXT,
    rows_affected INTEGER DEFAULT 0,

    -- Performance
    duration_ms INTEGER,

    -- Context
    user_agent TEXT DEFAULT 'Hudson Street Library System',
    source_file TEXT,                     -- if operation was from a file
    batch_id TEXT,                        -- for grouping related operations

    -- Timestamps
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    -- Additional Metadata
    metadata TEXT                         -- JSON for additional context
);
```

#### 5. Normalized Tables (Future Enhancement)

These tables support advanced features like multiple authors per book and normalized tagging.

**Authors Table:**
```sql
CREATE TABLE authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    full_name TEXT NOT NULL,
    birth_year INTEGER,
    death_year INTEGER,
    nationality TEXT DEFAULT '',
    biography TEXT DEFAULT '',
    wikidata_id TEXT DEFAULT '',
    viaf_id TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(full_name)
);
```

**Collections Table:**
```sql
CREATE TABLE collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Tags Table:**
```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT 'general',      -- subject, genre, format, era
    color TEXT DEFAULT '#6B7280',         -- hex color for UI
    description TEXT DEFAULT '',
    use_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes

Performance indexes on frequently queried fields:

```sql
-- Books table indexes
CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author_full_name ON books(author_full_name);
CREATE INDEX idx_books_author_last ON books(author_last);
CREATE INDEX idx_books_isbn_asin ON books(isbn_asin);
CREATE UNIQUE INDEX idx_books_isbn_unique ON books(isbn_asin) WHERE isbn_asin != '';
CREATE INDEX idx_books_publication_year ON books(publication_year);
CREATE INDEX idx_books_search_text ON books(search_text);

-- Covers table indexes
CREATE INDEX idx_covers_book_id ON covers(book_id);
CREATE INDEX idx_covers_status ON covers(status);

-- API cache indexes
CREATE INDEX idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX idx_api_cache_expires ON api_cache(expires_at);

-- Processing log indexes
CREATE INDEX idx_processing_log_operation ON processing_log(operation_type);
CREATE INDEX idx_processing_log_status ON processing_log(status);
CREATE INDEX idx_processing_log_started ON processing_log(started_at);
```

### Triggers

Automatic data maintenance triggers:

```sql
-- Update updated_at timestamp on book changes
CREATE TRIGGER trigger_books_updated_at
AFTER UPDATE ON books
BEGIN
    UPDATE books SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Increment version number on book updates
CREATE TRIGGER trigger_books_version
AFTER UPDATE ON books
BEGIN
    UPDATE books SET version = OLD.version + 1 WHERE id = NEW.id;
END;

-- Track tag usage
CREATE TRIGGER trigger_book_tags_insert_count
AFTER INSERT ON book_tags
BEGIN
    UPDATE tags SET use_count = use_count + 1 WHERE id = NEW.tag_id;
END;
```

### Views

Commonly used database views:

```sql
-- Books with cover information
CREATE VIEW view_books_complete AS
SELECT
    b.*,
    c.local_path as cover_local_path,
    c.status as cover_status,
    CASE WHEN c.id IS NOT NULL THEN 1 ELSE 0 END as has_cover
FROM books b
LEFT JOIN covers c ON b.id = c.book_id AND c.status = 'complete';

-- Books without covers
CREATE VIEW view_books_missing_covers AS
SELECT b.*
FROM books b
LEFT JOIN covers c ON b.id = c.book_id AND c.status = 'complete'
WHERE c.id IS NULL;

-- Recent activity
CREATE VIEW view_recent_activity AS
SELECT
    operation_type,
    operation_category,
    target_identifier,
    status,
    started_at,
    duration_ms
FROM processing_log
ORDER BY started_at DESC
LIMIT 100;
```

---

## CSV Data Format

### Books CSV Structure

The legacy CSV format contains all book data in a flat structure.

**File:** `/src/_data/books.csv`

**Columns (28 total):**

```
id,author_last,author_first,author_full_name,title,publisher,publication_year,
height_cm,width_cm,depth_cm,binding,page_count,edition_printrun,isbn_asin,
editor,contributors,is_signed_inscribed,designer,description,artist_url,
publisher_url,collection_grouping,tags,classification,bisac,ddc,location,
accession_no,image_url
```

### Column Specifications

| Column | Type | Format | Example | Notes |
|--------|------|--------|---------|-------|
| `id` | Integer | Numeric | `1` | Unique identifier |
| `author_last` | String | Text | `Abbott` | Author's last name |
| `author_first` | String | Text | `Berenice` | Author's first name |
| `author_full_name` | String | Text | `Berenice Abbott` | Full name for display |
| `title` | String | Text | `Documenting Science` | Book title (required) |
| `publisher` | String | Text | `Steidl` | Publisher name |
| `publication_year` | Integer | YYYY | `2012` | Year only |
| `height_cm` | Decimal | ##.# | `31.0` | Height in cm |
| `width_cm` | Decimal | ##.# | `29.5` | Width in cm |
| `depth_cm` | Decimal | ##.# | `2.5` | Depth in cm |
| `binding` | String | Text | `Hardcover` | Binding type |
| `page_count` | Integer | Numeric | `180` | Number of pages |
| `edition_printrun` | String | Text | `1st edition` | Edition info |
| `isbn_asin` | String | Alphanumeric | `9783869304311` | ISBN-10/13 or ASIN |
| `editor` | String | Text | `Kurtz, Ron` | Editor name(s) |
| `contributors` | String | CSV | `Ron Kurtz, Julia Van Haaften` | Comma-separated |
| `is_signed_inscribed` | Boolean | true/false | `false` | Signed flag |
| `designer` | String | Text | `John Doe` | Book designer |
| `description` | String | Text | Long text | Full description |
| `artist_url` | String | URL | `http://example.com` | Artist website |
| `publisher_url` | String | URL | `https://steidl.de` | Publisher website |
| `collection_grouping` | String | Text | `Photography` | Primary collection |
| `tags` | String | CSV | `Science, Photography` | Comma-separated |
| `classification` | String | Text | `Photography; Monographs` | Classification |
| `bisac` | String | Code | `PHO023000` | BISAC code |
| `ddc` | String | Code | `770.92` | Dewey Decimal |
| `location` | String | Text | `Hudson Street Library, NYC` | Physical location |
| `accession_no` | String | Text | `2024.001` | Accession number |
| `image_url` | String | URL/Path | `/assets/images/book.jpg` | Cover image path |

### CSV Encoding

- **Character Encoding:** UTF-8
- **Line Endings:** LF (Unix) or CRLF (Windows)
- **Field Delimiter:** Comma (`,`)
- **Text Qualifier:** Double quotes (`"`)
- **Escape Character:** Double quote (`""` for quotes within text)

### CSV Best Practices

1. **Always include header row** as the first line
2. **Quote fields containing:**
   - Commas
   - Newlines
   - Double quotes
3. **Use NULL or empty string** for missing values
4. **Boolean values:** Use `true`/`false` (lowercase)
5. **Dates:** Use ISO 8601 format (YYYY-MM-DD)

---

## JSON Data Structures

### Book Object

API responses return books in JSON format:

```json
{
  "id": 1,
  "author_last": "Abbott",
  "author_first": "Berenice",
  "author_full_name": "Berenice Abbott",
  "title": "Documenting Science",
  "publisher": "Steidl",
  "publication_year": 2012,
  "height_cm": 31.0,
  "width_cm": 29.5,
  "depth_cm": null,
  "binding": "Hardcover",
  "page_count": 180,
  "edition_printrun": "1st edition",
  "isbn_asin": "9783869304311",
  "editor": "Kurtz, Ron",
  "contributors": "Ron Kurtz, Julia Van Haaften, John Durant",
  "is_signed_inscribed": false,
  "designer": null,
  "description": "Illustrated in tritone throughout...",
  "artist_url": null,
  "publisher_url": "https://steidl.de",
  "collection_grouping": "Photography",
  "tags": "Science, Music, Photography, Photographers, Technology, architecture",
  "classification": "Photography; Individual Photographers; General Monographs",
  "bisac": null,
  "ddc": null,
  "location": "Hudson Street Library, NYC",
  "accession_no": null,
  "image_url": null,
  "created_at": "2025-01-14T10:30:00Z",
  "updated_at": "2025-01-14T10:30:00Z",
  "version": 1
}
```

### API Cache Object

```json
{
  "id": 42,
  "cache_key": "google_books:isbn_lookup:9783869304311",
  "api_source": "google_books",
  "query_type": "isbn_lookup",
  "query_value": "9783869304311",
  "response_data": {
    "title": "Documenting Science",
    "authors": ["Berenice Abbott"],
    "publisher": "Steidl",
    "publishedDate": "2012",
    "imageLinks": {
      "thumbnail": "https://..."
    }
  },
  "http_status": 200,
  "created_at": "2025-01-14T10:00:00Z",
  "expires_at": "2025-01-15T10:00:00Z",
  "hit_count": 3,
  "last_accessed": "2025-01-14T12:00:00Z",
  "is_successful": true,
  "confidence_score": 0.95
}
```

### Migration Report Object

```json
{
  "migration_id": "migration_2025-09-23T20-22-27-813Z",
  "started_at": "2025-09-23T20:22:27.813Z",
  "completed_at": "2025-09-23T20:23:15.456Z",
  "duration_ms": 47643,
  "statistics": {
    "total": 401,
    "successful": 401,
    "failed": 0,
    "skipped": 0,
    "duplicates": 0
  },
  "errors": [],
  "csv_backup_path": "/src/_data/books_backup_migration_2025-09-23T20-22-27-813Z.csv",
  "database_path": "/data/library.db"
}
```

---

## Data Validation Rules

### Field Validation

#### Required Fields

- `title`: Must not be empty
- `author_full_name`: Should be populated (can be empty string if unknown)

#### Numeric Validations

```javascript
// Year validation
publication_year >= 1000 && publication_year <= new Date().getFullYear() + 1

// Dimensions (if provided)
height_cm > 0 && height_cm < 200
width_cm > 0 && width_cm < 150
depth_cm > 0 && depth_cm < 50

// Page count
page_count > 0 && page_count < 10000
```

#### ISBN Validation

```javascript
// ISBN-10: 10 digits (may include X)
/^[0-9]{9}[0-9X]$/.test(isbn)

// ISBN-13: 13 digits
/^[0-9]{13}$/.test(isbn)

// ASIN: 10 alphanumeric characters
/^[A-Z0-9]{10}$/.test(asin)
```

#### URL Validation

```javascript
// Basic URL format
/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(url)
```

### Data Type Conversions

```javascript
// String to Number
publication_year = Number(publication_year)
height_cm = parseFloat(height_cm)
page_count = parseInt(page_count)

// Boolean conversion
is_signed_inscribed = value === 'true' || value === '1' || value === 1
```

### Sanitization Rules

1. **Trim whitespace** from all string fields
2. **Remove control characters** from text fields
3. **Normalize line endings** to LF
4. **Remove null bytes** (`\0`)
5. **Limit field lengths:**
   - `title`: 500 characters
   - `author_full_name`: 200 characters
   - `description`: Unlimited (TEXT field)
   - `tags`: 1000 characters

---

## Data Relationships

### Entity Relationship Diagram (Text)

```
books (1) ──< (N) covers
  │
  │ (1)
  │
  ├──< (N) book_collections ──> (1) collections
  │
  │ (1)
  │
  ├──< (N) book_authors ──> (1) authors
  │
  │ (1)
  │
  └──< (N) book_tags ──> (1) tags
```

### Relationship Details

#### One-to-Many: Books to Covers

- One book can have multiple cover images (different sources, versions)
- Each cover belongs to exactly one book
- `CASCADE DELETE`: Deleting a book removes all its covers

#### Many-to-Many: Books to Collections

- A book can belong to multiple collections
- A collection contains multiple books
- Junction table: `book_collections`

#### Many-to-Many: Books to Authors

- A book can have multiple authors (co-authors)
- An author can write multiple books
- Junction table: `book_authors`

#### Many-to-Many: Books to Tags

- A book can have multiple tags
- A tag can apply to multiple books
- Junction table: `book_tags`

### Foreign Key Constraints

```sql
-- Covers table
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE

-- Book collections
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE

-- Book authors
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT

-- Book tags
FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
```

---

## Sample Data Examples

### Complete Book Record

```sql
INSERT INTO books (
    author_last, author_first, author_full_name, title, publisher,
    publication_year, height_cm, width_cm, depth_cm, binding,
    page_count, edition_printrun, isbn_asin, description,
    publisher_url, collection_grouping, tags, classification
) VALUES (
    'Abbott', 'Berenice', 'Berenice Abbott',
    'Documenting Science', 'Steidl', 2012,
    31.0, 29.5, NULL, 'Hardcover',
    180, '1st edition', '9783869304311',
    'Illustrated in tritone throughout. Fascination with scientific advances...',
    'https://steidl.de', 'Photography',
    'Science, Photography, Technology',
    'Photography; Individual Photographers; General Monographs'
);
```

### Cover Record

```sql
INSERT INTO covers (
    book_id, original_url, local_path, filename,
    width, height, file_size, format, status,
    source_api, quality_score
) VALUES (
    1,
    'https://covers.openlibrary.org/b/isbn/9783869304311-L.jpg',
    '/src/assets/images/books/abbott_documenting_science.jpg',
    'abbott_documenting_science.jpg',
    600, 800, 245678, 'jpg', 'complete',
    'open_library', 0.92
);
```

### API Cache Entry

```sql
INSERT INTO api_cache (
    cache_key, api_source, query_type, query_value,
    response_data, http_status, expires_at, confidence_score
) VALUES (
    'google_books:isbn_lookup:9783869304311',
    'google_books',
    'isbn_lookup',
    '9783869304311',
    '{"title":"Documenting Science","authors":["Berenice Abbott"],...}',
    200,
    datetime('now', '+24 hours'),
    0.95
);
```

---

## Data Migration Procedures

### CSV to SQLite Migration

#### Migration Script

```bash
node scripts/database/db-migration.js
```

#### Migration Options

```javascript
const options = {
    csvPath: './src/_data/books.csv',     // Source CSV file
    dbPath: './data/library.db',          // Target database
    dryRun: false,                        // Test without writing
    verbose: true,                        // Detailed logging
    backupCsv: true,                      // Create CSV backup
    batchSize: 100,                       // Batch processing size
    force: false                          // Overwrite existing database
};
```

#### Migration Process

1. **Pre-Migration Validation**
   ```javascript
   - Verify CSV file exists and is readable
   - Check CSV format and headers
   - Validate data types and required fields
   ```

2. **Backup Creation**
   ```javascript
   - Create timestamped CSV backup
   - Location: /src/_data/books_backup_migration_{timestamp}.csv
   ```

3. **Database Initialization**
   ```javascript
   - Create/verify database file
   - Execute schema.sql
   - Create indexes and triggers
   - Set PRAGMA settings
   ```

4. **Data Transformation**
   ```javascript
   - Read CSV in batches (default: 100 rows)
   - Transform data types (String → Number, Boolean)
   - Sanitize and validate fields
   - Generate search_text column
   ```

5. **Data Insertion**
   ```javascript
   - Begin transaction
   - Insert batch of records
   - Handle duplicates (skip or update)
   - Log errors
   - Commit transaction
   ```

6. **Post-Migration Verification**
   ```javascript
   - Count records (CSV vs Database)
   - Verify indexes created
   - Run integrity checks
   - Generate migration report
   ```

7. **Report Generation**
   ```javascript
   - Save JSON report to /data/migration_report_{timestamp}.json
   - Include statistics, errors, and metadata
   ```

### Migration Error Handling

**Common Errors:**

1. **Duplicate ISBN**
   ```
   Error: UNIQUE constraint failed: books.isbn_asin
   Solution: Skip or update existing record
   ```

2. **Invalid Data Type**
   ```
   Error: Cannot convert "invalid" to number
   Solution: Use default value or NULL
   ```

3. **Missing Required Field**
   ```
   Error: NOT NULL constraint failed: books.title
   Solution: Skip record or use placeholder
   ```

### Rollback Procedures

If migration fails:

1. **Automatic Rollback**
   - Transaction rollback on error
   - Database remains in pre-migration state

2. **Manual Rollback**
   ```bash
   # Restore from backup
   cp data/library.db.backup-{timestamp} data/library.db

   # Or restore CSV
   cp src/_data/books_backup_migration_{timestamp}.csv src/_data/books.csv
   ```

### Data Integrity Checks

```sql
-- Check for missing required fields
SELECT COUNT(*) FROM books WHERE title = '' OR title IS NULL;

-- Check for orphaned covers
SELECT COUNT(*) FROM covers
WHERE book_id NOT IN (SELECT id FROM books);

-- Check for expired cache entries
SELECT COUNT(*) FROM api_cache
WHERE expires_at < datetime('now');

-- Verify index integrity
PRAGMA integrity_check;
```

### Maintenance Procedures

#### Database Optimization

```sql
-- Vacuum to reclaim space
VACUUM;

-- Analyze for query optimization
ANALYZE;

-- Incremental vacuum
PRAGMA incremental_vacuum;
```

#### Cache Cleanup

```sql
-- Remove expired cache entries
DELETE FROM api_cache WHERE expires_at <= datetime('now');

-- Remove old log entries (older than 90 days)
DELETE FROM processing_log
WHERE started_at < datetime('now', '-90 days');
```

#### Backup Procedures

```javascript
const { DatabaseUtils } = require('./scripts/database/db-utils');

const utils = new DatabaseUtils();
await utils.initialize();

// Create compressed backup
const backup = await utils.createBackup({
    description: 'Daily backup',
    compress: true
});

// Restore from backup
await utils.restoreBackup('/data/backup-file.db');
```

---

## Summary

This documentation provides:

- **Complete database schema** with all tables, columns, and constraints
- **CSV format specification** for legacy data import/export
- **JSON structure** for API responses and cache storage
- **Validation rules** to ensure data integrity
- **Relationship mappings** between entities
- **Sample data** for testing and reference
- **Migration procedures** for CSV-to-SQLite conversion

For implementation details, see:
- `/scripts/database/database.js` - Database class implementation
- `/scripts/database/schema.sql` - Complete SQL schema
- `/scripts/database/db-migration.js` - Migration script
- `/scripts/database/README.md` - Database system documentation
