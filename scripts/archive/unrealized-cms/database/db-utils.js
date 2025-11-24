const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const LibraryDatabase = require('./database');

/**
 * Hudson Street Library Database Utilities
 * Provides backup, restore, maintenance, and performance optimization utilities
 */

class DatabaseUtils {
    constructor(dbPath = null, options = {}) {
        this.dbPath = dbPath || path.join(__dirname, '../../data/library.db');
        this.options = {
            verbose: options.verbose || false,
            backupDir: options.backupDir || path.join(path.dirname(this.dbPath), 'backups'),
            ...options
        };

        this.db = null;
    }

    /**
     * Initialize database connection
     */
    async initialize() {
        if (!this.db) {
            this.db = new LibraryDatabase(this.dbPath, this.options);
            await this.db.initialize();
        }
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /**
     * BACKUP OPERATIONS
     */

    /**
     * Create full database backup
     */
    async createBackup(options = {}) {
        const backupOptions = {
            includeTimestamp: options.includeTimestamp !== false,
            compress: options.compress || false,
            description: options.description || 'Manual backup',
            ...options
        };

        try {
            // Ensure backup directory exists
            if (!fs.existsSync(this.options.backupDir)) {
                fs.mkdirSync(this.options.backupDir, { recursive: true });
            }

            // Generate backup filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            let backupName = backupOptions.includeTimestamp
                ? `library_backup_${timestamp}.db`
                : 'library_backup.db';

            if (backupOptions.name) {
                backupName = backupOptions.name.endsWith('.db') ? backupOptions.name : `${backupOptions.name}.db`;
            }

            const backupPath = path.join(this.options.backupDir, backupName);

            // Ensure database is initialized
            await this.initialize();

            // Use SQLite backup API for consistent backup
            await this.createSqliteBackup(this.dbPath, backupPath);

            // Compress if requested
            let finalPath = backupPath;
            if (backupOptions.compress) {
                finalPath = await this.compressBackup(backupPath);
                fs.unlinkSync(backupPath); // Remove uncompressed version
            }

            // Get backup info
            const backupInfo = this.getBackupInfo(finalPath);

            // Log backup creation
            this.db.logOperation(
                'backup',
                'database',
                'system',
                null,
                backupName,
                null,
                {
                    backupPath: finalPath,
                    description: backupOptions.description,
                    size: backupInfo.size,
                    compressed: backupOptions.compress
                },
                'success'
            );

            this.log(`Backup created successfully: ${finalPath}`, 'success');

            return {
                success: true,
                backupPath: finalPath,
                info: backupInfo
            };

        } catch (error) {
            this.log(`Backup failed: ${error.message}`, 'error');
            throw new Error(`Backup failed: ${error.message}`);
        }
    }

    /**
     * Create SQLite backup using .backup command
     */
    async createSqliteBackup(sourcePath, targetPath) {
        return new Promise((resolve, reject) => {
            try {
                // Use better-sqlite3's backup method
                const Database = require('better-sqlite3');
                const sourceDb = new Database(sourcePath, { readonly: true });
                const targetDb = new Database(targetPath);

                // Perform backup
                sourceDb.backup(targetDb);

                sourceDb.close();
                targetDb.close();

                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Compress backup file
     */
    async compressBackup(backupPath) {
        const zlib = require('zlib');
        const compressedPath = backupPath.replace('.db', '.db.gz');

        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(backupPath);
            const writeStream = fs.createWriteStream(compressedPath);
            const gzip = zlib.createGzip({ level: 9 });

            readStream
                .pipe(gzip)
                .pipe(writeStream)
                .on('finish', () => resolve(compressedPath))
                .on('error', reject);
        });
    }

    /**
     * List available backups
     */
    listBackups() {
        if (!fs.existsSync(this.options.backupDir)) {
            return [];
        }

        const backups = fs.readdirSync(this.options.backupDir)
            .filter(file => file.endsWith('.db') || file.endsWith('.db.gz'))
            .map(file => {
                const filePath = path.join(this.options.backupDir, file);
                const stats = fs.statSync(filePath);

                return {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    compressed: file.endsWith('.gz'),
                    info: this.getBackupInfo(filePath)
                };
            })
            .sort((a, b) => b.created - a.created);

        return backups;
    }

    /**
     * Get backup file information
     */
    getBackupInfo(backupPath) {
        const stats = fs.statSync(backupPath);
        const isCompressed = backupPath.endsWith('.gz');

        return {
            name: path.basename(backupPath),
            path: backupPath,
            size: stats.size,
            sizeFormatted: this.formatBytes(stats.size),
            created: stats.birthtime,
            modified: stats.mtime,
            compressed: isCompressed,
            exists: fs.existsSync(backupPath)
        };
    }

    /**
     * RESTORE OPERATIONS
     */

    /**
     * Restore database from backup
     */
    async restoreFromBackup(backupPath, options = {}) {
        const restoreOptions = {
            createCurrentBackup: options.createCurrentBackup !== false,
            verifyIntegrity: options.verifyIntegrity !== false,
            force: options.force || false,
            ...options
        };

        try {
            this.log('Starting database restore...', 'info');

            // Verify backup exists
            if (!fs.existsSync(backupPath)) {
                throw new Error(`Backup file not found: ${backupPath}`);
            }

            // Create backup of current database if requested
            let currentBackupPath = null;
            if (restoreOptions.createCurrentBackup && fs.existsSync(this.dbPath)) {
                this.log('Creating backup of current database...', 'info');
                const currentBackup = await this.createBackup({
                    description: 'Pre-restore backup',
                    name: `pre_restore_${Date.now()}`
                });
                currentBackupPath = currentBackup.backupPath;
            }

            // Close current database connection
            this.close();

            // Decompress backup if needed
            let restoreSource = backupPath;
            if (backupPath.endsWith('.gz')) {
                restoreSource = await this.decompressBackup(backupPath);
            }

            // Verify backup integrity
            if (restoreOptions.verifyIntegrity) {
                await this.verifyBackupIntegrity(restoreSource);
            }

            // Perform restore (copy backup to main database location)
            fs.copyFileSync(restoreSource, this.dbPath);

            // Clean up temporary decompressed file
            if (restoreSource !== backupPath) {
                fs.unlinkSync(restoreSource);
            }

            // Re-initialize database connection
            await this.initialize();

            // Verify restored database
            const stats = this.db.getStats();

            // Log restore operation
            this.db.logOperation(
                'restore',
                'database',
                'system',
                null,
                path.basename(backupPath),
                null,
                {
                    backupPath: backupPath,
                    currentBackupPath: currentBackupPath,
                    booksRestored: stats.books.total
                },
                'success'
            );

            this.log(`Database restored successfully from: ${backupPath}`, 'success');
            this.log(`Restored ${stats.books.total} books`, 'info');

            return {
                success: true,
                backupPath: backupPath,
                currentBackupPath: currentBackupPath,
                stats: stats
            };

        } catch (error) {
            this.log(`Restore failed: ${error.message}`, 'error');
            throw new Error(`Restore failed: ${error.message}`);
        }
    }

    /**
     * Decompress backup file
     */
    async decompressBackup(compressedPath) {
        const zlib = require('zlib');
        const tempPath = compressedPath.replace('.gz', '.temp');

        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(compressedPath);
            const writeStream = fs.createWriteStream(tempPath);
            const gunzip = zlib.createGunzip();

            readStream
                .pipe(gunzip)
                .pipe(writeStream)
                .on('finish', () => resolve(tempPath))
                .on('error', reject);
        });
    }

    /**
     * Verify backup integrity
     */
    async verifyBackupIntegrity(backupPath) {
        this.log('Verifying backup integrity...', 'info');

        try {
            // Try to open backup database
            const Database = require('better-sqlite3');
            const testDb = new Database(backupPath, { readonly: true });

            // Run basic integrity check
            const integrityCheck = testDb.pragma('integrity_check');
            testDb.close();

            if (integrityCheck[0].integrity_check !== 'ok') {
                throw new Error('Backup database integrity check failed');
            }

            this.log('Backup integrity verified', 'success');

        } catch (error) {
            throw new Error(`Backup integrity verification failed: ${error.message}`);
        }
    }

    /**
     * MAINTENANCE OPERATIONS
     */

    /**
     * Vacuum database to reclaim space and defragment
     */
    async vacuum(options = {}) {
        try {
            await this.initialize();

            this.log('Starting database vacuum...', 'info');

            const beforeStats = this.getDetailedStats();
            const startTime = Date.now();

            // Perform vacuum
            this.db.db.exec('VACUUM');

            const duration = Date.now() - startTime;
            const afterStats = this.getDetailedStats();
            const spaceSaved = beforeStats.fileSize - afterStats.fileSize;

            this.log(`Vacuum completed in ${duration}ms`, 'success');
            this.log(`Space reclaimed: ${this.formatBytes(spaceSaved)}`, 'info');

            // Log vacuum operation
            this.db.logOperation(
                'vacuum',
                'maintenance',
                'system',
                null,
                'database_vacuum',
                beforeStats,
                afterStats,
                'success',
                null,
                duration
            );

            return {
                success: true,
                duration: duration,
                spaceSaved: spaceSaved,
                beforeStats: beforeStats,
                afterStats: afterStats
            };

        } catch (error) {
            this.log(`Vacuum failed: ${error.message}`, 'error');
            throw new Error(`Vacuum failed: ${error.message}`);
        }
    }

    /**
     * Analyze database to update query planner statistics
     */
    async analyze() {
        try {
            await this.initialize();

            this.log('Analyzing database statistics...', 'info');

            const startTime = Date.now();
            this.db.db.exec('ANALYZE');
            const duration = Date.now() - startTime;

            this.log(`Analysis completed in ${duration}ms`, 'success');

            // Log analyze operation
            this.db.logOperation(
                'analyze',
                'maintenance',
                'system',
                null,
                'database_analyze',
                null,
                null,
                'success',
                null,
                duration
            );

            return {
                success: true,
                duration: duration
            };

        } catch (error) {
            this.log(`Analysis failed: ${error.message}`, 'error');
            throw new Error(`Analysis failed: ${error.message}`);
        }
    }

    /**
     * Optimize database (vacuum + analyze)
     */
    async optimize() {
        try {
            this.log('Starting database optimization...', 'info');

            const results = {
                vacuum: await this.vacuum(),
                analyze: await this.analyze()
            };

            this.log('Database optimization completed', 'success');
            return results;

        } catch (error) {
            this.log(`Optimization failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Clean up expired cache entries
     */
    async cleanupCache() {
        try {
            await this.initialize();

            const removedCount = this.db.cleanExpiredCache();
            this.log(`Removed ${removedCount} expired cache entries`, 'info');

            return {
                success: true,
                removedCount: removedCount
            };

        } catch (error) {
            this.log(`Cache cleanup failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * VALIDATION OPERATIONS
     */

    /**
     * Validate database integrity
     */
    async validateIntegrity() {
        try {
            await this.initialize();

            this.log('Validating database integrity...', 'info');

            const results = {
                integrityCheck: this.db.db.pragma('integrity_check'),
                foreignKeyCheck: this.db.db.pragma('foreign_key_check'),
                quickCheck: this.db.db.pragma('quick_check')
            };

            const isValid = results.integrityCheck[0].integrity_check === 'ok' &&
                           results.quickCheck[0].quick_check === 'ok' &&
                           results.foreignKeyCheck.length === 0;

            if (isValid) {
                this.log('Database integrity validation passed', 'success');
            } else {
                this.log('Database integrity validation found issues', 'warn');
                if (results.foreignKeyCheck.length > 0) {
                    this.log(`Foreign key violations: ${results.foreignKeyCheck.length}`, 'warn');
                }
            }

            return {
                valid: isValid,
                results: results
            };

        } catch (error) {
            this.log(`Integrity validation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Validate data consistency
     */
    async validateDataConsistency() {
        try {
            await this.initialize();

            this.log('Validating data consistency...', 'info');

            const issues = [];

            // Check for books without required fields
            const booksWithoutTitle = this.db.db.prepare('SELECT COUNT(*) as count FROM books WHERE title IS NULL OR title = ""').get();
            if (booksWithoutTitle.count > 0) {
                issues.push(`${booksWithoutTitle.count} books without title`);
            }

            // Check for covers without books
            const orphanedCovers = this.db.db.prepare('SELECT COUNT(*) as count FROM covers WHERE book_id NOT IN (SELECT id FROM books)').get();
            if (orphanedCovers.count > 0) {
                issues.push(`${orphanedCovers.count} orphaned cover records`);
            }

            // Check for duplicate ISBNs
            const duplicateIsbns = this.db.db.prepare(`
                SELECT isbn_asin, COUNT(*) as count
                FROM books
                WHERE isbn_asin IS NOT NULL AND isbn_asin != ''
                GROUP BY isbn_asin
                HAVING COUNT(*) > 1
            `).all();

            if (duplicateIsbns.length > 0) {
                issues.push(`${duplicateIsbns.length} duplicate ISBN/ASIN values`);
            }

            const isConsistent = issues.length === 0;

            if (isConsistent) {
                this.log('Data consistency validation passed', 'success');
            } else {
                this.log(`Data consistency issues found: ${issues.length}`, 'warn');
                issues.forEach(issue => this.log(`  - ${issue}`, 'warn'));
            }

            return {
                consistent: isConsistent,
                issues: issues,
                duplicateIsbns: duplicateIsbns
            };

        } catch (error) {
            this.log(`Data consistency validation failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * PERFORMANCE OPERATIONS
     */

    /**
     * Get detailed database statistics
     */
    getDetailedStats() {
        if (!this.db || !this.db.db) {
            throw new Error('Database not initialized');
        }

        const stats = {
            fileSize: this.getDatabaseFileSize(),
            pageCount: this.db.db.pragma('page_count'),
            pageSize: this.db.db.pragma('page_size'),
            cacheSize: this.db.db.pragma('cache_size'),
            freelistCount: this.db.db.pragma('freelist_count'),
            journalMode: this.db.db.pragma('journal_mode'),
            synchronous: this.db.db.pragma('synchronous'),
            autoVacuum: this.db.db.pragma('auto_vacuum'),
            foreignKeys: this.db.db.pragma('foreign_keys')
        };

        stats.utilisedSpace = (stats.pageCount - stats.freelistCount) * stats.pageSize;
        stats.freeSpace = stats.freelistCount * stats.pageSize;
        stats.efficiency = stats.pageCount > 0 ? ((stats.pageCount - stats.freelistCount) / stats.pageCount * 100).toFixed(2) : 0;

        return stats;
    }

    /**
     * Get database file size
     */
    getDatabaseFileSize() {
        try {
            const stats = fs.statSync(this.dbPath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Benchmark query performance
     */
    async benchmarkQueries() {
        try {
            if (!this.db) {
                await this.initialize();
            }

            this.log('Running query performance benchmarks...', 'info');

            const benchmarks = {};

            // Test common queries
            const queries = {
                'SELECT all books': 'SELECT * FROM books',
                'Search by title': "SELECT * FROM books WHERE title LIKE '%photo%'",
                'Search by author': "SELECT * FROM books WHERE author_full_name LIKE '%abbott%'",
                'Books with covers': 'SELECT * FROM view_books_complete WHERE has_cover = 1',
                'Books without covers': 'SELECT * FROM view_books_missing_covers',
                'Recent books': 'SELECT * FROM books ORDER BY created_at DESC LIMIT 10'
            };

            for (const [name, sql] of Object.entries(queries)) {
                const times = [];

                // Run each query 5 times
                for (let i = 0; i < 5; i++) {
                    const start = process.hrtime.bigint();
                    this.db.db.prepare(sql).all();
                    const end = process.hrtime.bigint();
                    times.push(Number(end - start) / 1000000); // Convert to milliseconds
                }

                benchmarks[name] = {
                    avg: times.reduce((a, b) => a + b) / times.length,
                    min: Math.min(...times),
                    max: Math.max(...times),
                    times: times
                };
            }

            this.log('Query benchmarks completed', 'success');
            return benchmarks;

        } catch (error) {
            this.log(`Benchmark failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * UTILITY METHODS
     */

    /**
     * Format bytes to human readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format duration in human readable format
     */
    formatDuration(ms) {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    }

    /**
     * Log with colors and levels
     */
    log(message, level = 'info') {
        if (!this.options.verbose && level === 'debug') return;

        const colors = {
            info: '\x1b[36m',    // Cyan
            success: '\x1b[32m', // Green
            warn: '\x1b[33m',    // Yellow
            error: '\x1b[31m',   // Red
            debug: '\x1b[37m'    // White
        };

        const reset = '\x1b[0m';
        const timestamp = new Date().toISOString();
        const color = colors[level] || colors.info;

        console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${reset}`);
    }

    /**
     * CSV Handler compatibility methods
     */

    /**
     * Create backup in CSV handler compatible format
     */
    async createBackup_CSV_Format() {
        const result = await this.createBackup({
            description: 'CSV handler compatible backup'
        });

        return {
            success: result.success,
            backup: result.backupPath
        };
    }
}

/**
 * Standalone utility functions
 */

/**
 * Quick database health check
 */
async function healthCheck(dbPath = null) {
    const utils = new DatabaseUtils(dbPath, { verbose: false });

    try {
        await utils.initialize();

        const stats = utils.db.getStats();
        const integrity = await utils.validateIntegrity();
        const consistency = await utils.validateDataConsistency();

        const health = {
            healthy: integrity.valid && consistency.consistent,
            stats: stats,
            integrity: integrity,
            consistency: consistency,
            recommendations: []
        };

        // Generate recommendations
        if (stats.covers.failed > 0) {
            health.recommendations.push('Some cover downloads have failed - consider retrying');
        }

        if (stats.cache.expired > 0) {
            health.recommendations.push('Expired cache entries found - consider cleanup');
        }

        const detailedStats = utils.getDetailedStats();
        if (detailedStats.efficiency < 80) {
            health.recommendations.push('Database efficiency is low - consider vacuum');
        }

        return health;

    } finally {
        utils.close();
    }
}

/**
 * Emergency database repair
 */
async function emergencyRepair(dbPath = null) {
    const utils = new DatabaseUtils(dbPath, { verbose: true });

    try {
        console.log('Starting emergency database repair...');

        // Create backup before repair
        await utils.initialize();
        const backup = await utils.createBackup({
            description: 'Pre-repair emergency backup'
        });

        console.log(`Emergency backup created: ${backup.backupPath}`);

        // Run repairs
        await utils.vacuum();
        await utils.analyze();
        await utils.cleanupCache();

        // Validate after repair
        const integrity = await utils.validateIntegrity();
        const consistency = await utils.validateDataConsistency();

        console.log('Emergency repair completed');

        return {
            success: true,
            backupPath: backup.backupPath,
            integrity: integrity,
            consistency: consistency
        };

    } finally {
        utils.close();
    }
}

module.exports = {
    DatabaseUtils,
    healthCheck,
    emergencyRepair
};