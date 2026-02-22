/**
 * Security Tests for CSV Handler
 *
 * Covers:
 * - Path traversal prevention in createBackup (CWE-22, OWASP A01:2021)
 * - CSV formula injection prevention in sanitizeCSVField (CWE-1236)
 * - Integration of sanitization into validateAndCleanRecord
 */

const { describe, it, before, after } = require('mocha');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CSVHandler = require('../../scripts/utils/csv-handler');

// Resolve the base directory that createBackup uses internally
const BASE_DIR = path.resolve(__dirname, '../../src/_data');

describe('CSV Security', function () {

  // ---------------------------------------------------------------
  // Path Traversal Protection (CWE-22)
  // ---------------------------------------------------------------
  describe('Path Traversal Protection - createBackup', function () {

    // We need an actual file inside src/_data to test the happy path.
    const validFile = path.join(BASE_DIR, '_test_backup_source.csv');

    before(function () {
      // Create a small throwaway CSV so copyFileSync succeeds
      if (!fs.existsSync(BASE_DIR)) {
        fs.mkdirSync(BASE_DIR, { recursive: true });
      }
      fs.writeFileSync(validFile, 'id,title\n1,Test Book\n');
    });

    after(function () {
      // Clean up the source file and any backups created during tests
      const files = fs.readdirSync(BASE_DIR);
      files.forEach(f => {
        if (f.startsWith('_test_backup_source')) {
          fs.unlinkSync(path.join(BASE_DIR, f));
        }
      });
    });

    it('should reject an absolute path outside the data directory', function () {
      const malicious = '/etc/passwd.csv';
      assert.throws(
        () => CSVHandler.createBackup(malicious),
        /Security: Invalid file path outside allowed directory/
      );
    });

    it('should reject relative paths that escape via ..', function () {
      const malicious = path.join(BASE_DIR, '../../secret.csv');
      assert.throws(
        () => CSVHandler.createBackup(malicious),
        /Security: Invalid file path outside allowed directory/
      );
    });

    it('should reject deep traversal sequences', function () {
      const malicious = path.join(BASE_DIR, '../../../../etc/passwd.csv');
      assert.throws(
        () => CSVHandler.createBackup(malicious),
        /Security: Invalid file path outside allowed directory/
      );
    });

    it('should reject a path that looks similar but is outside the base dir', function () {
      // e.g., src/_data_evil/payload.csv would resolve outside baseDir + sep
      const tricky = path.resolve(BASE_DIR + '_evil', 'payload.csv');
      assert.throws(
        () => CSVHandler.createBackup(tricky),
        /Security: Invalid file path outside allowed directory/
      );
    });

    it('should allow a valid path inside the data directory', function () {
      const backupPath = CSVHandler.createBackup(validFile);

      // Backup file should exist
      assert.ok(fs.existsSync(backupPath), 'Backup file was not created');

      // Backup path should contain the timestamp pattern
      assert.ok(backupPath.includes('_backup_'), 'Backup filename missing timestamp');

      // Backup should be inside the base directory
      const resolvedBackup = path.resolve(backupPath);
      assert.ok(
        resolvedBackup.startsWith(BASE_DIR + path.sep),
        'Backup was created outside the allowed directory'
      );
    });

    it('should create a backup whose content matches the original', function () {
      const backupPath = CSVHandler.createBackup(validFile);
      const original = fs.readFileSync(validFile, 'utf8');
      const backup = fs.readFileSync(backupPath, 'utf8');
      assert.strictEqual(original, backup);
    });
  });

  // ---------------------------------------------------------------
  // CSV Formula Injection Prevention (CWE-1236)
  // ---------------------------------------------------------------
  describe('CSV Formula Injection - sanitizeCSVField', function () {

    it('should prefix = with a single quote', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField('=1+1'), "'=1+1");
    });

    it('should prefix + with a single quote', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField('+1+1'), "'+1+1");
    });

    it('should prefix - with a single quote', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField('-1+1'), "'-1+1");
    });

    it('should prefix @ with a single quote', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField('@SUM(A1:A10)'), "'@SUM(A1:A10)");
    });

    it('should prefix tab character with a single quote', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField('\tcmd'), "'\tcmd");
    });

    it('should prefix carriage return with a single quote', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField('\rcmd'), "'\rcmd");
    });

    it('should prefix newline with a single quote', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField('\ncmd'), "'\ncmd");
    });

    it('should neutralize a DDE command injection payload', function () {
      // Classic DDE attack: =cmd|'/C calc'!A0
      const result = CSVHandler.sanitizeCSVField("=cmd|'/C calc'!A0");
      // Starts with = so gets quote-prefixed; the prefix happens first
      assert.strictEqual(result, "'=cmd|'/C calc'!A0");
    });

    it('should strip pipe characters in non-prefixed strings', function () {
      const result = CSVHandler.sanitizeCSVField("data|with|pipes");
      assert.strictEqual(result, 'datawithpipes');
    });

    it('should strip semicolons in non-prefixed strings', function () {
      const result = CSVHandler.sanitizeCSVField("HYPERLINK(\"http://evil\";\"click\")");
      assert.strictEqual(result, 'HYPERLINK("http://evil""click")');
    });

    it('should not modify safe strings', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField('Normal Book Title'), 'Normal Book Title');
      assert.strictEqual(CSVHandler.sanitizeCSVField('A History of Art'), 'A History of Art');
      assert.strictEqual(CSVHandler.sanitizeCSVField('2025'), '2025');
    });

    it('should return non-string values unchanged', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField(42), 42);
      assert.strictEqual(CSVHandler.sanitizeCSVField(null), null);
      assert.strictEqual(CSVHandler.sanitizeCSVField(undefined), undefined);
      assert.strictEqual(CSVHandler.sanitizeCSVField(true), true);
    });

    it('should handle an empty string without modification', function () {
      assert.strictEqual(CSVHandler.sanitizeCSVField(''), '');
    });
  });

  // ---------------------------------------------------------------
  // Integration: sanitizeCSVField inside validateAndCleanRecord
  // ---------------------------------------------------------------
  describe('validateAndCleanRecord CSV injection integration', function () {

    it('should sanitize formula-prefixed fields during record validation', function () {
      const record = {
        id: '1',
        title: '=cmd|calc',
        author_full_name: 'Safe Author'
      };

      const result = CSVHandler.validateAndCleanRecord(record, 1);
      assert.strictEqual(result.record.title, "'=cmd|calc");
      assert.ok(result.corrected, 'Record should be marked as corrected');
    });

    it('should sanitize multiple dangerous fields in a single record', function () {
      const record = {
        id: '2',
        title: '+DANGEROUS',
        author_full_name: '@INJECT',
        publisher: 'Safe Publisher'
      };

      const result = CSVHandler.validateAndCleanRecord(record, 2);
      assert.strictEqual(result.record.title, "'+DANGEROUS");
      assert.strictEqual(result.record.author_full_name, "'@INJECT");
      assert.strictEqual(result.record.publisher, 'Safe Publisher');
    });

    it('should not double-sanitize already safe fields', function () {
      const record = {
        id: '3',
        title: 'The Great Gatsby',
        author_full_name: 'F. Scott Fitzgerald'
      };

      const result = CSVHandler.validateAndCleanRecord(record, 3);
      assert.strictEqual(result.record.title, 'The Great Gatsby');
      assert.strictEqual(result.record.author_full_name, 'F. Scott Fitzgerald');
    });

    it('should handle fields that are both whitespace-padded and formula-injected', function () {
      const record = {
        id: '4',
        title: '  =1+1  ',
        author_full_name: 'Author'
      };

      const result = CSVHandler.validateAndCleanRecord(record, 4);
      // trim() runs first, then sanitizeCSVField
      assert.strictEqual(result.record.title, "'=1+1");
    });

    it('should strip pipes from mid-string fields during validation', function () {
      const record = {
        id: '5',
        title: 'Book Title',
        author_full_name: 'Author',
        description: 'text|with|pipes'
      };

      const result = CSVHandler.validateAndCleanRecord(record, 5);
      assert.strictEqual(result.record.description, 'textwithpipes');
    });

    it('should preserve existing functionality for null-like values', function () {
      const record = {
        id: '6',
        title: 'A Book',
        author_full_name: 'Writer',
        publisher: 'NULL'
      };

      const result = CSVHandler.validateAndCleanRecord(record, 6);
      assert.strictEqual(result.record.publisher, '');
    });
  });
});
