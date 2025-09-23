/**
 * Persistent Image Cache System
 *
 * Implements a comprehensive caching system to prevent duplicate image downloads
 * and track metadata about acquired images. Integrates with the existing
 * image-core.js deduplication system.
 *
 * Features:
 * - Persistent JSON-based cache with in-memory optimization
 * - Metadata tracking (URL, path, download date, size, hash)
 * - Cache invalidation by age and manual clearing
 * - Lookup by ISBN, filename, or content hash
 * - Integration with image-core.js deduplication
 * - Cache statistics and reporting
 * - Atomic write operations for cache integrity
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');
const { IMAGE_CONFIG, validateImage, checkImageExists } = require('./image-core');

// Promise-based file operations
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const access = promisify(fs.access);

/**
 * Cache configuration
 */
const CACHE_CONFIG = {
    // Cache file location
    cacheFile: path.join(process.cwd(), 'data', 'image-cache.json'),

    // Cache behavior settings
    behavior: {
        maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days in milliseconds
        enableMemoryCache: true,            // Use in-memory cache for performance
        atomicWrites: true,                 // Use atomic write operations
        validateOnLoad: false,              // Validate cached entries on load (slower)
        autoCleanup: true,                  // Auto-remove invalid entries
        backupOnWrite: true                 // Create backup before cache updates
    },

    // Hash settings for content verification
    hash: {
        algorithm: 'sha256',
        encoding: 'hex'
    },

    // Default image storage paths
    paths: {
        books: path.join(process.cwd(), 'src', 'assets', 'images', 'books'),
        general: path.join(process.cwd(), 'src', 'assets', 'images', 'general'),
        temp: path.join(process.cwd(), 'temp', 'images')
    }
};

/**
 * In-memory cache for performance optimization
 */
let memoryCache = new Map();
let cacheLoaded = false;
let cacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    invalidations: 0,
    errors: 0
};

/**
 * Main ImageCache class
 */
class ImageCache {
    constructor(options = {}) {
        this.config = { ...CACHE_CONFIG, ...options };
        this.memoryCache = memoryCache;
        this.stats = cacheStats;
    }

    /**
     * Initialize the cache system
     *
     * @returns {Promise<boolean>} Success status
     */
    async initialize() {
        try {
            // Ensure cache directory exists
            const cacheDir = path.dirname(this.config.cacheFile);
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            // Load existing cache
            await this.loadCache();

            // Perform initial cleanup if enabled
            if (this.config.behavior.autoCleanup) {
                await this.cleanupExpiredEntries();
            }

            console.log(`Image cache initialized with ${this.memoryCache.size} entries`);
            return true;
        } catch (error) {
            console.error('Failed to initialize image cache:', error.message);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Load cache from disk into memory
     *
     * @returns {Promise<void>}
     */
    async loadCache() {
        try {
            if (await this.fileExists(this.config.cacheFile)) {
                const cacheData = await readFile(this.config.cacheFile, 'utf8');
                const cache = JSON.parse(cacheData);

                // Validate cache structure
                if (cache.version && cache.entries) {
                    // Load entries into memory cache
                    this.memoryCache.clear();
                    Object.entries(cache.entries).forEach(([key, entry]) => {
                        this.memoryCache.set(key, entry);
                    });

                    // Update stats
                    if (cache.stats) {
                        Object.assign(this.stats, cache.stats);
                    }
                }
            }
            cacheLoaded = true;
        } catch (error) {
            console.warn('Could not load existing cache, starting fresh:', error.message);
            this.memoryCache.clear();
            cacheLoaded = true;
        }
    }

    /**
     * Save cache from memory to disk
     *
     * @returns {Promise<void>}
     */
    async saveCache() {
        try {
            const cacheData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                stats: this.stats,
                entries: Object.fromEntries(this.memoryCache)
            };

            if (this.config.behavior.atomicWrites) {
                await this.atomicWrite(this.config.cacheFile, JSON.stringify(cacheData, null, 2));
            } else {
                await writeFile(this.config.cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
            }

            this.stats.writes++;
        } catch (error) {
            console.error('Failed to save cache:', error.message);
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Add an image to the cache
     *
     * @param {Object} imageData - Image information
     * @param {string} imageData.url - Source URL
     * @param {string} imageData.localPath - Local file path
     * @param {Object} imageData.bookData - Associated book information
     * @param {Object} options - Additional options
     * @returns {Promise<string>} Cache entry ID
     */
    async addImage(imageData, options = {}) {
        try {
            if (!await this.fileExists(imageData.localPath)) {
                throw new Error(`Image file does not exist: ${imageData.localPath}`);
            }

            // Generate unique cache key
            const cacheKey = this.generateCacheKey(imageData);

            // Calculate file hash and get stats
            const [fileHash, fileStats] = await Promise.all([
                this.calculateFileHash(imageData.localPath),
                stat(imageData.localPath)
            ]);

            // Validate image if requested
            let validation = null;
            if (options.validate) {
                validation = await validateImage(imageData.localPath);
            }

            // Create cache entry
            const entry = {
                id: cacheKey,
                url: imageData.url,
                localPath: imageData.localPath,
                filename: path.basename(imageData.localPath),
                directory: path.dirname(imageData.localPath),

                // File metadata
                size: fileStats.size,
                hash: fileHash,
                mtime: fileStats.mtime.toISOString(),

                // Cache metadata
                addedDate: new Date().toISOString(),
                lastAccessed: new Date().toISOString(),
                accessCount: 1,

                // Book data for lookups
                bookData: imageData.bookData || {},
                isbn: this.extractISBN(imageData.bookData),

                // Optional validation results
                validation: validation,

                // Additional metadata
                tags: options.tags || [],
                source: options.source || 'unknown'
            };

            // Store in memory and persist
            this.memoryCache.set(cacheKey, entry);
            await this.saveCache();

            console.log(`Added image to cache: ${entry.filename} (${entry.size} bytes)`);
            return cacheKey;

        } catch (error) {
            console.error('Failed to add image to cache:', error.message);
            this.stats.errors++;
            throw error;
        }
    }

    /**
     * Check if an image exists in cache
     *
     * @param {Object} searchParams - Search parameters
     * @returns {Object|null} Cache entry or null
     */
    lookupImage(searchParams) {
        try {
            // Ensure cache is loaded
            if (!cacheLoaded) {
                throw new Error('Cache not loaded');
            }

            let entry = null;

            // Search by cache key/ID
            if (searchParams.id) {
                entry = this.memoryCache.get(searchParams.id);
                if (entry) {
                    this.updateAccessStats(entry);
                    this.stats.hits++;
                    return entry;
                }
            }

            // Search by ISBN
            if (searchParams.isbn) {
                entry = this.findByISBN(searchParams.isbn);
                if (entry) {
                    this.updateAccessStats(entry);
                    this.stats.hits++;
                    return entry;
                }
            }

            // Search by filename
            if (searchParams.filename) {
                entry = this.findByFilename(searchParams.filename);
                if (entry) {
                    this.updateAccessStats(entry);
                    this.stats.hits++;
                    return entry;
                }
            }

            // Search by URL
            if (searchParams.url) {
                entry = this.findByURL(searchParams.url);
                if (entry) {
                    this.updateAccessStats(entry);
                    this.stats.hits++;
                    return entry;
                }
            }

            // Search by content hash
            if (searchParams.hash) {
                entry = this.findByHash(searchParams.hash);
                if (entry) {
                    this.updateAccessStats(entry);
                    this.stats.hits++;
                    return entry;
                }
            }

            // Search by book data
            if (searchParams.bookData) {
                entry = this.findByBookData(searchParams.bookData);
                if (entry) {
                    this.updateAccessStats(entry);
                    this.stats.hits++;
                    return entry;
                }
            }

            this.stats.misses++;
            return null;

        } catch (error) {
            console.error('Cache lookup error:', error.message);
            this.stats.errors++;
            return null;
        }
    }

    /**
     * Check if an image should be downloaded based on cache status
     *
     * @param {Object} imageRequest - Image request parameters
     * @returns {Object} Download recommendation
     */
    shouldDownload(imageRequest) {
        const result = {
            shouldDownload: true,
            reason: 'not_cached',
            existingEntry: null,
            recommendations: []
        };

        // Check cache first
        const cachedEntry = this.lookupImage(imageRequest);
        if (cachedEntry) {
            result.existingEntry = cachedEntry;

            // Check if cached file still exists
            if (fs.existsSync(cachedEntry.localPath)) {
                result.shouldDownload = false;
                result.reason = 'cached_and_exists';
                result.recommendations.push('Use existing cached image');
                return result;
            } else {
                result.reason = 'cached_but_missing';
                result.recommendations.push('Re-download - cached file missing');
                // Remove invalid cache entry
                this.removeEntry(cachedEntry.id);
            }
        }

        // Check filesystem using image-core integration
        if (imageRequest.bookData) {
            const bookImageDirs = [
                this.config.paths.books,
                this.config.paths.general
            ];

            for (const dir of bookImageDirs) {
                if (fs.existsSync(dir)) {
                    const existsCheck = checkImageExists(imageRequest.bookData, dir, { fuzzyMatch: true });
                    if (existsCheck.exists) {
                        result.shouldDownload = false;
                        result.reason = 'exists_not_cached';
                        result.recommendations.push('Add existing file to cache');

                        // Suggest adding to cache
                        result.addToCache = {
                            localPath: existsCheck.path,
                            url: imageRequest.url,
                            bookData: imageRequest.bookData
                        };
                        return result;
                    } else if (existsCheck.alternateMatches.length > 0) {
                        result.recommendations.push(`Consider checking alternate matches: ${existsCheck.alternateMatches.slice(0, 3).join(', ')}`);
                    }
                }
            }
        }

        return result;
    }

    /**
     * Remove expired cache entries
     *
     * @returns {Promise<number>} Number of entries removed
     */
    async cleanupExpiredEntries() {
        const cutoffDate = new Date(Date.now() - this.config.behavior.maxAge);
        let removedCount = 0;

        for (const [key, entry] of this.memoryCache.entries()) {
            const entryDate = new Date(entry.addedDate);
            if (entryDate < cutoffDate) {
                this.memoryCache.delete(key);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            await this.saveCache();
            this.stats.invalidations += removedCount;
            console.log(`Cleaned up ${removedCount} expired cache entries`);
        }

        return removedCount;
    }

    /**
     * Clear entire cache
     *
     * @param {Object} options - Clear options
     * @returns {Promise<boolean>} Success status
     */
    async clearCache(options = {}) {
        try {
            const beforeCount = this.memoryCache.size;

            if (options.backup && beforeCount > 0) {
                const backupFile = `${this.config.cacheFile}.backup.${Date.now()}`;
                await this.saveCache();
                fs.copyFileSync(this.config.cacheFile, backupFile);
                console.log(`Cache backed up to: ${backupFile}`);
            }

            this.memoryCache.clear();
            await this.saveCache();

            this.stats.invalidations += beforeCount;
            console.log(`Cleared cache - removed ${beforeCount} entries`);

            return true;
        } catch (error) {
            console.error('Failed to clear cache:', error.message);
            this.stats.errors++;
            return false;
        }
    }

    /**
     * Get comprehensive cache statistics
     *
     * @returns {Object} Cache statistics
     */
    getStats() {
        const now = new Date();
        const entries = Array.from(this.memoryCache.values());

        // Calculate size distribution
        const sizes = entries.map(e => e.size).sort((a, b) => a - b);
        const totalSize = sizes.reduce((sum, size) => sum + size, 0);

        // Calculate age distribution
        const ages = entries.map(e => now - new Date(e.addedDate));
        const avgAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 0;

        // File type distribution
        const extensions = new Map();
        entries.forEach(entry => {
            const ext = path.extname(entry.filename).toLowerCase();
            extensions.set(ext, (extensions.get(ext) || 0) + 1);
        });

        // Source distribution
        const sources = new Map();
        entries.forEach(entry => {
            sources.set(entry.source, (sources.get(entry.source) || 0) + 1);
        });

        return {
            cache: {
                totalEntries: this.memoryCache.size,
                totalSize: totalSize,
                averageSize: entries.length > 0 ? Math.round(totalSize / entries.length) : 0,
                averageAge: Math.round(avgAge / (1000 * 60 * 60 * 24)), // days
                cacheFile: this.config.cacheFile,
                cacheFileExists: fs.existsSync(this.config.cacheFile),
                lastSaved: new Date().toISOString()
            },
            performance: {
                ...this.stats,
                hitRate: this.stats.hits + this.stats.misses > 0 ?
                    Math.round((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100) : 0
            },
            distribution: {
                bySize: {
                    min: sizes[0] || 0,
                    max: sizes[sizes.length - 1] || 0,
                    median: sizes[Math.floor(sizes.length / 2)] || 0
                },
                byExtension: Object.fromEntries(extensions),
                bySource: Object.fromEntries(sources)
            },
            health: {
                hasExpiredEntries: entries.some(e =>
                    (now - new Date(e.addedDate)) > this.config.behavior.maxAge
                ),
                hasMissingFiles: entries.some(e => !fs.existsSync(e.localPath)),
                memoryUsage: process.memoryUsage().heapUsed
            }
        };
    }

    /**
     * Validate cache integrity
     *
     * @returns {Promise<Object>} Validation report
     */
    async validateCache() {
        const report = {
            valid: true,
            errors: [],
            warnings: [],
            statistics: {
                total: this.memoryCache.size,
                valid: 0,
                invalid: 0,
                missing: 0
            }
        };

        for (const [key, entry] of this.memoryCache.entries()) {
            try {
                // Check if file exists
                if (!fs.existsSync(entry.localPath)) {
                    report.statistics.missing++;
                    report.warnings.push(`Missing file: ${entry.localPath}`);
                    continue;
                }

                // Verify file hash if configured
                if (this.config.behavior.validateOnLoad) {
                    const currentHash = await this.calculateFileHash(entry.localPath);
                    if (currentHash !== entry.hash) {
                        report.statistics.invalid++;
                        report.warnings.push(`Hash mismatch for ${entry.filename}`);
                        continue;
                    }
                }

                report.statistics.valid++;
            } catch (error) {
                report.statistics.invalid++;
                report.errors.push(`Validation error for ${entry.filename}: ${error.message}`);
                report.valid = false;
            }
        }

        return report;
    }

    // Helper methods

    generateCacheKey(imageData) {
        const components = [
            imageData.url || '',
            imageData.localPath || '',
            JSON.stringify(imageData.bookData || {}),
            Date.now()
        ];
        return crypto.createHash('md5').update(components.join('|')).digest('hex');
    }

    async calculateFileHash(filePath) {
        const buffer = await readFile(filePath);
        return crypto.createHash(this.config.hash.algorithm)
            .update(buffer)
            .digest(this.config.hash.encoding);
    }

    extractISBN(bookData) {
        if (!bookData) return null;
        return bookData.isbn_asin || bookData.isbn || bookData.id || null;
    }

    findByISBN(isbn) {
        for (const entry of this.memoryCache.values()) {
            if (entry.isbn === isbn) return entry;
        }
        return null;
    }

    findByFilename(filename) {
        for (const entry of this.memoryCache.values()) {
            if (entry.filename === filename || entry.localPath.endsWith(filename)) {
                return entry;
            }
        }
        return null;
    }

    findByURL(url) {
        for (const entry of this.memoryCache.values()) {
            if (entry.url === url) return entry;
        }
        return null;
    }

    findByHash(hash) {
        for (const entry of this.memoryCache.values()) {
            if (entry.hash === hash) return entry;
        }
        return null;
    }

    findByBookData(bookData) {
        const isbn = this.extractISBN(bookData);
        if (isbn) {
            return this.findByISBN(isbn);
        }

        // Fallback to title/author matching
        for (const entry of this.memoryCache.values()) {
            if (entry.bookData &&
                entry.bookData.title === bookData.title &&
                entry.bookData.author_last === bookData.author_last) {
                return entry;
            }
        }
        return null;
    }

    updateAccessStats(entry) {
        entry.lastAccessed = new Date().toISOString();
        entry.accessCount = (entry.accessCount || 0) + 1;
    }

    removeEntry(id) {
        if (this.memoryCache.delete(id)) {
            this.saveCache().catch(err => console.error('Failed to save cache after removal:', err));
            return true;
        }
        return false;
    }

    async atomicWrite(filePath, data) {
        const tempPath = `${filePath}.tmp.${Date.now()}`;
        try {
            await writeFile(tempPath, data, 'utf8');
            fs.renameSync(tempPath, filePath);
        } catch (error) {
            // Cleanup temp file on error
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
            throw error;
        }
    }

    async fileExists(filePath) {
        try {
            await access(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

// Singleton instance for global use
let globalCache = null;

/**
 * Get or create the global cache instance
 *
 * @param {Object} options - Cache options
 * @returns {Promise<ImageCache>} Cache instance
 */
async function getCache(options = {}) {
    if (!globalCache) {
        globalCache = new ImageCache(options);
        await globalCache.initialize();
    }
    return globalCache;
}

/**
 * Convenience functions for common operations
 */
async function cacheImage(imageData, options = {}) {
    const cache = await getCache();
    return cache.addImage(imageData, options);
}

async function lookupCachedImage(searchParams) {
    const cache = await getCache();
    return cache.lookupImage(searchParams);
}

async function shouldDownloadImage(imageRequest) {
    const cache = await getCache();
    return cache.shouldDownload(imageRequest);
}

async function getCacheStats() {
    const cache = await getCache();
    return cache.getStats();
}

async function clearImageCache(options = {}) {
    const cache = await getCache();
    return cache.clearCache(options);
}

async function validateImageCache() {
    const cache = await getCache();
    return cache.validateCache();
}

// Export the cache system
module.exports = {
    ImageCache,
    CACHE_CONFIG,

    // Singleton access
    getCache,

    // Convenience functions
    cacheImage,
    lookupCachedImage,
    shouldDownloadImage,
    getCacheStats,
    clearImageCache,
    validateImageCache,

    // For testing and advanced usage
    _resetCache: () => { globalCache = null; memoryCache.clear(); cacheLoaded = false; }
};