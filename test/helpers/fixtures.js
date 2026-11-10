/**
 * Test Fixtures
 * Reusable test data and setup utilities inspired by datasette-enrichments
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class TestFixtures {
  constructor() {
    this.tempFiles = [];
    this.tempDirs = [];
  }

  /**
   * Create a test CSV file with book data
   */
  createTestCSV(filename = 'books.csv', rows = []) {
    const defaultRows = [
      {
        isbn_asin: '978-0-123456-78-9',
        title: 'Test Book',
        author_full_name: 'Test Author',
        publisher: 'Test Publisher',
        year_published: '2020',
        tags: 'fiction'
      }
    ];

    const data = rows.length > 0 ? rows : defaultRows;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const value = row[h] || '';
        // Escape quotes by doubling them
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ].join('\n');

    const filePath = this.createTempFile(filename, csvContent);
    return filePath;
  }

  /**
   * Create a temporary file
   */
  createTempFile(filename, content = '') {
    const tempDir = this.createTempDir();
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content);
    this.tempFiles.push(filePath);
    return filePath;
  }

  /**
   * Create a temporary directory
   */
  createTempDir() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-test-'));
    this.tempDirs.push(tempDir);
    return tempDir;
  }

  /**
   * Create a minimal valid image file for testing
   */
  createTestImage(filename = 'test.jpg', size = 5000) {
    // JPEG file header (minimal structure)
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, // SOI + APP0
      0x00, 0x10, // Length
      0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
      0x01, 0x01, // Version
      0x01, // Units
      0x00, 0x48, 0x00, 0x48, // Density
      0x00, 0x00, // Thumbnail
      0xFF, 0xD9 // EOI
    ]);

    const padding = Buffer.alloc(Math.max(0, size - jpegHeader.length), 0);
    const content = Buffer.concat([jpegHeader, padding]);

    return this.createTempFile(filename, content);
  }

  /**
   * Cleanup all temporary resources
   * Similar to datasette-enrichments fixture teardown pattern
   */
  cleanup() {
    // Remove temp files
    for (const file of this.tempFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      } catch (error) {
        console.warn(`Warning: Could not remove ${file}: ${error.message}`);
      }
    }

    // Remove temp directories
    for (const dir of this.tempDirs) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
        }
      } catch (error) {
        console.warn(`Warning: Could not remove ${dir}: ${error.message}`);
      }
    }

    // Reset arrays
    this.tempFiles = [];
    this.tempDirs = [];
  }
}

/**
 * Create a fresh fixtures instance for each test
 * Usage in tests: const fixtures = createFixtures();
 */
function createFixtures() {
  return new TestFixtures();
}

module.exports = {
  TestFixtures,
  createFixtures
};
