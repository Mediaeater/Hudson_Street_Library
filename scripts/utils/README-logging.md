# Unified Logging System

A comprehensive logging solution for the Hudson Street Library image processing pipeline that provides consistent logging across all modules, file-based logging, operation tracking, and statistical reporting.

## Features

- **Multiple Log Levels**: debug, info, warn, error
- **Colored Console Output**: With emoji support for better readability
- **File Logging**: Automatic logging to rotating files
- **Operation Tracking**: Track start/completion/failure of operations
- **Batch Processing Support**: Special handling for batch operations
- **Statistical Reporting**: Generate reports on processing activities
- **Error Aggregation**: Collect and analyze failed operations
- **Log Rotation**: Automatic cleanup of old log files

## Quick Start

```javascript
const { getGlobalLogger } = require('./utils/logger');
const logger = getGlobalLogger();

// Basic logging
logger.info('Processing started');
logger.success('Operation completed successfully');
logger.warn('File size is larger than recommended');
logger.error('Failed to process image', error);

// Specialized image processing logging
logger.logImageProcess('/path/to/image.jpg', 'optimization');
logger.logOptimization(inputPath, outputPaths, stats);
```

## Configuration

```javascript
const logger = getGlobalLogger({
  level: 'info',                    // Minimum log level
  enableConsole: true,              // Enable console output
  enableFile: true,                 // Enable file logging
  logDir: './logs',                 // Log directory
  includeColors: true,              // Colored console output
  includeEmojis: true,              // Emoji in console output
  maxFileSize: 10 * 1024 * 1024,   // 10MB max file size
  maxFiles: 5                       // Keep 5 log files
});
```

## API Reference

### Basic Logging Methods

#### `logger.debug(message, metadata = {})`
Log debug information (only shown when level is 'debug')

#### `logger.info(message, metadata = {})`
Log general information

#### `logger.warn(message, metadata = {})`
Log warnings (automatically tracked in statistics)

#### `logger.error(message, error = null, metadata = {})`
Log errors (automatically tracked in statistics)

#### `logger.success(message, metadata = {})`
Log successful operations with success emoji

### Specialized Methods

#### `logger.processing(message, metadata = {})`
Log processing activities with processing emoji

#### `logger.logImageProcess(imagePath, action, metadata = {})`
Log image processing operations
```javascript
logger.logImageProcess('/path/to/image.jpg', 'optimization', {
  format: 'jpeg',
  size: '2MB'
});
```

#### `logger.logOptimization(inputPath, outputPaths, stats = {})`
Log image optimization results
```javascript
logger.logOptimization('/input.jpg', ['/output1.jpg', '/output2.jpg'], {
  compressionRatio: 75,
  originalSize: '2MB'
});
```

#### `logger.logFileOperation(operation, filePath, metadata = {})`
Log file operations (upload, download, move, etc.)

### Operation Tracking

#### `logger.trackOperation(operationName, status, metadata = {})`
Start tracking an operation
```javascript
const operationId = logger.trackOperation('image-optimization', 'started', {
  inputFile: 'image.jpg'
});
```

#### `logger.updateOperation(operationId, status, metadata = {})`
Update operation status
```javascript
logger.updateOperation(operationId, 'completed', {
  outputFiles: 3,
  duration: '1.2s'
});
```

### Batch Processing

#### `logger.startBatch(batchName, itemCount)`
Start tracking a batch operation
```javascript
const batchId = logger.startBatch('image-optimization', 50);
```

#### `logger.endBatch(operationId, results = {})`
Complete batch tracking
```javascript
logger.endBatch(batchId, {
  successful: 45,
  failed: 5
});
```

### Statistics and Reporting

#### `logger.getStats()`
Get current logger statistics
```javascript
const stats = logger.getStats();
console.log(`Success rate: ${stats.successRate}`);
```

#### `logger.printStats()`
Print formatted statistics to console

#### `logger.generateReport(includeDetails = false)`
Generate comprehensive report and save to file
```javascript
const report = await logger.generateReport(true);
```

## File Structure

The logger creates the following files in the configured log directory:

```
logs/
├── main-2024-01-15.log          # Daily main log
├── error-2024-01-15.log         # Daily error log
├── report-1642234567890.json    # Generated reports
└── ...
```

### Log File Format

JSON-formatted log entries:
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "message": "Image optimization completed",
  "metadata": {
    "inputPath": "/path/to/image.jpg",
    "outputCount": 3,
    "compressionRatio": 75
  },
  "pid": 12345
}
```

## Migration from Console.log

### Before
```javascript
console.log(`⚡ Optimizing: ${path.basename(inputPath)}`);
console.log(`✅ Generated ${count} optimized variants`);
console.error(`❌ Optimization failed: ${error.message}`);
```

### After
```javascript
logger.processing(`Optimizing: ${path.basename(inputPath)}`);
logger.success(`Generated ${count} optimized variants`, { count });
logger.error('Optimization failed', error, { inputPath });
```

## Integration Examples

### Class Integration
```javascript
const { getGlobalLogger } = require('./utils/logger');

class ImageProcessor {
  constructor() {
    this.logger = getGlobalLogger();
  }

  async processImage(imagePath) {
    const operationId = this.logger.trackOperation('image-processing', 'started');

    try {
      this.logger.logImageProcess(imagePath, 'validation');
      // ... validation code ...

      this.logger.logImageProcess(imagePath, 'optimization');
      // ... optimization code ...

      this.logger.updateOperation(operationId, 'completed');
      this.logger.success('Image processed successfully', { imagePath });

    } catch (error) {
      this.logger.updateOperation(operationId, 'failed');
      this.logger.error('Image processing failed', error, { imagePath });
      throw error;
    }
  }
}
```

### Batch Processing
```javascript
async function processBatch(imagePaths) {
  const batchId = logger.startBatch('image-batch', imagePaths.length);
  let successful = 0;
  let failed = 0;

  for (const imagePath of imagePaths) {
    try {
      await processImage(imagePath);
      successful++;
    } catch (error) {
      failed++;
    }
  }

  logger.endBatch(batchId, { successful, failed });
}
```

## Testing

Run the test script to see the logger in action:

```bash
node scripts/utils/logger-test.js
```

This will demonstrate all logging features and create sample log files.

## Benefits

1. **Consistency**: All modules use the same logging format
2. **Debugging**: Structured logs make troubleshooting easier
3. **Monitoring**: Track operation success rates and performance
4. **Auditing**: Complete record of all processing activities
5. **Maintenance**: Automatic log rotation and cleanup
6. **Reporting**: Generate reports for analysis and optimization

## Best Practices

1. **Use appropriate log levels**: debug for development, info for normal operations
2. **Include relevant metadata**: Always provide context with log messages
3. **Track operations**: Use operation tracking for important processes
4. **Handle errors properly**: Always log errors with full context
5. **Use batch tracking**: For multiple item processing operations
6. **Regular reports**: Generate periodic reports for monitoring