# Testing Guide

## Overview

The Hudson Street Library project uses a lightweight, dependency-free testing framework for all test suites. This guide covers how to run tests, write new tests, and maintain test quality.

## Quick Start

```bash
# Run all tests with comprehensive reporting
node scripts/tests/test-runner.js

# Run with verbose output for debugging
node scripts/tests/test-runner.js --verbose

# Generate HTML report
node scripts/tests/test-runner.js --report html --output ./test-reports

# Run individual test suite
node scripts/tests/test-image-core.js
```

## Table of Contents

1. [Testing Framework Overview](#testing-framework-overview)
2. [Running Tests](#running-tests)
3. [Test Structure](#test-structure)
4. [Writing New Tests](#writing-new-tests)
5. [Testing Patterns](#testing-patterns)
6. [Mocking and Fixtures](#mocking-and-fixtures)
7. [Coverage Requirements](#coverage-requirements)
8. [Continuous Integration](#continuous-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting Tests](#troubleshooting-tests)

---

## Testing Framework Overview

### Design Philosophy

The Hudson Street Library testing framework is:

- **Zero Dependencies**: Uses only Node.js built-in modules
- **Fast**: Average test suite runs in under 10 seconds
- **Deterministic**: Tests produce consistent, reliable results
- **Isolated**: Each test runs independently without shared state
- **Simple**: Easy to understand and extend without learning complex frameworks

### Available Test Suites

| Test Suite | Purpose | File | Category |
|------------|---------|------|----------|
| **Image Core** | Image utilities and validation | `test-image-core.js` | Core |
| **Book API Client** | API client with mocking | `test-book-api-client.js` | API |
| **Logger System** | Logging and statistics | `test-logger.js` | Core |
| **CSV Handler** | Data parsing and validation | `test-csv-handler.js` | Data |

### Test Runner Architecture

```
test-runner.js (Main orchestrator)
├── Parallel/Sequential execution
├── Report generation (JSON, HTML, JUnit)
├── Performance tracking
└── Suite coordination
    ├── test-image-core.js
    ├── test-book-api-client.js
    ├── test-logger.js
    └── test-csv-handler.js
```

---

## Running Tests

### Basic Execution

```bash
# Run all test suites (parallel by default)
node scripts/tests/test-runner.js

# Run sequentially (useful for debugging)
node scripts/tests/test-runner.js --sequential

# Enable verbose output
node scripts/tests/test-runner.js --verbose

# Stop on first failure
node scripts/tests/test-runner.js --fail-fast
```

### Individual Test Suites

```bash
# Image core utilities
node scripts/tests/test-image-core.js

# Book API client
node scripts/tests/test-book-api-client.js

# Logger system
node scripts/tests/test-logger.js

# CSV handler
node scripts/tests/test-csv-handler.js
```

### Report Generation

The test runner can generate reports in multiple formats:

#### JSON Report (Default)
```bash
node scripts/tests/test-runner.js --report json

# Output: scripts/test-output/test-results.json
```

**JSON Structure:**
```json
{
  "startTime": "2025-10-19T10:00:00.000Z",
  "endTime": "2025-10-19T10:00:05.234Z",
  "duration": 5234,
  "totalTests": 42,
  "totalPassed": 40,
  "totalFailed": 2,
  "suiteResults": [...],
  "summary": {
    "overall": "PASS",
    "successRate": 95.2,
    "totalSuites": 4,
    "passedSuites": 3,
    "failedSuites": 1
  },
  "environment": {...}
}
```

#### HTML Report
```bash
node scripts/tests/test-runner.js --report html

# Output: scripts/test-output/test-results.html
# Open in browser for interactive view
```

**Features:**
- Visual summary with color-coded metrics
- Suite breakdown with timestamps
- Environment information
- Performance metrics
- Professional styling

#### JUnit XML Report
```bash
node scripts/tests/test-runner.js --report junit

# Output: scripts/test-output/junit.xml
# Compatible with CI/CD systems (Jenkins, GitHub Actions, etc.)
```

#### All Reports
```bash
node scripts/tests/test-runner.js --report all

# Generates JSON, HTML, and JUnit XML reports
```

### Custom Output Directory

```bash
node scripts/tests/test-runner.js --report html --output ./custom-reports
```

### Command Line Options Reference

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--verbose` | `-v` | Enable detailed output | `false` |
| `--sequential` | - | Run tests sequentially | Parallel |
| `--fail-fast` | - | Stop on first failure | Continue |
| `--report <format>` | - | Report format (console/json/html/junit/all) | `console` |
| `--output <dir>` | `-o` | Output directory for reports | `scripts/test-output` |
| `--help` | `-h` | Show help message | - |

---

## Test Structure

### TestRunner Class

Every test suite uses the `TestRunner` class for organization:

```javascript
const { TestRunner } = require('./test-framework'); // Conceptual

class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        // Execute all tests
        // Track passed/failed
        // Return results
    }
}
```

### Assertion Functions

All test suites use these standard assertion helpers:

```javascript
// Basic assertion
assert(condition, message);
assert(x > 5, 'x should be greater than 5');

// Equality assertion
assertEqual(actual, expected, message);
assertEqual(result, 'expected-value', 'Values should match');

// Greater than assertion
assertGreaterThan(actual, threshold, message);
assertGreaterThan(count, 0, 'Count should be positive');

// Contains assertion (arrays)
assertContains(array, item, message);
assertContains(['a', 'b', 'c'], 'b', 'Array should contain b');

// Object property assertion
assertObjectHasProperty(obj, property, message);
assertObjectHasProperty(config, 'timeout', 'Config should have timeout');
```

### Test Lifecycle

```javascript
async function runMyTests() {
    const runner = new TestRunner('My Test Suite');

    // 1. Setup: Define tests
    runner.test('test name', async () => {
        // 2. Arrange: Setup test data
        const input = createTestData();

        // 3. Act: Execute the code being tested
        const result = await functionUnderTest(input);

        // 4. Assert: Verify results
        assertEqual(result.status, 'success');
    });

    // 5. Execute: Run all tests
    const results = await runner.run();

    // 6. Cleanup: Automatic cleanup of temp files
    // (handled by TestRunner)

    return results;
}
```

---

## Writing New Tests

### Step-by-Step Guide

#### 1. Create Test File

```bash
# Create new test file
touch scripts/tests/test-my-feature.js
```

#### 2. Setup Test Structure

```javascript
/**
 * Test Suite for My Feature
 * Tests functionality in scripts/my-feature.js
 */

// Simple test framework
class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.tempFiles = [];
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        console.log(`\n🧪 Running ${this.suiteName} Tests`);
        console.log('='.repeat(50));

        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                this.passed++;
                console.log(`✅ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ ${name}: ${error.message}`);
                if (process.env.VERBOSE) {
                    console.log(`   Stack: ${error.stack}`);
                }
            }
        }

        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        return { passed: this.passed, failed: this.failed };
    }

    cleanup() {
        // Cleanup logic
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}
```

#### 3. Write Test Cases

```javascript
async function runMyFeatureTests() {
    const runner = new TestRunner('My Feature');

    // Test happy path
    runner.test('basic functionality works', async () => {
        const result = await myFeature.doSomething();
        assertEqual(result.status, 'success');
    });

    // Test edge cases
    runner.test('handles empty input', async () => {
        const result = await myFeature.doSomething('');
        assert(result.handled, 'Should handle empty input');
    });

    // Test error conditions
    runner.test('throws on invalid input', async () => {
        try {
            await myFeature.doSomething(null);
            assert(false, 'Should have thrown error');
        } catch (error) {
            assert(error.message.includes('Invalid'), 'Should throw validation error');
        }
    });

    return await runner.run();
}

// Export for test runner
module.exports = { runMyFeatureTests };

// Allow direct execution
if (require.main === module) {
    runMyFeatureTests()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}
```

#### 4. Register with Test Runner

Edit `scripts/tests/test-runner.js`:

```javascript
const { runMyFeatureTests } = require('./test-my-feature');

// Add to suites array
this.suites = [
    { name: 'Image Core Utilities', runner: runImageCoreTests, category: 'core' },
    { name: 'Book API Client', runner: runBookAPIClientTests, category: 'api' },
    { name: 'Logger System', runner: runLoggerTests, category: 'core' },
    { name: 'CSV Handler', runner: runCSVHandlerTests, category: 'data' },
    { name: 'My Feature', runner: runMyFeatureTests, category: 'feature' } // NEW
];
```

---

## Testing Patterns

### Testing Synchronous Functions

```javascript
runner.test('synchronous function test', () => {
    const input = { x: 5, y: 10 };
    const result = calculateSum(input);
    assertEqual(result, 15);
});
```

### Testing Asynchronous Functions

```javascript
runner.test('async function test', async () => {
    const data = await fetchData();
    assert(data.length > 0, 'Should return data');
});
```

### Testing File Operations

```javascript
runner.test('file operation test', async () => {
    // Create temp file
    const tempFile = runner.createTempFile('test.txt', 'content');

    // Test operation
    const result = await processFile(tempFile);

    // Verify result
    assert(result.success, 'Should process file');

    // Cleanup happens automatically
});
```

### Testing Error Handling

```javascript
runner.test('error handling test', async () => {
    try {
        await riskyOperation();
        assert(false, 'Should have thrown error');
    } catch (error) {
        assert(error instanceof ValidationError, 'Should throw ValidationError');
        assert(error.message.includes('invalid'), 'Should have descriptive message');
    }
});
```

### Testing with Multiple Assertions

```javascript
runner.test('complex test with multiple assertions', async () => {
    const result = await complexOperation();

    // Verify multiple aspects
    assertObjectHasProperty(result, 'status');
    assertEqual(result.status, 'success');
    assertObjectHasProperty(result, 'data');
    assert(Array.isArray(result.data), 'Data should be array');
    assertGreaterThan(result.data.length, 0, 'Should have data items');
});
```

### Testing with Temporary Files

```javascript
runner.test('temp file test', () => {
    // Create temp file with specific content
    const tempFile = runner.createTempFile('data.json', JSON.stringify({ test: true }));

    // Test with file
    const data = loadData(tempFile);
    assertEqual(data.test, true);

    // File automatically cleaned up after test
});
```

### Testing with Temporary Directories

```javascript
runner.test('temp directory test', async () => {
    // Create temp directory
    const tempDir = runner.createTempDir();

    // Create files in directory
    fs.writeFileSync(path.join(tempDir, 'file1.txt'), 'content1');
    fs.writeFileSync(path.join(tempDir, 'file2.txt'), 'content2');

    // Test directory operations
    const files = await scanDirectory(tempDir);
    assertEqual(files.length, 2);

    // Directory automatically cleaned up
});
```

---

## Mocking and Fixtures

### Mocking External APIs

Example from `test-book-api-client.js`:

```javascript
// Mock HTTPS requests
runner.mockHttpsRequest({
    items: [{
        volumeInfo: {
            title: 'Test Book',
            authors: ['Test Author']
        }
    }]
}, 200);

// Test with mocked API
const result = await apiClient.searchGoogleBooks('test query');
assertEqual(result.items.length, 1);
```

### Mocking Console Output

Example from `test-logger.js`:

```javascript
runner.test('console capture test', () => {
    // Start capturing
    runner.captureConsole();

    // Execute code that logs
    logger.info('Test message');
    logger.error('Test error');

    // Get captured logs
    const logs = runner.getCapturedLogs();
    assertEqual(logs.length, 2);
    assertEqual(logs[0].level, 'info');

    // Restore console
    runner.restoreConsole();
});
```

### Creating Test Fixtures

```javascript
// Fixture for book data
const bookFixture = {
    author_last: 'Tolkien',
    title: 'The Hobbit',
    isbn_asin: '9780547928227',
    publisher: 'Houghton Mifflin',
    year: '2012'
};

runner.test('test with fixture', () => {
    const result = processBook(bookFixture);
    assert(result.success);
});
```

### Creating Minimal Valid Files

Example from `test-image-core.js`:

```javascript
createTempImageFile(filename, size = 5000) {
    // Create minimal valid JPEG structure
    const jpegHeader = Buffer.from([
        0xFF, 0xD8, 0xFF, 0xE0, // SOI + APP0
        0x00, 0x10, // Length
        0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
        // ... minimal JPEG structure
        0xFF, 0xD9 // EOI
    ]);

    // Pad to desired size
    const padding = Buffer.alloc(Math.max(0, size - jpegHeader.length), 0);
    const content = Buffer.concat([jpegHeader, padding]);

    return this.writeTempFile(filename, content);
}
```

### Mocking Time-Dependent Functions

```javascript
runner.test('time-dependent test', async () => {
    const originalNow = Date.now;

    // Mock Date.now
    Date.now = () => 1000000000000;

    try {
        const result = await timeBasedFunction();
        assertEqual(result.timestamp, 1000000000000);
    } finally {
        // Restore original
        Date.now = originalNow;
    }
});
```

---

## Coverage Requirements

### Target Coverage

- **Overall Coverage**: 80% minimum
- **Core Modules**: 90% minimum
- **API Clients**: 70% minimum (due to external dependencies)
- **Utilities**: 85% minimum

### Coverage Areas

#### Must Test
- ✅ All public functions and methods
- ✅ Error handling paths
- ✅ Edge cases (empty input, null, undefined)
- ✅ Validation logic
- ✅ Data transformation functions

#### Should Test
- ✅ Configuration handling
- ✅ File I/O operations
- ✅ Data parsing and serialization
- ✅ Performance-critical paths

#### Optional to Test
- Console logging statements (unless critical)
- Simple getters/setters
- Pure delegation functions

### Coverage by Test Suite

Current coverage (as of October 2025):

| Test Suite | Coverage | Tests | Status |
|------------|----------|-------|--------|
| Image Core | ~85% | 15 tests | ✅ Good |
| Book API Client | ~75% | 12 tests | ✅ Good |
| Logger | ~90% | 10 tests | ✅ Excellent |
| CSV Handler | ~80% | 13 tests | ✅ Good |

### Measuring Coverage

While we don't use automated coverage tools, you can assess coverage by:

1. **Code Review**: Review source files and test files side-by-side
2. **Function Counting**: Count tested vs. untested functions
3. **Path Analysis**: Identify code paths (if/else, try/catch) and verify tests cover them
4. **Edge Case Checklist**: Verify each function has tests for common edge cases

---

## Continuous Integration

### GitHub Actions Integration

The test suite is designed to integrate with CI/CD pipelines. Example GitHub Actions workflow:

```yaml
name: Run Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm ci

    - name: Run tests
      run: node scripts/tests/test-runner.js --report junit --output ./test-results

    - name: Publish test results
      uses: dorny/test-reporter@v1
      if: always()
      with:
        name: Test Results
        path: './test-results/junit.xml'
        reporter: java-junit

    - name: Upload test reports
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: test-reports
        path: ./test-results/
```

### Exit Codes

The test runner uses standard exit codes:

- **0**: All tests passed
- **1**: One or more tests failed or test runner crashed

This allows CI/CD systems to properly detect test failures.

### Running Tests in CI

```bash
# CI-friendly command
node scripts/tests/test-runner.js --report junit --output ./test-results

# With fail-fast for quick feedback
node scripts/tests/test-runner.js --fail-fast --report junit

# Sequential for debugging flaky tests
node scripts/tests/test-runner.js --sequential --verbose
```

### Performance in CI

- **Typical Duration**: 5-10 seconds for all suites
- **Parallel Execution**: Enabled by default for speed
- **Resource Usage**: Minimal (< 100MB RAM, negligible CPU)
- **No External Dependencies**: Tests run completely offline

---

## Best Practices

### Test Naming

```javascript
// ✅ Good: Descriptive, specific
runner.test('generateFilename - handles special characters in title', () => {});
runner.test('validateImage - rejects files smaller than 1KB', () => {});

// ❌ Bad: Vague, unclear
runner.test('test1', () => {});
runner.test('it works', () => {});
```

### Test Organization

```javascript
// ✅ Good: Grouped by feature/function
// Test generateStandardFilename
runner.test('generateStandardFilename - basic functionality', () => {});
runner.test('generateStandardFilename - with sanitization', () => {});
runner.test('generateStandardFilename - with fallbacks', () => {});

// Test sanitizeFilename
runner.test('sanitizeFilename - removes invalid characters', () => {});
runner.test('sanitizeFilename - handles spaces', () => {});
```

### Assertion Messages

```javascript
// ✅ Good: Clear, informative messages
assertEqual(result.status, 'success', 'API call should succeed');
assert(files.length > 0, 'Should find at least one file');

// ❌ Bad: No message or generic message
assertEqual(result.status, 'success');
assert(files.length > 0, 'Assertion failed');
```

### Test Independence

```javascript
// ✅ Good: Each test is independent
runner.test('test A', () => {
    const data = createFreshData();
    const result = processData(data);
    assertEqual(result, expected);
});

runner.test('test B', () => {
    const data = createFreshData(); // Fresh data, not reused
    const result = processData(data);
    assertEqual(result, expected);
});

// ❌ Bad: Tests share state
let sharedData = createData(); // Don't do this!

runner.test('test A', () => {
    processData(sharedData); // Modifies shared state
});

runner.test('test B', () => {
    processData(sharedData); // Depends on test A's changes
});
```

### Error Testing

```javascript
// ✅ Good: Specific error checking
runner.test('validation error test', async () => {
    try {
        await validateInput(null);
        assert(false, 'Should have thrown error');
    } catch (error) {
        assert(error instanceof ValidationError, 'Should throw ValidationError');
        assert(error.message.includes('required'), 'Should mention required field');
    }
});

// ❌ Bad: Generic error checking
runner.test('error test', async () => {
    try {
        await validateInput(null);
        assert(false);
    } catch (error) {
        // Any error passes - too loose
    }
});
```

### Cleanup

```javascript
// ✅ Good: Automatic cleanup via TestRunner
runner.test('file test', () => {
    const tempFile = runner.createTempFile('test.txt', 'content');
    // Use tempFile
    // Cleanup automatic
});

// ✅ Good: Manual cleanup in finally block
runner.test('manual cleanup test', async () => {
    const resource = await acquireResource();
    try {
        // Use resource
    } finally {
        await releaseResource(resource);
    }
});
```

### Test Performance

```javascript
// ✅ Good: Fast, focused tests
runner.test('quick validation test', () => {
    const result = validateQuickly(input);
    assert(result.valid);
});

// ❌ Bad: Slow tests with unnecessary delays
runner.test('slow test', async () => {
    await sleep(5000); // Don't add arbitrary delays
    const result = await fetchData();
    assert(result);
});
```

### Mock Usage

```javascript
// ✅ Good: Mock external dependencies
runner.test('API test with mock', async () => {
    runner.mockHttpsRequest({ data: 'test' });
    const result = await apiCall();
    assertEqual(result.data, 'test');
});

// ❌ Bad: Testing actual external APIs
runner.test('real API test', async () => {
    const result = await fetch('https://real-api.com/data'); // Don't do this
    // Tests should be offline and fast
});
```

---

## Troubleshooting Tests

### Common Test Failures

#### "Assertion failed"

**Cause**: Expected value doesn't match actual value

**Solution**:
```bash
# Run with verbose output to see details
node scripts/tests/test-runner.js --verbose

# Run individual test suite
node scripts/tests/test-image-core.js

# Check assertion message for details
```

#### "File does not exist"

**Cause**: Test looking for missing file or incorrect path

**Solution**:
- Verify file paths are absolute, not relative
- Check temp file creation logic
- Ensure cleanup isn't running too early

#### "Cannot read property of undefined"

**Cause**: Missing or null data in test

**Solution**:
- Add null/undefined checks in test
- Verify mock data structure matches expected format
- Check async operations completed before assertions

### Debugging Test Failures

```bash
# Step 1: Run with verbose output
VERBOSE=1 node scripts/tests/test-image-core.js

# Step 2: Run individual failing test
# Edit test file to comment out passing tests, run again

# Step 3: Add debug logging
runner.test('failing test', () => {
    console.log('Input:', input);
    const result = functionUnderTest(input);
    console.log('Result:', result);
    assertEqual(result, expected);
});

# Step 4: Run sequentially to avoid parallel issues
node scripts/tests/test-runner.js --sequential
```

### Flaky Tests

**Symptoms**: Tests pass sometimes, fail other times

**Common Causes**:
1. **Timing Issues**: Async operations not properly awaited
2. **Shared State**: Tests affecting each other
3. **File System Race Conditions**: File not ready when accessed
4. **Randomness**: Tests using random data without seeds

**Solutions**:

```javascript
// Fix timing issues - always await async operations
runner.test('async test', async () => {
    const result = await asyncOperation(); // Don't forget await!
    assertEqual(result.status, 'done');
});

// Fix shared state - create fresh data for each test
runner.test('independent test', () => {
    const data = createFreshTestData(); // Don't reuse
    // ...
});

// Fix file system races - ensure operations complete
runner.test('file test', async () => {
    const file = runner.createTempFile('test.txt', 'content');
    await fs.promises.access(file); // Verify file exists
    const content = await fs.promises.readFile(file, 'utf8');
    // ...
});

// Fix randomness - use seeded random or fixed data
runner.test('deterministic test', () => {
    const data = { id: 123, name: 'Test' }; // Fixed data
    // Don't use Math.random() without seed
});
```

### Performance Issues

**Symptoms**: Tests take too long to run

**Solutions**:

```bash
# Check which suite is slow
node scripts/tests/test-runner.js
# Look at duration for each suite

# Run with performance metrics
node scripts/tests/test-runner.js --report html
# Open HTML report to see detailed timing
```

**Common Slow Test Causes**:
- Actual network requests (should be mocked)
- Large file operations (use minimal test files)
- Unnecessary delays (remove sleeps/timeouts)
- Too many iterations (reduce test data size)

### Test Suite Won't Run

**Symptoms**: Test runner crashes or hangs

**Diagnostics**:

```bash
# Check Node.js version
node --version  # Should be v18 or higher

# Check for syntax errors
node --check scripts/tests/test-runner.js

# Run individual suite to isolate issue
node scripts/tests/test-image-core.js

# Check for missing dependencies
npm ci
```

### Mock Not Working

**Symptoms**: Mock data not being used, real operations happening

**Solution**:

```javascript
// Ensure mock is set up BEFORE test execution
runner.test('mocked test', async () => {
    // Setup mock
    runner.mockHttpsRequest({ data: 'test' });

    // Now call code that uses mocked request
    const result = await apiFunction();

    // Verify mock was used
    assertEqual(result.data, 'test');

    // Mock automatically restored after test
});
```

### Cleanup Failures

**Symptoms**: Warnings about files that couldn't be cleaned up

**Causes**:
- Files still open when cleanup runs
- Permission issues
- Files already deleted

**Solution**: Usually harmless warnings, but if persistent:

```javascript
// Ensure files are closed before cleanup
runner.test('proper file handling', async () => {
    const tempFile = runner.createTempFile('test.txt', 'content');

    // Open, use, and CLOSE file
    const fd = await fs.promises.open(tempFile, 'r');
    try {
        const content = await fd.readFile('utf8');
        // Use content
    } finally {
        await fd.close(); // Important!
    }

    // Now cleanup can succeed
});
```

---

## Appendix

### Complete Test Command Reference

```bash
# Basic test running
node scripts/tests/test-runner.js                                    # All tests, parallel
node scripts/tests/test-runner.js --verbose                          # With details
node scripts/tests/test-runner.js --sequential                       # One at a time
node scripts/tests/test-runner.js --fail-fast                        # Stop on failure

# Report generation
node scripts/tests/test-runner.js --report json                      # JSON output
node scripts/tests/test-runner.js --report html                      # HTML report
node scripts/tests/test-runner.js --report junit                     # JUnit XML
node scripts/tests/test-runner.js --report all                       # All formats

# Custom output
node scripts/tests/test-runner.js --output ./reports                 # Custom directory
node scripts/tests/test-runner.js --report html -o ./reports         # Short form

# Individual suites
node scripts/tests/test-image-core.js                               # Image tests only
node scripts/tests/test-book-api-client.js                          # API tests only
node scripts/tests/test-logger.js                                   # Logger tests only
node scripts/tests/test-csv-handler.js                              # CSV tests only

# Environment variables
VERBOSE=1 node scripts/tests/test-runner.js                         # Verbose mode
NODE_ENV=test node scripts/tests/test-runner.js                     # Test environment
```

### Assertion Function Reference

```javascript
// Basic assertions
assert(condition, message)
// Examples:
assert(x > 0, 'x must be positive')
assert(result.success, 'Operation should succeed')

// Equality
assertEqual(actual, expected, message)
// Examples:
assertEqual(status, 'active', 'Status should be active')
assertEqual(count, 5, 'Should have 5 items')

// Comparison
assertGreaterThan(actual, threshold, message)
// Examples:
assertGreaterThan(age, 18, 'Age must be over 18')
assertGreaterThan(score, 0, 'Score must be positive')

// Array containment
assertContains(array, item, message)
// Examples:
assertContains(['a', 'b', 'c'], 'b', 'Should contain b')
assertContains(tags, 'featured', 'Should have featured tag')

// Object properties
assertObjectHasProperty(object, propertyName, message)
// Examples:
assertObjectHasProperty(config, 'timeout', 'Config needs timeout')
assertObjectHasProperty(result, 'data', 'Result should have data')
```

### Test Suite Template

Use this template to create new test suites:

```javascript
/**
 * Test Suite for [Feature Name]
 * Tests functionality in scripts/[feature-file].js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import module to test
const { functionToTest } = require('../path/to/module');

// Test framework
class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.tempFiles = [];
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        console.log(`\n🧪 Running ${this.suiteName} Tests`);
        console.log('='.repeat(50));

        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                this.passed++;
                console.log(`✅ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ ${name}: ${error.message}`);
                if (process.env.VERBOSE) {
                    console.log(`   Stack: ${error.stack}`);
                }
            }
        }

        this.cleanup();
        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        return { passed: this.passed, failed: this.failed };
    }

    cleanup() {
        // Cleanup temp files
        for (const file of this.tempFiles) {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (error) {
                console.warn(`Warning: Could not cleanup ${file}`);
            }
        }
        this.tempFiles = [];
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

// Test suite
async function runFeatureTests() {
    const runner = new TestRunner('Feature Name');

    // Add tests here
    runner.test('basic functionality', () => {
        const result = functionToTest();
        assert(result, 'Should return truthy value');
    });

    return await runner.run();
}

// Export for test runner
module.exports = { runFeatureTests };

// Allow direct execution
if (require.main === module) {
    runFeatureTests()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}
```

---

## Resources

- [Test Runner Source](../scripts/tests/test-runner.js)
- [Test Examples](../scripts/tests/)
- [GitHub Actions Integration](../docs/GITHUB-ACTIONS-PIPELINE.md)
- [Troubleshooting Guide](../docs/TROUBLESHOOTING.md)

---

**Last Updated**: October 2025
**Maintainers**: Hudson Street Library Development Team
