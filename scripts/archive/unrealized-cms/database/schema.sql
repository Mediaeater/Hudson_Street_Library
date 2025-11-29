-- Hudson Street Library Database Schema
-- SQLite database schema for book library management system
-- Replaces CSV-based storage with relational database

-- Books table - Main book information
CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- Author information
    author_last TEXT DEFAULT '',
    author_first TEXT DEFAULT '',
    author_full_name TEXT NOT NULL DEFAULT '',

    -- Book details
    title TEXT NOT NULL,
    publisher TEXT DEFAULT '',
    publication_year INTEGER,

    -- Physical dimensions
    height_cm REAL,
    width_cm REAL,
    depth_cm REAL,

    -- Binding and content
    binding TEXT DEFAULT '',
    page_count INTEGER,
    edition_printrun TEXT DEFAULT '',

    -- Identifiers
    isbn_asin TEXT DEFAULT '',
    editor TEXT DEFAULT '',
    contributors TEXT DEFAULT '',

    -- Special attributes
    is_signed_inscribed BOOLEAN DEFAULT FALSE,
    designer TEXT DEFAULT '',

    -- Content
    description TEXT DEFAULT '',

    -- URLs
    artist_url TEXT DEFAULT '',
    publisher_url TEXT DEFAULT '',

    -- Classification
    collection_grouping TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    classification TEXT DEFAULT '',
    bisac TEXT DEFAULT '',
    ddc TEXT DEFAULT '',

    -- Location
    location TEXT DEFAULT 'Hudson Street Library, NYC',
    accession_no TEXT DEFAULT '',

    -- Image
    image_url TEXT DEFAULT '',

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Version tracking
    version INTEGER DEFAULT 1,

    -- Search optimization
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

-- Book covers table - Image metadata and processing information
CREATE TABLE IF NOT EXISTS covers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,

    -- Image information
    original_url TEXT,
    local_path TEXT,
    filename TEXT,

    -- Image properties
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    format TEXT, -- jpg, png, webp, etc.

    -- Processing status
    status TEXT DEFAULT 'pending', -- pending, processing, complete, failed, missing
    error_message TEXT,

    -- Quality metrics
    quality_score REAL, -- 0-1 scale
    has_isbn_visible BOOLEAN DEFAULT FALSE,
    has_text_overlay BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,

    -- API source information
    source_api TEXT, -- google_books, open_library, manual, etc.
    api_response_data TEXT, -- JSON response for debugging

    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
);

-- API cache table - Cache responses from external APIs
CREATE TABLE IF NOT EXISTS api_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Cache key components
    cache_key TEXT UNIQUE NOT NULL,
    api_source TEXT NOT NULL, -- google_books, open_library, isbn_db, etc.
    query_type TEXT NOT NULL, -- isbn_lookup, title_search, cover_search, etc.
    query_value TEXT NOT NULL, -- the actual query (ISBN, title, etc.)

    -- Cache data
    response_data TEXT NOT NULL, -- JSON response
    http_status INTEGER,

    -- Cache metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    hit_count INTEGER DEFAULT 0,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,

    -- Response quality
    is_successful BOOLEAN DEFAULT TRUE,
    confidence_score REAL -- 0-1 scale for how good the match is
);

-- Processing log table - Track all database operations
CREATE TABLE IF NOT EXISTS processing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Operation details
    operation_type TEXT NOT NULL, -- insert, update, delete, migration, backup, etc.
    operation_category TEXT NOT NULL, -- book, cover, api, maintenance, etc.

    -- Target information
    target_table TEXT,
    target_id INTEGER,
    target_identifier TEXT, -- ISBN, book title, etc.

    -- Operation data
    old_values TEXT, -- JSON of previous values
    new_values TEXT, -- JSON of new values

    -- Result
    status TEXT NOT NULL DEFAULT 'pending', -- pending, success, failed, partial
    error_message TEXT,
    rows_affected INTEGER DEFAULT 0,

    -- Performance
    duration_ms INTEGER,

    -- Context
    user_agent TEXT DEFAULT 'Hudson Street Library System',
    source_file TEXT, -- if operation was from a file
    batch_id TEXT, -- for grouping related operations

    -- Timestamps
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,

    -- Additional metadata
    metadata TEXT -- JSON for additional context
);

-- Book authors table - Normalized author information (future enhancement)
CREATE TABLE IF NOT EXISTS authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT DEFAULT '',
    last_name TEXT DEFAULT '',
    full_name TEXT NOT NULL,

    -- Additional author information
    birth_year INTEGER,
    death_year INTEGER,
    nationality TEXT DEFAULT '',
    biography TEXT DEFAULT '',

    -- External IDs
    wikidata_id TEXT DEFAULT '',
    viaf_id TEXT DEFAULT '',

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(full_name)
);

-- Book-Author junction table (for multiple authors per book)
CREATE TABLE IF NOT EXISTS book_authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,

    -- Role information
    role TEXT DEFAULT 'author', -- author, editor, illustrator, translator, etc.
    position INTEGER DEFAULT 1, -- order of authors

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT,
    UNIQUE(book_id, author_id, role)
);

-- Collections table - Organize books into collections
CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',

    -- Collection properties
    is_public BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Book-Collection junction table
CREATE TABLE IF NOT EXISTS book_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    collection_id INTEGER NOT NULL,

    -- Position in collection
    position INTEGER DEFAULT 0,

    -- Metadata
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
    UNIQUE(book_id, collection_id)
);

-- Tags table - Normalized tag system
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,

    -- Tag properties
    category TEXT DEFAULT 'general', -- subject, genre, format, era, etc.
    color TEXT DEFAULT '#6B7280', -- hex color for UI display
    description TEXT DEFAULT '',

    -- Usage statistics
    use_count INTEGER DEFAULT 0,

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Book-Tag junction table
CREATE TABLE IF NOT EXISTS book_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,

    -- Relevance score (0-1)
    relevance REAL DEFAULT 1.0,

    -- Source of tag application
    source TEXT DEFAULT 'manual', -- manual, imported, auto-generated

    -- Metadata
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(book_id, tag_id)
);

-- ============================================================================
-- INDEXES for performance optimization
-- ============================================================================

-- Books table indexes
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author_full_name ON books(author_full_name);
CREATE INDEX IF NOT EXISTS idx_books_author_last ON books(author_last);
CREATE INDEX IF NOT EXISTS idx_books_isbn_asin ON books(isbn_asin);
-- Unique constraint on ISBN only when not empty
CREATE UNIQUE INDEX IF NOT EXISTS idx_books_isbn_unique ON books(isbn_asin) WHERE isbn_asin != '';
CREATE INDEX IF NOT EXISTS idx_books_publisher ON books(publisher);
CREATE INDEX IF NOT EXISTS idx_books_publication_year ON books(publication_year);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books(created_at);
CREATE INDEX IF NOT EXISTS idx_books_updated_at ON books(updated_at);

-- Full-text search index on the generated search_text column
CREATE INDEX IF NOT EXISTS idx_books_search_text ON books(search_text);

-- Covers table indexes
CREATE INDEX IF NOT EXISTS idx_covers_book_id ON covers(book_id);
CREATE INDEX IF NOT EXISTS idx_covers_status ON covers(status);
CREATE INDEX IF NOT EXISTS idx_covers_local_path ON covers(local_path);
CREATE INDEX IF NOT EXISTS idx_covers_source_api ON covers(source_api);
CREATE INDEX IF NOT EXISTS idx_covers_created_at ON covers(created_at);

-- API cache indexes
CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_source ON api_cache(api_source);
CREATE INDEX IF NOT EXISTS idx_api_cache_query ON api_cache(query_type, query_value);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_api_cache_accessed ON api_cache(last_accessed);

-- Processing log indexes
CREATE INDEX IF NOT EXISTS idx_processing_log_operation ON processing_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_processing_log_category ON processing_log(operation_category);
CREATE INDEX IF NOT EXISTS idx_processing_log_target ON processing_log(target_table, target_id);
CREATE INDEX IF NOT EXISTS idx_processing_log_status ON processing_log(status);
CREATE INDEX IF NOT EXISTS idx_processing_log_started ON processing_log(started_at);
CREATE INDEX IF NOT EXISTS idx_processing_log_batch ON processing_log(batch_id);

-- Junction table indexes
CREATE INDEX IF NOT EXISTS idx_book_authors_book ON book_authors(book_id);
CREATE INDEX IF NOT EXISTS idx_book_authors_author ON book_authors(author_id);
CREATE INDEX IF NOT EXISTS idx_book_collections_book ON book_collections(book_id);
CREATE INDEX IF NOT EXISTS idx_book_collections_collection ON book_collections(collection_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_book ON book_tags(book_id);
CREATE INDEX IF NOT EXISTS idx_book_tags_tag ON book_tags(tag_id);

-- Authors table indexes
CREATE INDEX IF NOT EXISTS idx_authors_full_name ON authors(full_name);
CREATE INDEX IF NOT EXISTS idx_authors_last_name ON authors(last_name);

-- Collections table indexes
CREATE INDEX IF NOT EXISTS idx_collections_name ON collections(name);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public);

-- Tags table indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_category ON tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_use_count ON tags(use_count);

-- ============================================================================
-- TRIGGERS for maintaining data integrity and automation
-- ============================================================================

-- Update updated_at timestamp when books are modified
CREATE TRIGGER IF NOT EXISTS trigger_books_updated_at
AFTER UPDATE ON books
BEGIN
    UPDATE books SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update version number when books are modified
CREATE TRIGGER IF NOT EXISTS trigger_books_version
AFTER UPDATE ON books
BEGIN
    UPDATE books SET version = OLD.version + 1 WHERE id = NEW.id;
END;

-- Update updated_at timestamp when covers are modified
CREATE TRIGGER IF NOT EXISTS trigger_covers_updated_at
AFTER UPDATE ON covers
BEGIN
    UPDATE covers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update tag use_count when book_tags are added/removed
CREATE TRIGGER IF NOT EXISTS trigger_book_tags_insert_count
AFTER INSERT ON book_tags
BEGIN
    UPDATE tags SET use_count = use_count + 1 WHERE id = NEW.tag_id;
END;

CREATE TRIGGER IF NOT EXISTS trigger_book_tags_delete_count
AFTER DELETE ON book_tags
BEGIN
    UPDATE tags SET use_count = use_count - 1 WHERE id = OLD.tag_id;
END;

-- Update API cache hit count and last accessed
CREATE TRIGGER IF NOT EXISTS trigger_api_cache_hit
AFTER UPDATE OF last_accessed ON api_cache
BEGIN
    UPDATE api_cache SET hit_count = hit_count + 1 WHERE id = NEW.id;
END;

-- ============================================================================
-- VIEWS for common queries
-- ============================================================================

-- Complete book information with cover status
CREATE VIEW IF NOT EXISTS view_books_complete AS
SELECT
    b.*,
    c.local_path as cover_local_path,
    c.status as cover_status,
    c.width as cover_width,
    c.height as cover_height,
    c.quality_score as cover_quality,
    CASE
        WHEN c.id IS NOT NULL THEN 1
        ELSE 0
    END as has_cover
FROM books b
LEFT JOIN covers c ON b.id = c.book_id AND c.status = 'complete';

-- Books without covers
CREATE VIEW IF NOT EXISTS view_books_missing_covers AS
SELECT b.*
FROM books b
LEFT JOIN covers c ON b.id = c.book_id AND c.status = 'complete'
WHERE c.id IS NULL;

-- Recent activity log
CREATE VIEW IF NOT EXISTS view_recent_activity AS
SELECT
    operation_type,
    operation_category,
    target_table,
    target_identifier,
    status,
    started_at,
    duration_ms,
    rows_affected
FROM processing_log
ORDER BY started_at DESC
LIMIT 100;

-- Tag usage statistics
CREATE VIEW IF NOT EXISTS view_tag_stats AS
SELECT
    t.name,
    t.category,
    t.use_count,
    COUNT(bt.book_id) as actual_use_count,
    t.created_at
FROM tags t
LEFT JOIN book_tags bt ON t.id = bt.tag_id
GROUP BY t.id, t.name, t.category, t.use_count, t.created_at
ORDER BY t.use_count DESC;

-- Collection summary
CREATE VIEW IF NOT EXISTS view_collection_summary AS
SELECT
    c.name,
    c.description,
    COUNT(bc.book_id) as book_count,
    c.is_public,
    c.created_at
FROM collections c
LEFT JOIN book_collections bc ON c.id = bc.collection_id
GROUP BY c.id, c.name, c.description, c.is_public, c.created_at
ORDER BY book_count DESC;

-- ============================================================================
-- INITIAL DATA - Default collections and common tags
-- ============================================================================

-- Default collections
INSERT OR IGNORE INTO collections (name, description, is_public, display_order) VALUES
('Photography', 'Photography books and monographs', TRUE, 1),
('Art', 'Art books and artist monographs', TRUE, 2),
('Recently Added', 'Recently acquired books', TRUE, 0),
('Signed Books', 'Books with author signatures or inscriptions', TRUE, 3),
('Rare Editions', 'Limited editions and special printings', TRUE, 4);

-- Common tag categories and initial tags
INSERT OR IGNORE INTO tags (name, slug, category, color, description) VALUES
-- Subject tags
('Photography', 'photography', 'subject', '#3B82F6', 'Photography-related content'),
('Art', 'art', 'subject', '#EF4444', 'Art and artistic content'),
('Architecture', 'architecture', 'subject', '#10B981', 'Architecture and built environment'),
('Fashion', 'fashion', 'subject', '#8B5CF6', 'Fashion and clothing design'),
('Music', 'music', 'subject', '#F59E0B', 'Music and musicians'),

-- Format tags
('Monograph', 'monograph', 'format', '#6B7280', 'Single artist or photographer monograph'),
('Exhibition Catalog', 'exhibition-catalog', 'format', '#EC4899', 'Exhibition catalog or museum publication'),
('Artist Book', 'artist-book', 'format', '#14B8A6', 'Artist-designed book or publication'),
('Hardcover', 'hardcover', 'format', '#84CC16', 'Hardcover binding'),
('Softcover', 'softcover', 'format', '#A3A3A3', 'Softcover or paperback binding'),

-- Era tags
('Contemporary', 'contemporary', 'era', '#F97316', '21st century works'),
('Modern', 'modern', 'era', '#06B6D4', '20th century works'),
('Historical', 'historical', 'era', '#8B5A2B', 'Pre-20th century works'),

-- Location tags
('NYC', 'nyc', 'location', '#1D4ED8', 'New York City related'),
('International', 'international', 'location', '#DC2626', 'International/non-US content'),

-- Special attributes
('Signed', 'signed', 'attribute', '#F59E0B', 'Signed by author or artist'),
('Limited Edition', 'limited-edition', 'attribute', '#7C3AED', 'Limited edition publication'),
('First Edition', 'first-edition', 'attribute', '#059669', 'First edition publication');

-- ============================================================================
-- PRAGMA settings for performance and reliability
-- ============================================================================

-- Enable Write-Ahead Logging for better concurrency
PRAGMA journal_mode = WAL;

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Set synchronous mode for balance of safety and performance
PRAGMA synchronous = NORMAL;

-- Optimize for read performance
PRAGMA cache_size = 10000;

-- Auto-vacuum to prevent database bloat
PRAGMA auto_vacuum = INCREMENTAL;

-- Set page size for better performance with our data types
PRAGMA page_size = 4096;

-- Enable query planner optimizations
PRAGMA optimize;