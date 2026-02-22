/**
 * Security Tests: ReDoS Protection for parseAccessionDate
 *
 * Validates that the hardened parseAccessionDate function in .eleventy.js:
 * - Truncates oversized inputs (50 char max)
 * - Rejects characters outside the allowed whitelist
 * - Only accepts known date formats (YYYY-MM-DD, year-only, "Month Day, Year", "Month Year")
 * - Validates date ranges (1900-2100)
 * - Completes within performance bounds even on adversarial input
 *
 * OWASP Reference: A03:2021 - Injection (ReDoS variant)
 * See also: CWE-1333 (Inefficient Regular Expression Complexity)
 */

const { describe, it } = require('mocha');
const assert = require('assert');
const { parseAccessionDate } = require('../../.eleventy.js');

describe('ReDoS Protection - parseAccessionDate', function () {

  // -------------------------------------------------------
  // 1. Input length limiting
  // -------------------------------------------------------
  describe('Input length limiting', function () {
    it('should return null for excessively long strings', function () {
      const longString = '2025-01-15' + '9'.repeat(100000);
      const result = parseAccessionDate(longString);
      // The string gets truncated to 50 chars, which won't match any format
      assert.strictEqual(result, null);
    });

    it('should complete in <100ms even with a 1MB string', function () {
      const megabyteString = 'A'.repeat(1024 * 1024);
      const start = Date.now();
      const result = parseAccessionDate(megabyteString);
      const duration = Date.now() - start;

      assert.strictEqual(result, null);
      assert.ok(duration < 100, `Took ${duration}ms, expected <100ms`);
    });

    it('should handle empty string', function () {
      assert.strictEqual(parseAccessionDate(''), null);
    });

    it('should handle whitespace-only string', function () {
      assert.strictEqual(parseAccessionDate('   '), null);
    });
  });

  // -------------------------------------------------------
  // 2. Type validation
  // -------------------------------------------------------
  describe('Type validation', function () {
    it('should return null for null input', function () {
      assert.strictEqual(parseAccessionDate(null), null);
    });

    it('should return null for undefined input', function () {
      assert.strictEqual(parseAccessionDate(undefined), null);
    });

    it('should return null for numeric input', function () {
      assert.strictEqual(parseAccessionDate(12345), null);
    });

    it('should return null for object input', function () {
      assert.strictEqual(parseAccessionDate({ date: '2025-01-01' }), null);
    });

    it('should return null for array input', function () {
      assert.strictEqual(parseAccessionDate(['2025-01-01']), null);
    });

    it('should return null for boolean input', function () {
      assert.strictEqual(parseAccessionDate(true), null);
    });
  });

  // -------------------------------------------------------
  // 3. Character whitelist enforcement
  // -------------------------------------------------------
  describe('Character whitelist enforcement', function () {
    it('should reject strings with special characters', function () {
      assert.strictEqual(parseAccessionDate('2025-01-15; DROP TABLE'), null);
    });

    it('should reject strings with angle brackets', function () {
      assert.strictEqual(parseAccessionDate('<script>2025</script>'), null);
    });

    it('should reject strings with parentheses', function () {
      assert.strictEqual(parseAccessionDate('Date(2025)'), null);
    });

    it('should reject strings with equals sign', function () {
      assert.strictEqual(parseAccessionDate('=2025-01-01'), null);
    });

    it('should reject strings with pipe characters', function () {
      assert.strictEqual(parseAccessionDate('2025|01|01'), null);
    });

    it('should reject strings with backticks', function () {
      assert.strictEqual(parseAccessionDate('`2025-01-01`'), null);
    });

    it('should reject strings with curly braces', function () {
      assert.strictEqual(parseAccessionDate('{2025-01-01}'), null);
    });

    it('should reject null bytes', function () {
      assert.strictEqual(parseAccessionDate('2025\x00-01-01'), null);
    });

    it('should reject unicode control characters', function () {
      assert.strictEqual(parseAccessionDate('2025\u200B-01-01'), null);
    });
  });

  // -------------------------------------------------------
  // 4. Valid format: YYYY-MM-DD
  // -------------------------------------------------------
  describe('YYYY-MM-DD format', function () {
    it('should parse a standard date', function () {
      const result = parseAccessionDate('2025-01-15');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getUTCFullYear(), 2025);
      assert.strictEqual(result.getUTCMonth(), 0); // January = 0
      assert.strictEqual(result.getUTCDate(), 15);
    });

    it('should parse the earliest valid date', function () {
      const result = parseAccessionDate('1900-01-01');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getUTCFullYear(), 1900);
    });

    it('should parse the latest valid date', function () {
      const result = parseAccessionDate('2100-12-31');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getUTCFullYear(), 2100);
    });

    it('should reject year below 1900', function () {
      assert.strictEqual(parseAccessionDate('1899-12-31'), null);
    });

    it('should reject year above 2100', function () {
      assert.strictEqual(parseAccessionDate('2101-01-01'), null);
    });

    it('should reject month 0', function () {
      assert.strictEqual(parseAccessionDate('2025-00-15'), null);
    });

    it('should reject month 13', function () {
      assert.strictEqual(parseAccessionDate('2025-13-01'), null);
    });

    it('should reject day 0', function () {
      assert.strictEqual(parseAccessionDate('2025-01-00'), null);
    });

    it('should reject day 32', function () {
      assert.strictEqual(parseAccessionDate('2025-01-32'), null);
    });
  });

  // -------------------------------------------------------
  // 5. Valid format: year only
  // -------------------------------------------------------
  describe('Year-only format', function () {
    it('should parse a 4-digit year starting with 20', function () {
      const result = parseAccessionDate('2025');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getUTCFullYear(), 2025);
      assert.strictEqual(result.getUTCMonth(), 0);
      assert.strictEqual(result.getUTCDate(), 1);
    });

    it('should parse a 4-digit year starting with 19', function () {
      const result = parseAccessionDate('1998');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getUTCFullYear(), 1998);
    });

    it('should reject years before 1900', function () {
      assert.strictEqual(parseAccessionDate('1800'), null);
    });

    it('should reject 3-digit numbers', function () {
      assert.strictEqual(parseAccessionDate('202'), null);
    });

    it('should reject 5-digit numbers', function () {
      assert.strictEqual(parseAccessionDate('20251'), null);
    });
  });

  // -------------------------------------------------------
  // 6. Valid format: "Month Day, Year"
  // -------------------------------------------------------
  describe('"Month Day, Year" format', function () {
    it('should parse "October 29, 2025"', function () {
      const result = parseAccessionDate('October 29, 2025');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getFullYear(), 2025);
    });

    it('should parse "January 1, 2000"', function () {
      const result = parseAccessionDate('January 1, 2000');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getFullYear(), 2000);
    });

    it('should reject date with year out of range', function () {
      assert.strictEqual(parseAccessionDate('January 1, 2200'), null);
    });

    it('should reject an invalid month name', function () {
      // "Foobar 1, 2025" passes the regex but Date constructor returns NaN
      const result = parseAccessionDate('Foobar 1, 2025');
      assert.strictEqual(result, null);
    });
  });

  // -------------------------------------------------------
  // 7. Valid format: "Month Year"
  // -------------------------------------------------------
  describe('"Month Year" format', function () {
    it('should parse "December 2024"', function () {
      const result = parseAccessionDate('December 2024');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getFullYear(), 2024);
    });

    it('should parse "March 1900"', function () {
      const result = parseAccessionDate('March 1900');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getFullYear(), 1900);
    });

    it('should reject invalid month name', function () {
      assert.strictEqual(parseAccessionDate('Smarch 2025'), null);
    });

    it('should reject year out of range', function () {
      assert.strictEqual(parseAccessionDate('January 2200'), null);
    });
  });

  // -------------------------------------------------------
  // 8. Unrecognized formats are rejected (no arbitrary Date.parse)
  // -------------------------------------------------------
  describe('Unrecognized format rejection', function () {
    it('should reject MM/DD/YYYY format', function () {
      // The whitelist allows slashes, but no regex matches this format
      assert.strictEqual(parseAccessionDate('01/15/2025'), null);
    });

    it('should reject "Day Month Year" format', function () {
      assert.strictEqual(parseAccessionDate('15 October 2025'), null);
    });

    it('should reject ISO 8601 with time', function () {
      assert.strictEqual(parseAccessionDate('2025-01-15T10:30:00Z'), null);
    });

    it('should reject Unix timestamp strings', function () {
      assert.strictEqual(parseAccessionDate('1706313600'), null);
    });

    it('should reject random prose', function () {
      assert.strictEqual(parseAccessionDate('sometime in January'), null);
    });

    it('should reject "Day-Month-Year" with hyphens', function () {
      assert.strictEqual(parseAccessionDate('15-Oct-2025'), null);
    });
  });

  // -------------------------------------------------------
  // 9. ReDoS / performance tests
  // -------------------------------------------------------
  describe('Performance under adversarial input', function () {
    it('should handle repeated whitespace-like patterns in <100ms', function () {
      // Pattern designed to stress backtracking in naive regex
      const adversarial = 'January ' + '1, '.repeat(10000) + '2025';
      const start = Date.now();
      const result = parseAccessionDate(adversarial);
      const duration = Date.now() - start;

      assert.strictEqual(result, null);
      assert.ok(duration < 100, `Took ${duration}ms, expected <100ms`);
    });

    it('should handle nested repetition patterns in <100ms', function () {
      // Classic ReDoS payload: alternating characters that cause backtracking
      const adversarial = 'a'.repeat(50000) + '!';
      const start = Date.now();
      const result = parseAccessionDate(adversarial);
      const duration = Date.now() - start;

      assert.strictEqual(result, null);
      assert.ok(duration < 100, `Took ${duration}ms, expected <100ms`);
    });

    it('should handle many hyphens in <100ms', function () {
      const adversarial = '2025' + '-01'.repeat(50000);
      const start = Date.now();
      const result = parseAccessionDate(adversarial);
      const duration = Date.now() - start;

      assert.strictEqual(result, null);
      assert.ok(duration < 100, `Took ${duration}ms, expected <100ms`);
    });

    it('should parse 10000 valid dates in <500ms', function () {
      const dates = [
        '2025-01-15', '2024-06-30', 'October 29, 2025',
        'December 2024', '2023', '1999-12-31',
        'March 2000', 'July 4, 1976', '2001', '2100-01-01'
      ];

      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        parseAccessionDate(dates[i % dates.length]);
      }
      const duration = Date.now() - start;

      assert.ok(duration < 500, `Took ${duration}ms for 10000 parses, expected <500ms`);
    });
  });

  // -------------------------------------------------------
  // 10. Edge cases
  // -------------------------------------------------------
  describe('Edge cases', function () {
    it('should handle leading/trailing whitespace', function () {
      const result = parseAccessionDate('  2025-01-15  ');
      assert.ok(result instanceof Date);
      assert.strictEqual(result.getUTCFullYear(), 2025);
    });

    it('should handle a string that is exactly 50 chars', function () {
      // "October 29, 2025" is 16 chars, pad with leading spaces to 50
      const padded = ' '.repeat(34) + 'October 29, 2025';
      assert.strictEqual(padded.length, 50);
      const result = parseAccessionDate(padded);
      assert.ok(result instanceof Date);
    });

    it('should return null for a date string just over 50 chars after trim', function () {
      // Build a string that after trim is 51 chars and doesn't match any format
      const oversize = 'A'.repeat(51);
      // After trim and slice to 50, this becomes 50 'A's which fails format checks
      assert.strictEqual(parseAccessionDate(oversize), null);
    });
  });
});
