/**
 * Data Integrity Integration Tests
 * Demonstrates datasette-enrichments patterns:
 * - Fixture-based setup
 * - Parametrized tests
 * - Async test patterns
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createFixtures } = require('../helpers/fixtures');
const { waitFor, sleep } = require('../helpers/async-utils');

describe('Data Integrity Tests', function() {
  let fixtures;

  // Setup fixtures before each test (similar to pytest fixtures)
  beforeEach(function() {
    fixtures = createFixtures();
  });

  // Cleanup after each test
  afterEach(function() {
    if (fixtures) {
      fixtures.cleanup();
    }
  });

  describe('Database Operations', function() {
    it('should create test database with sample data', function() {
      const { db, dbPath } = fixtures.createTestDatabase();

      assert.ok(fs.existsSync(dbPath), 'Database file should exist');

      const books = db.prepare('SELECT * FROM books').all();
      assert.strictEqual(books.length, 3, 'Should have 3 test books');
    });

    it('should handle books with and without ISBNs', function() {
      const { db } = fixtures.createTestDatabase();

      const withISBN = db.prepare('SELECT * FROM books WHERE isbn_asin IS NOT NULL').all();
      const withoutISBN = db.prepare('SELECT * FROM books WHERE isbn_asin IS NULL').all();

      assert.strictEqual(withISBN.length, 2, 'Should have 2 books with ISBNs');
      assert.strictEqual(withoutISBN.length, 1, 'Should have 1 book without ISBN');
    });

    it('should query books by collection', function() {
      const { db } = fixtures.createTestDatabase();

      const specialCollection = db.prepare(
        'SELECT * FROM books WHERE collection = ?'
      ).all('special-collection');

      assert.strictEqual(specialCollection.length, 1);
      assert.strictEqual(specialCollection[0].title, 'Book Without ISBN');
    });
  });

  describe('CSV File Operations', function() {
    it('should create valid CSV file', function() {
      const csvPath = fixtures.createTestCSV();

      assert.ok(fs.existsSync(csvPath), 'CSV file should exist');

      const content = fs.readFileSync(csvPath, 'utf8');
      assert.ok(content.includes('isbn_asin'), 'Should have header');
      assert.ok(content.includes('Test Book'), 'Should have data');
    });

    it('should create CSV with custom data', function() {
      const customRows = [
        {
          isbn_asin: '111-1-11111-11-1',
          title: 'Custom Book',
          author_full_name: 'Custom Author',
          publisher: 'Custom Pub',
          year_published: '2025',
          tags: 'test'
        }
      ];

      const csvPath = fixtures.createTestCSV('custom.csv', customRows);
      const content = fs.readFileSync(csvPath, 'utf8');

      assert.ok(content.includes('Custom Book'));
      assert.ok(content.includes('Custom Author'));
    });
  });

  describe('Image File Operations', function() {
    it('should create valid test image', function() {
      const imagePath = fixtures.createTestImage('test.jpg');

      assert.ok(fs.existsSync(imagePath), 'Image file should exist');

      const buffer = fs.readFileSync(imagePath);
      // Check JPEG magic bytes
      assert.strictEqual(buffer[0], 0xFF, 'Should start with JPEG marker');
      assert.strictEqual(buffer[1], 0xD8, 'Should start with JPEG marker');
    });

    it('should create image with specified size', function() {
      const size = 10000;
      const imagePath = fixtures.createTestImage('large.jpg', size);
      const stats = fs.statSync(imagePath);

      assert.strictEqual(stats.size, size, 'Image should match requested size');
    });
  });

  describe('Async Patterns', function() {
    it('should wait for condition to become true', async function() {
      let counter = 0;
      const incrementAsync = async () => {
        await sleep(50);
        counter++;
      };

      // Start async operation
      incrementAsync();

      // Wait for it to complete
      await waitFor(
        () => counter > 0,
        { timeout: 1000, interval: 10, message: 'Counter did not increment' }
      );

      assert.strictEqual(counter, 1);
    });

    it('should timeout if condition not met', async function() {
      const neverTrue = () => false;

      await assert.rejects(
        async () => {
          await waitFor(neverTrue, { timeout: 100, interval: 10 });
        },
        /Condition not met within timeout/
      );
    });
  });

  describe('Temporary File Management', function() {
    it('should create and cleanup temp files', function() {
      const filePath = fixtures.createTempFile('test.txt', 'test content');

      assert.ok(fs.existsSync(filePath), 'Temp file should exist');

      fixtures.cleanup();

      assert.ok(!fs.existsSync(filePath), 'Temp file should be cleaned up');
    });

    it('should create and cleanup temp directories', function() {
      const tempDir = fixtures.createTempDir();

      assert.ok(fs.existsSync(tempDir), 'Temp dir should exist');

      fixtures.cleanup();

      assert.ok(!fs.existsSync(tempDir), 'Temp dir should be cleaned up');
    });
  });
});
