const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

/**
 * Hudson Street Library Database Module
 * Main SQLite database interface using better-sqlite3
 * Provides connection management, CRUD operations, and query builders
 */

class LibraryDatabase {
    constructor(dbPath = null, options = {}) {
        // Default database path
        this.dbPath = dbPath || path.join(__dirname, '../../data/library.db');

        // Database connection options
        this.options = {
            verbose: options.verbose === true ? console.log : null, // Set to console.log for query logging
            fileMustExist: false,
            timeout: 5000,
            ...options
        };

        this.db = null;
        this.isInitialized = false;
        this.transactionDepth = 0;

        // Cache for prepared statements
        this.statements = new Map();

        // Connection pool simulation (better-sqlite3 is single connection)
        this.connectionPool = {
            maxConnections: 1,
            activeConnections: 0,
            waitingQueue: []
        };
    }

    /**
     * Initialize database connection and schema
     */
    async initialize() {
        try {
            // Ensure directory exists
            const dbDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Create database connection
            const dbOptions = {
                fileMustExist: this.options.fileMustExist,
                timeout: this.options.timeout
            };

            // Only add verbose if it's a function
            if (typeof this.options.verbose === 'function') {
                dbOptions.verbose = this.options.verbose;
            }

            this.db = new Database(this.dbPath, dbOptions);

            // Load and execute schema
            await this.executeSchema();

            // Configure database settings
            this.configurePragmas();

            // Prepare common statements
            this.prepareStatements();

            this.isInitialized = true;
            this.log('Database initialized successfully');

            return { success: true, message: 'Database initialized' };
        } catch (error) {
            this.log(`Database initialization failed: ${error.message}`, 'error');
            throw new Error(`Database initialization failed: ${error.message}`);
        }
    }

    /**
     * Execute schema SQL file
     */
    async executeSchema() {
        const schemaPath = path.join(__dirname, 'schema.sql');

        if (!fs.existsSync(schemaPath)) {
            throw new Error('Schema file not found: schema.sql');
        }

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Execute schema as a single script to handle multi-line statements
        try {
            this.db.exec(schemaSql);
        } catch (error) {
            // If that fails, try splitting and executing individual statements
            const statements = schemaSql
                .split(';')
                .map(stmt => stmt.trim())
                .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

            for (const statement of statements) {
                try {
                    if (statement.trim()) {
                        this.db.exec(statement + ';');
                    }
                } catch (stmtError) {
                    // Skip pragma statements that might fail in different environments
                    if (!statement.toUpperCase().includes('PRAGMA')) {
                        console.log(`Failed to execute statement: ${statement}`);
                        throw stmtError;
                    }
                }
            }
        }
    }

    /**
     * Configure SQLite PRAGMA settings
     */
    configurePragmas() {
        try {
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('foreign_keys = ON');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 10000');
            this.db.pragma('auto_vacuum = INCREMENTAL');
            this.db.pragma('page_size = 4096');
        } catch (error) {
            this.log(`Warning: Some PRAGMA settings failed: ${error.message}`, 'warn');
        }
    }

    /**
     * Prepare commonly used SQL statements
     */
    prepareStatements() {
        const statements = {
            // Books operations
            insertBook: `
                INSERT INTO books (
                    author_last, author_first, author_full_name, title, publisher,
                    publication_year, height_cm, width_cm, depth_cm, binding,
                    page_count, edition_printrun, isbn_asin, editor, contributors,
                    is_signed_inscribed, designer, description, artist_url,
                    publisher_url, collection_grouping, tags, classification,
                    bisac, ddc, location, accession_no, image_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,

            updateBook: `
                UPDATE books SET
                    author_last = ?, author_first = ?, author_full_name = ?, title = ?,
                    publisher = ?, publication_year = ?, height_cm = ?, width_cm = ?,
                    depth_cm = ?, binding = ?, page_count = ?, edition_printrun = ?,
                    isbn_asin = ?, editor = ?, contributors = ?, is_signed_inscribed = ?,
                    designer = ?, description = ?, artist_url = ?, publisher_url = ?,
                    collection_grouping = ?, tags = ?, classification = ?, bisac = ?,
                    ddc = ?, location = ?, accession_no = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `,

            deleteBook: 'DELETE FROM books WHERE id = ?',
            getBookById: 'SELECT * FROM books WHERE id = ?',
            getBookByIsbn: 'SELECT * FROM books WHERE isbn_asin = ?',
            getAllBooks: 'SELECT * FROM books ORDER BY title',
            searchBooks: 'SELECT * FROM books WHERE search_text LIKE ? ORDER BY title LIMIT ? OFFSET ?',

            // Covers operations
            insertCover: `
                INSERT INTO covers (
                    book_id, original_url, local_path, filename, width, height,
                    file_size, format, status, quality_score, source_api
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,

            updateCoverStatus: 'UPDATE covers SET status = ?, error_message = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            getCoversByBookId: 'SELECT * FROM covers WHERE book_id = ? ORDER BY created_at DESC',

            // API cache operations
            insertApiCache: `
                INSERT OR REPLACE INTO api_cache (
                    cache_key, api_source, query_type, query_value, response_data,
                    http_status, expires_at, confidence_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,

            getApiCache: 'SELECT * FROM api_cache WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP',
            cleanExpiredCache: 'DELETE FROM api_cache WHERE expires_at <= CURRENT_TIMESTAMP',

            // Processing log operations
            insertLog: `
                INSERT INTO processing_log (
                    operation_type, operation_category, target_table, target_id,
                    target_identifier, old_values, new_values, status, error_message,
                    rows_affected, duration_ms, source_file, batch_id, metadata
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,

            // Statistics
            getBookCount: 'SELECT COUNT(*) as count FROM books',
            getCoverCount: 'SELECT COUNT(*) as count FROM covers WHERE status = "complete"',
            getRecentActivity: 'SELECT * FROM view_recent_activity LIMIT ?'
        };

        // Prepare all statements
        for (const [key, sql] of Object.entries(statements)) {
            try {
                this.statements.set(key, this.db.prepare(sql));
            } catch (error) {
                this.log(`Failed to prepare statement ${key}: ${error.message}`, 'error');
            }
        }
    }

    /**
     * CRUD Operations for Books
     */

    /**
     * Insert a new book
     */
    insertBook(bookData) {
        this.ensureInitialized();

        try {
            // Basic validation
            if (!bookData.title && !bookData.isbn_asin) {
                return {
                    success: false,
                    error: 'Either title or ISBN is required for book insertion'
                };
            }

            const stmt = this.statements.get('insertBook');
            const params = [
                bookData.author_last || '',
                bookData.author_first || '',
                bookData.author_full_name || '',
                bookData.title || '',
                bookData.publisher || '',
                bookData.publication_year ? Number(bookData.publication_year) : null,
                bookData.height_cm ? Number(bookData.height_cm) : null,
                bookData.width_cm ? Number(bookData.width_cm) : null,
                bookData.depth_cm ? Number(bookData.depth_cm) : null,
                bookData.binding || '',
                bookData.page_count ? Number(bookData.page_count) : null,
                bookData.edition_printrun || '',
                bookData.isbn_asin || '',
                bookData.editor || '',
                bookData.contributors || '',
                bookData.is_signed_inscribed ? 1 : 0,
                bookData.designer || '',
                bookData.description || '',
                bookData.artist_url || '',
                bookData.publisher_url || '',
                bookData.collection_grouping || '',
                bookData.tags || '',
                bookData.classification || '',
                bookData.bisac || '',
                bookData.ddc || '',
                bookData.location || 'Hudson Street Library, NYC',
                bookData.accession_no || '',
                bookData.image_url || ''
            ];

            const result = stmt.run(...params);

            this.logOperation('insert', 'book', 'books', result.lastInsertRowid,
                             bookData.title || bookData.isbn_asin, null, bookData, 'success');

            return {
                success: true,
                id: result.lastInsertRowid,
                changes: result.changes
            };
        } catch (error) {
            this.logOperation('insert', 'book', 'books', null,
                             bookData.title || bookData.isbn_asin, null, bookData, 'failed', error.message);

            // Handle specific SQLite errors with clear messages
            if (error.message.includes('UNIQUE constraint failed')) {
                if (error.message.includes('isbn_asin')) {
                    return {
                        success: false,
                        error: `A book with ISBN ${bookData.isbn_asin} already exists`
                    };
                }
                return {
                    success: false,
                    error: 'A book with these details already exists'
                };
            }

            return {
                success: false,
                error: `Failed to insert book: ${error.message}`
            };
        }
    }

    /**
     * Update an existing book
     */
    updateBook(id, bookData) {
        this.ensureInitialized();

        try {
            // Validate ID
            if (!id || isNaN(Number(id))) {
                return {
                    success: false,
                    error: 'Valid book ID is required for update'
                };
            }

            // Get original data for logging
            const originalBook = this.getBookById(id);
            if (!originalBook) {
                return {
                    success: false,
                    error: `Book with ID ${id} not found`
                };
            }

            const stmt = this.statements.get('updateBook');
            const params = [
                bookData.author_last !== undefined ? bookData.author_last : originalBook.author_last,
                bookData.author_first !== undefined ? bookData.author_first : originalBook.author_first,
                bookData.author_full_name !== undefined ? bookData.author_full_name : originalBook.author_full_name,
                bookData.title !== undefined ? bookData.title : originalBook.title,
                bookData.publisher !== undefined ? bookData.publisher : originalBook.publisher,
                bookData.publication_year !== undefined ?
                    (bookData.publication_year ? Number(bookData.publication_year) : null) :
                    originalBook.publication_year,
                bookData.height_cm !== undefined ?
                    (bookData.height_cm ? Number(bookData.height_cm) : null) :
                    originalBook.height_cm,
                bookData.width_cm !== undefined ?
                    (bookData.width_cm ? Number(bookData.width_cm) : null) :
                    originalBook.width_cm,
                bookData.depth_cm !== undefined ?
                    (bookData.depth_cm ? Number(bookData.depth_cm) : null) :
                    originalBook.depth_cm,
                bookData.binding !== undefined ? bookData.binding : originalBook.binding,
                bookData.page_count !== undefined ?
                    (bookData.page_count ? Number(bookData.page_count) : null) :
                    originalBook.page_count,
                bookData.edition_printrun !== undefined ? bookData.edition_printrun : originalBook.edition_printrun,
                bookData.isbn_asin !== undefined ? bookData.isbn_asin : originalBook.isbn_asin,
                bookData.editor !== undefined ? bookData.editor : originalBook.editor,
                bookData.contributors !== undefined ? bookData.contributors : originalBook.contributors,
                bookData.is_signed_inscribed !== undefined ?
                    (bookData.is_signed_inscribed ? 1 : 0) :
                    originalBook.is_signed_inscribed,
                bookData.designer !== undefined ? bookData.designer : originalBook.designer,
                bookData.description !== undefined ? bookData.description : originalBook.description,
                bookData.artist_url !== undefined ? bookData.artist_url : originalBook.artist_url,
                bookData.publisher_url !== undefined ? bookData.publisher_url : originalBook.publisher_url,
                bookData.collection_grouping !== undefined ? bookData.collection_grouping : originalBook.collection_grouping,
                bookData.tags !== undefined ? bookData.tags : originalBook.tags,
                bookData.classification !== undefined ? bookData.classification : originalBook.classification,
                bookData.bisac !== undefined ? bookData.bisac : originalBook.bisac,
                bookData.ddc !== undefined ? bookData.ddc : originalBook.ddc,
                bookData.location !== undefined ? bookData.location : originalBook.location,
                bookData.accession_no !== undefined ? bookData.accession_no : originalBook.accession_no,
                bookData.image_url !== undefined ? bookData.image_url : originalBook.image_url,
                id
            ];

            const result = stmt.run(...params);

            this.logOperation('update', 'book', 'books', id,
                             originalBook.title || originalBook.isbn_asin, originalBook, bookData, 'success');

            return {
                success: true,
                id: Number(id),
                changes: result.changes
            };
        } catch (error) {
            this.logOperation('update', 'book', 'books', id, null, null, bookData, 'failed', error.message);

            // Handle specific SQLite errors
            if (error.message.includes('UNIQUE constraint failed')) {
                if (error.message.includes('isbn_asin')) {
                    return {
                        success: false,
                        error: `Cannot update: A book with ISBN ${bookData.isbn_asin} already exists`
                    };
                }
                return {
                    success: false,
                    error: 'Cannot update: A book with these details already exists'
                };
            }

            return {
                success: false,
                error: `Failed to update book: ${error.message}`
            };
        }
    }

    /**
     * Delete a book
     */
    deleteBook(id) {
        this.ensureInitialized();

        try {
            // Validate ID
            if (!id || isNaN(Number(id))) {
                return {
                    success: false,
                    error: 'Valid book ID is required for deletion'
                };
            }

            // Get original data for logging
            const originalBook = this.getBookById(id);
            if (!originalBook) {
                return {
                    success: false,
                    error: `Book with ID ${id} not found`
                };
            }

            const stmt = this.statements.get('deleteBook');
            const result = stmt.run(id);

            this.logOperation('delete', 'book', 'books', id,
                             originalBook.title || originalBook.isbn_asin, originalBook, null, 'success');

            return {
                success: true,
                changes: result.changes
            };
        } catch (error) {
            this.logOperation('delete', 'book', 'books', id, null, null, null, 'failed', error.message);

            // Handle specific SQLite errors
            if (error.message.includes('FOREIGN KEY constraint failed')) {
                return {
                    success: false,
                    error: `Cannot delete book with ID ${id}: Book has related data (covers, etc.). Delete related data first or disable foreign key constraints.`
                };
            }

            return {
                success: false,
                error: `Failed to delete book: ${error.message}`
            };
        }
    }

    /**
     * Get book by ID
     */
    getBookById(id) {
        this.ensureInitialized();
        const stmt = this.statements.get('getBookById');
        return stmt.get(id);
    }

    /**
     * Get book by ISBN
     */
    getBookByIsbn(isbn) {
        this.ensureInitialized();
        const stmt = this.statements.get('getBookByIsbn');
        return stmt.get(isbn);
    }

    /**
     * Get all books
     */
    getAllBooks(limit = null, offset = 0) {
        this.ensureInitialized();

        if (limit) {
            const stmt = this.db.prepare('SELECT * FROM books ORDER BY title LIMIT ? OFFSET ?');
            return stmt.all(limit, offset);
        } else {
            const stmt = this.statements.get('getAllBooks');
            return stmt.all();
        }
    }

    /**
     * Search books with pagination
     */
    searchBooks(query, limit = 50, offset = 0) {
        this.ensureInitialized();
        const stmt = this.statements.get('searchBooks');
        const searchTerm = `%${query.toLowerCase()}%`;
        return stmt.all(searchTerm, limit, offset);
    }

    /**
     * Get books by author
     */
    getBooksByAuthor(authorName, exact = false) {
        this.ensureInitialized();

        let sql;
        let param;

        if (exact) {
            sql = 'SELECT * FROM books WHERE author_full_name = ? ORDER BY title';
            param = authorName;
        } else {
            sql = 'SELECT * FROM books WHERE author_full_name LIKE ? OR author_last LIKE ? ORDER BY title';
            param = `%${authorName}%`;
        }

        const stmt = this.db.prepare(sql);
        return exact ? stmt.all(param) : stmt.all(param, param);
    }

    /**
     * Get books missing covers
     */
    getBooksWithoutCovers() {
        this.ensureInitialized();
        return this.db.prepare('SELECT * FROM view_books_missing_covers ORDER BY title').all();
    }

    /**
     * Cover Operations
     */

    /**
     * Insert cover record
     */
    insertCover(coverData) {
        this.ensureInitialized();

        try {
            // Validate that book_id is provided
            if (!coverData.book_id) {
                return {
                    success: false,
                    error: 'book_id is required for cover insertion'
                };
            }

            // Check if the book exists
            const book = this.getBookById(coverData.book_id);
            if (!book) {
                return {
                    success: false,
                    error: `Book with ID ${coverData.book_id} not found. Cannot insert cover for non-existent book.`
                };
            }

            const stmt = this.statements.get('insertCover');
            const result = stmt.run(
                Number(coverData.book_id),
                coverData.original_url || null,
                coverData.local_path || null,
                coverData.filename || null,
                coverData.width ? Number(coverData.width) : null,
                coverData.height ? Number(coverData.height) : null,
                coverData.file_size ? Number(coverData.file_size) : null,
                coverData.format || null,
                coverData.status || 'pending',
                coverData.quality_score ? Number(coverData.quality_score) : null,
                coverData.source_api || null
            );

            return {
                success: true,
                id: result.lastInsertRowid,
                changes: result.changes
            };
        } catch (error) {
            // Handle specific SQLite errors
            if (error.message.includes('FOREIGN KEY constraint failed')) {
                return {
                    success: false,
                    error: `Book with ID ${coverData.book_id} not found. Cannot insert cover for non-existent book.`
                };
            }

            return {
                success: false,
                error: `Failed to insert cover: ${error.message}`
            };
        }
    }

    /**
     * Update cover status
     */
    updateCoverStatus(coverId, status, errorMessage = null) {
        this.ensureInitialized();

        try {
            // Validate parameters
            if (!coverId || isNaN(Number(coverId))) {
                return {
                    success: false,
                    error: 'Valid cover ID is required for status update'
                };
            }

            if (!status) {
                return {
                    success: false,
                    error: 'Status is required for cover status update'
                };
            }

            // Check if cover exists
            const existingCovers = this.db.prepare('SELECT id FROM covers WHERE id = ?').get(coverId);
            if (!existingCovers) {
                return {
                    success: false,
                    error: `Cover with ID ${coverId} not found`
                };
            }

            const stmt = this.statements.get('updateCoverStatus');
            const result = stmt.run(status, errorMessage, coverId);

            return {
                success: true,
                changes: result.changes
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to update cover status: ${error.message}`
            };
        }
    }

    /**
     * Get covers for a book
     */
    getCoversByBookId(bookId) {
        this.ensureInitialized();
        const stmt = this.statements.get('getCoversByBookId');
        return stmt.all(bookId);
    }

    /**
     * API Cache Operations
     */

    /**
     * Cache API response
     */
    cacheApiResponse(cacheKey, apiSource, queryType, queryValue, responseData, httpStatus = 200, expiresInHours = 24, confidence = 1.0) {
        this.ensureInitialized();

        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + expiresInHours);

            const stmt = this.statements.get('insertApiCache');
            const result = stmt.run(
                cacheKey,
                apiSource,
                queryType,
                queryValue,
                JSON.stringify(responseData),
                httpStatus,
                expiresAt.toISOString(),
                confidence
            );

            return {
                success: true,
                id: result.lastInsertRowid
            };
        } catch (error) {
            throw new Error(`Failed to cache API response: ${error.message}`);
        }
    }

    /**
     * Get cached API response
     */
    getCachedApiResponse(cacheKey) {
        this.ensureInitialized();

        const stmt = this.statements.get('getApiCache');
        const result = stmt.get(cacheKey);

        if (result) {
            // Update last accessed and hit count
            this.db.prepare('UPDATE api_cache SET last_accessed = CURRENT_TIMESTAMP WHERE cache_key = ?').run(cacheKey);

            return {
                ...result,
                response_data: JSON.parse(result.response_data)
            };
        }

        return null;
    }

    /**
     * Clean expired cache entries
     */
    cleanExpiredCache() {
        this.ensureInitialized();
        const stmt = this.statements.get('cleanExpiredCache');
        const result = stmt.run();
        return result.changes;
    }

    /**
     * Logging Operations
     */

    /**
     * Log database operation
     */
    logOperation(operationType, category, targetTable, targetId, targetIdentifier, oldValues, newValues, status, errorMessage = null, duration = null, sourceFile = null, batchId = null, metadata = null) {
        if (!this.isInitialized) return; // Don't log during initialization

        try {
            const stmt = this.statements.get('insertLog');
            stmt.run(
                operationType,
                category,
                targetTable,
                targetId,
                targetIdentifier,
                oldValues ? JSON.stringify(oldValues) : null,
                newValues ? JSON.stringify(newValues) : null,
                status,
                errorMessage,
                0, // rows_affected - will be updated by caller if needed
                duration,
                sourceFile,
                batchId,
                metadata ? JSON.stringify(metadata) : null
            );
        } catch (error) {
            this.log(`Failed to log operation: ${error.message}`, 'error');
        }
    }

    /**
     * Transaction Management
     */

    /**
     * Begin transaction
     */
    beginTransaction() {
        this.ensureInitialized();

        if (this.transactionDepth === 0) {
            this.db.exec('BEGIN TRANSACTION');
        }
        this.transactionDepth++;

        return {
            commit: () => this.commitTransaction(),
            rollback: () => this.rollbackTransaction()
        };
    }

    /**
     * Commit transaction
     */
    commitTransaction() {
        this.ensureInitialized();

        if (this.transactionDepth > 0) {
            this.transactionDepth--;
            if (this.transactionDepth === 0) {
                this.db.exec('COMMIT');
            }
        }
    }

    /**
     * Rollback transaction
     */
    rollbackTransaction() {
        this.ensureInitialized();

        if (this.transactionDepth > 0) {
            this.transactionDepth = 0;
            this.db.exec('ROLLBACK');
        }
    }

    /**
     * Execute in transaction
     */
    transaction(callback) {
        const txn = this.beginTransaction();

        try {
            const result = callback();
            txn.commit();
            return result;
        } catch (error) {
            txn.rollback();
            throw error;
        }
    }

    /**
     * Query Builders
     */

    /**
     * Build dynamic query for books
     */
    buildBookQuery(filters = {}, orderBy = 'title', direction = 'ASC', limit = null, offset = 0) {
        let sql = 'SELECT * FROM books';
        const params = [];
        const conditions = [];

        // Build WHERE conditions
        if (filters.author) {
            conditions.push('(author_full_name LIKE ? OR author_last LIKE ?)');
            params.push(`%${filters.author}%`, `%${filters.author}%`);
        }

        if (filters.title) {
            conditions.push('title LIKE ?');
            params.push(`%${filters.title}%`);
        }

        if (filters.publisher) {
            conditions.push('publisher LIKE ?');
            params.push(`%${filters.publisher}%`);
        }

        if (filters.year) {
            if (Array.isArray(filters.year)) {
                conditions.push('publication_year BETWEEN ? AND ?');
                params.push(filters.year[0], filters.year[1]);
            } else {
                conditions.push('publication_year = ?');
                params.push(filters.year);
            }
        }

        if (filters.isbn) {
            conditions.push('isbn_asin = ?');
            params.push(filters.isbn);
        }

        if (filters.tags) {
            conditions.push('tags LIKE ?');
            params.push(`%${filters.tags}%`);
        }

        if (filters.signed) {
            conditions.push('is_signed_inscribed = ?');
            params.push(filters.signed);
        }

        if (filters.search) {
            conditions.push('search_text LIKE ?');
            params.push(`%${filters.search.toLowerCase()}%`);
        }

        // Add WHERE clause
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        // Add ORDER BY
        const validColumns = ['title', 'author_full_name', 'publisher', 'publication_year', 'created_at', 'updated_at'];
        if (validColumns.includes(orderBy)) {
            sql += ` ORDER BY ${orderBy} ${direction.toUpperCase()}`;
        }

        // Add LIMIT and OFFSET
        if (limit) {
            sql += ' LIMIT ?';
            params.push(limit);

            if (offset > 0) {
                sql += ' OFFSET ?';
                params.push(offset);
            }
        }

        return { sql, params };
    }

    /**
     * Execute dynamic book query
     */
    queryBooks(filters = {}, orderBy = 'title', direction = 'ASC', limit = null, offset = 0) {
        this.ensureInitialized();

        const { sql, params } = this.buildBookQuery(filters, orderBy, direction, limit, offset);
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Statistics and Analytics
     */

    /**
     * Get database statistics
     */
    getStats() {
        this.ensureInitialized();

        const bookCountStmt = this.statements.get('getBookCount');
        const coverCountStmt = this.statements.get('getCoverCount');

        const stats = {
            books: {
                total: bookCountStmt.get().count,
                withCovers: coverCountStmt.get().count,
                withoutCovers: 0
            },
            covers: {
                total: this.db.prepare('SELECT COUNT(*) as count FROM covers').get().count,
                complete: coverCountStmt.get().count,
                pending: this.db.prepare('SELECT COUNT(*) as count FROM covers WHERE status = "pending"').get().count,
                failed: this.db.prepare('SELECT COUNT(*) as count FROM covers WHERE status = "failed"').get().count
            },
            cache: {
                entries: this.db.prepare('SELECT COUNT(*) as count FROM api_cache').get().count,
                expired: this.db.prepare('SELECT COUNT(*) as count FROM api_cache WHERE expires_at <= CURRENT_TIMESTAMP').get().count
            },
            database: {
                size: this.getDatabaseSize(),
                lastVacuum: this.getLastVacuum(),
                pageCount: this.db.pragma('page_count'),
                pageSize: this.db.pragma('page_size'),
                journalMode: this.db.pragma('journal_mode'),
                foreignKeys: this.db.pragma('foreign_keys')
            }
        };

        stats.books.withoutCovers = stats.books.total - stats.books.withCovers;

        return stats;
    }

    /**
     * Get database file size
     */
    getDatabaseSize() {
        try {
            const stats = fs.statSync(this.dbPath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get last vacuum date
     */
    getLastVacuum() {
        try {
            return this.db.pragma('schema_version');
        } catch (error) {
            return null;
        }
    }

    /**
     * Utility Methods
     */

    /**
     * Ensure database is initialized
     */
    ensureInitialized() {
        if (!this.isInitialized) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            // Clear prepared statements map
            this.statements.clear();

            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }

    /**
     * Optimize database
     */
    optimize() {
        this.ensureInitialized();

        try {
            this.db.pragma('optimize');
            this.db.pragma('incremental_vacuum');
            return { success: true, message: 'Database optimized' };
        } catch (error) {
            throw new Error(`Database optimization failed: ${error.message}`);
        }
    }

    /**
     * Logging utility
     */
    log(message, level = 'info') {
        if (this.options.verbose) {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
    }

    /**
     * CSV Handler compatibility methods for easy migration
     */

    /**
     * Read books in CSV handler format
     */
    readBooksSync() {
        const books = this.getAllBooks();
        return {
            data: books,
            errors: [],
            stats: {
                totalRows: books.length,
                validRows: books.length,
                invalidRows: 0,
                correctedRows: 0
            }
        };
    }

    /**
     * Update book in CSV handler format
     */
    async updateBook_CSV_Format(identifier, updates) {
        try {
            let book = this.getBookByIsbn(identifier) || this.getBookById(identifier);

            if (!book) {
                return {
                    success: false,
                    error: `Book not found with identifier: ${identifier}`
                };
            }

            const result = this.updateBook(book.id, updates);
            const updatedBook = this.getBookById(book.id);

            return {
                success: result.success,
                errors: [],
                originalBook: book,
                updatedBook: updatedBook
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Batch update books in CSV handler format
     */
    async batchUpdateBooks_CSV_Format(updates) {
        const results = {
            successful: 0,
            failed: 0,
            errors: [],
            updatedBooks: []
        };

        const transaction = this.beginTransaction();

        try {
            for (const update of updates) {
                try {
                    const result = await this.updateBook_CSV_Format(update.identifier, update.updates);

                    if (result.success) {
                        results.successful++;
                        results.updatedBooks.push({
                            identifier: update.identifier,
                            original: result.originalBook,
                            updated: result.updatedBook
                        });
                    } else {
                        results.failed++;
                        results.errors.push(result.error);
                    }
                } catch (error) {
                    results.failed++;
                    results.errors.push(`${update.identifier}: ${error.message}`);
                }
            }

            transaction.commit();
            results.writeSuccess = true;

        } catch (error) {
            transaction.rollback();
            results.writeSuccess = false;
            results.writeErrors = [error.message];
        }

        return results;
    }
}

module.exports = LibraryDatabase;