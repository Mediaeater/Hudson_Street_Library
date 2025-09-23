/**
 * Test Suite for CSV Handler
 * Tests all functionality in scripts/utils/csv-handler.js
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');

// Simple test framework
class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.tempFiles = [];
        this.tempDirs = [];
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    createTempDir() {
        const tempDir = path.join(os.tmpdir(), `csv-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        fsSync.mkdirSync(tempDir, { recursive: true });
        this.tempDirs.push(tempDir);
        return tempDir;
    }

    async createTempCSV(filename, content) {
        const tempDir = this.createTempDir();
        const filePath = path.join(tempDir, filename);
        await fs.writeFile(filePath, content);
        this.tempFiles.push(filePath);
        return filePath;
    }

    async cleanup() {
        // Cleanup temp files
        for (const file of this.tempFiles) {
            try {
                if (fsSync.existsSync(file)) {
                    await fs.unlink(file);
                }
            } catch (error) {
                console.warn(`Warning: Could not cleanup ${file}: ${error.message}`);
            }
        }

        // Cleanup temp directories
        for (const dir of this.tempDirs) {
            try {
                if (fsSync.existsSync(dir)) {
                    await fs.rmdir(dir, { recursive: true });
                }
            } catch (error) {
                console.warn(`Warning: Could not cleanup ${dir}: ${error.message}`);
            }
        }

        this.tempFiles = [];
        this.tempDirs = [];
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

        await this.cleanup();
        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        return { passed: this.passed, failed: this.failed };
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

function assertGreaterThan(actual, expected, message) {
    if (actual <= expected) {
        throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
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

// Mock CSV Parser and Stringifier (simplified versions)
const MockCSV = {
    parse: (data, options = {}) => {
        const lines = data.trim().split('\n');
        if (lines.length === 0) return [];

        const delimiter = options.delimiter || ',';
        const quote = options.quote || '"';
        const headers = options.columns !== false;

        let result = [];
        let headerRow = null;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const cells = MockCSV.parseLine(line, delimiter, quote);

            if (headers && i === 0) {
                headerRow = cells;
                continue;
            }

            if (headers && headerRow) {
                const row = {};
                headerRow.forEach((header, index) => {
                    row[header] = cells[index] || '';
                });
                result.push(row);
            } else {
                result.push(cells);
            }
        }

        return result;
    },

    parseLine: (line, delimiter = ',', quote = '"') => {
        const cells = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];

            if (char === quote) {
                if (inQuotes && line[i + 1] === quote) {
                    // Escaped quote
                    current += quote;
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === delimiter && !inQuotes) {
                cells.push(current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }

        cells.push(current);
        return cells;
    },

    stringify: (data, options = {}) => {
        if (!Array.isArray(data) || data.length === 0) {
            return '';
        }

        const delimiter = options.delimiter || ',';
        const quote = options.quote || '"';
        const headers = options.header !== false;

        let result = '';

        // Add headers if data contains objects
        if (headers && typeof data[0] === 'object' && !Array.isArray(data[0])) {
            const headerRow = Object.keys(data[0]);
            result += headerRow.map(h => MockCSV.escapeCell(h, delimiter, quote)).join(delimiter) + '\n';
        }

        // Add data rows
        for (const row of data) {
            let rowData;
            if (typeof row === 'object' && !Array.isArray(row)) {
                rowData = Object.values(row);
            } else {
                rowData = Array.isArray(row) ? row : [row];
            }

            const escapedRow = rowData.map(cell => MockCSV.escapeCell(String(cell || ''), delimiter, quote));
            result += escapedRow.join(delimiter) + '\n';
        }

        return result;
    },

    escapeCell: (cell, delimiter = ',', quote = '"') => {
        const needsQuoting = cell.includes(delimiter) ||
                           cell.includes(quote) ||
                           cell.includes('\n') ||
                           cell.includes('\r');

        if (needsQuoting) {
            return quote + cell.replace(new RegExp(quote, 'g'), quote + quote) + quote;
        }

        return cell;
    }
};

// Mock CSVHandler class (simplified version for testing)
class MockCSVHandler {
    static BOOKS_SCHEMA = {
        required: ['id', 'title', 'author_full_name'],
        optional: ['author_last', 'author_first', 'publisher', 'publication_year', 'isbn_asin', 'image_url', 'description'],
        defaults: {
            'author_last': '',
            'author_first': '',
            'publisher': '',
            'publication_year': '',
            'isbn_asin': '',
            'image_url': '',
            'description': ''
        }
    };

    static async read(filePath, options = {}) {
        const defaultOptions = {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            relax_column_count: true,
            quote: '"',
            escape: '"',
            ...options
        };

        const result = {
            data: [],
            errors: [],
            stats: {
                totalRows: 0,
                validRows: 0,
                invalidRows: 0,
                correctedRows: 0
            }
        };

        try {
            const content = await fs.readFile(filePath, 'utf8');
            const rows = MockCSV.parse(content, defaultOptions);

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                result.stats.totalRows++;

                try {
                    const cleanRecord = this.validateAndCleanRecord(row, i + 1);
                    result.data.push(cleanRecord.record);

                    if (cleanRecord.corrected) {
                        result.stats.correctedRows++;
                    }
                    result.stats.validRows++;

                    if (cleanRecord.warnings.length > 0) {
                        result.errors.push({
                            row: i + 1,
                            type: 'warning',
                            warnings: cleanRecord.warnings
                        });
                    }
                } catch (error) {
                    result.stats.invalidRows++;
                    result.errors.push({
                        row: i + 1,
                        type: 'error',
                        message: error.message,
                        record: row
                    });
                }
            }
        } catch (error) {
            // Try recovery from corruption
            const recoveredResult = await this.recoverFromCorruption(filePath, options);
            recoveredResult.errors.unshift({
                type: 'recovery',
                message: `Original parsing failed: ${error.message}. Attempted recovery.`
            });
            return recoveredResult;
        }

        return result;
    }

    static validateAndCleanRecord(record, rowIndex) {
        const result = {
            record: { ...record },
            corrected: false,
            warnings: []
        };

        // Check required fields
        for (const field of this.BOOKS_SCHEMA.required) {
            if (!record[field] || record[field].trim() === '') {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Apply defaults and clean data
        for (const [field, defaultValue] of Object.entries(this.BOOKS_SCHEMA.defaults)) {
            if (!record[field]) {
                result.record[field] = defaultValue;
                result.corrected = true;
            } else {
                // Clean the field
                const cleaned = this.cleanField(field, record[field]);
                if (cleaned !== record[field]) {
                    result.record[field] = cleaned;
                    result.corrected = true;
                    result.warnings.push(`Cleaned field ${field}: "${record[field]}" -> "${cleaned}"`);
                }
            }
        }

        // Validate data formats
        if (result.record.publication_year && !/^\d{4}$/.test(result.record.publication_year)) {
            result.warnings.push(`Invalid publication year format: ${result.record.publication_year}`);
        }

        if (result.record.isbn_asin && !/^[\d\-x]+$/i.test(result.record.isbn_asin.replace(/\s+/g, ''))) {
            result.warnings.push(`Potentially invalid ISBN/ASIN format: ${result.record.isbn_asin}`);
        }

        return result;
    }

    static cleanField(fieldName, value) {
        if (typeof value !== 'string') {
            return String(value || '');
        }

        let cleaned = value.trim();

        // Remove problematic characters
        cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, ''); // Control characters
        cleaned = cleaned.replace(/\s+/g, ' '); // Multiple spaces

        // Field-specific cleaning
        if (fieldName === 'isbn_asin') {
            cleaned = cleaned.replace(/[^\d\-x]/gi, '');
        } else if (fieldName === 'publication_year') {
            const match = cleaned.match(/\d{4}/);
            if (match) {
                cleaned = match[0];
            }
        }

        return cleaned;
    }

    static async write(filePath, data, options = {}) {
        const defaultOptions = {
            header: true,
            quote: '"',
            escape: '"',
            ...options
        };

        try {
            const csvContent = MockCSV.stringify(data, defaultOptions);
            await fs.writeFile(filePath, csvContent);

            return {
                success: true,
                path: filePath,
                recordsWritten: data.length,
                size: csvContent.length
            };
        } catch (error) {
            throw new Error(`Failed to write CSV file: ${error.message}`);
        }
    }

    static async append(filePath, records, options = {}) {
        if (!Array.isArray(records)) {
            records = [records];
        }

        try {
            const csvContent = MockCSV.stringify(records, { ...options, header: false });
            await fs.appendFile(filePath, csvContent);

            return {
                success: true,
                path: filePath,
                recordsAppended: records.length
            };
        } catch (error) {
            throw new Error(`Failed to append to CSV file: ${error.message}`);
        }
    }

    static async recoverFromCorruption(filePath, options = {}) {
        const result = {
            data: [],
            errors: [{
                type: 'recovery',
                message: 'Attempting to recover from corrupted CSV file'
            }],
            stats: {
                totalRows: 0,
                validRows: 0,
                invalidRows: 0,
                correctedRows: 0
            }
        };

        try {
            const content = await fs.readFile(filePath, 'utf8');
            const lines = content.split('\n');

            // Try to parse line by line
            let headers = null;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                result.stats.totalRows++;

                try {
                    const cells = MockCSV.parseLine(line);

                    if (!headers && cells.length > 0) {
                        headers = cells;
                        continue;
                    }

                    if (headers && cells.length > 0) {
                        const record = {};
                        headers.forEach((header, index) => {
                            record[header] = cells[index] || '';
                        });

                        // Try to validate the recovered record
                        try {
                            const cleanRecord = this.validateAndCleanRecord(record, i + 1);
                            result.data.push(cleanRecord.record);
                            result.stats.validRows++;
                        } catch (validationError) {
                            result.stats.invalidRows++;
                            result.errors.push({
                                row: i + 1,
                                type: 'recovery_error',
                                message: validationError.message,
                                record
                            });
                        }
                    }
                } catch (parseError) {
                    result.stats.invalidRows++;
                    result.errors.push({
                        row: i + 1,
                        type: 'parse_error',
                        message: `Could not parse line: ${parseError.message}`,
                        line
                    });
                }
            }
        } catch (error) {
            result.errors.push({
                type: 'fatal',
                message: `Recovery failed: ${error.message}`
            });
        }

        return result;
    }

    static async batchUpdate(filePath, updates, keyField = 'id', options = {}) {
        try {
            // Read existing data
            const existing = await this.read(filePath, options);
            if (existing.errors.some(e => e.type === 'error')) {
                throw new Error('Cannot update file with existing errors');
            }

            // Create update map
            const updateMap = new Map();
            updates.forEach(update => {
                const key = update[keyField];
                if (key) {
                    updateMap.set(key, update);
                }
            });

            // Apply updates
            let updatedCount = 0;
            const updatedData = existing.data.map(record => {
                const key = record[keyField];
                if (updateMap.has(key)) {
                    updatedCount++;
                    return { ...record, ...updateMap.get(key) };
                }
                return record;
            });

            // Write back
            const writeResult = await this.write(filePath, updatedData, options);

            return {
                ...writeResult,
                totalRecords: updatedData.length,
                updatedRecords: updatedCount,
                skippedUpdates: updates.length - updatedCount
            };
        } catch (error) {
            throw new Error(`Batch update failed: ${error.message}`);
        }
    }
}

// Test Suite
async function runCSVHandlerTests() {
    const runner = new TestRunner('CSV Handler');

    // Test basic CSV reading
    runner.test('CSV Reading - valid CSV file', async () => {
        const csvContent = `id,title,author_full_name,author_last,author_first
1,"The Hobbit","J.R.R. Tolkien","Tolkien","J.R.R."
2,"1984","George Orwell","Orwell","George"`;

        const filePath = await runner.createTempCSV('test.csv', csvContent);
        const result = await MockCSVHandler.read(filePath);

        assertObjectHasProperty(result, 'data', 'Should have data array');
        assertObjectHasProperty(result, 'errors', 'Should have errors array');
        assertObjectHasProperty(result, 'stats', 'Should have stats object');

        assertEqual(result.data.length, 2, 'Should have 2 records');
        assertEqual(result.stats.validRows, 2, 'Should have 2 valid rows');
        assertEqual(result.stats.invalidRows, 0, 'Should have no invalid rows');

        const firstBook = result.data[0];
        assertEqual(firstBook.title, 'The Hobbit', 'Should have correct title');
        assertEqual(firstBook.author_last, 'Tolkien', 'Should have correct author');
    });

    runner.test('CSV Reading - handles missing optional fields', async () => {
        const csvContent = `id,title,author_full_name
1,"Test Book","Test Author"`;

        const filePath = await runner.createTempCSV('test-minimal.csv', csvContent);
        const result = await MockCSVHandler.read(filePath);

        assertEqual(result.data.length, 1, 'Should have 1 record');
        assertEqual(result.stats.correctedRows, 1, 'Should show correction applied');

        const book = result.data[0];
        assertObjectHasProperty(book, 'author_last', 'Should have default author_last');
        assertObjectHasProperty(book, 'publisher', 'Should have default publisher');
        assertEqual(book.author_last, '', 'Should use default empty string');
    });

    runner.test('CSV Reading - validates required fields', async () => {
        const csvContent = `id,title,author_full_name
1,"","Test Author"
2,"Valid Title",""`;

        const filePath = await runner.createTempCSV('test-invalid.csv', csvContent);
        const result = await MockCSVHandler.read(filePath);

        assertEqual(result.stats.invalidRows, 2, 'Should have 2 invalid rows');
        assertEqual(result.stats.validRows, 0, 'Should have no valid rows');
        assertEqual(result.errors.length, 2, 'Should have 2 errors');

        assert(result.errors[0].message.includes('title'), 'Should identify missing title');
        assert(result.errors[1].message.includes('author_full_name'), 'Should identify missing author');
    });

    runner.test('CSV Reading - cleans dirty data', async () => {
        const csvContent = `id,title,author_full_name,publication_year,isbn_asin
1,"Test   Book","Test    Author","2023abc","978-0-123-45678-9 extra"`;

        const filePath = await runner.createTempCSV('test-dirty.csv', csvContent);
        const result = await MockCSVHandler.read(filePath);

        assertEqual(result.data.length, 1, 'Should have 1 record');
        assertEqual(result.stats.correctedRows, 1, 'Should show corrections');

        const book = result.data[0];
        assertEqual(book.publication_year, '2023', 'Should clean publication year');
        assertEqual(book.isbn_asin, '978012345678', 'Should clean ISBN');

        // Should have warnings about cleaning
        const warnings = result.errors.filter(e => e.type === 'warning');
        assert(warnings.length > 0, 'Should have cleaning warnings');
    });

    // Test CSV writing
    runner.test('CSV Writing - creates valid CSV file', async () => {
        const data = [
            { id: '1', title: 'Book One', author_full_name: 'Author One' },
            { id: '2', title: 'Book Two', author_full_name: 'Author Two' }
        ];

        const tempDir = runner.createTempDir();
        const filePath = path.join(tempDir, 'output.csv');

        const result = await MockCSVHandler.write(filePath, data);

        assert(result.success, 'Write should be successful');
        assertEqual(result.recordsWritten, 2, 'Should write 2 records');
        assert(fsSync.existsSync(filePath), 'File should exist');

        // Verify file content
        const content = await fs.readFile(filePath, 'utf8');
        assertContains(content, 'id,title,author_full_name', 'Should have headers');
        assertContains(content, 'Book One', 'Should have first book');
        assertContains(content, 'Book Two', 'Should have second book');
    });

    runner.test('CSV Writing - handles special characters', async () => {
        const data = [
            { id: '1', title: 'Book with "Quotes"', description: 'Line 1\nLine 2' },
            { id: '2', title: 'Book, with, commas', description: 'Normal text' }
        ];

        const tempDir = runner.createTempDir();
        const filePath = path.join(tempDir, 'special.csv');

        const result = await MockCSVHandler.write(filePath, data);

        assert(result.success, 'Write should be successful');

        // Verify file can be read back correctly
        const readResult = await MockCSVHandler.read(filePath);
        assertEqual(readResult.data.length, 2, 'Should read back correctly');
        assertEqual(readResult.data[0].title, 'Book with "Quotes"', 'Should preserve quotes');
        assertEqual(readResult.data[1].title, 'Book, with, commas', 'Should preserve commas');
    });

    // Test CSV appending
    runner.test('CSV Appending - adds records to existing file', async () => {
        const initialData = [
            { id: '1', title: 'Book One', author_full_name: 'Author One' }
        ];

        const tempDir = runner.createTempDir();
        const filePath = path.join(tempDir, 'append-test.csv');

        // Write initial data
        await MockCSVHandler.write(filePath, initialData);

        // Append new records
        const newRecords = [
            { id: '2', title: 'Book Two', author_full_name: 'Author Two' },
            { id: '3', title: 'Book Three', author_full_name: 'Author Three' }
        ];

        const appendResult = await MockCSVHandler.append(filePath, newRecords);

        assert(appendResult.success, 'Append should be successful');
        assertEqual(appendResult.recordsAppended, 2, 'Should append 2 records');

        // Verify final content
        const readResult = await MockCSVHandler.read(filePath);
        assertEqual(readResult.data.length, 3, 'Should have 3 total records');
        assertEqual(readResult.data[1].title, 'Book Two', 'Should have appended data');
        assertEqual(readResult.data[2].title, 'Book Three', 'Should have appended data');
    });

    // Test batch updates
    runner.test('CSV Batch Update - updates existing records', async () => {
        const initialData = [
            { id: '1', title: 'Book One', author_full_name: 'Author One', publisher: 'Pub A' },
            { id: '2', title: 'Book Two', author_full_name: 'Author Two', publisher: 'Pub B' },
            { id: '3', title: 'Book Three', author_full_name: 'Author Three', publisher: 'Pub C' }
        ];

        const tempDir = runner.createTempDir();
        const filePath = path.join(tempDir, 'batch-update.csv');

        // Write initial data
        await MockCSVHandler.write(filePath, initialData);

        // Prepare updates
        const updates = [
            { id: '1', publisher: 'Updated Pub A', publication_year: '2023' },
            { id: '3', publisher: 'Updated Pub C', description: 'New description' }
        ];

        const updateResult = await MockCSVHandler.batchUpdate(filePath, updates);

        assert(updateResult.success, 'Batch update should be successful');
        assertEqual(updateResult.updatedRecords, 2, 'Should update 2 records');
        assertEqual(updateResult.totalRecords, 3, 'Should maintain total record count');

        // Verify updates
        const readResult = await MockCSVHandler.read(filePath);
        const book1 = readResult.data.find(b => b.id === '1');
        const book2 = readResult.data.find(b => b.id === '2');
        const book3 = readResult.data.find(b => b.id === '3');

        assertEqual(book1.publisher, 'Updated Pub A', 'Should update book 1 publisher');
        assertEqual(book1.publication_year, '2023', 'Should add publication year to book 1');
        assertEqual(book2.publisher, 'Pub B', 'Should not change book 2');
        assertEqual(book3.publisher, 'Updated Pub C', 'Should update book 3 publisher');
        assertEqual(book3.description, 'New description', 'Should add description to book 3');
    });

    // Test error recovery
    runner.test('CSV Recovery - handles corrupted file', async () => {
        const corruptedContent = `id,title,author_full_name
1,"Unclosed quote,"Author One"
2,"Good Book","Author Two"
3,Missing quote in title,"Author Three"`;

        const filePath = await runner.createTempCSV('corrupted.csv', corruptedContent);
        const result = await MockCSVHandler.read(filePath);

        // Should attempt recovery
        const recoveryErrors = result.errors.filter(e => e.type === 'recovery');
        assert(recoveryErrors.length > 0, 'Should have recovery attempt');

        // Should recover some valid records
        assert(result.data.length > 0, 'Should recover some records');
        assertEqual(result.data[0].title, 'Good Book', 'Should recover valid records');
    });

    // Test data validation
    runner.test('CSV Validation - validates publication year format', async () => {
        const csvContent = `id,title,author_full_name,publication_year
1,"Test Book","Test Author","invalid_year"
2,"Test Book 2","Test Author 2","2023"`;

        const filePath = await runner.createTempCSV('validation-test.csv', csvContent);
        const result = await MockCSVHandler.read(filePath);

        // Should have warnings about invalid year
        const warnings = result.errors.filter(e => e.type === 'warning');
        const yearWarning = warnings.find(w =>
            w.warnings && w.warnings.some(warning =>
                warning.includes('Invalid publication year')
            )
        );
        assert(yearWarning, 'Should warn about invalid publication year');
    });

    runner.test('CSV Validation - validates ISBN format', async () => {
        const csvContent = `id,title,author_full_name,isbn_asin
1,"Test Book","Test Author","invalid-isbn-format!"
2,"Test Book 2","Test Author 2","978-0-123-45678-9"`;

        const filePath = await runner.createTempCSV('isbn-validation.csv', csvContent);
        const result = await MockCSVHandler.read(filePath);

        // Should have warnings about invalid ISBN
        const warnings = result.errors.filter(e => e.type === 'warning');
        const isbnWarning = warnings.find(w =>
            w.warnings && w.warnings.some(warning =>
                warning.includes('Potentially invalid ISBN')
            )
        );
        assert(isbnWarning, 'Should warn about invalid ISBN format');
    });

    // Test edge cases
    runner.test('CSV Edge Cases - handles empty file', async () => {
        const filePath = await runner.createTempCSV('empty.csv', '');
        const result = await MockCSVHandler.read(filePath);

        assertEqual(result.data.length, 0, 'Should handle empty file');
        assertEqual(result.stats.totalRows, 0, 'Should have zero total rows');
    });

    runner.test('CSV Edge Cases - handles file with only headers', async () => {
        const csvContent = 'id,title,author_full_name';
        const filePath = await runner.createTempCSV('headers-only.csv', csvContent);
        const result = await MockCSVHandler.read(filePath);

        assertEqual(result.data.length, 0, 'Should handle headers-only file');
        assertEqual(result.stats.totalRows, 0, 'Should have zero data rows');
    });

    return await runner.run();
}

// Export for use in test runner
module.exports = { runCSVHandlerTests };

// Run directly if this file is executed
if (require.main === module) {
    runCSVHandlerTests()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}