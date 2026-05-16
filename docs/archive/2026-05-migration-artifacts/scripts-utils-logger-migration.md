# Logger Migration Guide

This guide shows how to replace existing console.log statements throughout the image processing codebase with the new unified logging system.

## Quick Start

```javascript
const { getGlobalLogger } = require('./utils/logger');
const logger = getGlobalLogger();
```

## Common Replacements

### 1. Basic Console Logs

**Before:**
```javascript
console.log(`⚡ Optimizing: ${path.basename(inputPath)}`);
```

**After:**
```javascript
logger.processing(`Optimizing: ${path.basename(inputPath)}`);
```

### 2. Success Messages

**Before:**
```javascript
console.log(`✅ Generated ${result.optimized.length} optimized variants`);
```

**After:**
```javascript
logger.success(`Generated ${result.optimized.length} optimized variants`, {
  optimizedCount: result.optimized.length,
  compressionRatio: result.stats.compressionRatio
});
```

### 3. Error Logging

**Before:**
```javascript
console.error(`❌ Optimization failed: ${error.message}`);
```

**After:**
```javascript
logger.error('Optimization failed', error, { inputPath, operation: 'optimize' });
```

### 4. Warning Messages

**Before:**
```javascript
console.error(`⚠️  Could not calculate optimization stats: ${error.message}`);
```

**After:**
```javascript
logger.warn('Could not calculate optimization stats', { error: error.message, inputPath });
```

### 5. Info Messages with Data

**Before:**
```javascript
console.log(`📝 Extracted metadata: ${JSON.stringify(metadata, null, 2)}`);
```

**After:**
```javascript
logger.info('Extracted metadata', { metadata });
```

## File-by-File Migration

### optimizer.js

**Lines to replace:**
- Line 12: `console.log(\`⚡ Optimizing: ${path.basename(inputPath)}\`)` → `logger.processing(\`Optimizing: ${path.basename(inputPath)}\`)`
- Line 49: `console.log(\`✅ Generated ${result.optimized.length + result.thumbnails.length} optimized variants\`)` → `logger.success(...)`
- Line 55: `console.error(\`❌ Optimization failed: ${error.message}\`)` → `logger.error('Optimization failed', error, { inputPath })`
- Line 85: `console.log(\`⚡ Batch optimizing ${inputPaths.length} images...\`)` → `logger.startBatch('image-optimization', inputPaths.length)`

### image-pipeline.js

**Lines to replace:**
- Line 29: `console.log('🚀 Initializing Image Pipeline...')` → `logger.info('Initializing Image Pipeline')`
- Line 35: `console.log(\`✅ Directory ready: ${name} (${dir})\`)` → `logger.success(\`Directory ready: ${name}\`, { directory: dir })`
- Line 37: `console.error(\`❌ Failed to create directory ${name}:\`, error.message)` → `logger.error(\`Failed to create directory ${name}\`, error, { directory: dir })`

### image-processor.js

This file has minimal console output, but validation errors could be logged:

**Add logger integration:**
```javascript
const { getGlobalLogger } = require('./logger');

class ImageProcessor {
    static logger = getGlobalLogger();

    static async validate(filePath) {
        // ... existing code ...

        if (!result.valid) {
            this.logger.warn('Image validation failed', {
                filePath,
                errors: result.errors
            });
        }

        return result;
    }
}
```

## Integration Pattern

### 1. Add logger to class constructor:

```javascript
class YourImageProcessor {
    constructor(config) {
        this.config = config;
        this.logger = getGlobalLogger();
    }
}
```

### 2. Use operation tracking for important processes:

```javascript
async someOperation(input) {
    const operationId = this.logger.trackOperation('operation-name', 'started', { input });

    try {
        // ... operation code ...

        this.logger.updateOperation(operationId, 'completed', { output });
        return result;
    } catch (error) {
        this.logger.updateOperation(operationId, 'failed', { error: error.message });
        throw error;
    }
}
```

### 3. Use batch tracking for loops:

```javascript
async processBatch(items) {
    const batchId = this.logger.startBatch('batch-name', items.length);

    // ... process items ...

    this.logger.endBatch(batchId, { successful, failed });
}
```

## Configuration Options

### Development
```javascript
const logger = getGlobalLogger({
    level: 'debug',
    includeColors: true,
    includeEmojis: true,
    enableFile: true
});
```

### Production
```javascript
const logger = getGlobalLogger({
    level: 'info',
    includeColors: false,
    includeEmojis: false,
    enableFile: true,
    maxFileSize: 50 * 1024 * 1024 // 50MB
});
```

## Benefits After Migration

1. **Consistent Formatting**: All log messages follow the same format
2. **File Logging**: All operations are automatically logged to files
3. **Operation Tracking**: Track success/failure rates and performance
4. **Error Aggregation**: All errors are collected for analysis
5. **Statistical Reporting**: Generate reports on processing activities
6. **Log Rotation**: Automatic cleanup of old log files
7. **Structured Data**: All log entries include structured metadata

## Testing the Migration

After updating a file, test with:

```javascript
const { getGlobalLogger } = require('./utils/logger');
const logger = getGlobalLogger({ level: 'debug' });

// Run your operations
// ...

// Print statistics
logger.printStats();

// Generate report
logger.generateReport(true).then(report => {
    console.log('Report generated:', report.summary);
});
```