# Testing Guide

This project uses testing patterns inspired by [datasette-enrichments](https://github.com/datasette/datasette-enrichments).

## Migration Status

Tests are being migrated from the custom TestRunner framework (`scripts/tests/`) to Mocha:
- ✅ **test-image-core** - Migrated (19 tests passing)
- ⏳ **test-logger** - Pending migration
- ⏳ **test-csv-handler** - Pending migration
- ⏳ **test-book-api-client** - Pending migration

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for migration patterns and instructions.

## Key Patterns

### 1. Fixture-Based Setup

Tests use reusable fixtures to set up test data, similar to pytest fixtures.

```javascript
const { createFixtures } = require('./helpers/fixtures');

describe('My Tests', function() {
  let fixtures;

  beforeEach(function() {
    fixtures = createFixtures();
  });

  afterEach(function() {
    fixtures.cleanup();
  });

  it('should work with test database', function() {
    const { db } = fixtures.createTestDatabase();
    // Use database in test
  });
});
```

### 2. Async Waiting Patterns

Use polling and waiting utilities for async operations:

```javascript
const { waitFor, sleep, poll } = require('./helpers/async-utils');

it('should wait for condition', async function() {
  await waitFor(
    () => someCondition(),
    { timeout: 5000, interval: 100 }
  );
});
```

### 3. Parametrized Tests

Test multiple scenarios without duplicating code:

```javascript
const testCases = [
  { input: 'value1', expected: 'result1' },
  { input: 'value2', expected: 'result2' }
];

testCases.forEach(({ input, expected }) => {
  it(`should handle ${input}`, function() {
    assert.strictEqual(doSomething(input), expected);
  });
});
```

### 4. Automatic Cleanup

Fixtures handle cleanup automatically:

```javascript
// Temp files, databases, and directories are cleaned up in afterEach
const tempFile = fixtures.createTempFile('test.txt', 'content');
const { db } = fixtures.createTestDatabase();
const tempDir = fixtures.createTempDir();
// All cleaned up automatically
```

## Test Structure

```
test/
├── README.md               # This file
├── setup.js               # Global test configuration
├── test.js                # Smoke tests (original)
├── helpers/
│   ├── fixtures.js        # Test fixtures and setup utilities
│   └── async-utils.js     # Async testing utilities
├── unit/
│   └── test-parametrized.js  # Unit test examples
└── integration/
    └── test-data-integrity.js # Integration test examples
```

## Running Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Watch mode
npm run test:watch

# Verbose output
npm run test:verbose
```

## Writing New Tests

### Basic Template

```javascript
const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('assert');
const { createFixtures } = require('../helpers/fixtures');

describe('My Feature', function() {
  let fixtures;

  beforeEach(function() {
    fixtures = createFixtures();
  });

  afterEach(function() {
    fixtures.cleanup();
  });

  it('should do something', function() {
    // Your test
  });
});
```

### Async Test Template

```javascript
const { waitFor } = require('../helpers/async-utils');

it('should handle async operation', async function() {
  // Start async work
  startAsyncOperation();

  // Wait for completion
  await waitFor(
    () => isComplete(),
    { timeout: 5000, message: 'Operation did not complete' }
  );

  // Assert results
  assert.ok(result);
});
```

### Parametrized Test Template

```javascript
const scenarios = [
  { name: 'case1', input: 'a', expected: 'A' },
  { name: 'case2', input: 'b', expected: 'B' }
];

scenarios.forEach(({ name, input, expected }) => {
  it(`should handle ${name}`, function() {
    assert.strictEqual(transform(input), expected);
  });
});
```

## Available Fixtures

### Database Fixtures

```javascript
const { db, dbPath } = fixtures.createTestDatabase();
// Creates SQLite database with sample book data
```

### File Fixtures

```javascript
// CSV file
const csvPath = fixtures.createTestCSV('books.csv', rows);

// Generic file
const filePath = fixtures.createTempFile('test.txt', 'content');

// Test image
const imagePath = fixtures.createTestImage('test.jpg', 5000);

// Directory
const dirPath = fixtures.createTempDir();
```

## Async Utilities

### waitFor

Wait for a condition to become true:

```javascript
await waitFor(
  () => fileExists(path),
  { timeout: 5000, interval: 100, message: 'File not found' }
);
```

### poll

Poll until a function returns a value:

```javascript
const result = await poll(
  () => getStatus(),
  { timeout: 5000, interval: 100 }
);
```

### retry

Retry with exponential backoff:

```javascript
const data = await retry(
  () => fetchData(),
  { maxAttempts: 3, initialDelay: 100 }
);
```

### waitForFile

Wait for a file to exist:

```javascript
await waitForFile('/path/to/file', { timeout: 5000 });
```

### waitForFileContent

Wait for file to contain content:

```javascript
await waitForFileContent(
  '/path/to/file',
  /expected pattern/,
  { timeout: 5000 }
);
```

## Best Practices

1. **Use fixtures for setup** - Don't create files/databases manually
2. **Clean up automatically** - Use `beforeEach`/`afterEach` hooks
3. **Test one thing** - Keep tests focused and simple
4. **Use descriptive names** - Test names should explain what's being tested
5. **Parametrize when appropriate** - Avoid duplicating test code
6. **Handle async properly** - Use `async`/`await` and waiting utilities
7. **Isolate tests** - Tests should not depend on each other

## Configuration

Test configuration is in `.mocharc.json`:

```json
{
  "require": ["test/setup.js"],
  "recursive": true,
  "timeout": 5000,
  "exit": true,
  "spec": ["test/**/*.js", "!test/helpers/**"],
  "reporter": "spec"
}
```

## Patterns from datasette-enrichments

This test suite implements these patterns from datasette-enrichments:

- ✅ Fixture-based setup (`conftest.py:18-218`)
- ✅ Automatic cleanup (`conftest.py:215-218`)
- ✅ Parametrized tests (`test_enrichments.py:54-55`)
- ✅ Async polling (`test_enrichments.py:112-124`)
- ✅ Wait utilities (`utils.py:wait_for_job`)
- ✅ Test database setup (`conftest.py:14-50`)
- ✅ Temporary file management
- ✅ Environment configuration (`setup.js`)
