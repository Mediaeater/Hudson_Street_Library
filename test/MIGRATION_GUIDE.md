# Migration Guide: Custom Tests → Mocha

This guide shows how to migrate from the custom TestRunner framework in `scripts/tests/` to the new Mocha-based testing infrastructure.

## Migration Status

- ✅ **test-image-core.js** - Migrated to `test/unit/test-image-core.js` (19 tests, 85 total passing)
- ⏳ **test-logger.js** - Pending migration (701 lines)
- ⏳ **test-csv-handler.js** - Pending migration (831 lines)
- ⏳ **test-book-api-client.js** - Pending migration (487 lines)
- ❌ **test-runner.js** - Will be deprecated (replaced by Mocha)

## Pattern Mappings

### 1. Test Structure

**Before (Custom TestRunner):**
```javascript
const runner = new TestRunner('Suite Name');

runner.test('test name', () => {
  assertEqual(actual, expected);
});

await runner.run();
```

**After (Mocha):**
```javascript
describe('Suite Name', function() {
  it('test name', function() {
    assert.strictEqual(actual, expected);
  });
});
```

### 2. Fixtures and Cleanup

**Before (Custom):**
```javascript
class TestRunner {
  constructor() {
    this.tempFiles = [];
  }

  createTempFile(filename) {
    const path = ...;
    fs.writeFileSync(path, ...);
    this.tempFiles.push(path);
    return path;
  }

  cleanup() {
    for (const file of this.tempFiles) {
      fs.unlinkSync(file);
    }
  }
}
```

**After (Mocha with fixtures):**
```javascript
const { createFixtures } = require('../helpers/fixtures');

describe('Tests', function() {
  let fixtures;

  beforeEach(function() {
    fixtures = createFixtures();
  });

  afterEach(function() {
    fixtures.cleanup();
  });

  it('test', function() {
    const file = fixtures.createTempFile('test.txt', 'content');
    // Automatic cleanup in afterEach
  });
});
```

### 3. Assertions

**Before (Custom):**
```javascript
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected) {
  if (actual !== expected) throw new Error(...);
}

function assertContains(array, item) {
  if (!array.includes(item)) throw new Error(...);
}
```

**After (Node assert):**
```javascript
const assert = require('assert');

assert.ok(condition, message);
assert.strictEqual(actual, expected);
assert.ok(array.includes(item), message);
```

### 4. Async Tests

**Before:**
```javascript
runner.test('async test', async () => {
  const result = await someAsyncFunction();
  assertEqual(result, expected);
});
```

**After:**
```javascript
it('async test', async function() {
  const result = await someAsyncFunction();
  assert.strictEqual(result, expected);
});
```

### 5. Parametrized Tests

**Before:**
```javascript
const testCases = [
  { input: 'a', expected: 'A' },
  { input: 'b', expected: 'B' }
];

for (const testCase of testCases) {
  runner.test(`handles ${testCase.input}`, () => {
    assertEqual(transform(testCase.input), testCase.expected);
  });
}
```

**After:**
```javascript
const testCases = [
  { input: 'a', expected: 'A' },
  { input: 'b', expected: 'B' }
];

testCases.forEach(({ input, expected }) => {
  it(`should handle ${input}`, function() {
    assert.strictEqual(transform(input), expected);
  });
});
```

## Example Migration: test-image-core.js

### Before (368 lines)
```javascript
// Custom framework with TestRunner class
const runner = new TestRunner('Image Core Utilities');

runner.test('generateStandardFilename - basic functionality', () => {
  const bookData = { author_last: 'Tolkien', title: 'The Hobbit', ... };
  const filename = generateStandardFilename(bookData);
  assertEqual(filename, 'Tolkien_The_Hobbit_9780547928227.jpg');
});

runner.test('validateImage - valid image file', async () => {
  const validImagePath = runner.createTempImageFile('valid.jpg', 10000);
  const result = await validateImage(validImagePath);
  assert(result.valid, 'Should be valid');
});

await runner.run();
```

### After (Mocha - migrated)
```javascript
const { createFixtures } = require('../helpers/fixtures');
const assert = require('assert');

describe('Image Core Utilities', function() {
  let fixtures;

  beforeEach(function() {
    fixtures = createFixtures();
  });

  afterEach(function() {
    fixtures.cleanup();
  });

  describe('generateStandardFilename', function() {
    it('should generate basic filename', function() {
      const bookData = { author_last: 'Tolkien', title: 'The Hobbit', ... };
      const filename = generateStandardFilename(bookData);
      assert.strictEqual(filename, 'Tolkien_The_Hobbit_9780547928227.jpg');
    });
  });

  describe('validateImage', function() {
    it('should validate valid image file', async function() {
      const validImagePath = fixtures.createTestImage('valid.jpg', 10000);
      const result = await validateImage(validImagePath);
      assert.ok(result.valid, 'Should be valid');
    });
  });
});
```

## Benefits of Migration

1. **Standard tooling** - Mocha is widely supported with IDE integration
2. **Better organization** - `describe()` blocks for clear test grouping
3. **Automatic cleanup** - Fixtures handle setup/teardown
4. **Watch mode** - `npm run test:watch` for TDD
5. **Better reporters** - Multiple output formats
6. **Filtered runs** - Run specific tests or suites
7. **Timeouts** - Per-test timeout configuration
8. **Skipping** - `it.skip()` and `it.only()` for focused testing

## Migration Checklist

For each test file:

- [ ] Create new file in `test/unit/` or `test/integration/`
- [ ] Import required modules and test target
- [ ] Import `createFixtures` from helpers
- [ ] Convert `runner.test()` → `it()`
- [ ] Group related tests with `describe()`
- [ ] Add `beforeEach`/`afterEach` for fixtures
- [ ] Convert custom assertions → `assert.*`
- [ ] Convert temp file creation → `fixtures.*`
- [ ] Run tests: `npm test -- test/unit/filename.js`
- [ ] Fix any failing tests
- [ ] Remove or deprecate original file

## Running Tests

```bash
# Run all migrated tests
npm test

# Run specific file
npm test -- test/unit/test-image-core.js

# Watch mode for TDD
npm run test:watch

# Only unit tests
npm run test:unit

# Only integration tests
npm run test:integration
```

## Common Issues

### Issue: Temp files not cleaning up
**Solution:** Ensure `fixtures.cleanup()` is called in `afterEach`

### Issue: Tests timing out
**Solution:** Add `this.timeout(10000)` for slow tests

### Issue: Async test not waiting
**Solution:** Use `async function() { await ... }` syntax

### Issue: Assertion doesn't match
**Solution:** Check actual function output matches expected value

## Next Steps

1. ✅ Migrate test-image-core.js
2. ⏳ Migrate test-logger.js
3. ⏳ Migrate test-csv-handler.js
4. ⏳ Migrate test-book-api-client.js
5. ⏳ Remove custom TestRunner framework
6. ⏳ Update CI/CD to use `npm test`
