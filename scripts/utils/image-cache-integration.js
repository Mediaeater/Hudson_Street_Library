/**
 * Image Cache Integration Module
 *
 * Provides seamless integration between the image cache system and existing
 * image acquisition scripts. This module acts as a bridge to retrofit
 * existing code with caching capabilities.
 */

const fs = require('fs');
const path = require('path');
const {
    getCache,
    cacheImage,
    lookupCachedImage,
    shouldDownloadImage,
    getCacheStats
} = require('./image-cache');

/**
 * Integration wrapper for image download operations
 * This function should be called before any image download to check cache
 *
 * @param {Object} downloadRequest - Download request parameters
 * @param {Function} downloadFunction - The actual download function to call if needed
 * @param {Object} options - Integration options
 * @returns {Promise<Object>} Download result with caching information
 */
async function cachedImageDownload(downloadRequest, downloadFunction, options = {}) {
    const result = {
        downloaded: false,
        cached: false,
        path: null,
        cacheKey: null,
        error: null,
        metadata: {}
    };

    try {
        // Check if we should download this image
        const downloadCheck = await shouldDownloadImage(downloadRequest);

        if (!downloadCheck.shouldDownload) {
            // Use cached or existing image
            result.cached = true;
            result.path = downloadCheck.existingEntry?.localPath;
            result.cacheKey = downloadCheck.existingEntry?.id;
            result.metadata.reason = downloadCheck.reason;
            result.metadata.recommendations = downloadCheck.recommendations;

            console.log(`📋 Using cached image: ${path.basename(result.path || 'unknown')}`);
            return result;
        }

        // If we have an existing file not in cache, add it to cache first
        if (downloadCheck.addToCache) {
            try {
                const cacheKey = await cacheImage({
                    url: downloadRequest.url,
                    localPath: downloadCheck.addToCache.localPath,
                    bookData: downloadCheck.addToCache.bookData
                }, { source: 'existing-file' });

                result.cached = true;
                result.path = downloadCheck.addToCache.localPath;
                result.cacheKey = cacheKey;
                result.metadata.reason = 'added_existing_to_cache';

                console.log(`📋 Added existing file to cache: ${path.basename(result.path)}`);
                return result;
            } catch (cacheError) {
                console.warn('Failed to add existing file to cache:', cacheError.message);
                // Continue with download
            }
        }

        // Proceed with download
        console.log(`⬇️  Downloading new image: ${downloadRequest.url}`);
        const downloadResult = await downloadFunction(downloadRequest);

        if (downloadResult && downloadResult.success && downloadResult.path) {
            result.downloaded = true;
            result.path = downloadResult.path;

            // Add downloaded image to cache
            try {
                const cacheKey = await cacheImage({
                    url: downloadRequest.url,
                    localPath: downloadResult.path,
                    bookData: downloadRequest.bookData
                }, {
                    validate: options.validateDownloads !== false,
                    source: options.source || 'download',
                    tags: options.tags || ['downloaded']
                });

                result.cacheKey = cacheKey;
                result.metadata.cached_after_download = true;

                console.log(`💾 Cached downloaded image: ${path.basename(result.path)}`);
            } catch (cacheError) {
                console.warn('Failed to cache downloaded image:', cacheError.message);
                result.metadata.cache_error = cacheError.message;
            }

            // Copy any additional metadata from download result
            Object.assign(result.metadata, downloadResult.metadata || {});
        } else {
            result.error = downloadResult?.error || 'Download failed';
        }

    } catch (error) {
        result.error = error.message;
        console.error('Cached download operation failed:', error.message);
    }

    return result;
}

/**
 * Batch processing with cache integration
 * Processes multiple image requests with intelligent caching
 *
 * @param {Array} requests - Array of download requests
 * @param {Function} downloadFunction - Download function
 * @param {Object} options - Batch processing options
 * @returns {Promise<Object>} Batch processing results
 */
async function batchCachedDownload(requests, downloadFunction, options = {}) {
    const results = {
        total: requests.length,
        processed: 0,
        downloaded: 0,
        cached: 0,
        errors: 0,
        details: [],
        timing: {
            start: new Date(),
            end: null,
            duration: null
        }
    };

    console.log(`🚀 Starting batch processing of ${requests.length} image requests`);

    // Process requests with concurrency control
    const concurrency = options.concurrency || 5;
    const batches = [];

    for (let i = 0; i < requests.length; i += concurrency) {
        batches.push(requests.slice(i, i + concurrency));
    }

    for (const batch of batches) {
        const batchPromises = batch.map(async (request, index) => {
            try {
                const result = await cachedImageDownload(request, downloadFunction, options);

                results.processed++;
                if (result.downloaded) results.downloaded++;
                if (result.cached) results.cached++;
                if (result.error) results.errors++;

                results.details.push({
                    request: {
                        url: request.url,
                        isbn: request.bookData?.isbn_asin || 'unknown'
                    },
                    result
                });

                // Progress reporting
                if (options.onProgress) {
                    options.onProgress(results.processed, results.total, result);
                }

                return result;
            } catch (error) {
                results.errors++;
                results.processed++;
                console.error(`Batch item ${index} failed:`, error.message);
                return { error: error.message };
            }
        });

        await Promise.all(batchPromises);
    }

    results.timing.end = new Date();
    results.timing.duration = results.timing.end - results.timing.start;

    console.log(`✅ Batch processing completed:`);
    console.log(`   📊 Total: ${results.total}, Downloaded: ${results.downloaded}, Cached: ${results.cached}, Errors: ${results.errors}`);
    console.log(`   ⏱️  Duration: ${Math.round(results.timing.duration / 1000)}s`);

    return results;
}

/**
 * Pre-flight check for image acquisition operations
 * Analyzes what would happen without actually downloading
 *
 * @param {Array} requests - Image requests to analyze
 * @returns {Promise<Object>} Analysis results
 */
async function analyzeImageRequests(requests) {
    console.log(`🔍 Analyzing ${requests.length} image requests...`);

    const analysis = {
        total: requests.length,
        wouldDownload: 0,
        wouldUseCache: 0,
        wouldAddToCache: 0,
        potential_issues: [],
        recommendations: [],
        details: []
    };

    for (const request of requests) {
        try {
            const check = await shouldDownloadImage(request);
            const detail = {
                url: request.url,
                isbn: request.bookData?.isbn_asin || 'unknown',
                action: check.shouldDownload ? 'download' : 'use_cached',
                reason: check.reason
            };

            if (check.shouldDownload) {
                analysis.wouldDownload++;
                if (check.addToCache) {
                    analysis.wouldAddToCache++;
                    detail.action = 'add_to_cache';
                }
            } else {
                analysis.wouldUseCache++;
            }

            analysis.details.push(detail);
        } catch (error) {
            analysis.potential_issues.push({
                url: request.url,
                error: error.message
            });
        }
    }

    // Generate recommendations
    if (analysis.wouldDownload > analysis.total * 0.8) {
        analysis.recommendations.push('Consider pre-populating cache - most images will be downloaded');
    }

    if (analysis.wouldUseCache > analysis.total * 0.8) {
        analysis.recommendations.push('Good cache coverage - most images already available');
    }

    if (analysis.wouldAddToCache > 0) {
        analysis.recommendations.push(`${analysis.wouldAddToCache} existing files can be added to cache`);
    }

    console.log(`📊 Analysis complete: ${analysis.wouldDownload} downloads, ${analysis.wouldUseCache} cached`);
    return analysis;
}

/**
 * Migrate existing image directories to cache
 * Scans directories and adds existing images to cache
 *
 * @param {Array} directories - Directories to scan
 * @param {Object} options - Migration options
 * @returns {Promise<Object>} Migration results
 */
async function migrateExistingImages(directories, options = {}) {
    const results = {
        scanned: 0,
        added: 0,
        skipped: 0,
        errors: 0,
        details: []
    };

    console.log(`🔄 Migrating existing images from ${directories.length} directories...`);

    for (const directory of directories) {
        if (!fs.existsSync(directory)) {
            console.warn(`Directory not found: ${directory}`);
            continue;
        }

        try {
            const files = fs.readdirSync(directory)
                .filter(file => ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(file).toLowerCase()));

            for (const file of files) {
                const filePath = path.join(directory, file);
                results.scanned++;

                try {
                    // Try to extract book data from filename
                    const bookData = extractBookDataFromFilename(file);

                    // Check if already cached
                    const existing = await lookupCachedImage({ filename: file });
                    if (existing) {
                        results.skipped++;
                        continue;
                    }

                    // Add to cache
                    await cacheImage({
                        url: options.defaultUrl || 'file://migrated',
                        localPath: filePath,
                        bookData
                    }, {
                        source: 'migration',
                        tags: ['migrated', path.basename(directory)]
                    });

                    results.added++;
                    results.details.push({
                        file,
                        directory,
                        action: 'added'
                    });

                } catch (error) {
                    results.errors++;
                    results.details.push({
                        file,
                        directory,
                        action: 'error',
                        error: error.message
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to process directory ${directory}:`, error.message);
            results.errors++;
        }
    }

    console.log(`✅ Migration complete: ${results.added} added, ${results.skipped} skipped, ${results.errors} errors`);
    return results;
}

/**
 * Cache maintenance and cleanup operations
 */
async function performCacheMaintenance(options = {}) {
    console.log('🔧 Performing cache maintenance...');

    const maintenance = {
        timestamp: new Date().toISOString(),
        operations: [],
        errors: []
    };

    try {
        // Get cache statistics before maintenance
        const statsBefore = await getCacheStats();
        maintenance.operations.push({
            operation: 'stats_before',
            result: statsBefore.cache.totalEntries + ' entries'
        });

        // Validate cache integrity
        if (options.validate !== false) {
            const cache = await getCache();
            const validation = await cache.validateCache();

            maintenance.operations.push({
                operation: 'validation',
                result: {
                    valid: validation.statistics.valid,
                    invalid: validation.statistics.invalid,
                    missing: validation.statistics.missing
                }
            });

            // Remove entries with missing files
            if (validation.statistics.missing > 0 && options.removeMissing) {
                // Implementation would go here
                maintenance.operations.push({
                    operation: 'remove_missing',
                    result: 'feature not implemented'
                });
            }
        }

        // Clean up expired entries
        if (options.cleanExpired !== false) {
            const cache = await getCache();
            const removed = await cache.cleanupExpiredEntries();
            maintenance.operations.push({
                operation: 'cleanup_expired',
                result: removed + ' entries removed'
            });
        }

        // Get statistics after maintenance
        const statsAfter = await getCacheStats();
        maintenance.operations.push({
            operation: 'stats_after',
            result: statsAfter.cache.totalEntries + ' entries'
        });

        console.log('✅ Cache maintenance completed');

    } catch (error) {
        maintenance.errors.push(error.message);
        console.error('❌ Cache maintenance failed:', error.message);
    }

    return maintenance;
}

/**
 * Extract book data from standardized filename
 * Helper function for migration and analysis
 *
 * @param {string} filename - Image filename
 * @returns {Object} Extracted book data
 */
function extractBookDataFromFilename(filename) {
    // Remove extension
    const base = path.basename(filename, path.extname(filename));

    // Try to parse standardized format: author_title_isbn
    const parts = base.split('_');

    if (parts.length >= 3) {
        return {
            author_last: parts[0],
            title: parts.slice(1, -1).join(' '),
            isbn_asin: parts[parts.length - 1]
        };
    }

    // Fallback for non-standard filenames
    return {
        title: base,
        author_last: 'Unknown',
        isbn_asin: null
    };
}

/**
 * Integration helper for existing scripts
 * Provides a simple wrapper to add caching to existing download functions
 *
 * @param {Function} originalFunction - Original download function
 * @returns {Function} Wrapped function with caching
 */
function wrapWithCache(originalFunction) {
    return async function(...args) {
        // Try to determine if this is an image download operation
        const possibleRequest = args[0];

        if (possibleRequest && (possibleRequest.url || possibleRequest.bookData)) {
            // Use cached download wrapper
            return cachedImageDownload(possibleRequest, originalFunction, {
                source: 'wrapped-function'
            });
        } else {
            // Fall back to original function
            return originalFunction(...args);
        }
    };
}

module.exports = {
    // Core integration functions
    cachedImageDownload,
    batchCachedDownload,

    // Analysis and planning
    analyzeImageRequests,

    // Migration and maintenance
    migrateExistingImages,
    performCacheMaintenance,

    // Helpers
    extractBookDataFromFilename,
    wrapWithCache
};