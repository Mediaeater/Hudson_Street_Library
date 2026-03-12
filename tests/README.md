# Datasette Catalog Test Suite

Comprehensive tests for the Hudson Street Library Datasette catalog.

## Test Files

### 1. `test_book_datasette_integration.sh` (Integration Test)

**Purpose**: Verify book workflow → Datasette catalog integration
**Framework**: Bash script with automated checks
**Tests**: 4 integration tests

**Test Coverage**:
- ✅ --no-rebuild flag availability
- ✅ Update script executable
- ✅ Integration code present
- ✅ Manual rebuild functionality

**Run**:
```bash
./tests/test_book_datasette_integration.sh
```

### 2. `test_catalog_api.py` (Pytest)

**Based on**: Datasette project test patterns
**Framework**: pytest with fixtures
**Tests**: 21 tests across 6 test classes

**Test Coverage**:
- ✅ Database structure and schema
- ✅ Full-text search (FTS5) functionality
- ✅ Performance indexes
- ✅ Metadata configuration
- ✅ Data integrity
- ✅ Query performance

**Run**:
```bash
pytest tests/test_catalog_api.py -v
```

### 3. `test_datasette_catalog.py` (Standalone)

**Framework**: Standalone Python script with colored output
**Tests**: 17 tests with visual progress

**Test Coverage**:
- ✅ File and installation checks
- ✅ Database structure
- ✅ FTS configuration
- ✅ Index existence
- ✅ Metadata validation
- ✅ Data quality checks

**Run**:
```bash
python3 tests/test_datasette_catalog.py
```

## Running All Tests

### Quick Test
```bash
./tests/run-datasette-tests.sh
```

### Pytest with Coverage
```bash
pytest tests/ -v --cov=. --cov-report=term-missing
```

### Individual Test Classes
```bash
# Test database structure only
pytest tests/test_catalog_api.py::TestDatabaseStructure -v

# Test FTS only
pytest tests/test_catalog_api.py::TestFullTextSearch -v

# Test metadata configuration
pytest tests/test_catalog_api.py::TestMetadataConfiguration -v
```

## Test Results

**Current Status**: ✅ All tests passing

```
Integration Test: 4 passed
Pytest Tests:     19 passed, 2 skipped
Standalone Tests: 17 passed, 0 failed
Total:            40 tests
Coverage:         Integration, Database, FTS, Indexes, Config, Data Quality
```

**Skipped Tests** (data quality warnings):
- 30 books missing titles (expected for magazines/periodicals)
- 835 books with year=0 (indicates unknown publication year)

## Test Details

### Database Structure Tests

Verifies:
- Database file exists
- Books table exists and has records
- All required columns present (id, title, author, etc.)
- Column types are correct (INTEGER, TEXT, FLOAT)

### Full-Text Search Tests

Verifies:
- FTS5 table created (books_fts)
- All 5 columns indexed: title, author_full_name, classification, tags, notes
- Search queries work correctly
- FTS triggers enabled for auto-updates

### Performance Index Tests

Verifies:
- Author index exists (idx_books_author_last)
- Category index exists (idx_books_collection_grouping)
- Queries use indexes (via EXPLAIN QUERY PLAN)

### Metadata Configuration Tests

Verifies:
- metadata.json exists and is valid JSON
- Custom title configured
- All 4 facets configured (author, category, format, year)
- URL columns configured for rendering

### Data Integrity Tests

Checks:
- All books have valid IDs
- Books have titles (warning if missing)
- Publication years in valid range (warning if invalid)

### Query Performance Tests

Verifies:
- Author queries use idx_books_author_last
- Category queries use idx_books_collection_grouping
- EXPLAIN QUERY PLAN shows index usage

## Adding New Tests

### Pytest Pattern

```python
class TestNewFeature:
    """Test description"""

    def test_something(self, db_connection):
        """Test case description"""
        cursor = db_connection.cursor()
        result = cursor.execute("SELECT ...").fetchall()
        assert result is not None
```

### Standalone Pattern

```python
def test_new_feature(self):
    """Test: Description"""
    result = self.run_query("SELECT ...")
    if result:
        print_success("Test passed")
        self.tests_passed += 1
        return True
    else:
        print_error("Test failed")
        self.tests_failed += 1
        return False
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Test Datasette Catalog

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install datasette sqlite-utils pytest pytest-asyncio
      - run: ./scripts/setup-datasette.sh
      - run: pytest tests/test_catalog_api.py -v
```

## Troubleshooting

**Tests fail with "Database not found"**:
```bash
# Run setup first
./scripts/setup-datasette.sh
```

**Import errors**:
```bash
# Install test dependencies
pip3 install pytest pytest-asyncio
```

**FTS tests fail**:
```bash
# Rebuild FTS
./scripts/update-datasette-catalog.sh
```

## Test Maintenance

**After CSV Updates**:
```bash
# Update database
./scripts/update-datasette-catalog.sh

# Re-run tests
pytest tests/test_catalog_api.py -v
```

**After Schema Changes**:
1. Update test expectations in test files
2. Run full test suite
3. Update test documentation if needed

**After Metadata Changes**:
```bash
# Validate JSON
python -m json.tool metadata.json

# Run config tests
pytest tests/test_catalog_api.py::TestMetadataConfiguration -v
```

## Coverage Report

Run with coverage:
```bash
pytest tests/ --cov=. --cov-report=html
open htmlcov/index.html
```

## Performance Benchmarks

**Test Execution Time**:
- Pytest suite: ~0.12s (21 tests)
- Standalone suite: ~0.5s (17 tests)
- Total: <1 second

**Database Queries**:
- FTS search: <10ms
- Indexed queries: <5ms
- Full table scan: ~50ms

---

**Test Framework Versions**:
- Python: 3.11.8
- pytest: 9.0.2
- pytest-asyncio: 1.3.0
- Datasette: 0.65.2
- sqlite-utils: 3.39

**Last Updated**: 2026-03-08
