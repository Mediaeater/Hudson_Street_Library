#!/bin/bash
# Run Datasette catalog tests

set -e

echo "🧪 Hudson Street Library - Datasette Catalog Test Suite"
echo "========================================================"
echo ""

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 not found"
    exit 1
fi

# Check if pytest is available
if ! command -v pytest &> /dev/null; then
    echo "⚠️  pytest not found, installing..."
    pip3 install pytest pytest-asyncio
fi

# Check if database exists
if [ ! -f "hudson_street_library.db" ]; then
    echo "❌ Database not found. Run ./scripts/setup-datasette.sh first"
    exit 1
fi

# Run standalone test suite
echo "📝 Running Standalone Test Suite..."
echo ""
python3 tests/test_datasette_catalog.py
standalone_exit=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run pytest suite
echo "📝 Running Pytest Test Suite..."
echo ""
pytest tests/test_catalog_api.py -v --tb=short
pytest_exit=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $standalone_exit -eq 0 ] && [ $pytest_exit -eq 0 ]; then
    echo "✅ All test suites passed!"
    echo ""
    echo "Standalone Tests: ✓ Passed"
    echo "Pytest Suite:     ✓ Passed"
    exit 0
else
    echo "❌ Some tests failed"
    echo ""
    if [ $standalone_exit -ne 0 ]; then
        echo "Standalone Tests: ✗ Failed (exit code $standalone_exit)"
    else
        echo "Standalone Tests: ✓ Passed"
    fi

    if [ $pytest_exit -ne 0 ]; then
        echo "Pytest Suite:     ✗ Failed (exit code $pytest_exit)"
    else
        echo "Pytest Suite:     ✓ Passed"
    fi
    exit 1
fi
