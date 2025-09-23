# Hudson Street Library Test Suite

This directory contains comprehensive tests for the consolidated modules in the Hudson Street Library project.

## Test Files

### Core Test Files

- **test-image-core.js** - Tests for image utilities (`scripts/utils/image-core.js`)
  - Filename generation and sanitization
  - Image validation with size and format checks
  - Duplicate detection algorithms
  - Configuration management

- **test-book-api-client.js** - Tests for book API client (`scripts/utils/book-api-client.js`)
  - API initialization and configuration
  - Rate limiting functionality
  - Retry logic with exponential backoff
  - Caching mechanisms
  - Mock API responses (no actual API calls)

- **test-logger.js** - Tests for logging system (`scripts/utils/logger.js`)
  - Different log levels (debug, info, warn, error)
  - File and console output
  - Statistics tracking
  - Batch operation logging

- **test-csv-handler.js** - Tests for CSV operations (`scripts/utils/csv-handler.js`)
  - Reading and parsing CSV files
  - Writing and appending CSV data
  - Data validation and cleaning
  - Batch update operations
  - Error recovery from corrupted files

- **test-runner.js** - Main test executor
  - Runs all test suites
  - Provides comprehensive reporting
  - Supports multiple output formats

## Running Tests

### Run All Tests
```bash
# Run all tests with default settings
node scripts/tests/test-runner.js

# Run with verbose output
node scripts/tests/test-runner.js --verbose

# Run sequentially (instead of parallel)
node scripts/tests/test-runner.js --sequential

# Stop on first failure
node scripts/tests/test-runner.js --fail-fast
```

### Run Individual Test Suites
```bash
# Run image core tests only
node scripts/tests/test-image-core.js

# Run API client tests only
node scripts/tests/test-book-api-client.js

# Run logger tests only
node scripts/tests/test-logger.js

# Run CSV handler tests only
node scripts/tests/test-csv-handler.js
```

### Generate Reports
```bash
# Generate HTML report
node scripts/tests/test-runner.js --report html

# Generate JSON report (default)
node scripts/tests/test-runner.js --report json

# Generate JUnit XML report
node scripts/tests/test-runner.js --report junit

# Generate all report formats
node scripts/tests/test-runner.js --report all

# Specify output directory
node scripts/tests/test-runner.js --report html --output ./test-reports
```

## Test Framework

The tests use a simple, lightweight testing framework with no external dependencies:

- **Assertions**: `assert()`, `assertEqual()`, `assertGreaterThan()`, `assertContains()`, `assertObjectHasProperty()`
- **Test Organization**: Each test suite uses a `TestRunner` class to organize and execute tests
- **Mocking**: Simple mocking for external dependencies (API calls, file system operations)
- **Cleanup**: Automatic cleanup of temporary files and directories
- **Error Handling**: Comprehensive error catching and reporting

## Test Features

### Image Core Tests
- ✅ Filename generation with various book data combinations
- ✅ Sanitization of invalid characters and special cases
- ✅ Image validation (format, size, dimensions)
- ✅ Duplicate detection by file size
- ✅ Configuration testing
- ✅ File existence checking with fuzzy matching

### Book API Client Tests
- ✅ Client initialization and configuration
- ✅ Rate limiting enforcement
- ✅ Caching functionality (store, retrieve, clear)
- ✅ Retry logic simulation
- ✅ Mock API responses for Google Books and Open Library
- ✅ Error handling and recovery
- ✅ Request counting and statistics

### Logger Tests
- ✅ Log level filtering (debug, info, warn, error)
- ✅ Console and file output formatting
- ✅ Statistics tracking (operations, errors, warnings)
- ✅ Operation timing and tracking
- ✅ Batch processing with progress reporting
- ✅ Metadata handling and preservation

### CSV Handler Tests
- ✅ Reading valid and invalid CSV files
- ✅ Data validation and cleaning
- ✅ Writing CSV files with proper escaping
- ✅ Appending records to existing files
- ✅ Batch update operations
- ✅ Error recovery from corrupted files
- ✅ Schema validation for book data

## Output Formats

### Console Output
- Real-time test execution progress
- Summary statistics and performance metrics
- Color-coded pass/fail indicators
- Detailed error messages in verbose mode

### JSON Report
```json
{
  "startTime": "2023-09-23T10:00:00.000Z",
  "endTime": "2023-09-23T10:00:05.234Z",
  "duration": 5234,
  "totalTests": 42,
  "totalPassed": 40,
  "totalFailed": 2,
  "suiteResults": [...],
  "summary": {...},
  "environment": {...}
}
```

### HTML Report
- Interactive web-based report
- Visual charts and graphs
- Detailed suite breakdowns
- Environment information
- Professional styling

### JUnit XML
- Compatible with CI/CD systems
- Jenkins, GitHub Actions, etc.
- Standard XML format for test results

## Integration with CI/CD

The test suite is designed to integrate with continuous integration systems:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: node scripts/tests/test-runner.js --report junit --output ./test-results

- name: Publish Test Results
  uses: dorny/test-reporter@v1
  if: always()
  with:
    name: Test Results
    path: './test-results/junit.xml'
    reporter: java-junit
```

## Performance Considerations

- **Parallel Execution**: Tests run in parallel by default for faster completion
- **Memory Management**: Automatic cleanup of temporary files and resources
- **Mock Operations**: No actual API calls or heavy I/O operations during testing
- **Performance Metrics**: Duration tracking for each test suite and individual operations

## Error Handling

- **Graceful Degradation**: Tests continue even if individual tests fail
- **Detailed Reporting**: Clear error messages with context
- **Cleanup**: Automatic cleanup even when tests fail
- **Recovery**: CSV corruption recovery testing
- **Isolation**: Tests don't interfere with each other

## Best Practices

- **No External Dependencies**: Tests use only Node.js built-in modules
- **Deterministic**: Tests produce consistent results
- **Fast Execution**: Average runtime under 10 seconds
- **Comprehensive Coverage**: Tests cover happy path, edge cases, and error conditions
- **Clear Naming**: Test names clearly describe what is being tested
- **Isolated**: Each test is independent and doesn't rely on external state