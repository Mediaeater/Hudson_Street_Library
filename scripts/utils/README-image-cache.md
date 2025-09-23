# Image Cache System

A comprehensive caching system designed to prevent duplicate image downloads and efficiently manage image metadata across all image acquisition operations in the Hudson Street Library project.

## Overview

The image cache system provides:

- **Persistent caching** to track downloaded images and prevent re-downloading
- **Metadata storage** including URL, local path, download date, size, and content hash
- **Cache invalidation** based on age or manual clearing
- **Integration** with the existing deduplication system from `image-core.js`
- **Multiple lookup methods** by ISBN, filename, URL, or content hash
- **Cache statistics and reporting** for monitoring and optimization
- **Atomic operations** for data integrity

## Architecture

### Core Components

1. **`image-cache.js`** - Main cache implementation with persistent JSON storage
2. **`image-cache-integration.js`** - Integration helpers for existing scripts
3. **`test-image-cache.js`** - Comprehensive test suite

### Storage Structure

```
data/
└── image-cache.json          # Persistent cache storage
    ├── version               # Cache format version
    ├── timestamp            # Last update time
    ├── stats                # Performance statistics
    └── entries              # Image metadata entries
        ├── [hash-id]        # Unique cache entry
        │   ├── url          # Source URL
        │   ├── localPath    # File system path
        │   ├── size         # File size in bytes
        │   ├── hash         # Content hash (SHA-256)
        │   ├── bookData     # Associated book information
        │   └── metadata     # Additional metadata
        └── ...
```

## Usage

### Basic Usage

```javascript
const { getCache, cacheImage, lookupCachedImage } = require('./image-cache');

// Initialize cache
const cache = await getCache();

// Add an image to cache
const cacheKey = await cacheImage({
    url: 'https://example.com/book-cover.jpg',
    localPath: '/path/to/local/image.jpg',
    bookData: {
        title: 'Book Title',
        author_last: 'Author',
        isbn_asin: '1234567890'
    }
});

// Look up cached image
const cached = await lookupCachedImage({ isbn: '1234567890' });
if (cached) {
    console.log('Image exists:', cached.localPath);
}
```

### Integration with Downloads

```javascript
const { cachedImageDownload } = require('./image-cache-integration');

// Wrap existing download function with caching
const result = await cachedImageDownload(
    downloadRequest,
    originalDownloadFunction,
    { validate: true, source: 'book-covers' }
);

if (result.cached) {
    console.log('Used cached image:', result.path);
} else if (result.downloaded) {
    console.log('Downloaded and cached:', result.path);
}
```

### Batch Processing

```javascript
const { batchCachedDownload } = require('./image-cache-integration');

const results = await batchCachedDownload(
    imageRequests,
    downloadFunction,
    {
        concurrency: 5,
        onProgress: (processed, total, result) => {
            console.log(`Progress: ${processed}/${total}`);
        }
    }
);
```

## API Reference

### Core Functions

#### `getCache(options)`
Returns the singleton cache instance with optional configuration override.

#### `cacheImage(imageData, options)`
Adds an image to the cache with metadata.

**Parameters:**
- `imageData.url` - Source URL
- `imageData.localPath` - Local file path
- `imageData.bookData` - Book information object
- `options.validate` - Validate image on add (default: false)
- `options.tags` - Array of tags for categorization
- `options.source` - Source identifier

#### `lookupCachedImage(searchParams)`
Search for cached images using various criteria.

**Search Parameters:**
- `id` - Cache entry ID
- `isbn` - Book ISBN/ASIN
- `filename` - Image filename
- `url` - Source URL
- `hash` - Content hash
- `bookData` - Book data object

#### `shouldDownloadImage(request)`
Determines if an image should be downloaded based on cache status.

Returns recommendation object with:
- `shouldDownload` - Boolean recommendation
- `reason` - Explanation for recommendation
- `existingEntry` - Cached entry if found
- `recommendations` - Array of suggested actions

### Integration Functions

#### `cachedImageDownload(request, downloadFn, options)`
Intelligent download wrapper that checks cache before downloading.

#### `batchCachedDownload(requests, downloadFn, options)`
Batch process multiple image requests with caching.

#### `analyzeImageRequests(requests)`
Pre-flight analysis of what would happen for a batch of requests.

#### `migrateExistingImages(directories, options)`
Scan directories and add existing images to cache.

### Maintenance Functions

#### `getCacheStats()`
Returns comprehensive cache statistics including hit rates, size distribution, and performance metrics.

#### `validateImageCache()`
Validates cache integrity and reports issues.

#### `clearImageCache(options)`
Clears cache with optional backup.

#### `performCacheMaintenance(options)`
Automated maintenance including cleanup and validation.

## Configuration

### Default Configuration

```javascript
const CACHE_CONFIG = {
    cacheFile: 'data/image-cache.json',
    behavior: {
        maxAge: 30 * 24 * 60 * 60 * 1000,  // 30 days
        enableMemoryCache: true,
        atomicWrites: true,
        validateOnLoad: false,
        autoCleanup: true,
        backupOnWrite: true
    },
    hash: {
        algorithm: 'sha256',
        encoding: 'hex'
    },
    paths: {
        books: 'src/assets/images/books',
        general: 'src/assets/images/general',
        temp: 'temp/images'
    }
};
```

### Custom Configuration

```javascript
const cache = await getCache({
    cacheFile: '/custom/path/cache.json',
    behavior: {
        maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
        enableMemoryCache: false
    }
});
```

## Integration with Existing Systems

### With image-core.js

The cache system integrates seamlessly with the existing `image-core.js` deduplication system:

```javascript
const { checkImageExists } = require('./image-core');
const { shouldDownloadImage } = require('./image-cache');

// Combined check: cache + filesystem
const downloadCheck = await shouldDownloadImage(request);
if (downloadCheck.shouldDownload) {
    const fsCheck = checkImageExists(request.bookData, imageDir);
    // Handle accordingly
}
```

### Retrofitting Existing Scripts

Use the integration helpers to add caching to existing download scripts:

```javascript
const { wrapWithCache } = require('./image-cache-integration');

// Wrap existing function
const cachedDownloadFunction = wrapWithCache(originalDownloadFunction);

// Or use explicit integration
const result = await cachedImageDownload(request, originalFunction);
```

## Monitoring and Maintenance

### Cache Statistics

```bash
node -e "
const { getCacheStats } = require('./scripts/utils/image-cache');
getCacheStats().then(stats => console.log(JSON.stringify(stats, null, 2)));
"
```

### Cache Validation

```bash
node -e "
const { validateImageCache } = require('./scripts/utils/image-cache');
validateImageCache().then(report => {
    console.log('Valid:', report.statistics.valid);
    console.log('Invalid:', report.statistics.invalid);
    console.log('Missing:', report.statistics.missing);
});
"
```

### Maintenance Operations

```bash
# Run automated maintenance
node -e "
const { performCacheMaintenance } = require('./scripts/utils/image-cache-integration');
performCacheMaintenance({
    validate: true,
    cleanExpired: true,
    removeMissing: true
}).then(result => console.log('Maintenance completed:', result));
"
```

## Performance Considerations

### Memory Usage

- **In-memory cache** provides fast lookups but uses RAM
- **Configurable** - can be disabled for memory-constrained environments
- **Automatic cleanup** removes expired entries

### File I/O

- **Atomic writes** prevent corruption during concurrent access
- **Batched operations** reduce disk I/O overhead
- **Backup creation** ensures data safety

### Lookup Performance

- **O(1) lookups** by cache key
- **O(n) searches** by other criteria (filename, ISBN, etc.)
- **Memory cache** eliminates disk reads for repeated lookups

## Troubleshooting

### Common Issues

1. **Cache file corruption**
   - Enable atomic writes (default)
   - Use backup feature before major operations

2. **Memory usage too high**
   - Disable memory cache: `enableMemoryCache: false`
   - Reduce cache max age to force cleanup

3. **Missing files in cache**
   - Run cache validation: `validateImageCache()`
   - Use maintenance function to clean invalid entries

4. **Permission errors**
   - Ensure cache directory is writable
   - Check file permissions on cache file

### Debugging

Enable debug logging:

```javascript
// Set debug environment
process.env.DEBUG = 'image-cache:*';

// Or add manual logging
const cache = await getCache();
console.log('Cache stats:', await cache.getStats());
```

## Testing

Run the comprehensive test suite:

```bash
node scripts/utils/test-image-cache.js
```

The test suite covers:
- Cache initialization
- Image addition and lookup
- Download recommendations
- Statistics generation
- Cache validation
- Cache clearing
- Error handling

## Migration Guide

### From No Caching

1. **Install** the cache system files
2. **Initialize** cache in your main script:
   ```javascript
   const { getCache } = require('./scripts/utils/image-cache');
   await getCache(); // Initialize
   ```
3. **Wrap** download functions:
   ```javascript
   const { cachedImageDownload } = require('./scripts/utils/image-cache-integration');
   // Replace direct downloads with cachedImageDownload
   ```

### From Custom Caching

1. **Migrate** existing cache data:
   ```javascript
   const { migrateExistingImages } = require('./scripts/utils/image-cache-integration');
   await migrateExistingImages(['path/to/images']);
   ```
2. **Replace** custom cache logic with standard functions
3. **Test** with validation function

## Best Practices

1. **Initialize early** - Call `getCache()` at application startup
2. **Use batch operations** for multiple images
3. **Monitor statistics** to tune cache settings
4. **Regular maintenance** - run cleanup periodically
5. **Backup before major operations** - use the backup feature
6. **Validate after migrations** - ensure data integrity

## Future Enhancements

Potential improvements for future versions:

- **Database backend** for large-scale deployments
- **Distributed caching** across multiple instances
- **Image similarity detection** for better deduplication
- **Automatic cache warming** from external sources
- **Web interface** for cache management
- **Export/import** functionality for cache sharing

---

This cache system provides a robust foundation for managing image downloads efficiently while maintaining data integrity and providing comprehensive monitoring capabilities.