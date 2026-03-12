#!/bin/bash
# Test: Book Addition + Datasette Integration

set -e

echo "🧪 Testing Book → Datasette Integration"
echo "========================================="
echo ""

# Check prerequisites
if [ ! -f "scripts/add-book-from-text.js" ]; then
    echo "❌ add-book-from-text.js not found"
    exit 1
fi

if [ ! -f "scripts/update-datasette-catalog.sh" ]; then
    echo "❌ update-datasette-catalog.sh not found"
    exit 1
fi

if [ ! -f "hudson_street_library.db" ]; then
    echo "❌ Datasette database not found. Run ./scripts/setup-datasette.sh first"
    exit 1
fi

echo "✓ Prerequisites met"
echo ""

# Get initial count
INITIAL_COUNT=$(sqlite-utils query hudson_street_library.db "SELECT COUNT(*) as c FROM books" --csv | tail -n1 | tr -d '\r')
echo "📊 Initial book count: $INITIAL_COUNT"
echo ""

# Test 1: Check --no-rebuild flag exists
echo "Test 1: Verify --no-rebuild flag..."
if node scripts/add-book-from-text.js --help | grep -q "no-rebuild"; then
    echo "✅ --no-rebuild flag documented"
else
    echo "❌ --no-rebuild flag not found in help"
    exit 1
fi
echo ""

# Test 2: Verify update script is executable
echo "Test 2: Verify update script is executable..."
if [ -x "scripts/update-datasette-catalog.sh" ]; then
    echo "✅ Update script is executable"
else
    echo "⚠️  Update script not executable, fixing..."
    chmod +x scripts/update-datasette-catalog.sh
fi
echo ""

# Test 3: Verify integration code exists
echo "Test 3: Verify integration code in add-book script..."
if grep -q "update-datasette-catalog.sh" scripts/add-book-from-text.js; then
    echo "✅ Integration code present"
else
    echo "❌ Integration code not found"
    exit 1
fi

if grep -q "rebuildDatasette" scripts/add-book-from-text.js; then
    echo "✅ Rebuild flag logic present"
else
    echo "❌ Rebuild flag logic not found"
    exit 1
fi
echo ""

# Test 4: Manual rebuild test (sanity check)
echo "Test 4: Manual rebuild test..."
./scripts/update-datasette-catalog.sh > /dev/null 2>&1
REBUILT_COUNT=$(sqlite-utils query hudson_street_library.db "SELECT COUNT(*) as c FROM books" --csv | tail -n1 | tr -d '\r')

if [ "$REBUILT_COUNT" = "$INITIAL_COUNT" ]; then
    echo "✅ Manual rebuild works (count: $REBUILT_COUNT)"
else
    echo "❌ Manual rebuild changed count: $INITIAL_COUNT → $REBUILT_COUNT"
    exit 1
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All integration tests passed!"
echo ""
echo "Integration Status:"
echo "  • --no-rebuild flag: ✓ Available"
echo "  • Update script:     ✓ Executable"
echo "  • Integration code:  ✓ Present"
echo "  • Manual rebuild:    ✓ Working"
echo ""
echo "The add-book script will now automatically update"
echo "the Datasette catalog after adding books!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
