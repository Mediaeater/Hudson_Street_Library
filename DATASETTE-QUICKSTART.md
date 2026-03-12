# Datasette Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install Tools
```bash
pip3 install datasette sqlite-utils
```

### 2. Create Database
```bash
# Convert CSV to SQLite
sqlite-utils insert hudson_street_library.db books \
  src/_data/books.csv \
  --csv \
  --detect-types

# Enable search
sqlite-utils enable-fts hudson_street_library.db books \
  title author_full_name classification tags notes \
  --create-triggers

# Create indexes
sqlite-utils create-index hudson_street_library.db books author_last
sqlite-utils create-index hudson_street_library.db books collection_grouping
```

### 3. Start Server
```bash
datasette hudson_street_library.db --metadata metadata.json
```

### 4. Open Browser
Visit: **http://localhost:8001**

---

## 🔗 Workflow Integration

**New books automatically update the catalog!**

When you add a book via the add-book script, the Datasette catalog rebuilds automatically:

```bash
# Add book - catalog updates automatically!
node scripts/add-book-from-text.js --interactive

# For bulk imports, skip auto-rebuild
node scripts/add-book-from-text.js --text "Book..." --no-rebuild
```

See `DATASETTE-INTEGRATION.md` for details.

---

## 📖 Common Tasks

### Search Books
- Type in search box: `"diane arbus"` or `photography NEW YORK`

### Filter Books
- Click facets in sidebar (Author, Category, Format, Year)

### Export Data
- Add `.json` or `.csv` to any URL
- Example: `http://localhost:8001/hudson_street_library/books.json`

### Update Database

**Automatic** (when using add-book script):
```bash
# Books added via this script auto-update the catalog
node scripts/add-book-from-text.js --interactive
```

**Manual** (when editing CSV directly):
```bash
# Use the update script
./scripts/update-datasette-catalog.sh

# Or rebuild manually:
rm hudson_street_library.db
sqlite-utils insert hudson_street_library.db books \
  src/_data/books.csv --csv --detect-types
sqlite-utils enable-fts hudson_street_library.db books \
  title author_full_name classification tags notes --create-triggers
sqlite-utils create-index hudson_street_library.db books author_last
sqlite-utils create-index hudson_street_library.db books collection_grouping
```

### Custom SQL Queries
```sql
-- Books per year
SELECT publication_year, COUNT(*) as count
FROM books
WHERE publication_year IS NOT NULL
GROUP BY publication_year
ORDER BY publication_year DESC;

-- Top authors
SELECT author_full_name, COUNT(*) as books
FROM books
WHERE author_full_name != ''
GROUP BY author_full_name
ORDER BY books DESC
LIMIT 20;
```

---

## 🔧 Configuration

**metadata.json** controls:
- Site title and description
- Facets (sidebar filters)
- URL rendering (clickable links)
- Column labels and descriptions

Edit `metadata.json` to customize the interface.

---

## 📊 Database Stats

- **Books**: 1,718
- **Size**: 1.4 MB
- **FTS**: Enabled on 5 columns
- **Indexes**: 2 (author, category)

---

## 📚 Full Documentation

See `docs/DATASETTE-CATALOG-GUIDE.md` for complete details on:
- Advanced queries
- API usage
- Deployment options
- Customization
- Troubleshooting

---

## 🆘 Quick Help

| Problem | Solution |
|---------|----------|
| Port in use | Add `--port 8080` |
| Search not working | Rebuild FTS (see Update Database) |
| Slow queries | Check indexes exist |
| Changes not appearing | Restart datasette |

**More help**: https://docs.datasette.io/
