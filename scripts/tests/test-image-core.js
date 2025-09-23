/**
 * Test Suite for Image Core Utilities
 * Tests all functions in scripts/utils/image-core.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const {
    generateStandardFilename,
    sanitizeFilename,
    validateImage,
    findDuplicateImages,
    checkImageExists,
    IMAGE_CONFIG
} = require('../utils/image-core');

// Simple test framework
class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.tempFiles = [];
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        console.log(`\n🧪 Running ${this.suiteName} Tests`);
        console.log('='.repeat(50));

        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                this.passed++;
                console.log(`✅ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ ${name}: ${error.message}`);
                if (process.env.VERBOSE) {
                    console.log(`   Stack: ${error.stack}`);
                }
            }
        }

        // Cleanup temp files
        this.cleanup();

        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        return { passed: this.passed, failed: this.failed };
    }

    // Helper to create temporary test files
    createTempFile(filename, size = 1024) {
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, `test-${Date.now()}-${filename}`);
        const content = Buffer.alloc(size, 'A');
        fs.writeFileSync(filePath, content);
        this.tempFiles.push(filePath);
        return filePath;
    }

    createTempImageFile(filename, size = 5000) {
        // Create a minimal valid JPEG file structure
        const tempDir = os.tmpdir();
        const filePath = path.join(tempDir, `test-${Date.now()}-${filename}`);

        // JPEG file header (minimal structure for testing)
        const jpegHeader = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, // SOI + APP0
            0x00, 0x10, // Length
            0x4A, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
            0x01, 0x01, // Version
            0x01, // Units (1 = pixels per inch)
            0x00, 0x48, 0x00, 0x48, // X and Y density (72 DPI)
            0x00, 0x00, // Thumbnail width and height
            0xFF, 0xD9 // EOI
        ]);

        // Pad to desired size
        const padding = Buffer.alloc(Math.max(0, size - jpegHeader.length), 0);
        const content = Buffer.concat([jpegHeader, padding]);

        fs.writeFileSync(filePath, content);
        this.tempFiles.push(filePath);
        return filePath;
    }

    cleanup() {
        for (const file of this.tempFiles) {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (error) {
                console.warn(`Warning: Could not cleanup ${file}: ${error.message}`);
            }
        }
        this.tempFiles = [];
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertContains(array, item, message) {
    if (!array.includes(item)) {
        throw new Error(message || `Expected array to contain ${item}`);
    }
}

function assertObjectHasProperty(obj, prop, message) {
    if (!obj.hasOwnProperty(prop)) {
        throw new Error(message || `Expected object to have property ${prop}`);
    }
}

// Test Suite
async function runImageCoreTests() {
    const runner = new TestRunner('Image Core Utilities');

    // Test generateStandardFilename
    runner.test('generateStandardFilename - basic functionality', () => {
        const bookData = {
            author_last: 'Tolkien',
            title: 'The Hobbit',
            isbn_asin: '9780547928227'
        };

        const filename = generateStandardFilename(bookData);
        assertEqual(filename, 'Tolkien_The_Hobbit_9780547928227.jpg');
    });

    runner.test('generateStandardFilename - with sanitization', () => {
        const bookData = {
            author_last: 'O\'Connor',
            title: 'A Good Man Is Hard to Find!',
            isbn_asin: '978-0-374-50716-4'
        };

        const filename = generateStandardFilename(bookData);
        assertEqual(filename, 'O_Connor_A_Good_Man_Is_Hard_to_Find__978_0_374_50716_4.jpg');
    });

    runner.test('generateStandardFilename - with fallbacks', () => {
        const bookData = {
            title: 'Unknown Author Book',
            id: 'book123'
        };

        const filename = generateStandardFilename(bookData);
        assertEqual(filename, 'Unknown_Unknown_Author_Book_book123.jpg');
    });

    runner.test('generateStandardFilename - with options', () => {
        const bookData = {
            author_last: 'Asimov',
            title: 'Foundation',
            isbn_asin: '9780553293357'
        };

        const filename = generateStandardFilename(bookData, {
            extension: '.png',
            maxLength: 20
        });

        assert(filename.endsWith('.png'), 'Should use custom extension');
        assert(filename.length <= 24, 'Should respect maxLength (including extension)'); // 20 + 4 for .png
    });

    // Test sanitizeFilename
    runner.test('sanitizeFilename - removes invalid characters', () => {
        const dirty = 'Bad<File>Name:With|Invalid?Characters*.txt';
        const clean = sanitizeFilename(dirty);
        assertEqual(clean, 'BadFileNameWithInvalidCharacters_txt');
    });

    runner.test('sanitizeFilename - handles spaces and special chars', () => {
        const dirty = 'File With Spaces & Special-Chars (2023)';
        const clean = sanitizeFilename(dirty);
        assertEqual(clean, 'File_With_Spaces_Special-Chars_2023');
    });

    runner.test('sanitizeFilename - collapses underscores', () => {
        const dirty = 'Multiple___Underscores____Here';
        const clean = sanitizeFilename(dirty);
        assertEqual(clean, 'Multiple_Underscores_Here');
    });

    // Test validateImage
    runner.test('validateImage - valid image file', async () => {
        const validImagePath = runner.createTempImageFile('valid.jpg', 10000);
        const result = await validateImage(validImagePath);

        assert(result.valid, 'Should be valid');
        assertEqual(result.errors.length, 0, 'Should have no errors');
        assertObjectHasProperty(result, 'stats', 'Should have stats');
        assert(result.stats.size > 0, 'Should have file size');
    });

    runner.test('validateImage - file does not exist', async () => {
        const result = await validateImage('/nonexistent/file.jpg');

        assert(!result.valid, 'Should be invalid');
        assertContains(result.errors, 'File does not exist', 'Should have existence error');
    });

    runner.test('validateImage - invalid format', async () => {
        const invalidFile = runner.createTempFile('test.txt', 5000);
        const result = await validateImage(invalidFile);

        assert(!result.valid, 'Should be invalid');
        assert(result.errors.some(err => err.includes('Invalid format')), 'Should have format error');
    });

    runner.test('validateImage - file too small', async () => {
        const smallFile = runner.createTempImageFile('small.jpg', 100); // 100 bytes
        const result = await validateImage(smallFile);

        assert(!result.valid, 'Should be invalid');
        assert(result.errors.some(err => err.includes('File too small')), 'Should have size error');
    });

    runner.test('validateImage - file very large (warning)', async () => {
        const largeFile = runner.createTempImageFile('large.jpg', 6000000); // 6MB
        const result = await validateImage(largeFile);

        assert(result.valid, 'Should still be valid');
        assert(result.warnings.some(warn => warn.includes('File very large')), 'Should have size warning');
    });

    // Test findDuplicateImages
    runner.test('findDuplicateImages - finds duplicates by size', async () => {
        const tempDir = os.tmpdir();
        const testDir = path.join(tempDir, `test-duplicates-${Date.now()}`);
        fs.mkdirSync(testDir, { recursive: true });
        runner.tempFiles.push(testDir);

        // Create files with same size
        const file1 = path.join(testDir, 'image1.jpg');
        const file2 = path.join(testDir, 'image2.jpg');
        const content = Buffer.alloc(5000, 'A');

        fs.writeFileSync(file1, content);
        fs.writeFileSync(file2, content);
        runner.tempFiles.push(file1, file2);

        const duplicates = await findDuplicateImages(testDir);

        assert(duplicates.length > 0, 'Should find duplicate groups');
        assert(duplicates[0].files.length === 2, 'Should find 2 files with same size');
        assertEqual(duplicates[0].type, 'size', 'Should be size-based duplicate');
    });

    runner.test('findDuplicateImages - handles non-existent directory', async () => {
        try {
            await findDuplicateImages('/nonexistent/directory');
            assert(false, 'Should throw error for non-existent directory');
        } catch (error) {
            assert(error.message.includes('does not exist'), 'Should have appropriate error message');
        }
    });

    // Test checkImageExists
    runner.test('checkImageExists - finds existing file', () => {
        const tempDir = os.tmpdir();
        const bookData = {
            author_last: 'Test',
            title: 'Book',
            isbn_asin: '123456789'
        };

        const expectedFilename = generateStandardFilename(bookData);
        const expectedPath = path.join(tempDir, expectedFilename);

        // Create the expected file
        fs.writeFileSync(expectedPath, 'test content');
        runner.tempFiles.push(expectedPath);

        const result = checkImageExists(bookData, tempDir);

        assert(result.exists, 'Should find existing file');
        assertEqual(result.filename, expectedFilename, 'Should have correct filename');
        assertEqual(result.path, expectedPath, 'Should have correct path');
    });

    runner.test('checkImageExists - file does not exist', () => {
        const tempDir = os.tmpdir();
        const bookData = {
            author_last: 'NonExistent',
            title: 'Book',
            isbn_asin: '999999999'
        };

        const result = checkImageExists(bookData, tempDir);

        assert(!result.exists, 'Should not find non-existent file');
        assertObjectHasProperty(result, 'filename', 'Should have expected filename');
        assertObjectHasProperty(result, 'path', 'Should have expected path');
    });

    runner.test('checkImageExists - fuzzy matching finds alternatives', () => {
        const tempDir = os.tmpdir();
        const bookData = {
            author_last: 'Tolkien',
            title: 'Hobbit',
            isbn_asin: '123456789'
        };

        // Create a file that matches the ISBN but has different name format
        const alternateFile = path.join(tempDir, 'tolkien_hobbit_123456789_alt.jpg');
        fs.writeFileSync(alternateFile, 'test content');
        runner.tempFiles.push(alternateFile);

        const result = checkImageExists(bookData, tempDir, { fuzzyMatch: true });

        assert(!result.exists, 'Should not find exact match');
        assert(result.alternateMatches.length > 0, 'Should find alternate matches');
        assertContains(result.alternateMatches, path.basename(alternateFile), 'Should include alternate file');
    });

    // Test IMAGE_CONFIG
    runner.test('IMAGE_CONFIG - has required properties', () => {
        assertObjectHasProperty(IMAGE_CONFIG, 'validation', 'Should have validation config');
        assertObjectHasProperty(IMAGE_CONFIG, 'naming', 'Should have naming config');
        assertObjectHasProperty(IMAGE_CONFIG, 'deduplication', 'Should have deduplication config');

        // Check validation config
        assert(IMAGE_CONFIG.validation.minSize > 0, 'Should have minimum file size');
        assert(IMAGE_CONFIG.validation.validFormats.length > 0, 'Should have valid formats');
        assertContains(IMAGE_CONFIG.validation.validFormats, '.jpg', 'Should support JPG');
        assertContains(IMAGE_CONFIG.validation.validFormats, '.png', 'Should support PNG');

        // Check naming config
        assertObjectHasProperty(IMAGE_CONFIG.naming, 'pattern', 'Should have naming pattern');
        assertObjectHasProperty(IMAGE_CONFIG.naming, 'extension', 'Should have default extension');
    });

    return await runner.run();
}

// Export for use in test runner
module.exports = { runImageCoreTests };

// Run directly if this file is executed
if (require.main === module) {
    runImageCoreTests()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}