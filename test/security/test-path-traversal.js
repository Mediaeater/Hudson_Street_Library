/**
 * Security Tests: Path Traversal & Filename Injection
 *
 * Validates that sanitizeFilename in image-core.js blocks:
 *   - Path traversal via ../ sequences (OWASP A01:2021)
 *   - Hidden file creation via leading dots
 *   - HTML/script injection in filenames
 *   - Null byte injection
 *   - Edge cases (empty, whitespace-only, all-special-chars)
 *
 * Reference: REMEDIATION_PLAN.md, Day 1, Fix 1.2
 */

const { describe, it } = require('mocha');
const assert = require('assert');
const { sanitizeFilename } = require('../../scripts/utils/image-core');

describe('Filename Sanitization - Security', function () {

  describe('Path traversal prevention', function () {
    it('should strip directory components from ../../../etc/passwd', function () {
      const result = sanitizeFilename('../../../etc/passwd');
      // path.basename returns 'passwd'; no dots, no invalid chars
      assert.strictEqual(result, 'passwd');
      assert.ok(!result.includes('..'), 'Must not contain dot-dot');
      assert.ok(!result.includes('/'), 'Must not contain forward slash');
    });

    it('should strip Windows-style traversal ..\\..\\windows\\system32', function () {
      const result = sanitizeFilename('..\\..\\windows\\system32');
      // path.basename on POSIX treats backslash as regular char in the
      // basename, but the invalid-char regex strips backslashes, and the
      // dot-dot regex converts consecutive dots to underscore.
      assert.ok(!result.includes('..'), 'Must not contain dot-dot');
      assert.ok(!result.includes('\\'), 'Must not contain backslash');
    });

    it('should handle encoded traversal %2e%2e%2f', function () {
      // URL-encoded dots and slashes -- basename strips path component
      const result = sanitizeFilename('%2e%2e%2fetc%2fpasswd');
      assert.ok(!result.includes('/'), 'Must not contain forward slash');
      assert.ok(result.length > 0, 'Must produce non-empty output');
    });

    it('should handle traversal with null bytes ../../../etc/passwd%00.jpg', function () {
      const input = '../../../etc/passwd\x00.jpg';
      const result = sanitizeFilename(input);
      assert.ok(!result.includes('\x00'), 'Must not contain null byte');
      assert.ok(!result.includes('..'), 'Must not contain dot-dot');
    });

    it('should strip absolute path /etc/shadow', function () {
      const result = sanitizeFilename('/etc/shadow');
      assert.strictEqual(result, 'shadow');
    });
  });

  describe('Hidden file prevention', function () {
    it('should strip leading dot from .env', function () {
      const result = sanitizeFilename('.env');
      assert.strictEqual(result, 'env');
      assert.ok(!result.startsWith('.'), 'Must not start with dot');
    });

    it('should strip leading dots from ..htaccess', function () {
      const result = sanitizeFilename('..htaccess');
      assert.ok(!result.startsWith('.'), 'Must not start with dot');
      assert.ok(result.includes('htaccess'));
    });

    it('should strip leading dot from .gitconfig', function () {
      const result = sanitizeFilename('.gitconfig');
      assert.strictEqual(result, 'gitconfig');
    });
  });

  describe('Special character injection', function () {
    it('should neutralize HTML tags in filename', function () {
      const result = sanitizeFilename('<script>alert(1)</script>');
      assert.ok(!result.includes('<'), 'Must not contain <');
      assert.ok(!result.includes('>'), 'Must not contain >');
    });

    it('should strip pipes and redirects', function () {
      const result = sanitizeFilename('file|rm -rf|name');
      assert.ok(!result.includes('|'), 'Must not contain pipe');
    });

    it('should strip colons (Windows drive letters / ADS)', function () {
      const result = sanitizeFilename('C:payload.txt');
      assert.ok(!result.includes(':'), 'Must not contain colon');
    });

    it('should strip quotes', function () {
      const result = sanitizeFilename('file"name\'here');
      assert.ok(!result.includes('"'), 'Must not contain double quote');
    });

    it('should replace asterisks and question marks', function () {
      const result = sanitizeFilename('*.jpg');
      assert.ok(!result.includes('*'), 'Must not contain asterisk');
      const result2 = sanitizeFilename('file?.txt');
      assert.ok(!result2.includes('?'), 'Must not contain question mark');
    });
  });

  describe('Dot-dot sequence blocking', function () {
    it('should replace consecutive dots embedded in name', function () {
      const result = sanitizeFilename('some..file..name');
      assert.ok(!result.includes('..'), 'Must not contain dot-dot');
    });

    it('should replace triple dots', function () {
      const result = sanitizeFilename('file...name');
      assert.ok(!result.includes('..'), 'Must not contain dot-dot');
    });
  });

  describe('Edge cases and fallbacks', function () {
    it('should return "untitled" for null input', function () {
      assert.strictEqual(sanitizeFilename(null), 'untitled');
    });

    it('should return "untitled" for undefined input', function () {
      assert.strictEqual(sanitizeFilename(undefined), 'untitled');
    });

    it('should return "untitled" for empty string', function () {
      assert.strictEqual(sanitizeFilename(''), 'untitled');
    });

    it('should return "untitled" for non-string input', function () {
      assert.strictEqual(sanitizeFilename(12345), 'untitled');
      assert.strictEqual(sanitizeFilename({}), 'untitled');
      assert.strictEqual(sanitizeFilename([]), 'untitled');
    });

    it('should return "untitled" when all characters are stripped', function () {
      // Only invalid characters -- everything gets removed
      assert.strictEqual(sanitizeFilename('<>:"|?*'), 'untitled');
    });

    it('should handle very long filenames without crashing', function () {
      const long = 'a'.repeat(10000);
      const result = sanitizeFilename(long);
      assert.ok(typeof result === 'string');
      assert.ok(result.length > 0);
    });

    it('should handle filenames with only underscores and dots', function () {
      const result = sanitizeFilename('___...__');
      assert.ok(result.length > 0, 'Must produce non-empty output');
      assert.ok(!result.includes('..'), 'Must not contain dot-dot');
    });
  });

  describe('Normal filenames pass through correctly', function () {
    it('should preserve simple alphanumeric names', function () {
      assert.strictEqual(sanitizeFilename('cover123'), 'cover123');
    });

    it('should preserve names with single dots and hyphens', function () {
      assert.strictEqual(sanitizeFilename('book-cover.jpg'), 'book-cover.jpg');
    });

    it('should preserve underscored names', function () {
      assert.strictEqual(sanitizeFilename('Tolkien_Hobbit_123'), 'Tolkien_Hobbit_123');
    });

    it('should convert spaces to underscores', function () {
      const result = sanitizeFilename('my book cover');
      assert.strictEqual(result, 'my_book_cover');
    });

    it('should collapse multiple underscores', function () {
      assert.strictEqual(sanitizeFilename('too___many___underscores'), 'too_many_underscores');
    });
  });
});
