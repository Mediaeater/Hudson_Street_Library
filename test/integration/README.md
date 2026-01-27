# Integration Tests

Integration tests that use real implementations with actual file I/O operations.

## Tests

### test-csv-handler-integration.js

Comprehensive integration tests for `scripts/utils/csv-handler.js` using the real implementation.

**Coverage:** 57.42% (0% → 57.42%)
**Tests:** 41 tests (33 passing, 8 pending)

#### What's Tested

**✅ Reading CSV Files (5 tests)**
- Valid CSV parsing
- Missing optional fields handling
- Empty file handling
- Validation warnings

**✅ Writing CSV Files (3 tests)**
- Writing valid data
- Backup creation before overwrite
- Directory creation

**✅ Book Operations (3 tests)**
- Reading books from CSV
- Finding books without covers
- Getting books by author (case-insensitive)

**✅ Data Validation (2 tests)**
- Record validation and cleaning
- Data validation for writes

**✅ Stream Processing (1 test)**
- Large file streaming

**✅ File Statistics (1 test)**
- Getting CSV file stats (row count, columns, file size)

**✅ Error Recovery (2 tests)**
- Malformed CSV recovery
- Invalid CSV handling

**✅ Backup Creation (1 test)**
- Timestamped backup files

**✅ Synchronous Operations (1 test)**
- Synchronous book reading

**⏸️ Pending (8 tests)**
- Data validation edge cases
- Book update operations
- Batch updates
- Async stream processing

These pending tests need investigation - the actual API may differ from initial expectations.

#### Key Differences from Unit Tests

**Unit Tests (Mock-based):**
- Use MockCSVHandler class
- No actual file I/O
- Fast execution (~10ms)
- 0% code coverage

**Integration Tests (Real implementation):**
- Use actual CSVHandler class
- Real file I/O with temp directories
- Slightly slower (~50ms)
- 57% code coverage

#### Running

```bash
# Run integration tests only
npm run test:integration

# Run just CSV handler integration tests
npm test -- test/integration/test-csv-handler-integration.js

# Run with coverage
npm run test:coverage -- test/integration/test-csv-handler-integration.js
```

## Coverage Improvements

| File | Before | After | Improvement |
|------|--------|-------|-------------|
| csv-handler.js | 0% | 57.42% | +57.42% |
| Overall | 3.83% | 11.34% | +7.51% |

## Future Integration Tests

Planned integration tests for other critical modules:

### High Priority
- **csv-handler.js** - ✅ Done (57% coverage)
- **image-core.js** - Improve from 63% to 90%+
- **logger.js** - Add file I/O tests
- **book-api-client.js** - Add real HTTP tests (with mocked endpoints)

### Medium Priority
- **image-processor.js** - Image manipulation tests
- **image-cache.js** - Cache operations
- **unified-image-optimizer.js** - End-to-end optimization

## Best Practices

1. **Use Fixtures** - Always use fixtures for file/directory creation
2. **Clean Up** - Fixtures handle cleanup automatically in afterEach
3. **Real Data** - Use realistic test data that matches production
4. **Fast Execution** - Keep tests under 1 second where possible
5. **Isolated** - Each test should be independent
6. **Document Pending** - Leave TODOs for tests that need investigation

## Notes

- Integration tests complement unit tests, not replace them
- Mock-based unit tests are still valuable for fast feedback
- Integration tests catch issues that mocks miss
- Both approaches are needed for comprehensive coverage
