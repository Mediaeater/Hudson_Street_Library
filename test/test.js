const fs = require('fs');
const path = require('path');
const assert = require('assert');
const csv = require('csv-parse/sync');

describe('Hudson Street Library Smoke Tests', function () {

  describe('Data Integrity', function () {
    const booksCsvPath = path.join(__dirname, '../src/_data/books.csv');

    it('books.csv should exist', function () {
      assert.ok(fs.existsSync(booksCsvPath), 'books.csv file missing');
    });

    it('books.csv should have valid headers', function () {
      const fileContent = fs.readFileSync(booksCsvPath, 'utf8');
      const records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        to: 1 // Read only first record to check headers
      });

      const firstRecord = records[0];
      assert.ok(firstRecord, 'CSV is empty');

      // Check for critical columns
      assert.ok('isbn_asin' in firstRecord, 'Missing isbn_asin column');
      assert.ok('title' in firstRecord, 'Missing title column');
      assert.ok('author_full_name' in firstRecord, 'Missing author_full_name column');
    });
  });

  describe('File Structure', function () {
    it('images directory should exist', function () {
      const imagesPath = path.join(__dirname, '../src/assets/images/books');
      assert.ok(fs.existsSync(imagesPath), 'Images directory missing');
    });
  });
});
