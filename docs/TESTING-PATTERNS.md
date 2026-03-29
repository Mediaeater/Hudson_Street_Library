# Testing Patterns from datasette-enrichments

This document describes how testing patterns from [datasette-enrichments](https://github.com/datasette/datasette-enrichments) have been applied to this project.

## Overview

datasette-enrichments uses pytest with sophisticated patterns for testing async operations, database fixtures, and plugin systems. We've adapted these patterns to work with Mocha while maintaining the same testing philosophy.

## Pattern Mappings

### 1. Fixture-Based Setup (conftest.py → fixtures.js)

**datasette-enrichments:**
```python
@pytest_asyncio.fixture
async def datasette(tmpdir):
    data = str(tmpdir / "data.db")
    db = sqlite3.connect(data)
    # Setup database
    datasette = Datasette([data])
    await datasette.invoke_startup()
    return datasette
```

**Our implementation:**
```javascript
const fixtures = createFixtures();
const { db, dbPath } = fixtures.createTestDatabase();
```

Location: `test/helpers/fixtures.js`

### 2. Async Waiting Patterns (test_enrichments.py:112-124)

**datasette-enrichments:**
```python
tries = 0
ok = False
while tries < 10:
    await asyncio.sleep(0.1)
    tries += 1
    status = datasette._test_db.execute("select status...").fetchone()[0]
    if status == "running":
        ok = True
        break
assert ok, "Enrichment did not start running"
```

**Our implementation:**
```javascript
await waitFor(
  () => getStatus() === 'running',
  { timeout: 1000, interval: 100, message: 'Did not start running' }
);
```

Location: `test/helpers/async-utils.js`

### 3. Parametrized Tests (test_enrichments.py:54-56)

**datasette-enrichments:**
```python
@pytest.mark.parametrize("is_root", [True, False])
@pytest.mark.parametrize("table", ("t", "rowid_table", "foo/bar"))
async def test_uppercase_plugin(datasette, is_root, table):
    # Test code
```

**Our implementation:**
```javascript
const testCases = [
  { is_root: true, table: 't' },
  { is_root: false, table: 'rowid_table' }
];

testCases.forEach(({ is_root, table }) => {
  it(`should handle ${is_root} and ${table}`, function() {
    // Test code
  });
});
```

Location: `test/unit/test-parametrized.js`

### 4. Automatic Cleanup (conftest.py:215-218)

**datasette-enrichments:**
```python
pm.register(EnrichmentsDemoPlugin(), name="undo_EnrichmentsDemoPlugin")
try:
    yield
finally:
    pm.unregister(name="undo_EnrichmentsDemoPlugin")
```

**Our implementation:**
```javascript
afterEach(function() {
  if (fixtures) {
    fixtures.cleanup();
  }
});
```

All temporary files, databases, and directories are automatically cleaned up.

### 5. Test Database Setup (conftest.py:14-50)

**datasette-enrichments:**
```python
db.execute("create table t (id integer primary key, s text)")
db.execute("insert into t (s) values ('hello')")
db.execute("create table rowid_table (s text)")
# Multiple test tables with different characteristics
```

**Our implementation:**
```javascript
const { db } = fixtures.createTestDatabase();
// Creates books table with sample data
// Includes rows with/without ISBNs, collections, etc.
```

Location: `test/helpers/fixtures.js:18-60`

### 6. Environment Configuration (conftest.py vs setup.js)

**datasette-enrichments:**
```python
# conftest.py - automatic pytest discovery
@pytest.fixture(autouse=True)
def load_uppercase_plugin():
    # Plugin setup
```

**Our implementation:**
```javascript
// test/setup.js - runs before all tests
process.env.NODE_ENV = 'test';
global.TEST_ROOT = __dirname;
// Configuration
```

Location: `test/setup.js`

## Test Structure

```
test/
├── setup.js                    # Global config (like conftest.py)
├── helpers/
│   ├── fixtures.js            # Test fixtures (like pytest fixtures)
│   └── async-utils.js         # Waiting patterns (like utils.py)
├── unit/
│   ├── test-parametrized.js   # Parametrized test examples
│   └── test-csv-operations.js # CSV parsing tests
└── integration/
    └── test-data-integrity.js # Integration tests with fixtures
```

## Key Differences

### Python → JavaScript Adaptations

1. **Async handling**: `async/await` works similarly in both
2. **Fixtures**: pytest fixtures → beforeEach/afterEach hooks
3. **Parametrize**: `@pytest.mark.parametrize` → forEach loops
4. **Assertions**: `assert` statements → Mocha's assert library

### What We Kept

- Fixture-based setup/teardown
- Polling patterns for async operations
- Parametrized test approach
- Automatic cleanup
- Test database creation
- Environment configuration

### What We Adapted

- Plugin system (datasette-specific) → Not applicable
- HTTP client testing → Could be added for Eleventy
- Signed cookies/auth → Not applicable to static site

## Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Verbose output
npm run test:verbose
```

## Examples

### Using Fixtures

```javascript
describe('My Tests', function() {
  let fixtures;

  beforeEach(function() {
    fixtures = createFixtures();
  });

  afterEach(function() {
    fixtures.cleanup();
  });

  it('should work', function() {
    const { db } = fixtures.createTestDatabase();
    // Use db in test
  });
});
```

### Async Waiting

```javascript
it('should wait for completion', async function() {
  startAsyncOperation();

  await waitFor(
    () => isComplete(),
    { timeout: 5000, message: 'Operation did not complete' }
  );

  assert.ok(result);
});
```

### Parametrized Tests

```javascript
const scenarios = [
  { input: 'a', expected: 'A' },
  { input: 'b', expected: 'B' }
];

scenarios.forEach(({ input, expected }) => {
  it(`should transform ${input}`, function() {
    assert.strictEqual(transform(input), expected);
  });
});
```

## Reference

- datasette-enrichments tests: https://github.com/datasette/datasette-enrichments/tree/main/tests
- Key patterns source: `conftest.py` and `test_enrichments.py`
- Mocha documentation: https://mochajs.org/

## Benefits

1. **Reliable cleanup** - No test pollution
2. **Easy setup** - Fixtures handle complexity
3. **Readable tests** - Parametrization reduces duplication
4. **Async support** - Proper waiting utilities
5. **Isolation** - Each test gets fresh fixtures
