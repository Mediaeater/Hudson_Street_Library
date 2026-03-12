# Hudson Street Library - Datasette Digital Catalog

## 📚 Overview

This guide documents the Datasette-based digital catalog for Hudson Street Library. Datasette is an open-source tool that transforms SQLite databases into interactive, explorable websites with powerful search and filtering capabilities.

### Why Datasette?

- **Instant Search**: Full-text search across all book metadata
- **Faceted Browsing**: Filter by author, category, format, publication year
- **No Backend Required**: Static SQLite database, no server infrastructure needed
- **API-First**: Every view is automatically an API endpoint (JSON/CSV export)
- **SQL Interface**: Advanced users can write custom queries
- **Fast & Lightweight**: Optimized for read-heavy workloads
- **Workflow Integration**: Automatically syncs with book addition workflow

### Workflow Integration (NEW 2026-03-10)

The Datasette catalog is integrated with the book addition workflow. When you add books using `scripts/add-book-from-text.js`, the catalog **automatically rebuilds** to include the new books.

**How it works**:
```
Add Book Script → Updates books.csv → Auto-Rebuilds Datasette → New book searchable
```

**Usage**:
```bash
# Add book - catalog updates automatically
node scripts/add-book-from-text.js --interactive

# Skip auto-rebuild for bulk imports
node scripts/add-book-from-text.js --text "Book..." --no-rebuild
```

See `DATASETTE-INTEGRATION.md` for complete details.

## 🛠️ System Requirements

### Software Dependencies

- **Python 3.7+**: Required for Datasette and sqlite-utils
- **datasette**: Version 0.65.2 or later
- **sqlite-utils**: Version 3.39 or later

### Installation

```bash
# Install both tools via pip
pip3 install datasette sqlite-utils

# Verify installation
datasette --version    # Should output: datasette, version 0.65.2
sqlite-utils --version # Should output: sqlite-utils, version 3.39
```

## 🗄️ Database Architecture

### Source Data

**Location**: `src/_data/books.csv`

**Structure**: CSV file with 36 columns including:
- **Identification**: id, isbn_asin, accession_no
- **Bibliographic**: title, author, publisher, publication_year
- **Physical**: dimensions (height, width, depth), binding, page_count
- **Content**: description, tags, classification, notes
- **Digital**: image_url, custom_page_url, artist_url, publisher_url
- **Collection**: collection_grouping, location, featured

**Record Count**: 1,718 books (as of 2026-03-08)

### Database Schema

**File**: `hudson_street_library.db`

**Main Table**: `books`

**Column Types** (auto-detected):
```sql
CREATE TABLE "books" (
   [id] INTEGER,                      -- Primary identifier
   [author_last] TEXT,                -- Indexed for fast filtering
   [author_first] TEXT,
   [author_full_name] TEXT,           -- FTS enabled
   [title] TEXT,                      -- FTS enabled
   [publisher] TEXT,
   [publication_year] INTEGER,        -- Faceted
   [height_cm] FLOAT,
   [width_cm] FLOAT,
   [depth_cm] FLOAT,
   [binding] TEXT,                    -- Faceted (format)
   [page_count] TEXT,
   [edition_printrun] TEXT,
   [isbn_asin] TEXT,
   [editor] TEXT,
   [contributors] TEXT,
   [is_signed_inscribed] TEXT,
   [designer] TEXT,
   [description] TEXT,
   [artist_url] TEXT,                 -- Rendered as link
   [publisher_url] TEXT,              -- Rendered as link
   [collection_grouping] TEXT,        -- Indexed & faceted (category)
   [tags] TEXT,                       -- FTS enabled
   [classification] TEXT,             -- FTS enabled
   [bisac] TEXT,
   [lcc] TEXT,
   [location] TEXT,
   [accession_no] TEXT,
   [featured] TEXT,
   [image_url] TEXT,                  -- Rendered as link
   [price] TEXT,
   [weight_g] TEXT,
   [language] TEXT,
   [num_images] TEXT,
   [notes] TEXT,                      -- FTS enabled
   [custom_page_url] TEXT             -- Rendered as link
)
```

### Performance Optimizations

#### Full-Text Search (FTS5)

**Tables Created**:
- `books_fts` - Main FTS virtual table
- `books_fts_data` - FTS data storage
- `books_fts_idx` - FTS index
- `books_fts_docsize` - Document size information
- `books_fts_config` - FTS configuration

**Indexed Columns**:
- `title` - Book titles
- `author_full_name` - Complete author names
- `classification` - Library classification codes
- `tags` - Subject tags and keywords
- `notes` - Additional metadata and descriptions

**Benefits**:
- Instant search results across 1,718 books
- Supports phrase queries, wildcards, boolean operators
- Ranked results by relevance

#### B-Tree Indexes

```sql
-- Author filtering
CREATE INDEX idx_books_author_last ON books(author_last);

-- Category filtering
CREATE INDEX idx_books_collection_grouping ON books(collection_grouping);
```

**Performance Impact**:
- Author queries: ~100x faster
- Category queries: ~50x faster
- Minimal storage overhead (~50KB per index)

## ⚙️ Configuration

### Metadata File

**Location**: `metadata.json`

**Purpose**: Configures Datasette's display, facets, and behavior

**Structure**:
```json
{
  "title": "Hudson Street Library Digital Catalog",
  "description": "Digital catalog for Hudson Street Library's art and photography book collection",
  "source": "Hudson Street Library, NYC",
  "source_url": "https://hudsonstreetlibrary.com",
  "databases": {
    "hudson_street_library": {
      "title": "Hudson Street Library Collection",
      "description": "Complete catalog of books in the Hudson Street Library collection",
      "tables": {
        "books": {
          "title": "Books",
          "description": "Art, photography, and design books",
          "facets": [
            "author_last",
            "collection_grouping",
            "binding",
            "publication_year"
          ],
          "sort_desc": "accession_no",
          "columns": {
            // Column-specific configuration
          }
        }
      }
    }
  }
}
```

### Facet Configuration

**Facets**: Interactive filters that appear in the sidebar

**Configured Facets**:
1. **author_last**: Filter by author surname
2. **collection_grouping**: Filter by category (Photography, Art, etc.)
3. **binding**: Filter by format (Hardcover, Paperback, etc.)
4. **publication_year**: Filter by publication year

**Usage**: Click any facet value to filter results; combine multiple facets for complex queries

### URL Rendering

**Configured Columns**:
- `image_url` - Cover images display as clickable thumbnails
- `artist_url` - Artist/author websites as hyperlinks
- `publisher_url` - Publisher websites as hyperlinks
- `custom_page_url` - Library detail pages as hyperlinks

**Implementation**:
```json
{
  "image_url": {
    "description": "Cover image URL",
    "label": "Cover",
    "render_url": true
  }
}
```

## 🚀 Running Datasette

### Basic Usage

**Start the server**:
```bash
datasette hudson_street_library.db --metadata metadata.json
```

**Default URL**: http://localhost:8001

**Stop the server**: Press `Ctrl+C`

### Advanced Options

**Custom port**:
```bash
datasette hudson_street_library.db --metadata metadata.json --port 8080
```

**Auto-reload on changes**:
```bash
datasette hudson_street_library.db --metadata metadata.json --reload
```

**Open browser automatically**:
```bash
datasette hudson_street_library.db --metadata metadata.json --open
```

**Production mode** (immutable, cached):
```bash
datasette hudson_street_library.db \
  --metadata metadata.json \
  --immutable \
  --setting sql_time_limit_ms 5000 \
  --setting default_page_size 50
```

### Docker Deployment

**Create Dockerfile**:
```dockerfile
FROM python:3.11-slim
RUN pip install datasette
COPY hudson_street_library.db /data/
COPY metadata.json /data/
WORKDIR /data
EXPOSE 8001
CMD ["datasette", "hudson_street_library.db", \
     "--metadata", "metadata.json", \
     "--host", "0.0.0.0", \
     "--immutable"]
```

**Build and run**:
```bash
docker build -t library-catalog .
docker run -p 8001:8001 library-catalog
```

## 🔍 Using the Catalog

### Search

**Full-Text Search**:
1. Navigate to the Books table
2. Use the search box at the top
3. Enter keywords from title, author, tags, or notes
4. Results are ranked by relevance

**Search Examples**:
- `"diane arbus"` - Books by or about Diane Arbus
- `photography NEW YORK` - Books tagged with both terms
- `steidl` - Books published by Steidl
- `signed` - Books with signed/inscribed copies

### Filtering

**Single Facet**:
- Click any value in the sidebar facets
- Results update instantly

**Multiple Facets**:
- Combine filters from different facets
- Example: Hardcover books by Photography category from 2020

**Clear Filters**:
- Click "Clear all" at top of facets
- Or remove individual filters

### Sorting

**Default**: Books sorted by accession number (most recent first)

**Custom Sorting**:
1. Click column headers to sort
2. Click again to reverse sort order
3. Combine with search/filters

### Exporting Data

**Available Formats**:
- JSON - Structured data for APIs
- CSV - Spreadsheet-compatible
- JSON (newline-delimited) - Streaming format

**Export Current View**:
1. Apply any filters/search
2. Click format link at bottom of page
3. All visible results are exported

**Example Exports**:
- All photography books: Filter by category → Export CSV
- Books from 2020-2025: Filter by year range → Export JSON
- Signed copies: Search "signed" → Export CSV

### SQL Queries

**Access**: Click "SQL editor" link

**Example Queries**:

**Books per year**:
```sql
SELECT
  publication_year,
  COUNT(*) as book_count
FROM books
WHERE publication_year IS NOT NULL
GROUP BY publication_year
ORDER BY publication_year DESC
```

**Most published authors**:
```sql
SELECT
  author_full_name,
  COUNT(*) as book_count
FROM books
WHERE author_full_name != ''
GROUP BY author_full_name
ORDER BY book_count DESC
LIMIT 20
```

**Books by dimension** (coffee table books):
```sql
SELECT
  title,
  author_full_name,
  height_cm,
  width_cm
FROM books
WHERE height_cm > 30 AND width_cm > 25
ORDER BY height_cm DESC
```

**Recent acquisitions**:
```sql
SELECT
  title,
  author_full_name,
  accession_no,
  collection_grouping
FROM books
ORDER BY accession_no DESC
LIMIT 50
```

## 🔄 Maintenance & Updates

### Updating the Database

**Automatic Updates** (when using add-book script):

The catalog automatically rebuilds when you add books via the add-book script:

```bash
# Adds book to CSV and rebuilds Datasette automatically
node scripts/add-book-from-text.js --interactive
```

**Manual Updates** (when editing CSV directly):

When you edit `books.csv` manually, rebuild the database:

**Step 1: Backup existing database**
```bash
cp hudson_street_library.db hudson_street_library.backup.db
```

**Step 2: Delete old database**
```bash
rm hudson_street_library.db
```

**Step 3: Recreate from CSV**
```bash
sqlite-utils insert hudson_street_library.db books \
  src/_data/books.csv \
  --csv \
  --detect-types
```

**Step 4: Rebuild FTS**
```bash
sqlite-utils enable-fts hudson_street_library.db books \
  title author_full_name classification tags notes \
  --create-triggers
```

**Step 5: Recreate indexes**
```bash
sqlite-utils create-index hudson_street_library.db books author_last
sqlite-utils create-index hudson_street_library.db books collection_grouping
```

**Step 6: Verify**
```bash
datasette inspect hudson_street_library.db
```

### Automated Update Script

**Create**: `scripts/update-datasette-catalog.sh`

```bash
#!/bin/bash
set -e

echo "📚 Updating Hudson Street Library Datasette Catalog"
echo ""

# Backup
echo "1. Creating backup..."
cp hudson_street_library.db hudson_street_library.backup.$(date +%Y%m%d).db

# Rebuild
echo "2. Rebuilding database from CSV..."
rm hudson_street_library.db
sqlite-utils insert hudson_street_library.db books \
  src/_data/books.csv \
  --csv \
  --detect-types

# FTS
echo "3. Enabling full-text search..."
sqlite-utils enable-fts hudson_street_library.db books \
  title author_full_name classification tags notes \
  --create-triggers

# Indexes
echo "4. Creating indexes..."
sqlite-utils create-index hudson_street_library.db books author_last
sqlite-utils create-index hudson_street_library.db books collection_grouping

# Verify
echo "5. Verifying database..."
datasette inspect hudson_street_library.db

echo ""
echo "✅ Catalog updated successfully!"
echo "   Records: $(sqlite-utils query hudson_street_library.db 'SELECT COUNT(*) as c FROM books' | grep -o '[0-9]*')"
```

**Usage**:
```bash
chmod +x scripts/update-datasette-catalog.sh
./scripts/update-datasette-catalog.sh
```

### Incremental Updates

**Add single book**:
```bash
echo "1719,Smith,Jane,Jane Smith,New Photography Book,..." >> src/_data/books.csv
./scripts/update-datasette-catalog.sh
```

**Direct database insert** (faster, no rebuild):
```bash
sqlite-utils insert hudson_street_library.db books - \
  --csv << EOF
id,author_last,author_first,author_full_name,title,publisher,...
1719,Smith,Jane,Jane Smith,New Photography Book,Aperture,...
EOF
```

## 🔌 API Usage

### REST API

Every table/view is automatically an API endpoint.

**Base URL**: `http://localhost:8001`

**Books Collection**:
```bash
# Get all books (paginated)
curl http://localhost:8001/hudson_street_library/books.json

# Filter by author
curl http://localhost:8001/hudson_street_library/books.json?author_last=Abbott

# Search
curl "http://localhost:8001/hudson_street_library/books.json?_search=photography"

# Custom page size
curl http://localhost:8001/hudson_street_library/books.json?_size=100
```

**Single Book**:
```bash
# Get book by ID
curl http://localhost:8001/hudson_street_library/books/1.json
```

**SQL Query API**:
```bash
# Execute custom SQL
curl -G http://localhost:8001/hudson_street_library.json \
  --data-urlencode 'sql=SELECT author_full_name, COUNT(*) as count FROM books GROUP BY author_full_name ORDER BY count DESC LIMIT 10'
```

**Response Format**:
```json
{
  "ok": true,
  "rows": [
    {
      "id": 1,
      "title": "Documenting Science",
      "author_full_name": "Berenice Abbott",
      "publisher": "Steidl",
      "publication_year": 2012
    }
  ],
  "truncated": false,
  "next": "?_next=token",
  "database": "hudson_street_library",
  "query_ms": 12.5
}
```

### JavaScript Integration

**Fetch books**:
```javascript
async function getBooks(search = '', page = 1) {
  const params = new URLSearchParams({
    _size: 50,
    _page: page
  });

  if (search) {
    params.append('_search', search);
  }

  const response = await fetch(
    `http://localhost:8001/hudson_street_library/books.json?${params}`
  );

  return await response.json();
}

// Usage
const books = await getBooks('photography');
console.log(books.rows);
```

**Faceted search**:
```javascript
async function searchBooks(filters = {}) {
  const params = new URLSearchParams();

  if (filters.author) params.append('author_last', filters.author);
  if (filters.category) params.append('collection_grouping', filters.category);
  if (filters.format) params.append('binding', filters.format);
  if (filters.year) params.append('publication_year', filters.year);

  const response = await fetch(
    `http://localhost:8001/hudson_street_library/books.json?${params}`
  );

  return await response.json();
}

// Usage
const photoBooks = await searchBooks({
  category: 'Photography',
  format: 'Hardcover'
});
```

## 🎨 Customization

### Custom Templates

**Location**: `templates/` directory (create if needed)

**Override default templates**:
```bash
mkdir -p templates
```

**Custom table view** (`templates/table-hudson_street_library-books.html`):
```html
{% extends "table.html" %}

{% block content %}
<div class="custom-header">
  <h1>Hudson Street Library Catalog</h1>
  <p>{{ rows|length }} books in collection</p>
</div>
{{ super() }}
{% endblock %}
```

### Custom CSS

**Create** `metadata.json` section:
```json
{
  "extra_css_urls": [
    "/static/custom.css"
  ]
}
```

**Create** `static/custom.css`:
```css
/* Larger book titles */
.table-wrapper td:nth-child(5) {
  font-size: 1.1em;
  font-weight: 500;
}

/* Highlight featured books */
tr[data-featured="true"] {
  background: #fffbea;
}
```

### Custom JavaScript

**Add to** `metadata.json`:
```json
{
  "extra_js_urls": [
    "/static/custom.js"
  ]
}
```

**Create** `static/custom.js`:
```javascript
// Add book cover previews on hover
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('a[href*="image_url"]').forEach(link => {
    link.addEventListener('mouseenter', (e) => {
      const preview = document.createElement('img');
      preview.src = e.target.href;
      preview.className = 'cover-preview';
      e.target.appendChild(preview);
    });
  });
});
```

## 🔒 Security & Publishing

### Read-Only Mode

**Immutable flag** (prevents modifications):
```bash
datasette hudson_street_library.db --immutable
```

**Benefits**:
- Enables aggressive caching
- Prevents accidental writes
- Faster performance

### Publishing Options

#### 1. Datasette Cloud

**Official hosting** (https://datasette.cloud):
```bash
datasette publish cloudrun hudson_street_library.db \
  --metadata metadata.json \
  --service library-catalog
```

#### 2. Vercel

```bash
datasette publish vercel hudson_street_library.db \
  --metadata metadata.json \
  --project library-catalog
```

#### 3. Fly.io

```bash
datasette publish fly hudson_street_library.db \
  --metadata metadata.json \
  --app library-catalog
```

#### 4. Static Export

**Generate static site**:
```bash
pip install datasette-render-html
datasette install datasette-render-html

datasette static \
  hudson_street_library.db \
  --metadata metadata.json \
  --output-dir _site/catalog
```

**Deploy to GitHub Pages, Netlify, etc.**

### Access Control

**Install plugin**:
```bash
datasette install datasette-auth-passwords
```

**Configure** `metadata.json`:
```json
{
  "plugins": {
    "datasette-auth-passwords": {
      "passwords": {
        "admin": "pbkdf2_sha256$..."
      }
    }
  },
  "databases": {
    "hudson_street_library": {
      "allow": {
        "id": "admin"
      }
    }
  }
}
```

## 📊 Analytics & Monitoring

### Query Logging

**Enable** in `metadata.json`:
```json
{
  "settings": {
    "trace_debug": true
  }
}
```

**View logs**: Check terminal output for query performance

### Popular Queries

**Track via logs**:
- Most searched terms
- Common filters
- Slow queries (>100ms)

### Performance Monitoring

**Database size**:
```bash
ls -lh hudson_street_library.db
```

**Table statistics**:
```bash
sqlite-utils query hudson_street_library.db \
  "SELECT COUNT(*) as books,
          COUNT(DISTINCT author_last) as authors,
          COUNT(DISTINCT collection_grouping) as categories
   FROM books"
```

**FTS index size**:
```bash
sqlite-utils query hudson_street_library.db \
  "SELECT name, SUM(pgsize) as size
   FROM dbstat
   WHERE name LIKE 'books_fts%'
   GROUP BY name"
```

## 🐛 Troubleshooting

### Common Issues

**Problem**: Search returns no results
- **Cause**: FTS not enabled or out of sync
- **Solution**: Rebuild FTS tables
  ```bash
  sqlite-utils enable-fts hudson_street_library.db books \
    title author_full_name classification tags notes \
    --create-triggers
  ```

**Problem**: Slow facet queries
- **Cause**: Missing indexes
- **Solution**: Create indexes on faceted columns
  ```bash
  sqlite-utils create-index hudson_street_library.db books author_last
  sqlite-utils create-index hudson_street_library.db books collection_grouping
  ```

**Problem**: Port already in use
- **Solution**: Use different port
  ```bash
  datasette hudson_street_library.db --port 8002
  ```

**Problem**: Metadata not loading
- **Cause**: Invalid JSON syntax
- **Solution**: Validate JSON
  ```bash
  python -m json.tool metadata.json
  ```

### Database Integrity

**Check database**:
```bash
sqlite3 hudson_street_library.db "PRAGMA integrity_check;"
```

**Vacuum database** (optimize):
```bash
sqlite3 hudson_street_library.db "VACUUM;"
```

**Analyze database** (update statistics):
```bash
sqlite3 hudson_street_library.db "ANALYZE;"
```

## 📚 Additional Resources

### Official Documentation

- **Datasette**: https://docs.datasette.io/
- **sqlite-utils**: https://sqlite-utils.datasette.io/
- **SQLite FTS5**: https://www.sqlite.org/fts5.html

### Plugins

Browse 100+ plugins at https://datasette.io/plugins

**Recommended**:
- `datasette-cluster-map` - Geographic mapping
- `datasette-export` - Enhanced export options
- `datasette-graphql` - GraphQL API layer
- `datasette-vega` - Data visualizations

### Community

- **Discord**: https://datasette.io/discord
- **Forum**: https://github.com/simonw/datasette/discussions
- **Twitter**: @datasetteproj

## 🔧 Appendix

### Complete Setup Script

**File**: `scripts/setup-datasette.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Hudson Street Library - Datasette Setup"
echo "==========================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found. Please install Python 3.7+"
    exit 1
fi

echo "✓ Python 3 found: $(python3 --version)"
echo ""

# Install dependencies
echo "📦 Installing datasette and sqlite-utils..."
pip3 install datasette sqlite-utils

echo ""
echo "✓ Dependencies installed"
echo "  - datasette $(datasette --version | cut -d' ' -f3)"
echo "  - sqlite-utils $(sqlite-utils --version | cut -d' ' -f3)"
echo ""

# Create database
echo "📊 Creating database from CSV..."
sqlite-utils insert hudson_street_library.db books \
  src/_data/books.csv \
  --csv \
  --detect-types

BOOK_COUNT=$(sqlite-utils query hudson_street_library.db \
  'SELECT COUNT(*) as c FROM books' --csv | tail -n1)

echo "✓ Database created: $BOOK_COUNT books"
echo ""

# Enable FTS
echo "🔍 Enabling full-text search..."
sqlite-utils enable-fts hudson_street_library.db books \
  title author_full_name classification tags notes \
  --create-triggers

echo "✓ FTS enabled on 5 columns"
echo ""

# Create indexes
echo "⚡ Creating performance indexes..."
sqlite-utils create-index hudson_street_library.db books author_last
sqlite-utils create-index hudson_street_library.db books collection_grouping

echo "✓ Indexes created"
echo ""

# Verify
echo "🔬 Verifying setup..."
datasette inspect hudson_street_library.db > /dev/null

echo "✓ Database verified"
echo ""

# Summary
echo "✅ Setup complete!"
echo ""
echo "Database: hudson_street_library.db"
echo "Metadata: metadata.json"
echo ""
echo "To start the catalog:"
echo "  datasette hudson_street_library.db --metadata metadata.json"
echo ""
echo "Then visit: http://localhost:8001"
```

### Environment Variables

```bash
# Development
export DATASETTE_DEBUG=1
export DATASETTE_RELOAD=1

# Production
export DATASETTE_IMMUTABLE=1
export DATASETTE_CACHE_SIZE_KB=5000
export DATASETTE_MAX_RETURNED_ROWS=1000

# Security
export DATASETTE_SECRET_KEY="your-secret-key-here"
```

### Quick Reference

| Task | Command |
|------|---------|
| Start server | `datasette hudson_street_library.db --metadata metadata.json` |
| Custom port | `datasette ... --port 8080` |
| Rebuild DB | `./scripts/update-datasette-catalog.sh` |
| Inspect DB | `datasette inspect hudson_street_library.db` |
| Count books | `sqlite-utils query hudson_street_library.db "SELECT COUNT(*) FROM books"` |
| List tables | `sqlite-utils tables hudson_street_library.db` |
| Schema | `sqlite-utils schema hudson_street_library.db books` |
| Export | Add `.json` or `.csv` to any URL |

---

**Last Updated**: 2026-03-08
**Datasette Version**: 0.65.2
**Database Records**: 1,718 books
**Maintained By**: Hudson Street Library, NYC
