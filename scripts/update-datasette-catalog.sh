#!/bin/bash
set -e

echo "📚 Updating Hudson Street Library Datasette Catalog"
echo ""

# Backup
echo "1. Creating backup..."
if [ -f hudson_street_library.db ]; then
    cp hudson_street_library.db hudson_street_library.backup.$(date +%Y%m%d-%H%M%S).db
    echo "   ✓ Backup created"
else
    echo "   ℹ No existing database to backup"
fi

# Rebuild
echo ""
echo "2. Rebuilding database from CSV..."
if [ -f hudson_street_library.db ]; then
    rm hudson_street_library.db
fi

sqlite-utils insert hudson_street_library.db books \
  src/_data/books.csv \
  --csv \
  --detect-types

BOOK_COUNT=$(sqlite-utils query hudson_street_library.db \
  'SELECT COUNT(*) as c FROM books' --csv | tail -n1)
echo "   ✓ Database created with $BOOK_COUNT books"

# FTS
echo ""
echo "3. Enabling full-text search..."
sqlite-utils enable-fts hudson_street_library.db books \
  title author_full_name classification tags notes \
  --create-triggers

echo "   ✓ FTS enabled on 5 columns"

# Indexes
echo ""
echo "4. Creating performance indexes..."
sqlite-utils create-index hudson_street_library.db books author_last
sqlite-utils create-index hudson_street_library.db books collection_grouping

echo "   ✓ Indexes created"

# Verify
echo ""
echo "5. Verifying database..."
datasette inspect hudson_street_library.db > /dev/null

echo "   ✓ Database verified"

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Catalog updated successfully!"
echo ""
echo "Database: hudson_street_library.db"
echo "Records:  $BOOK_COUNT books"
echo "Size:     $(du -h hudson_street_library.db | cut -f1)"
echo ""
echo "To start the catalog:"
echo "  datasette hudson_street_library.db --metadata metadata.json"
echo ""
echo "Then visit: http://localhost:8001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
