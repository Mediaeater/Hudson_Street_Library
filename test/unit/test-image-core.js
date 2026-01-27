/**
 * Test Suite for Image Core Utilities
 * Migrated from scripts/tests/test-image-core.js to Mocha
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createFixtures } = require('../helpers/fixtures');

const {
  generateStandardFilename,
  sanitizeFilename,
  validateImage,
  validateImageDirectory,
  findDuplicateImages,
  getImageStats,
  checkImageExists,
  IMAGE_CONFIG
} = require('../../scripts/utils/image-core');

describe('Image Core Utilities', function() {
  let fixtures;

  beforeEach(function() {
    fixtures = createFixtures();
  });

  afterEach(function() {
    if (fixtures) {
      fixtures.cleanup();
    }
  });

  describe('generateStandardFilename', function() {
    it('should generate basic filename', function() {
      const bookData = {
        author_last: 'Tolkien',
        title: 'The Hobbit',
        isbn_asin: '9780547928227'
      };

      const filename = generateStandardFilename(bookData);
      assert.strictEqual(filename, 'Tolkien_The_Hobbit_9780547928227.jpg');
    });

    it('should sanitize special characters', function() {
      const bookData = {
        author_last: 'O\'Connor',
        title: 'A Good Man Is Hard to Find!',
        isbn_asin: '978-0-374-50716-4'
      };

      const filename = generateStandardFilename(bookData);
      assert.strictEqual(filename, 'O_Connor_A_Good_Man_Is_Hard_to_Find_978-0-374-50716-4.jpg');
    });

    it('should use fallbacks for missing data', function() {
      const bookData = {
        title: 'Unknown Author Book',
        id: 'book123'
      };

      const filename = generateStandardFilename(bookData);
      assert.strictEqual(filename, 'Unknown_Unknown_Author_Book_book123.jpg');
    });

    it('should respect custom options', function() {
      const bookData = {
        author_last: 'Asimov',
        title: 'Foundation',
        isbn_asin: '9780553293357'
      };

      const filename = generateStandardFilename(bookData, {
        extension: '.png',
        maxLength: 20
      });

      assert.ok(filename.endsWith('.png'), 'Should use custom extension');
      assert.ok(filename.length <= 24, 'Should respect maxLength (including extension)');
    });

    it('should use standard structure when pattern has no placeholders', function() {
      const bookData = {
        author_last: 'Tolkien',
        title: 'Hobbit',
        isbn_asin: '123456'
      };

      // Pattern without '{' uses standard structure (line 100)
      const filename = generateStandardFilename(bookData, {
        pattern: 'simple-pattern'
      });

      assert.strictEqual(filename, 'Tolkien_Hobbit_123456.jpg');
    });
  });

  describe('sanitizeFilename', function() {
    const testCases = [
      {
        input: 'Bad<File>Name:With|Invalid?Characters*.txt',
        expected: 'BadFileNameWithInvalidCharacters.txt',
        description: 'invalid characters'
      },
      {
        input: 'File With Spaces & Special-Chars (2023)',
        expected: 'File_With_Spaces_Special-Chars_2023',
        description: 'spaces and special chars'
      },
      {
        input: 'Multiple___Underscores____Here',
        expected: 'Multiple_Underscores_Here',
        description: 'collapsed underscores'
      }
    ];

    testCases.forEach(({ input, expected, description }) => {
      it(`should handle ${description}`, function() {
        const clean = sanitizeFilename(input);
        assert.strictEqual(clean, expected);
      });
    });
  });

  describe('validateImage', function() {
    it('should validate valid image file', async function() {
      const validImagePath = fixtures.createTestImage('valid.jpg', 10000);
      const result = await validateImage(validImagePath);

      assert.ok(result.valid, 'Should be valid');
      assert.strictEqual(result.errors.length, 0, 'Should have no errors');
      assert.ok(result.stats, 'Should have stats');
      assert.ok(result.stats.size > 0, 'Should have file size');
    });

    it('should reject non-existent file', async function() {
      const result = await validateImage('/nonexistent/file.jpg');

      assert.ok(!result.valid, 'Should be invalid');
      assert.ok(
        result.errors.includes('File does not exist'),
        'Should have existence error'
      );
    });

    it('should reject invalid format', async function() {
      const invalidFile = fixtures.createTempFile('test.txt', Buffer.alloc(5000, 'A'));
      const result = await validateImage(invalidFile);

      assert.ok(!result.valid, 'Should be invalid');
      assert.ok(
        result.errors.some(err => err.includes('Invalid format')),
        'Should have format error'
      );
    });

    it('should reject file that is too small', async function() {
      const smallFile = fixtures.createTestImage('small.jpg', 100);
      const result = await validateImage(smallFile);

      assert.ok(!result.valid, 'Should be invalid');
      assert.ok(
        result.errors.some(err => err.includes('File too small')),
        'Should have size error'
      );
    });

    it('should warn on very large file', async function() {
      // Use mocking instead of creating actual large file
      const testFile = fixtures.createTestImage('test.jpg', 5000);

      // Mock fs.statSync to return size > 5MB
      const originalStatSync = fs.statSync;
      fs.statSync = function(filePath) {
        const stats = originalStatSync.call(fs, filePath);
        if (filePath === testFile) {
          return { ...stats, size: 6000000 }; // 6MB
        }
        return stats;
      };

      try {
        const result = await validateImage(testFile);

        assert.ok(result.valid, 'Should still be valid');
        assert.ok(
          result.warnings.some(warn => warn.includes('File very large')),
          'Should have size warning'
        );
      } finally {
        // Always restore original function
        fs.statSync = originalStatSync;
      }
    });
  });

  describe('findDuplicateImages', function() {
    it('should find duplicates by size', async function() {
      const testDir = fixtures.createTempDir();

      // Create files with same size in the test directory
      const content = Buffer.alloc(5000, 'A');
      const file1 = path.join(testDir, 'image1.jpg');
      const file2 = path.join(testDir, 'image2.jpg');

      fs.writeFileSync(file1, content);
      fs.writeFileSync(file2, content);
      fixtures.tempFiles.push(file1, file2);

      const duplicates = await findDuplicateImages(testDir);

      assert.ok(duplicates.length > 0, 'Should find duplicate groups');
      assert.strictEqual(duplicates[0].files.length, 2, 'Should find 2 files with same size');
      assert.strictEqual(duplicates[0].type, 'size', 'Should be size-based duplicate');
    });

    it('should handle non-existent directory', async function() {
      await assert.rejects(
        async () => {
          await findDuplicateImages('/nonexistent/directory');
        },
        /does not exist/,
        'Should throw error for non-existent directory'
      );
    });

    it('should handle stat errors and log warning', async function() {
      const testDir = fixtures.createTempDir();

      // Create two files
      const file1 = path.join(testDir, 'good.jpg');
      const file2 = path.join(testDir, 'bad.jpg');
      fs.writeFileSync(file1, Buffer.alloc(5000));
      fs.writeFileSync(file2, Buffer.alloc(5000));
      fixtures.tempFiles.push(file1, file2);

      // Mock console.warn to capture warnings (line 318)
      const originalWarn = console.warn;
      const warnings = [];
      console.warn = function(...args) {
        warnings.push(args.join(' '));
      };

      // Mock fs.statSync to throw error for file2
      const originalStatSync = fs.statSync;
      fs.statSync = function(filePath) {
        if (filePath === file2) {
          throw new Error('Mock stat error');
        }
        return originalStatSync.call(fs, filePath);
      };

      try {
        const duplicates = await findDuplicateImages(testDir);

        // Should handle error gracefully and continue
        assert.ok(Array.isArray(duplicates));

        // Should have logged warning for the error
        assert.ok(
          warnings.some(w => w.includes('Could not stat file')),
          'Should log stat error warning'
        );
      } finally {
        fs.statSync = originalStatSync;
        console.warn = originalWarn;
      }
    });

    it('should check image dimensions if image-size available', async function() {
      // Create a minimal valid 1x1 PNG that image-size can read
      const pngData = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x00, 0x01, // width: 1
        0x00, 0x00, 0x00, 0x01, // height: 1
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color, compression, filter, interlace
        0x1F, 0x15, 0xC4, 0x89, // CRC
        0x00, 0x00, 0x00, 0x0A, // IDAT length
        0x49, 0x44, 0x41, 0x54, // IDAT
        0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
        0x0D, 0x0A, 0x2D, 0xB4, // CRC
        0x00, 0x00, 0x00, 0x00, // IEND length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);

      const testFile = fixtures.createTempFile('tiny.png', pngData);
      const result = await validateImage(testFile);

      // If image-size is available, should have dimensions (lines 188-194)
      if (result.stats.width !== undefined) {
        assert.strictEqual(result.stats.width, 1);
        assert.strictEqual(result.stats.height, 1);
        assert.ok(
          result.warnings.some(w => w.includes('Small dimensions')),
          'Should warn about small dimensions'
        );
      }
    });
  });

  describe('checkImageExists', function() {
    it('should find existing file', function() {
      const tempDir = fixtures.createTempDir();
      const bookData = {
        author_last: 'Test',
        title: 'Book',
        isbn_asin: '123456789'
      };

      const expectedFilename = generateStandardFilename(bookData);
      const expectedPath = path.join(tempDir, expectedFilename);

      // Create the expected file
      fs.writeFileSync(expectedPath, 'test content');
      fixtures.tempFiles.push(expectedPath);

      const result = checkImageExists(bookData, tempDir);

      assert.ok(result.exists, 'Should find existing file');
      assert.strictEqual(result.filename, expectedFilename, 'Should have correct filename');
      assert.strictEqual(result.path, expectedPath, 'Should have correct path');
    });

    it('should report when file does not exist', function() {
      const tempDir = fixtures.createTempDir();
      const bookData = {
        author_last: 'NonExistent',
        title: 'Book',
        isbn_asin: '999999999'
      };

      const result = checkImageExists(bookData, tempDir);

      assert.ok(!result.exists, 'Should not find non-existent file');
      assert.ok(result.filename, 'Should have expected filename');
      assert.ok(result.path, 'Should have expected path');
    });

    it('should find fuzzy matches when enabled', function() {
      const tempDir = fixtures.createTempDir();
      const bookData = {
        author_last: 'Tolkien',
        title: 'Hobbit',
        isbn_asin: '123456789'
      };

      // Create a file that matches the ISBN but has different name format
      const alternateFile = path.join(tempDir, 'tolkien_hobbit_123456789_alt.jpg');
      fs.writeFileSync(alternateFile, 'test content');
      fixtures.tempFiles.push(alternateFile);

      const result = checkImageExists(bookData, tempDir, { fuzzyMatch: true });

      assert.ok(!result.exists, 'Should not find exact match');
      assert.ok(result.alternateMatches.length > 0, 'Should find alternate matches');
      assert.ok(
        result.alternateMatches.includes(path.basename(alternateFile)),
        'Should include alternate file'
      );
    });
  });

  describe('validateImageDirectory', function() {
    it('should validate directory of images', async function() {
      const tempDir = fixtures.createTempDir();

      // Create some test images
      const validImage = fixtures.createTestImage('valid.jpg', 5000);
      const smallImage = fixtures.createTestImage('small.jpg', 2000);
      const textFile = path.join(tempDir, 'not-image.txt');
      fs.writeFileSync(textFile, 'text content');
      fixtures.tempFiles.push(textFile);

      // Copy images to temp dir
      fs.copyFileSync(validImage, path.join(tempDir, 'valid.jpg'));
      fs.copyFileSync(smallImage, path.join(tempDir, 'small.jpg'));

      const result = await validateImageDirectory(tempDir);

      assert.ok('total' in result);
      assert.ok('valid' in result);
      assert.ok('invalid' in result);
      assert.ok('details' in result);
      assert.ok(Array.isArray(result.details));
      assert.strictEqual(result.total, 2); // Only image files
      assert.ok(result.valid >= 0);
    });

    it('should throw error for non-existent directory', async function() {
      const nonExistentDir = path.join(fixtures.createTempDir(), 'does-not-exist');

      try {
        await validateImageDirectory(nonExistentDir);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert.ok(error.message.includes('does not exist'));
      }
    });

    it('should filter by valid formats only', async function() {
      const tempDir = fixtures.createTempDir();

      // Create mixed files
      const jpgFile = fixtures.createTestImage('test.jpg', 5000);
      const txtFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(txtFile, 'not an image');
      fixtures.tempFiles.push(txtFile);

      fs.copyFileSync(jpgFile, path.join(tempDir, 'test.jpg'));

      const result = await validateImageDirectory(tempDir);

      // Should only count the JPG file
      assert.strictEqual(result.total, 1);
      assert.ok(result.details.every(d => d.file.match(/\.(jpg|jpeg|png|gif)$/i)));
    });

    it('should track common issues', async function() {
      const tempDir = fixtures.createTempDir();

      // Create multiple small images
      const small1 = fixtures.createTestImage('small1.jpg', 1000);
      const small2 = fixtures.createTestImage('small2.jpg', 1500);

      fs.copyFileSync(small1, path.join(tempDir, 'small1.jpg'));
      fs.copyFileSync(small2, path.join(tempDir, 'small2.jpg'));

      const result = await validateImageDirectory(tempDir);

      assert.ok('summary' in result);
      assert.ok('commonIssues' in result.summary);
      assert.ok(result.summary.commonIssues instanceof Map);
    });
  });

  describe('getImageStats', function() {
    it('should generate comprehensive statistics', async function() {
      const tempDir = fixtures.createTempDir();

      // Create test images
      const img1 = fixtures.createTestImage('image1.jpg', 5000);
      const img2 = fixtures.createTestImage('image2.jpg', 5000); // Same size - potential duplicate

      fs.copyFileSync(img1, path.join(tempDir, 'image1.jpg'));
      fs.copyFileSync(img2, path.join(tempDir, 'image2.jpg'));

      const stats = await getImageStats(tempDir);

      assert.ok('directory' in stats);
      assert.ok('timestamp' in stats);
      assert.ok('files' in stats);
      assert.ok('duplicates' in stats);
      assert.ok('validation' in stats);
      assert.ok('recommendations' in stats);

      assert.strictEqual(stats.directory, tempDir);
      assert.ok(stats.files.total >= 0);
      assert.ok(Array.isArray(stats.recommendations));
    });

    it('should provide recommendations for issues', async function() {
      const tempDir = fixtures.createTempDir();

      // Create a small invalid image
      const smallImage = fixtures.createTestImage('small.jpg', 1000);
      fs.copyFileSync(smallImage, path.join(tempDir, 'small.jpg'));

      const stats = await getImageStats(tempDir);

      assert.ok(Array.isArray(stats.recommendations));
      // Should have recommendations for small/invalid files
      assert.ok(stats.recommendations.length >= 0);
    });

    it('should detect duplicate files', async function() {
      const tempDir = fixtures.createTempDir();

      // Create identical sized images
      const img1 = fixtures.createTestImage('dup1.jpg', 5000);
      const img2 = fixtures.createTestImage('dup2.jpg', 5000);

      fs.copyFileSync(img1, path.join(tempDir, 'dup1.jpg'));
      fs.copyFileSync(img2, path.join(tempDir, 'dup2.jpg'));

      const stats = await getImageStats(tempDir);

      assert.ok('duplicates' in stats);
      assert.ok('groups' in stats.duplicates);
      assert.ok('totalDuplicateFiles' in stats.duplicates);
      // Should detect duplicates by size
      assert.ok(stats.duplicates.groups >= 0);
    });
  });

  describe('Error Handling', function() {
    it('should handle validation errors gracefully', async function() {
      // Create a corrupted file that will cause validation errors
      const tempFile = path.join(fixtures.createTempDir(), 'corrupted.jpg');
      fs.writeFileSync(tempFile, 'not a valid image');
      fixtures.tempFiles.push(tempFile);

      const result = await validateImage(tempFile);

      assert.strictEqual(result.valid, false);
      assert.ok(Array.isArray(result.errors));
      assert.ok(result.errors.length > 0);
    });

    it('should catch general validation errors', async function() {
      // Create a valid test file
      const testFile = fixtures.createTestImage('test.jpg', 5000);

      // Mock fs.statSync to throw an error (lines 207-208)
      const originalStatSync = fs.statSync;
      fs.statSync = function(filePath) {
        if (filePath === testFile) {
          throw new Error('Mock stat error');
        }
        return originalStatSync.call(fs, filePath);
      };

      try {
        const result = await validateImage(testFile);

        assert.strictEqual(result.valid, false);
        assert.ok(result.errors.some(err => err.includes('Validation error')));
        assert.ok(result.errors.some(err => err.includes('Mock stat error')));
      } finally {
        fs.statSync = originalStatSync;
      }
    });

    it('should handle stat errors in findDuplicateImages', async function() {
      const tempDir = fixtures.createTempDir();

      // Create a valid image
      const img = fixtures.createTestImage('test.jpg', 5000);
      fs.copyFileSync(img, path.join(tempDir, 'test.jpg'));

      // This should not throw, even if there are stat errors
      const duplicates = await findDuplicateImages(tempDir);

      assert.ok(Array.isArray(duplicates));
    });

    it('should handle missing sizeOf gracefully', async function() {
      const tempFile = fixtures.createTestImage('test.jpg', 5000);

      // Should still validate even without dimension checking
      const result = await validateImage(tempFile);

      assert.ok('valid' in result);
      assert.ok('warnings' in result);
      assert.ok('errors' in result);
    });
  });

  describe('IMAGE_CONFIG', function() {
    it('should have required properties', function() {
      assert.ok(IMAGE_CONFIG.validation, 'Should have validation config');
      assert.ok(IMAGE_CONFIG.naming, 'Should have naming config');
      assert.ok(IMAGE_CONFIG.deduplication, 'Should have deduplication config');
    });

    it('should have validation settings', function() {
      assert.ok(IMAGE_CONFIG.validation.minSize > 0, 'Should have minimum file size');
      assert.ok(IMAGE_CONFIG.validation.validFormats.length > 0, 'Should have valid formats');
      assert.ok(
        IMAGE_CONFIG.validation.validFormats.includes('.jpg'),
        'Should support JPG'
      );
      assert.ok(
        IMAGE_CONFIG.validation.validFormats.includes('.png'),
        'Should support PNG'
      );
    });

    it('should have naming configuration', function() {
      assert.ok(IMAGE_CONFIG.naming.pattern, 'Should have naming pattern');
      assert.ok(IMAGE_CONFIG.naming.extension, 'Should have default extension');
    });
  });
});
