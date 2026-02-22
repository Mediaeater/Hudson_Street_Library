const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

/**
 * Unified CSV handler for the Hudson Street Library
 * Consolidates all CSV operations in one place with validation and error recovery
 */

// Expected schema for books.csv
const BOOKS_SCHEMA = {
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

class CSVHandler {
    /**
     * Read and parse CSV file with error recovery
     * @param {string} filePath - Path to CSV file
     * @param {Object} options - CSV parse options
     * @returns {Promise<{data: Array, errors: Array, stats: Object}>} Parsed data with error information
     */
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

        return new Promise((resolve, reject) => {
            let rowIndex = 0;

            fs.createReadStream(filePath)
                .pipe(parse(defaultOptions))
                .on('data', (record) => {
                    rowIndex++;
                    result.stats.totalRows++;

                    try {
                        // Validate and clean the record
                        const cleanRecord = this.validateAndCleanRecord(record, rowIndex);
                        result.data.push(cleanRecord.record);

                        if (cleanRecord.corrected) {
                            result.stats.correctedRows++;
                        }
                        result.stats.validRows++;

                        if (cleanRecord.warnings.length > 0) {
                            result.errors.push({
                                row: rowIndex,
                                type: 'warning',
                                warnings: cleanRecord.warnings
                            });
                        }
                    } catch (error) {
                        result.stats.invalidRows++;
                        result.errors.push({
                            row: rowIndex,
                            type: 'error',
                            message: error.message,
                            record: record
                        });
                    }
                })
                .on('end', () => {
                    resolve(result);
                })
                .on('error', (error) => {
                    // Try to recover from corrupted CSV
                    this.recoverFromCorruption(filePath, options)
                        .then(recoveredResult => {
                            recoveredResult.errors.unshift({
                                type: 'recovery',
                                message: `Original parsing failed: ${error.message}. Attempted recovery.`
                            });
                            resolve(recoveredResult);
                        })
                        .catch(() => reject(error));
                });
        });
    }

    /**
     * Write data to CSV file with backup and validation
     * @param {string} filePath - Output file path
     * @param {Array} data - Data to write
     * @param {Object} options - CSV stringify options
     * @returns {Promise<{success: boolean, backup?: string, errors: Array}>}
     */
    static async write(filePath, data, options = {}) {
        const defaultOptions = {
            header: true,
            quoted: true,
            quoted_empty: true,
            escape: '"',
            ...options
        };

        const result = {
            success: false,
            errors: []
        };

        try {
            // Validate data before writing
            const validation = this.validateDataForWrite(data);
            if (!validation.valid) {
                result.errors = validation.errors;
                return result;
            }

            // Create backup if file exists
            if (fs.existsSync(filePath)) {
                const backupOpts = options.allowedDir ? { allowedDir: options.allowedDir } : {};
                const backupPath = this.createBackup(filePath, backupOpts);
                result.backup = backupPath;
            }

            // Ensure directory exists
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            return new Promise((resolve, reject) => {
                stringify(data, defaultOptions, (err, output) => {
                    if (err) {
                        result.errors.push(`Stringify error: ${err.message}`);
                        resolve(result);
                    } else {
                        fs.writeFile(filePath, output, (writeErr) => {
                            if (writeErr) {
                                result.errors.push(`Write error: ${writeErr.message}`);
                                resolve(result);
                            } else {
                                result.success = true;
                                resolve(result);
                            }
                        });
                    }
                });
            });
        } catch (error) {
            result.errors.push(`Preparation error: ${error.message}`);
            return result;
        }
    }

    /**
     * Stream process large CSV files
     * @param {string} filePath - Path to CSV file
     * @param {Function} processRow - Function to process each row (can be async)
     * @param {Object} options - CSV parse options
     */
    static async stream(filePath, processRow, options = {}) {
        const defaultOptions = {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            ...options
        };

        return new Promise((resolve, reject) => {
            let rowCount = 0;
            let pendingOperations = 0;
            let streamEnded = false;
            const parser = parse(defaultOptions);
            const stream = fs.createReadStream(filePath);

            const checkComplete = () => {
                if (streamEnded && pendingOperations === 0) {
                    resolve(rowCount);
                }
            };

            parser.on('data', async (record) => {
                rowCount++;
                pendingOperations++;
                parser.pause(); // Pause to handle async processing

                try {
                    await processRow(record, rowCount);
                } catch (error) {
                    stream.destroy();
                    parser.destroy();
                    reject(error);
                    return;
                } finally {
                    pendingOperations--;
                    parser.resume(); // Resume after processing
                    checkComplete();
                }
            });

            parser.on('end', () => {
                streamEnded = true;
                checkComplete();
            });

            parser.on('error', reject);
            stream.on('error', reject);

            stream.pipe(parser);
        });
    }

    /**
     * Get CSV stats without loading entire file
     * @param {string} filePath - Path to CSV file
     */
    static async getStats(filePath) {
        let rowCount = 0;
        let columns = [];

        await this.stream(filePath, (record, index) => {
            if (index === 1) {
                columns = Object.keys(record);
            }
            rowCount++;
        });

        return {
            rowCount,
            columns,
            fileSize: fs.statSync(filePath).size
        };
    }

    /**
     * Filter CSV based on criteria
     * @param {string} inputPath - Input CSV path
     * @param {string} outputPath - Output CSV path
     * @param {Function} filterFn - Filter function
     */
    static async filter(inputPath, outputPath, filterFn) {
        const data = await this.read(inputPath);
        const filtered = data.filter(filterFn);
        await this.write(outputPath, filtered);
        return filtered.length;
    }

    /**
     * Merge multiple CSV files
     * @param {Array<string>} filePaths - Array of CSV file paths
     * @param {string} outputPath - Output file path
     * @param {boolean} removeDuplicates - Remove duplicate rows
     */
    static async merge(filePaths, outputPath, removeDuplicates = false) {
        const allData = [];
        const seen = new Set();
        const errors = [];

        for (const filePath of filePaths) {
            try {
                const result = await this.read(filePath);
                errors.push(...result.errors);

                for (const row of result.data) {
                    const key = JSON.stringify(row);
                    if (!removeDuplicates || !seen.has(key)) {
                        seen.add(key);
                        allData.push(row);
                    }
                }
            } catch (error) {
                errors.push({
                    file: filePath,
                    type: 'file_error',
                    message: error.message
                });
            }
        }

        const writeResult = await this.write(outputPath, allData);
        return {
            totalRows: allData.length,
            errors: [...errors, ...writeResult.errors],
            success: writeResult.success,
            backup: writeResult.backup
        };
    }

    /**
     * Sanitize CSV field to prevent formula injection
     * Spreadsheet applications (Excel, Google Sheets, LibreOffice) interpret
     * cells starting with =, +, -, @, \t, \r, \n as formulas. An attacker
     * can craft CSV data that executes arbitrary commands when opened.
     * (CWE-1236, OWASP injection)
     *
     * @param {string} value - Field value
     * @returns {string} Sanitized value
     */
    static sanitizeCSVField(value) {
        if (typeof value !== 'string') return value;

        // Characters that trigger formula interpretation in spreadsheet apps
        const formulaPrefixes = ['=', '+', '-', '@', '\t', '\r', '\n'];

        if (formulaPrefixes.some(char => value.startsWith(char))) {
            // Prefix with single quote to force text interpretation
            return "'" + value;
        }

        // Strip pipe and semicolon characters used in DDE/command injection
        // payloads like =cmd|'/C calc'!A0 or =HYPERLINK("http://evil";...)
        if (value.includes('|') || value.includes(';')) {
            return value.replace(/[|;]/g, '');
        }

        return value;
    }

    /**
     * Validate and clean a single record
     * @param {Object} record - CSV record
     * @param {number} rowIndex - Row number for error reporting
     * @returns {Object} - {record, corrected, warnings}
     */
    static validateAndCleanRecord(record, rowIndex) {
        const result = {
            record: { ...record },
            corrected: false,
            warnings: []
        };

        // Clean string fields - remove extra whitespace, handle null values
        Object.keys(result.record).forEach(key => {
            if (typeof result.record[key] === 'string') {
                const original = result.record[key];
                let cleaned = original.trim();

                // Handle various null representations
                if (cleaned === 'NULL' || cleaned === 'null' || cleaned === 'undefined' || cleaned === '') {
                    cleaned = '';
                }

                // Fix common encoding issues
                cleaned = cleaned.replace(/\u00e2\u20ac\u2122/g, "'");
                cleaned = cleaned.replace(/\u00e2\u20ac\u0153/g, '"');
                cleaned = cleaned.replace(/\u00e2\u20ac/g, '"');

                // SECURITY: Prevent CSV formula injection (CWE-1236)
                cleaned = this.sanitizeCSVField(cleaned);

                if (original !== cleaned) {
                    result.corrected = true;
                }

                result.record[key] = cleaned;
            }
        });

        // Books.csv specific validations
        if (this.isBooksCsvRecord(result.record)) {
            // Ensure required fields exist
            BOOKS_SCHEMA.required.forEach(field => {
                if (!result.record[field] || result.record[field].trim() === '') {
                    if (field === 'id') {
                        throw new Error(`Missing required field: ${field}`);
                    } else {
                        result.warnings.push(`Missing required field: ${field}`);
                        result.record[field] = BOOKS_SCHEMA.defaults[field] || 'Unknown';
                        result.corrected = true;
                    }
                }
            });

            // Add missing optional fields with defaults
            BOOKS_SCHEMA.optional.forEach(field => {
                if (!(field in result.record)) {
                    result.record[field] = BOOKS_SCHEMA.defaults[field] || '';
                    result.corrected = true;
                }
            });

            // Validate ISBN format
            if (result.record.isbn_asin && result.record.isbn_asin.trim()) {
                const isbn = result.record.isbn_asin.trim();
                if (!isbn.match(/^\d{10,13}$/) && !isbn.match(/^[A-Z0-9]{10}$/)) {
                    result.warnings.push(`Invalid ISBN/ASIN format: ${isbn}`);
                }
            }

            // Validate year
            if (result.record.publication_year && result.record.publication_year.trim()) {
                const year = parseInt(result.record.publication_year);
                if (isNaN(year) || year < 1800 || year > new Date().getFullYear() + 1) {
                    result.warnings.push(`Invalid publication year: ${result.record.publication_year}`);
                }
            }
        }

        return result;
    }

    /**
     * Check if a record appears to be from books.csv
     * @param {Object} record - CSV record
     * @returns {boolean}
     */
    static isBooksCsvRecord(record) {
        const bookFields = ['title', 'author_full_name', 'isbn_asin', 'publisher'];
        return bookFields.some(field => field in record);
    }

    /**
     * Validate data before writing
     * @param {Array} data - Data to validate
     * @returns {Object} - {valid, errors}
     */
    static validateDataForWrite(data) {
        const result = {
            valid: true,
            errors: []
        };

        if (!Array.isArray(data)) {
            result.valid = false;
            result.errors.push('Data must be an array');
            return result;
        }

        if (data.length === 0) {
            result.valid = false;
            result.errors.push('Data array is empty');
            return result;
        }

        // Check if all records have the same structure
        const firstRecordKeys = Object.keys(data[0]).sort();
        for (let i = 1; i < data.length; i++) {
            const currentKeys = Object.keys(data[i]).sort();
            if (JSON.stringify(firstRecordKeys) !== JSON.stringify(currentKeys)) {
                result.errors.push(`Record ${i + 1} has different structure than first record`);
            }
        }

        if (result.errors.length > 0) {
            result.valid = false;
        }

        return result;
    }

    /**
     * Default allowed directory for backup operations.
     * All file paths passed to createBackup must resolve within this directory.
     */
    static get ALLOWED_BACKUP_DIR() {
        return path.resolve(__dirname, '../../src/_data');
    }

    /**
     * Create a backup of existing file
     * @param {string} filePath - Original file path
     * @param {Object} [options] - Options
     * @param {string} [options.allowedDir] - Override allowed directory (for testing only)
     * @returns {string} - Backup file path
     * @throws {Error} If filePath resolves outside the allowed directory
     */
    static createBackup(filePath, options = {}) {
        // SECURITY: Validate filePath is within the allowed data directory
        // Prevents path traversal attacks (CWE-22, OWASP A01:2021)
        const resolvedPath = path.resolve(filePath);
        const baseDir = path.resolve(options.allowedDir || this.ALLOWED_BACKUP_DIR);

        if (!resolvedPath.startsWith(baseDir + path.sep) && resolvedPath !== baseDir) {
            throw new Error('Security: Invalid file path outside allowed directory');
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = filePath.replace(/\.csv$/, `_backup_${timestamp}.csv`);

        // Validate the generated backup path as well
        const resolvedBackup = path.resolve(backupPath);
        if (!resolvedBackup.startsWith(baseDir + path.sep) && resolvedBackup !== baseDir) {
            throw new Error('Security: Invalid backup path generated');
        }

        fs.copyFileSync(filePath, backupPath);
        return backupPath;
    }

    /**
     * Attempt to recover from corrupted CSV
     * @param {string} filePath - Path to corrupted CSV
     * @param {Object} options - Parse options
     * @returns {Promise<Object>} - Recovery result
     */
    static async recoverFromCorruption(filePath, options = {}) {
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
            // Try reading line by line and skip problematic lines
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');

            if (lines.length === 0) {
                throw new Error('File is completely empty');
            }

            // Get headers from first line
            const headerLine = lines[0];
            let headers;
            try {
                headers = parse(headerLine, { columns: false })[0];
            } catch (error) {
                throw new Error('Cannot parse header line');
            }

            // Process remaining lines
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                result.stats.totalRows++;

                try {
                    const parsedLine = parse(line, { columns: false, relax_column_count: true })[0];

                    // Create record object
                    const record = {};
                    headers.forEach((header, index) => {
                        record[header] = parsedLine[index] || '';
                    });

                    // Validate and clean
                    const cleanRecord = this.validateAndCleanRecord(record, i + 1);
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
                } catch (lineError) {
                    result.stats.invalidRows++;
                    result.errors.push({
                        row: i + 1,
                        type: 'skipped',
                        message: `Skipped corrupted line: ${lineError.message}`,
                        line: line.substring(0, 100) + (line.length > 100 ? '...' : '')
                    });
                }
            }

            return result;
        } catch (error) {
            throw new Error(`Recovery failed: ${error.message}`);
        }
    }

    /**
     * Books.csv specific operations
     */

    /**
     * Read books.csv with specific handling
     * @param {string} csvPath - Path to books.csv (optional, defaults to standard location)
     * @returns {Promise<Object>} - Books data with metadata
     */
    static async readBooks(csvPath = null) {
        const booksPath = csvPath || path.join(__dirname, '../../src/_data/books.csv');
        const result = await this.read(booksPath);

        // Add books-specific processing
        result.data = result.data.map(book => {
            // Ensure consistent author formatting
            if (!book.author_full_name && (book.author_first || book.author_last)) {
                book.author_full_name = `${book.author_first || ''} ${book.author_last || ''}`.trim();
            }

            // Clean ISBN
            if (book.isbn_asin) {
                book.isbn_asin = book.isbn_asin.replace(/[^0-9A-Z]/g, '');
            }

            return book;
        });

        return result;
    }

    /**
     * Update a book record in books.csv
     * @param {string} identifier - ISBN or book ID
     * @param {Object} updates - Fields to update
     * @param {string} csvPath - Path to books.csv (optional)
     * @returns {Promise<Object>} - Update result
     */
    static async updateBook(identifier, updates, csvPath = null, options = {}) {
        const booksPath = csvPath || path.join(__dirname, '../../src/_data/books.csv');
        const readResult = await this.readBooks(booksPath);

        // Find the book to update
        let bookIndex = -1;
        bookIndex = readResult.data.findIndex(book =>
            book.isbn_asin === identifier || book.id === identifier
        );

        if (bookIndex === -1) {
            return {
                success: false,
                error: `Book not found with identifier: ${identifier}`
            };
        }

        // Apply updates
        const originalBook = { ...readResult.data[bookIndex] };
        Object.assign(readResult.data[bookIndex], updates);

        // Add update timestamp to all records for consistency
        const timestamp = new Date().toISOString().split('T')[0];
        readResult.data.forEach(book => {
            if (!book.updated_at) {
                book.updated_at = timestamp;
            }
        });
        readResult.data[bookIndex].updated_at = timestamp;

        // Write back to file
        const writeOpts = options.allowedDir ? { allowedDir: options.allowedDir } : {};
        const writeResult = await this.write(booksPath, readResult.data, writeOpts);

        return {
            success: writeResult.success,
            errors: writeResult.errors,
            backup: writeResult.backup,
            originalBook,
            updatedBook: readResult.data[bookIndex]
        };
    }

    /**
     * Batch update multiple books
     * @param {Array} updates - Array of {identifier, updates} objects
     * @param {string} csvPath - Path to books.csv (optional)
     * @returns {Promise<Object>} - Batch update result
     */
    static async batchUpdateBooks(updates, csvPath = null, options = {}) {
        const booksPath = csvPath || path.join(__dirname, '../../src/_data/books.csv');
        const readResult = await this.readBooks(booksPath);

        const results = {
            successful: 0,
            failed: 0,
            errors: [],
            updatedBooks: []
        };

        // Apply all updates
        for (const update of updates) {
            const bookIndex = readResult.data.findIndex(book =>
                book.isbn_asin === update.identifier || book.id === update.identifier
            );

            if (bookIndex === -1) {
                results.failed++;
                results.errors.push(`Book not found: ${update.identifier}`);
                continue;
            }

            const originalBook = { ...readResult.data[bookIndex] };
            Object.assign(readResult.data[bookIndex], update.updates);
            readResult.data[bookIndex].updated_at = new Date().toISOString().split('T')[0];

            results.successful++;
            results.updatedBooks.push({
                identifier: update.identifier,
                original: originalBook,
                updated: readResult.data[bookIndex]
            });
        }

        // Write back to file if any updates were successful
        if (results.successful > 0) {
            const writeOpts = options.allowedDir ? { allowedDir: options.allowedDir } : {};
            const writeResult = await this.write(booksPath, readResult.data, writeOpts);
            results.writeSuccess = writeResult.success;
            results.writeErrors = writeResult.errors;
            results.backup = writeResult.backup;
        }

        return results;
    }

    /**
     * Find books missing covers
     * @param {string} csvPath - Path to books.csv (optional)
     * @returns {Promise<Array>} - Books without cover images
     */
    static async findBooksWithoutCovers(csvPath = null) {
        const readResult = await this.readBooks(csvPath);

        return readResult.data.filter(book => {
            const imageUrl = book.image_url || book.cover_image || '';
            return !imageUrl || imageUrl.trim() === '' || imageUrl.toLowerCase() === 'null';
        });
    }

    /**
     * Get books by author
     * @param {string} authorName - Author name (partial match)
     * @param {string} csvPath - Path to books.csv (optional)
     * @returns {Promise<Array>} - Matching books
     */
    static async getBooksByAuthor(authorName, csvPath = null) {
        const readResult = await this.readBooks(csvPath);
        const authorLower = authorName.toLowerCase();

        return readResult.data.filter(book => {
            const fullName = (book.author_full_name || '').toLowerCase();
            const firstName = (book.author_first || '').toLowerCase();
            const lastName = (book.author_last || '').toLowerCase();

            return fullName.includes(authorLower) ||
                   firstName.includes(authorLower) ||
                   lastName.includes(authorLower);
        });
    }

    /**
     * Synchronous read for Eleventy and other sync contexts
     * @param {string} csvPath - Path to CSV file
     * @returns {Object} - {data: Array, errors: Array, stats: Object}
     */
    static readBooksSync(csvPath = null) {
        const booksPath = csvPath || path.join(__dirname, '../../src/_data/books.csv');

        try {
            const content = fs.readFileSync(booksPath, 'utf8');

            // Use synchronous CSV parsing
            const { parse } = require('csv-parse/sync');
            const records = parse(content, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
                quote: '"',
                escape: '"'
            });

            const result = {
                data: [],
                errors: [],
                stats: {
                    totalRows: records.length,
                    validRows: 0,
                    invalidRows: 0,
                    correctedRows: 0
                }
            };

            // Process each record
            records.forEach((record, index) => {
                try {
                    const cleanRecord = this.validateAndCleanRecord(record, index + 1);
                    result.data.push(cleanRecord.record);

                    if (cleanRecord.corrected) {
                        result.stats.correctedRows++;
                    }
                    result.stats.validRows++;

                    if (cleanRecord.warnings.length > 0) {
                        result.errors.push({
                            row: index + 1,
                            type: 'warning',
                            warnings: cleanRecord.warnings
                        });
                    }
                } catch (error) {
                    result.stats.invalidRows++;
                    result.errors.push({
                        row: index + 1,
                        type: 'error',
                        message: error.message,
                        record: record
                    });
                }
            });

            // Apply books-specific processing
            result.data = result.data.map(book => {
                // Ensure consistent author formatting
                if (!book.author_full_name && (book.author_first || book.author_last)) {
                    book.author_full_name = `${book.author_first || ''} ${book.author_last || ''}`.trim();
                }

                // Clean ISBN
                if (book.isbn_asin) {
                    book.isbn_asin = book.isbn_asin.replace(/[^0-9A-Z]/g, '');
                }

                return book;
            });

            return result;
        } catch (error) {
            return {
                data: [],
                errors: [{ type: 'fatal', message: error.message }],
                stats: { totalRows: 0, validRows: 0, invalidRows: 0, correctedRows: 0 }
            };
        }
    }
}

module.exports = CSVHandler;