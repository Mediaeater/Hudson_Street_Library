/**
 * CSV Operations Tests
 * Real-world example testing CSV parsing similar to datasette-enrichments
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('assert');
const fs = require('fs');
const csv = require('csv-parse/sync');
const { createFixtures } = require('../helpers/fixtures');

describe('CSV Operations', function() {
  let fixtures;

  beforeEach(function() {
    fixtures = createFixtures();
  });

  afterEach(function() {
    fixtures.cleanup();
  });

  describe('Parsing books.csv', function() {
    it('should parse CSV with all fields', function() {
      const rows = [
        {
          isbn_asin: '978-0-123456-78-9',
          title: 'Test Book',
          author_full_name: 'John Doe',
          publisher: 'Test Publishing',
          year_published: '2020',
          tags: 'fiction,test'
        }
      ];

      const csvPath = fixtures.createTestCSV('books.csv', rows);
      const content = fs.readFileSync(csvPath, 'utf8');
      const parsed = csv.parse(content, { columns: true, skip_empty_lines: true });

      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].title, 'Test Book');
      assert.strictEqual(parsed[0].author_full_name, 'John Doe');
    });

    it('should handle missing optional fields', function() {
      const rows = [
        {
          isbn_asin: '',
          title: 'Minimal Book',
          author_full_name: 'Jane Smith',
          publisher: '',
          year_published: '',
          tags: ''
        }
      ];

      const csvPath = fixtures.createTestCSV('books.csv', rows);
      const content = fs.readFileSync(csvPath, 'utf8');
      const parsed = csv.parse(content, { columns: true, skip_empty_lines: true });

      assert.strictEqual(parsed.length, 1);
      assert.strictEqual(parsed[0].title, 'Minimal Book');
      assert.strictEqual(parsed[0].isbn_asin, '');
    });

    it('should handle special characters in titles', function() {
      const testCases = [
        { title: 'Book: A Story', expected: 'Book: A Story' },
        { title: 'Book "Quoted"', expected: 'Book "Quoted"' },
        { title: "Book's Title", expected: "Book's Title" },
        { title: 'Book & More', expected: 'Book & More' }
      ];

      testCases.forEach(({ title, expected }) => {
        const rows = [{
          isbn_asin: '',
          title: title,
          author_full_name: 'Author',
          publisher: '',
          year_published: '',
          tags: ''
        }];

        const csvPath = fixtures.createTestCSV(`test-${Date.now()}.csv`, rows);
        const content = fs.readFileSync(csvPath, 'utf8');
        const parsed = csv.parse(content, { columns: true, skip_empty_lines: true });

        assert.strictEqual(parsed[0].title, expected);
      });
    });

    it('should handle multiple books', function() {
      const rows = [
        {
          isbn_asin: '978-0-123456-78-9',
          title: 'Book One',
          author_full_name: 'Author One',
          publisher: 'Publisher A',
          year_published: '2020',
          tags: 'fiction'
        },
        {
          isbn_asin: '978-0-987654-32-1',
          title: 'Book Two',
          author_full_name: 'Author Two',
          publisher: 'Publisher B',
          year_published: '2021',
          tags: 'non-fiction'
        }
      ];

      const csvPath = fixtures.createTestCSV('books.csv', rows);
      const content = fs.readFileSync(csvPath, 'utf8');
      const parsed = csv.parse(content, { columns: true, skip_empty_lines: true });

      assert.strictEqual(parsed.length, 2);
      assert.strictEqual(parsed[0].title, 'Book One');
      assert.strictEqual(parsed[1].title, 'Book Two');
    });
  });

  describe('Tag parsing', function() {
    const tagTests = [
      { tags: 'fiction', expected: ['fiction'] },
      { tags: 'fiction,non-fiction', expected: ['fiction', 'non-fiction'] },
      { tags: 'art,design,photography', expected: ['art', 'design', 'photography'] },
      { tags: '', expected: [] },
      { tags: '  spaced  ,  tags  ', expected: ['spaced', 'tags'] }
    ];

    tagTests.forEach(({ tags, expected }) => {
      it(`should parse "${tags}"`, function() {
        const parsed = tags
          ? tags.split(',').map(t => t.trim()).filter(t => t)
          : [];

        assert.deepStrictEqual(parsed, expected);
      });
    });
  });

  describe('ISBN validation patterns', function() {
    const isbnTests = [
      { isbn: '978-0-123456-78-9', valid: true, type: 'ISBN-13 with hyphens' },
      { isbn: '9780123456789', valid: true, type: 'ISBN-13 without hyphens' },
      { isbn: '0-123456-789-X', valid: true, type: 'ISBN-10 with X' },
      { isbn: '0123456789', valid: true, type: 'ISBN-10 numeric' },
      { isbn: '', valid: false, type: 'empty' },
      { isbn: 'not-an-isbn', valid: false, type: 'invalid format' }
    ];

    isbnTests.forEach(({ isbn, valid, type }) => {
      it(`should ${valid ? 'accept' : 'reject'} ${type}`, function() {
        const isValidFormat = /^[\d-X]{10,17}$/.test(isbn) && isbn.length > 0;
        assert.strictEqual(isValidFormat, valid);
      });
    });
  });

  describe('Year validation', function() {
    const yearTests = [
      { year: '2020', valid: true, parsed: 2020 },
      { year: '1900', valid: true, parsed: 1900 },
      { year: '', valid: false, parsed: null },
      { year: 'unknown', valid: false, parsed: null },
      { year: '999', valid: false, parsed: null }
    ];

    yearTests.forEach(({ year, valid, parsed }) => {
      it(`should handle year "${year}"`, function() {
        const yearNum = parseInt(year, 10);
        const isValid = !isNaN(yearNum) && yearNum >= 1000 && yearNum <= 2100;
        const result = isValid ? yearNum : null;

        assert.strictEqual(isValid, valid);
        assert.strictEqual(result, parsed);
      });
    });
  });
});
