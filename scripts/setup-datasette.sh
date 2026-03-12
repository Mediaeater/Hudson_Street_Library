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
if [ ! -f src/_data/books.csv ]; then
    echo "❌ Error: src/_data/books.csv not found"
    echo "   Make sure you're running this from the project root"
    exit 1
fi

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

# Verify metadata
if [ ! -f metadata.json ]; then
    echo "⚠️  Warning: metadata.json not found"
    echo "   The catalog will work but without custom configuration"
    echo ""
fi

# Verify
echo "🔬 Verifying setup..."
datasette inspect hudson_street_library.db > /dev/null

echo "✓ Database verified"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup complete!"
echo ""
echo "Database: hudson_street_library.db"
echo "Records:  $BOOK_COUNT books"
echo "Size:     $(du -h hudson_street_library.db | cut -f1)"
echo ""
echo "📖 Documentation:"
echo "   Quick Start: DATASETTE-QUICKSTART.md"
echo "   Full Guide:  docs/DATASETTE-CATALOG-GUIDE.md"
echo ""
echo "🚀 To start the catalog:"
if [ -f metadata.json ]; then
    echo "   datasette hudson_street_library.db --metadata metadata.json"
else
    echo "   datasette hudson_street_library.db"
fi
echo ""
echo "Then visit: http://localhost:8001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
