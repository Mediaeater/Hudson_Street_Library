#!/usr/bin/env node
/**
 * Image Cache CLI Utility
 *
 * Command-line interface for managing the image cache system
 * Provides easy access to cache operations for maintenance and monitoring
 */

const fs = require('fs');
const path = require('path');
const {
    getCache,
    getCacheStats,
    clearImageCache,
    validateImageCache
} = require('./image-cache');
const {
    analyzeImageRequests,
    migrateExistingImages,
    performCacheMaintenance
} = require('./image-cache-integration');

// CLI configuration
const COMMANDS = {
    stats: 'Show cache statistics',
    validate: 'Validate cache integrity',
    clear: 'Clear cache (with backup option)',
    maintenance: 'Run automated maintenance',
    migrate: 'Migrate existing images to cache',
    analyze: 'Analyze potential download requests',
    search: 'Search cache entries',
    help: 'Show this help message'
};

/**
 * Display help information
 */
function showHelp() {
    console.log('Image Cache CLI Utility\n');
    console.log('Usage: node cache-cli.js <command> [options]\n');
    console.log('Commands:');
    Object.entries(COMMANDS).forEach(([cmd, desc]) => {
        console.log(`  ${cmd.padEnd(12)} ${desc}`);
    });
    console.log('\nExamples:');
    console.log('  node cache-cli.js stats');
    console.log('  node cache-cli.js clear --backup');
    console.log('  node cache-cli.js migrate src/assets/images/books');
    console.log('  node cache-cli.js search --isbn 1234567890');
    console.log('  node cache-cli.js maintenance --clean-expired');
}

/**
 * Display cache statistics
 */
async function showStats() {
    try {
        console.log('📊 Cache Statistics\n');

        const stats = await getCacheStats();

        // Cache overview
        console.log('Cache Overview:');
        console.log(`  Total entries: ${stats.cache.totalEntries}`);
        console.log(`  Total size: ${formatBytes(stats.cache.totalSize)}`);
        console.log(`  Average size: ${formatBytes(stats.cache.averageSize)}`);
        console.log(`  Average age: ${stats.cache.averageAge} days`);
        console.log(`  Cache file: ${stats.cache.cacheFile}`);
        console.log('');

        // Performance metrics
        console.log('Performance:');
        console.log(`  Hit rate: ${stats.performance.hitRate}%`);
        console.log(`  Cache hits: ${stats.performance.hits}`);
        console.log(`  Cache misses: ${stats.performance.misses}`);
        console.log(`  Writes: ${stats.performance.writes}`);
        console.log(`  Invalidations: ${stats.performance.invalidations}`);
        console.log(`  Errors: ${stats.performance.errors}`);
        console.log('');

        // File type distribution
        if (Object.keys(stats.distribution.byExtension).length > 0) {
            console.log('File Types:');
            Object.entries(stats.distribution.byExtension)
                .sort(([,a], [,b]) => b - a)
                .forEach(([ext, count]) => {
                    console.log(`  ${ext || 'no-ext'}: ${count}`);
                });
            console.log('');
        }

        // Health check
        console.log('Health Check:');
        console.log(`  Has expired entries: ${stats.health.hasExpiredEntries ? '⚠️  Yes' : '✅ No'}`);
        console.log(`  Has missing files: ${stats.health.hasMissingFiles ? '⚠️  Yes' : '✅ No'}`);
        console.log(`  Memory usage: ${formatBytes(stats.health.memoryUsage)}`);

    } catch (error) {
        console.error('❌ Failed to get statistics:', error.message);
        process.exit(1);
    }
}

/**
 * Validate cache integrity
 */
async function validateCache() {
    try {
        console.log('🔍 Validating cache integrity...\n');

        const validation = await validateImageCache();

        console.log('Validation Results:');
        console.log(`  Total entries: ${validation.statistics.total}`);
        console.log(`  Valid entries: ${validation.statistics.valid} ✅`);
        console.log(`  Invalid entries: ${validation.statistics.invalid} ${validation.statistics.invalid > 0 ? '❌' : '✅'}`);
        console.log(`  Missing files: ${validation.statistics.missing} ${validation.statistics.missing > 0 ? '⚠️' : '✅'}`);
        console.log('');

        if (validation.errors.length > 0) {
            console.log('Errors found:');
            validation.errors.forEach(error => console.log(`  ❌ ${error}`));
            console.log('');
        }

        if (validation.warnings.length > 0) {
            console.log('Warnings:');
            validation.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
            console.log('');
        }

        if (validation.valid) {
            console.log('✅ Cache validation passed');
        } else {
            console.log('❌ Cache validation failed - see errors above');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Cache validation failed:', error.message);
        process.exit(1);
    }
}

/**
 * Clear cache with optional backup
 */
async function clearCache(args) {
    try {
        const shouldBackup = args.includes('--backup') || args.includes('-b');

        if (shouldBackup) {
            console.log('💾 Creating backup before clearing cache...');
        }

        console.log('🗑️  Clearing cache...');

        const success = await clearImageCache({ backup: shouldBackup });

        if (success) {
            console.log('✅ Cache cleared successfully');
        } else {
            console.log('❌ Failed to clear cache');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Failed to clear cache:', error.message);
        process.exit(1);
    }
}

/**
 * Run cache maintenance
 */
async function runMaintenance(args) {
    try {
        console.log('🔧 Running cache maintenance...\n');

        const options = {
            validate: !args.includes('--skip-validation'),
            cleanExpired: !args.includes('--skip-cleanup'),
            removeMissing: args.includes('--remove-missing')
        };

        const result = await performCacheMaintenance(options);

        console.log('Maintenance Results:');
        result.operations.forEach(op => {
            console.log(`  ${op.operation}: ${typeof op.result === 'object' ? JSON.stringify(op.result) : op.result}`);
        });

        if (result.errors.length > 0) {
            console.log('\nErrors during maintenance:');
            result.errors.forEach(error => console.log(`  ❌ ${error}`));
        }

        console.log('\n✅ Maintenance completed');

    } catch (error) {
        console.error('❌ Maintenance failed:', error.message);
        process.exit(1);
    }
}

/**
 * Migrate existing images
 */
async function migrateImages(args) {
    try {
        const directories = args.filter(arg => !arg.startsWith('--'));

        if (directories.length === 0) {
            console.error('❌ No directories specified for migration');
            console.log('Usage: node cache-cli.js migrate <directory1> [directory2] ...');
            process.exit(1);
        }

        console.log(`🔄 Migrating images from ${directories.length} directories...\n`);

        const result = await migrateExistingImages(directories);

        console.log('Migration Results:');
        console.log(`  Scanned: ${result.scanned} files`);
        console.log(`  Added: ${result.added} files ✅`);
        console.log(`  Skipped: ${result.skipped} files (already cached)`);
        console.log(`  Errors: ${result.errors} files ❌`);

        if (result.errors > 0) {
            console.log('\nError details:');
            result.details
                .filter(detail => detail.action === 'error')
                .forEach(detail => {
                    console.log(`  ❌ ${detail.file}: ${detail.error}`);
                });
        }

        console.log('\n✅ Migration completed');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

/**
 * Search cache entries
 */
async function searchCache(args) {
    try {
        const cache = await getCache();

        // Parse search parameters
        const searchParams = {};
        for (let i = 0; i < args.length; i += 2) {
            const key = args[i]?.replace('--', '');
            const value = args[i + 1];
            if (key && value) {
                searchParams[key] = value;
            }
        }

        if (Object.keys(searchParams).length === 0) {
            console.error('❌ No search parameters provided');
            console.log('Usage: node cache-cli.js search --isbn 1234567890');
            console.log('       node cache-cli.js search --filename cover.jpg');
            console.log('       node cache-cli.js search --url http://example.com/image.jpg');
            process.exit(1);
        }

        console.log('🔍 Searching cache...\n');
        console.log('Search parameters:', searchParams);
        console.log('');

        const result = cache.lookupImage(searchParams);

        if (result) {
            console.log('✅ Found cache entry:');
            console.log(`  ID: ${result.id}`);
            console.log(`  Filename: ${result.filename}`);
            console.log(`  Path: ${result.localPath}`);
            console.log(`  URL: ${result.url}`);
            console.log(`  Size: ${formatBytes(result.size)}`);
            console.log(`  Added: ${new Date(result.addedDate).toLocaleString()}`);
            console.log(`  Last accessed: ${new Date(result.lastAccessed).toLocaleString()}`);
            console.log(`  Access count: ${result.accessCount}`);

            if (result.bookData && Object.keys(result.bookData).length > 0) {
                console.log(`  Book data:`, result.bookData);
            }

            if (result.tags && result.tags.length > 0) {
                console.log(`  Tags: ${result.tags.join(', ')}`);
            }
        } else {
            console.log('❌ No cache entry found matching the search criteria');
        }

    } catch (error) {
        console.error('❌ Search failed:', error.message);
        process.exit(1);
    }
}

/**
 * Format bytes for human-readable display
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main CLI handler
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
        showHelp();
        return;
    }

    const command = args[0];
    const commandArgs = args.slice(1);

    try {
        switch (command) {
            case 'stats':
                await showStats();
                break;

            case 'validate':
                await validateCache();
                break;

            case 'clear':
                await clearCache(commandArgs);
                break;

            case 'maintenance':
                await runMaintenance(commandArgs);
                break;

            case 'migrate':
                await migrateImages(commandArgs);
                break;

            case 'search':
                await searchCache(commandArgs);
                break;

            default:
                console.error(`❌ Unknown command: ${command}`);
                console.log('Use "node cache-cli.js help" for available commands');
                process.exit(1);
        }
    } catch (error) {
        console.error('💥 Unexpected error:', error.message);
        if (process.env.DEBUG) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Run CLI if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('CLI crashed:', error.message);
        process.exit(1);
    });
}

module.exports = {
    main,
    showHelp,
    showStats,
    validateCache,
    clearCache,
    runMaintenance,
    migrateImages,
    searchCache
};