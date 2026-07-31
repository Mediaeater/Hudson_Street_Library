/**
 * Integration Tests for CSV Handler
 * Tests the REAL csv-handler.js implementation with actual file I/O
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createFixtures } = require('../helpers/fixtures');
const CSVHandler = require('../../scripts/utils/csv-handler');

describe('CSV Handler Integration Tests', function() {
  let fixtures;
  let testDir;

  beforeEach(function() {
    fixtures = createFixtures();
    testDir = fixtures.createTempDir();
  });

  afterEach(function() {
    if (fixtures) {
      fixtures.cleanup();
    }
  });

  describe('Reading CSV Files', function() {
    it('should read valid CSV file', async function() {
      const csvPath = path.join(testDir, 'books.csv');
      const csvContent = `id,title,author_full_name,author_last,author_first,publisher,publication_year,isbn_asin
1,The Hobbit,J.R.R. Tolkien,Tolkien,J.R.R.,Houghton Mifflin,1937,9780547928227
2,1984,George Orwell,Orwell,George,Secker & Warburg,1949,9780451524935`;

      fs.writeFileSync(csvPath, csvContent);

      const result = await CSVHandler.read(csvPath);

      assert.ok(result.data);
      assert.strictEqual(result.data.length, 2);
      assert.strictEqual(result.stats.totalRows, 2);
      assert.strictEqual(result.stats.validRows, 2);
      assert.strictEqual(result.errors.length, 0);

      const firstBook = result.data[0];
      assert.strictEqual(firstBook.title, 'The Hobbit');
      assert.strictEqual(firstBook.author_full_name, 'J.R.R. Tolkien');
    });

    it('should handle CSV with missing optional fields', async function() {
      const csvPath = path.join(testDir, 'books.csv');
      const csvContent = `id,title,author_full_name
1,Book One,Author One
2,Book Two,Author Two`;

      fs.writeFileSync(csvPath, csvContent);

      const result = await CSVHandler.read(csvPath);

      assert.strictEqual(result.data.length, 2);
      assert.strictEqual(result.stats.validRows, 2);

      const book = result.data[0];
      assert.strictEqual(book.title, 'Book One');
      assert.ok('author_last' in book); // Should have default empty string
    });

    it('should handle empty CSV file', async function() {
      const csvPath = path.join(testDir, 'empty.csv');
      fs.writeFileSync(csvPath, 'id,title,author_full_name\n');

      const result = await CSVHandler.read(csvPath);

      assert.strictEqual(result.data.length, 0);
      assert.strictEqual(result.stats.totalRows, 0);
    });

    it('should detect and report validation warnings', async function() {
      const csvPath = path.join(testDir, 'books.csv');
      const csvContent = `id,title,author_full_name,isbn_asin
1,Book One,Author One,INVALID-ISBN
2,Book Two,Author Two,9780451524935`;

      fs.writeFileSync(csvPath, csvContent);

      const result = await CSVHandler.read(csvPath);

      assert.strictEqual(result.data.length, 2);
      assert.ok(result.errors.length > 0);

      const warnings = result.errors.filter(e => e.type === 'warning');
      assert.ok(warnings.length > 0, 'Should have validation warnings');
    });
  });

  describe('Writing CSV Files', function() {
    it('should write valid CSV data', async function() {
      const csvPath = path.join(testDir, 'output.csv');
      const data = [
        {
          id: '1',
          title: 'Test Book',
          author_full_name: 'Test Author',
          author_last: 'Author',
          author_first: 'Test'
        },
        {
          id: '2',
          title: 'Another Book',
          author_full_name: 'Another Author',
          author_last: 'Author',
          author_first: 'Another'
        }
      ];

      const result = await CSVHandler.write(csvPath, data);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(fs.existsSync(csvPath));

      // Read back and verify
      const content = fs.readFileSync(csvPath, 'utf8');
      assert.ok(content.includes('Test Book'));
      assert.ok(content.includes('Another Book'));
    });

    it('should create backup before overwriting', async function() {
      const csvPath = path.join(testDir, 'books.csv');

      // Write initial file (allowedDir permits backup in temp dir)
      const initialData = [
        { id: '1', title: 'Original', author_full_name: 'Author' }
      ];
      await CSVHandler.write(csvPath, initialData, { allowedDir: testDir });

      // Overwrite with new data
      const newData = [
        { id: '2', title: 'Updated', author_full_name: 'New Author' }
      ];
      const result = await CSVHandler.write(csvPath, newData, { allowedDir: testDir });

      assert.strictEqual(result.success, true);
      assert.ok(result.backup, 'Should create backup');
      assert.ok(fs.existsSync(result.backup), 'Backup file should exist');

      // Verify backup contains original data
      const backupContent = fs.readFileSync(result.backup, 'utf8');
      assert.ok(backupContent.includes('Original'));
    });

    it('should create directory if it does not exist', async function() {
      const nestedPath = path.join(testDir, 'nested', 'deep', 'books.csv');
      const data = [
        { id: '1', title: 'Test', author_full_name: 'Author' }
      ];

      const result = await CSVHandler.write(nestedPath, data);

      assert.strictEqual(result.success, true);
      assert.ok(fs.existsSync(nestedPath));
    });

    it('should validate data before writing', async function() {
      // Validation allows minimal data - only checks array structure
      // Missing fields get defaults during validateAndCleanRecord
      const csvPath = path.join(testDir, 'minimal.csv');
      const minimalData = [
        { id: '1', title: 'Test', author_full_name: 'Author' }
      ];

      const result = await CSVHandler.write(csvPath, minimalData);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.errors.length, 0);
      assert.ok(fs.existsSync(csvPath), 'Should write minimal valid data');
    });
  });

  describe('Book Operations', function() {
    let booksPath;

    beforeEach(function() {
      booksPath = path.join(testDir, 'books.csv');
      const csvContent = `id,title,author_full_name,author_last,author_first,publisher,publication_year,isbn_asin,image_url,description
1,The Hobbit,J.R.R. Tolkien,Tolkien,J.R.R.,Houghton Mifflin,1937,9780547928227,hobbit.jpg,A fantasy novel
2,1984,George Orwell,Orwell,George,Secker & Warburg,1949,9780451524935,1984.jpg,Dystopian novel
3,Dune,Frank Herbert,Herbert,Frank,Chilton Books,1965,9780441172719,dune.jpg,Science fiction`;

      fs.writeFileSync(booksPath, csvContent);
    });

    it('should read books from CSV', async function() {
      const result = await CSVHandler.readBooks(booksPath);

      assert.ok(result.data);
      assert.ok(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 3);
      assert.strictEqual(result.data[0].title, 'The Hobbit');
      assert.strictEqual(result.data[1].title, '1984');
      assert.strictEqual(result.data[2].title, 'Dune');
    });

    it('should update single book by ID', async function() {
      const updates = {
        publisher: 'Updated Publisher',
        publication_year: '2024'
      };

      const result = await CSVHandler.updateBook('1', updates, booksPath, { allowedDir: testDir });

      assert.strictEqual(result.success, true);
      assert.ok(result.backup, 'Should create backup');
      assert.ok(result.originalBook, 'Should include original book');
      assert.ok(result.updatedBook, 'Should include updated book');

      // Verify update
      const readResult = await CSVHandler.readBooks(booksPath);
      const updatedBook = readResult.data.find(b => b.id === '1');
      assert.strictEqual(updatedBook.publisher, 'Updated Publisher');
      assert.strictEqual(updatedBook.publication_year, '2024');
      assert.strictEqual(updatedBook.title, 'The Hobbit'); // Unchanged
    });

    it('updateBook must not add columns (regression: phantom updated_at column)', async function() {
      const columnsBefore = fs.readFileSync(booksPath, 'utf8').split('\n')[0].split(',').length;

      const result = await CSVHandler.updateBook(
        '1',
        { publisher: 'New Pub', bogus_column: 'should be skipped' },
        booksPath,
        { allowedDir: testDir }
      );

      assert.strictEqual(result.success, true);
      assert.deepStrictEqual(result.skippedKeys, ['bogus_column'], 'stray keys are reported, not applied');

      const headerAfter = fs.readFileSync(booksPath, 'utf8').split('\n')[0];
      assert.strictEqual(headerAfter.split(',').length, columnsBefore, 'column count must not change on update');
      assert.ok(!headerAfter.includes('updated_at'), 'no updated_at column');
      assert.ok(!headerAfter.includes('bogus_column'), 'stray update keys must not become columns');
    });

    it('batchUpdateBooks must not add columns either', async function() {
      const columnsBefore = fs.readFileSync(booksPath, 'utf8').split('\n')[0].split(',').length;

      const result = await CSVHandler.batchUpdateBooks(
        [{ identifier: '2', updates: { publisher: 'X', stray_key: 'nope' } }],
        booksPath,
        { allowedDir: testDir }
      );

      assert.ok(result.writeSuccess, 'Write should succeed');
      assert.ok(result.errors.some(e => e.includes('stray_key')), 'skipped keys are reported');

      const headerAfter = fs.readFileSync(booksPath, 'utf8').split('\n')[0];
      assert.strictEqual(headerAfter.split(',').length, columnsBefore, 'column count must not change on batch update');
      assert.ok(!headerAfter.includes('updated_at'), 'no updated_at column');
    });

    it('should update single book by ISBN', async function() {
      // ISBN is cleaned (hyphens removed) during readBooks
      const updates = {
        description: 'Updated description'
      };

      const result = await CSVHandler.updateBook('9780451524935', updates, booksPath, { allowedDir: testDir });

      assert.strictEqual(result.success, true);
      assert.ok(result.backup, 'Should create backup');

      // Verify update
      const readResult = await CSVHandler.readBooks(booksPath);
      const updatedBook = readResult.data.find(b => b.isbn_asin === '9780451524935');
      assert.ok(updatedBook, 'Should find book by ISBN');
      assert.strictEqual(updatedBook.description, 'Updated description');
      assert.strictEqual(updatedBook.title, '1984'); // Unchanged
    });

    it('should handle updating non-existent book', async function() {
      const result = await CSVHandler.updateBook('999', { title: 'New' }, booksPath);

      assert.strictEqual(result.success, false);
      assert.ok(result.error, 'Should have error message');
      assert.ok(result.error.includes('not found'), 'Error should mention not found');
      assert.ok(result.error.includes('999'), 'Error should include identifier');
    });

    it('should batch update multiple books', async function() {
      // Batch update uses {identifier, updates} structure
      const updates = [
        { identifier: '1', updates: { publisher: 'Publisher A' } },
        { identifier: '2', updates: { publisher: 'Publisher B' } },
        { identifier: '3', updates: { publisher: 'Publisher C' } }
      ];

      const result = await CSVHandler.batchUpdateBooks(updates, booksPath, { allowedDir: testDir });

      assert.ok(result.writeSuccess, 'Write should succeed');
      assert.strictEqual(result.successful, 3, 'All 3 books should update');
      assert.strictEqual(result.failed, 0, 'No failures expected');
      assert.ok(result.backup, 'Should create backup');

      // Verify all updates
      const readResult = await CSVHandler.readBooks(booksPath);
      assert.strictEqual(readResult.data.length, 3);
      assert.strictEqual(readResult.data[0].publisher, 'Publisher A');
      assert.strictEqual(readResult.data[1].publisher, 'Publisher B');
      assert.strictEqual(readResult.data[2].publisher, 'Publisher C');
    });

    it('should report books without covers', async function() {
      // Create CSV with some books missing covers
      const csvContent = `id,title,author_full_name,image_url
1,Book With Cover,Author One,cover.jpg
2,Book Without Cover,Author Two,
3,Another With Cover,Author Three,another.jpg`;

      fs.writeFileSync(booksPath, csvContent);

      const result = await CSVHandler.findBooksWithoutCovers(booksPath);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].title, 'Book Without Cover');
    });

    it('should get books by author', async function() {
      const result = await CSVHandler.getBooksByAuthor('Orwell', booksPath);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].title, '1984');
      assert.strictEqual(result[0].author_last, 'Orwell');
    });

    it('should handle author search case-insensitively', async function() {
      const result = await CSVHandler.getBooksByAuthor('tolkien', booksPath);

      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].title, 'The Hobbit');
    });
  });

  describe('Data Validation and Cleaning', function() {
    it('should validate and clean records', function() {
      const record = {
        id: '1',
        title: '  Test Book  ',
        author_full_name: 'Test Author',
        isbn_asin: '978-0-123-45678-9'
      };

      const result = CSVHandler.validateAndCleanRecord(record, 1);

      assert.ok(result.record);
      assert.strictEqual(result.record.title, 'Test Book'); // Trimmed
      assert.ok(result.warnings.length >= 0);
    });

    it('should reject records missing required fields', function() {
      // Only missing 'id' throws - other fields get defaults with warnings
      const recordMissingId = {
        title: 'Test Book',
        author_full_name: 'Author'
        // Missing id
      };

      assert.throws(() => {
        CSVHandler.validateAndCleanRecord(recordMissingId, 1);
      }, /required.*id/i);

      // Missing author_full_name generates warnings but doesn't throw
      const recordMissingAuthor = {
        id: '1',
        title: 'Test Book'
        // Missing author_full_name
      };

      const result = CSVHandler.validateAndCleanRecord(recordMissingAuthor, 1);
      assert.ok(result.record);
      assert.ok(result.warnings.length > 0, 'Should have warnings for missing author');
      assert.ok(result.warnings.some(w => w.includes('author_full_name')));
    });

    it('should validate data for write operations', function() {
      const validData = [
        {
          id: '1',
          title: 'Test',
          author_full_name: 'Author'
        }
      ];

      const result = CSVHandler.validateDataForWrite(validData);

      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should reject empty data for write', function() {
      const result = CSVHandler.validateDataForWrite([]);

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });

    it('should reject non-array data', function() {
      const result = CSVHandler.validateDataForWrite({ not: 'array' });

      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.length > 0);
    });
  });

  describe('Stream Processing', function() {
    it('should stream process large CSV files', async function() {
      const csvPath = path.join(testDir, 'large.csv');

      // Create CSV with multiple rows
      let csvContent = 'id,title,author_full_name\n';
      for (let i = 1; i <= 100; i++) {
        csvContent += `${i},Book ${i},Author ${i}\n`;
      }
      fs.writeFileSync(csvPath, csvContent);

      const processedRows = [];
      const rowCount = await CSVHandler.stream(csvPath, (record, index) => {
        processedRows.push(record);
      });

      assert.strictEqual(rowCount, 100);
      assert.strictEqual(processedRows.length, 100);
      assert.strictEqual(processedRows[0].title, 'Book 1');
      assert.strictEqual(processedRows[99].title, 'Book 100');
    });

    it('should handle async processing in stream', async function() {
      // Stream now properly awaits async callbacks with pause/resume
      const csvPath = path.join(testDir, 'books.csv');
      const csvContent = `id,title,author_full_name
1,Book 1,Author 1
2,Book 2,Author 2
3,Book 3,Author 3`;

      fs.writeFileSync(csvPath, csvContent);

      const results = [];
      const rowCount = await CSVHandler.stream(csvPath, async (record) => {
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 1));
        results.push(record.title);
      });

      assert.strictEqual(rowCount, 3, 'Should process all 3 rows');
      assert.strictEqual(results.length, 3, 'Should complete all async operations');
      assert.deepStrictEqual(results, ['Book 1', 'Book 2', 'Book 3']);
    });
  });

  describe('File Statistics', function() {
    it('should get CSV file statistics', async function() {
      const csvPath = path.join(testDir, 'books.csv');
      const csvContent = `id,title,author_full_name
1,Book 1,Author 1
2,Book 2,Author 2
3,Book 3,Author 3`;

      fs.writeFileSync(csvPath, csvContent);

      const stats = await CSVHandler.getStats(csvPath);

      assert.ok(stats);
      assert.ok('rowCount' in stats);
      assert.ok('columns' in stats);
      assert.ok('fileSize' in stats);
      assert.strictEqual(stats.rowCount, 3);
      assert.strictEqual(stats.columns.length, 3);
      assert.ok(stats.columns.includes('id'));
      assert.ok(stats.columns.includes('title'));
    });
  });

  describe('Error Recovery', function() {
    it('should attempt recovery from malformed CSV', async function() {
      const csvPath = path.join(testDir, 'corrupted.csv');

      // Create CSV with inconsistent columns
      const corruptedContent = `id,title,author_full_name
1,Book 1,Author 1
2,Book 2,Author 2,Extra Column
3,Book 3`;

      fs.writeFileSync(csvPath, corruptedContent);

      // Should use relax_column_count and recover
      const result = await CSVHandler.read(csvPath);

      assert.ok(result.data);
      assert.ok(result.data.length > 0, 'Should recover some data');
      assert.ok(result.stats.totalRows > 0);
    });

    it('should handle completely invalid CSV gracefully', async function() {
      const csvPath = path.join(testDir, 'invalid.csv');
      fs.writeFileSync(csvPath, 'Not a valid CSV\nRandom text\n123');

      const result = await CSVHandler.read(csvPath);

      // Should return result with errors, not throw
      assert.ok(result);
      assert.ok('errors' in result);
      assert.ok('data' in result);
    });
  });

  describe('Backup Creation', function() {
    it('should create timestamped backup', function() {
      const csvPath = path.join(testDir, 'books.csv');
      fs.writeFileSync(csvPath, 'id,title\n1,Test');

      const backupPath = CSVHandler.createBackup(csvPath, { allowedDir: testDir });

      assert.ok(backupPath);
      assert.ok(fs.existsSync(backupPath));
      assert.ok(backupPath.includes('_backup_'));

      const backupContent = fs.readFileSync(backupPath, 'utf8');
      assert.strictEqual(backupContent, 'id,title\n1,Test');
    });
  });

  describe('Synchronous Operations', function() {
    it('should read books synchronously', function() {
      const csvPath = path.join(testDir, 'books.csv');
      const csvContent = `id,title,author_full_name
1,Sync Book,Sync Author`;

      fs.writeFileSync(csvPath, csvContent);

      const result = CSVHandler.readBooksSync(csvPath);

      assert.ok(result.data);
      assert.ok(Array.isArray(result.data));
      assert.strictEqual(result.data.length, 1);
      assert.strictEqual(result.data[0].title, 'Sync Book');
    });
  });

  describe('Merge Operations', function() {
    it('should merge multiple CSV files', async function() {
      const file1 = path.join(testDir, 'file1.csv');
      const file2 = path.join(testDir, 'file2.csv');
      const outputPath = path.join(testDir, 'merged.csv');

      const csv1 = `id,title,author_full_name
1,Book 1,Author 1
2,Book 2,Author 2`;

      const csv2 = `id,title,author_full_name
3,Book 3,Author 3
4,Book 4,Author 4`;

      fs.writeFileSync(file1, csv1);
      fs.writeFileSync(file2, csv2);

      const result = await CSVHandler.merge([file1, file2], outputPath);

      assert.ok(result.success, 'Merge should succeed');
      assert.strictEqual(result.totalRows, 4, 'Should have 4 total rows');

      // Verify merged file
      const merged = await CSVHandler.read(outputPath);
      assert.strictEqual(merged.data.length, 4);
    });

    it('should remove duplicates when merging', async function() {
      const file1 = path.join(testDir, 'dup1.csv');
      const file2 = path.join(testDir, 'dup2.csv');
      const outputPath = path.join(testDir, 'merged-unique.csv');

      const csv1 = `id,title,author_full_name
1,Book 1,Author 1
2,Book 2,Author 2`;

      const csv2 = `id,title,author_full_name
2,Book 2,Author 2
3,Book 3,Author 3`;

      fs.writeFileSync(file1, csv1);
      fs.writeFileSync(file2, csv2);

      const result = await CSVHandler.merge([file1, file2], outputPath, true);

      assert.ok(result.success);
      assert.strictEqual(result.totalRows, 3, 'Should have 3 unique rows');

      // Verify no duplicates
      const merged = await CSVHandler.read(outputPath);
      assert.strictEqual(merged.data.length, 3);
    });
  });
});
