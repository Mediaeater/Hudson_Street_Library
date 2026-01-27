# Code Coverage Guide

## Overview

Code coverage has been added to the test suite using [nyc](https://github.com/istanbuljs/nyc), the Istanbul command-line client. This measures which parts of the codebase are executed during tests.

## Running Coverage

```bash
# Run tests with coverage report
npm run test:coverage

# Generate and open HTML coverage report
npm run test:coverage:html

# Generate LCOV report for CI/CD
npm run test:coverage:report
```

## Coverage Configuration

Coverage is configured in `.nycrc`:

- **Included files:** `scripts/utils/*.js` (utility modules)
- **Excluded files:** Example files, test files, CLI tools
- **Reports:** text, html, lcov
- **Thresholds:** 80% (lines, statements, functions, branches)

## Current Coverage Status

### Overall: 12.92% (as of 2026-01-27)

Updated after improving image-core.js coverage.

### Coverage by File

| File | Coverage | Status |
|------|----------|--------|
| image-core.js | 89.83% | ✅ Comprehensive tests (63.55% → 89.83%) |
| csv-handler.js | 57.42% | ✅ Integration tests added |
| book-api-client.js | 0% | Mock implementation (unit tests) |
| logger.js | 0% | Mock implementation (unit tests) |
| Other utilities | 0% | Not yet tested |

### Coverage Improvements

- **Initial:** 3.83% (mock-based unit tests only)
- **After CSV integration:** 11.34% (+7.51%)
- **After image-core improvement:** 12.92% (+9.09% total)
- **csv-handler.js:** 0% → 57.42% (+57.42%)
- **image-core.js:** 63.55% → 89.83% (+26.28%)

## Why Mock-Based Testing?

### Test Philosophy

Our current tests use **mock implementations** rather than real code for three main reasons:

1. **Isolation** - Tests don't depend on external services (APIs, file system, network)
2. **Speed** - Mock-based tests run in ~300ms vs potentially seconds with real I/O
3. **Reliability** - No flaky tests due to network issues, rate limits, or external state

### Trade-offs

**Advantages:**
- ✅ Fast execution
- ✅ No external dependencies
- ✅ Deterministic results
- ✅ Easy to test error conditions
- ✅ Validates behavior and contracts

**Disadvantages:**
- ❌ Doesn't test real implementation
- ❌ May miss integration issues
- ❌ Requires keeping mocks in sync with real code
- ❌ Low code coverage metrics

## Improving Coverage

### Strategy 1: Convert to Real Implementation Tests

Modify existing tests to use real implementations instead of mocks.

**Example: Logger Tests**

Current (mock-based):
```javascript
// test/unit/test-logger.js
class MockLogger {
  // Mock implementation
}

const logger = new MockLogger();
```

With real implementation:
```javascript
const { Logger } = require('../../scripts/utils/logger');

const logger = new Logger();
```

**Pros:** Immediate coverage increase
**Cons:** Slower tests, more setup/cleanup, external dependencies

### Strategy 2: Add Integration Tests

Keep unit tests with mocks, add separate integration tests with real code.

```javascript
// test/integration/test-logger-integration.js
const { Logger } = require('../../scripts/utils/logger');

describe('Logger Integration Tests', function() {
  it('should write to actual log files', async function() {
    const logger = new Logger({ logDir: tempDir });
    await logger.initialize();
    logger.info('test message');

    // Verify file was written
    const content = fs.readFileSync(logger.getLogFile(), 'utf8');
    assert.ok(content.includes('test message'));
  });
});
```

**Pros:** Best of both worlds - fast unit tests + comprehensive integration tests
**Cons:** More tests to maintain, longer overall test time

### Strategy 3: Hybrid Approach

Use real implementations for pure functions, mocks for I/O and external services.

**Example:**
- ✅ Use real implementation: `sanitizeFilename()`, `formatMessage()`
- ✅ Use mocks: API calls, database operations, file system writes

## Test Coverage vs. Behavior Coverage

**Important:** Low code coverage doesn't mean poor test quality.

Our tests validate:
- ✅ API contracts and interfaces
- ✅ Error handling behavior
- ✅ Edge cases and boundary conditions
- ✅ Configuration options
- ✅ Return value structures

This is **behavior coverage** - ensuring the code does what it's supposed to do, even if we're not executing every line of the real implementation.

## Recommendations

### For Unit Tests (Current)
Keep mock-based tests for:
- API clients (avoid real API calls)
- File system operations (avoid I/O in unit tests)
- External service integrations
- Time-dependent operations

### For Integration Tests (Future)
Add real implementation tests for:
- Critical paths (book adding, CSV operations)
- End-to-end workflows
- Performance-critical functions
- Functions with complex business logic

### Priority Coverage Targets

1. **image-core.js** - Already at 63.55%, target 90%+
   - Add tests for uncovered branches
   - Test error conditions

2. **csv-handler.js** - Priority for integration tests
   - Critical for data integrity
   - Should test real file operations

3. **logger.js** - Lower priority
   - Less critical functionality
   - Mock tests are sufficient

4. **book-api-client.js** - Keep mocked
   - External API dependencies
   - Rate limiting concerns
   - Network reliability issues

## Coverage Reports

### Text Report (Console)

```bash
npm run test:coverage
```

Shows coverage table in terminal after tests run.

### HTML Report

```bash
npm run test:coverage:html
```

Opens interactive HTML report showing:
- Line-by-line coverage
- Uncovered branches
- Function coverage
- Click through to source files

Located at: `coverage/index.html`

### LCOV Report

```bash
npm run test:coverage:report
```

Generates `coverage/lcov.info` for CI/CD integration (GitHub Actions, Codecov, Coveralls).

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run tests with coverage
  run: npm run test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
    fail_ci_if_error: false
```

### Coverage Badges

After CI/CD integration, add badge to README:

```markdown
[![codecov](https://codecov.io/gh/username/repo/branch/main/graph/badge.svg)](https://codecov.io/gh/username/repo)
```

## Setting Coverage Thresholds

Edit `.nycrc` to enforce minimum coverage:

```json
{
  "check-coverage": true,
  "lines": 80,
  "statements": 80,
  "functions": 80,
  "branches": 80
}
```

When `check-coverage: true`, tests will fail if coverage drops below thresholds.

## Best Practices

1. **Don't chase 100% coverage** - Focus on critical paths and complex logic
2. **Use appropriate testing strategy** - Mocks for unit tests, real code for integration tests
3. **Measure what matters** - Behavior coverage > line coverage
4. **Keep coverage reports in CI/CD** - Track trends over time
5. **Review coverage in PRs** - Ensure new code has adequate tests

## Files and Directories

```
.nycrc                    # nyc configuration
coverage/                 # Coverage reports (git ignored)
  ├── index.html         # HTML report entry point
  ├── lcov.info          # LCOV format for CI/CD
  └── ...                # Other report formats
.nyc_output/             # Temporary coverage data (git ignored)
```

## References

- [nyc Documentation](https://github.com/istanbuljs/nyc)
- [Istanbul](https://istanbul.js.org/)
- [Testing Best Practices](https://testingjavascript.com/)
- [When to Mock](https://kentcdodds.com/blog/when-to-mock)

---

**Last Updated:** 2026-01-27
**Test Framework:** Mocha + nyc
**Current Coverage:** 3.83% (expected with mock-based tests)
