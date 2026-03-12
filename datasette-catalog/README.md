# Hudson Street Library - Datasette Catalog

> Interactive, searchable digital catalog powered by Datasette

## What is This?

A SQLite-backed web interface for browsing and searching the Hudson Street Library collection. Built with [Datasette](https://datasette.io/), an open-source tool for exploring and publishing data.

## Features

- 🔍 **Full-Text Search**: Search across 1,718 books instantly
- 🏷️ **Faceted Browsing**: Filter by author, category, format, year
- 📊 **SQL Queries**: Write custom queries for advanced searches
- 📤 **Export**: Download results as JSON or CSV
- 🔗 **API**: Every view is automatically an API endpoint
- ⚡ **Fast**: Optimized with FTS5 and indexes
- 🔄 **Auto-Sync**: Automatically updates when books are added via add-book script

## Quick Start

### 1. First-Time Setup

```bash
# Run setup script (installs dependencies, creates database)
./scripts/setup-datasette.sh
```

### 2. Start the Catalog

```bash
datasette hudson_street_library.db --metadata metadata.json
```

Visit: **http://localhost:8001**

### 3. Adding Books (Auto-Updates Catalog)

```bash
# Add books - catalog rebuilds automatically!
node scripts/add-book-from-text.js --interactive

# For bulk imports, skip auto-rebuild and rebuild once at end
node scripts/add-book-from-text.js --text "Book 1..." --no-rebuild
node scripts/add-book-from-text.js --text "Book 2..." --no-rebuild
./scripts/update-datasette-catalog.sh
```

### 4. Manual Update (If Editing CSV Directly)

```bash
# Rebuild database from updated books.csv
./scripts/update-datasette-catalog.sh
```

## Directory Structure

```
├── hudson_street_library.db      # SQLite database (1.4 MB)
├── metadata.json                  # Datasette configuration
├── DATASETTE-QUICKSTART.md        # Quick reference guide
├── docs/
│   └── DATASETTE-CATALOG-GUIDE.md # Complete documentation
└── scripts/
    ├── setup-datasette.sh         # First-time setup
    └── update-datasette-catalog.sh # Rebuild database
```

## Database Details

**Source**: `src/_data/books.csv`
**Records**: 1,718 books
**Columns**: 36 fields including title, author, publisher, tags, description

**Search-Enabled Columns**:
- Title
- Author
- Classification
- Tags
- Notes

**Indexed Columns**:
- Author (last name)
- Collection grouping (category)

## Common Use Cases

### Browse Photography Books
1. Click "Category" facet in sidebar
2. Select "Photography"
3. Results update instantly

### Find Books by Author
1. Use search box: `"diane arbus"`
2. Or click author in facet sidebar

### Export Search Results
1. Apply filters/search
2. Scroll to bottom of page
3. Click "JSON" or "CSV" link

### Custom Query
```sql
-- Find large-format photography books
SELECT title, author_full_name, height_cm, width_cm
FROM books
WHERE collection_grouping = 'Photography'
  AND height_cm > 30
  AND width_cm > 25
ORDER BY height_cm DESC;
```

## API Examples

### Get All Books
```bash
curl http://localhost:8001/hudson_street_library/books.json
```

### Search
```bash
curl "http://localhost:8001/hudson_street_library/books.json?_search=photography"
```

### Filter
```bash
curl "http://localhost:8001/hudson_street_library/books.json?collection_grouping=Photography"
```

### Custom SQL
```bash
curl -G http://localhost:8001/hudson_street_library.json \
  --data-urlencode 'sql=SELECT author_full_name, COUNT(*) as count FROM books GROUP BY author_full_name ORDER BY count DESC LIMIT 10'
```

## Documentation

- **Quick Start**: [DATASETTE-QUICKSTART.md](../DATASETTE-QUICKSTART.md)
- **Full Guide**: [docs/DATASETTE-CATALOG-GUIDE.md](../docs/DATASETTE-CATALOG-GUIDE.md)
- **Datasette Docs**: https://docs.datasette.io/

## Troubleshooting

**Port already in use?**
```bash
datasette hudson_street_library.db --metadata metadata.json --port 8080
```

**Search not working?**
```bash
# Rebuild FTS
./scripts/update-datasette-catalog.sh
```

**Need to update database?**
```bash
# After editing books.csv
./scripts/update-datasette-catalog.sh
```

## Tech Stack

- **Datasette**: 0.65.2
- **sqlite-utils**: 3.39
- **SQLite**: FTS5 full-text search
- **Python**: 3.7+

## License

Data: © Hudson Street Library, NYC
Software: Datasette is Apache 2.0 licensed
