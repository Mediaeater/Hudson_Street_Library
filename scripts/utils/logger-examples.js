/**
 * Logger Integration Examples
 * Shows how to replace console.log statements throughout the codebase
 */

const { getGlobalLogger } = require('./logger');

// Initialize the global logger
const logger = getGlobalLogger({
  level: 'debug',
  logDir: require('path').join(__dirname, '../logs'),
  includeColors: true,
  includeEmojis: true,
  enableFile: true
});

// Example 1: Basic replacements for existing console.log statements
function exampleBasicReplacements() {
  // OLD: console.log(`⚡ Optimizing: ${path.basename(inputPath)}`);
  // NEW:
  logger.processing(`Optimizing: ${path.basename(inputPath)}`);

  // OLD: console.log(`✅ Generated ${result.optimized.length + result.thumbnails.length} optimized variants`);
  // NEW:
  logger.success(`Generated ${result.optimized.length + result.thumbnails.length} optimized variants`, {
    optimizedCount: result.optimized.length,
    thumbnailCount: result.thumbnails.length
  });

  // OLD: console.error(`❌ Optimization failed: ${error.message}`);
  // NEW:
  logger.error('Optimization failed', error, { inputPath, operation: 'optimize' });
}

// Example 2: Operation tracking for batch processes
function exampleBatchProcessing() {
  const imagePaths = ['image1.jpg', 'image2.jpg', 'image3.jpg'];

  // Start batch operation
  const batchId = logger.startBatch('image-optimization', imagePaths.length);

  let successful = 0;
  let failed = 0;

  for (const imagePath of imagePaths) {
    try {
      // Simulate image processing
      logger.logImageProcess(imagePath, 'processing');

      // ... actual processing code ...

      logger.logImageProcess(imagePath, 'completed');
      successful++;
    } catch (error) {
      logger.error('Failed to process image', error, { imagePath });
      failed++;
    }
  }

  // End batch operation
  logger.endBatch(batchId, { successful, failed });
}

// Example 3: ImageOptimizer class integration
class ExampleImageOptimizer {
  constructor(config) {
    this.config = config;
    this.logger = getGlobalLogger();
  }

  async optimizeImage(inputPath, options = {}) {
    // Track this operation
    const operationId = this.logger.trackOperation('image-optimization', 'started', {
      inputPath,
      options
    });

    try {
      this.logger.processing(`Optimizing: ${require('path').basename(inputPath)}`);

      // ... optimization code ...

      const result = {
        main: '/path/to/main.jpg',
        optimized: ['/path/to/optimized1.jpg', '/path/to/optimized2.jpg'],
        thumbnails: ['/path/to/thumb1.jpg'],
        stats: { compressionRatio: 75 }
      };

      // Log successful optimization
      this.logger.logOptimization(inputPath, result.optimized, result.stats);

      // Update operation tracking
      this.logger.updateOperation(operationId, 'completed', {
        outputCount: result.optimized.length,
        compressionRatio: result.stats.compressionRatio
      });

      return result;

    } catch (error) {
      this.logger.updateOperation(operationId, 'failed', { error: error.message });
      this.logger.error('Optimization failed', error, { inputPath });
      throw error;
    }
  }

  async optimizeBatch(inputPaths, options = {}) {
    const batchId = this.logger.startBatch('batch-optimization', inputPaths.length);

    const results = [];
    const batchSize = options.batchSize || this.config.pipeline.batchSize;

    for (let i = 0; i < inputPaths.length; i += batchSize) {
      const batch = inputPaths.slice(i, i + batchSize);
      this.logger.info(`Processing batch ${Math.floor(i/batchSize) + 1}`, {
        batchNumber: Math.floor(i/batchSize) + 1,
        batchSize: batch.length
      });

      const batchPromises = batch.map(async (inputPath) => {
        try {
          const result = await this.optimizeImage(inputPath, options);
          return { success: true, inputPath, result };
        } catch (error) {
          return { success: false, inputPath, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successful = results.filter(r => r.success).length;
    this.logger.endBatch(batchId, {
      total: inputPaths.length,
      successful,
      failed: inputPaths.length - successful
    });

    return results;
  }
}

// Example 4: Pipeline integration
class ExampleImagePipeline {
  constructor(options = {}) {
    this.config = options;
    this.logger = getGlobalLogger();

    this.stats = {
      processed: 0,
      optimized: 0,
      categorized: 0,
      errors: 0
    };
  }

  async initialize() {
    this.logger.info('Initializing Image Pipeline', { config: this.config });

    // Create necessary directories
    for (const [name, dir] of Object.entries(this.config.directories)) {
      try {
        await require('fs').promises.mkdir(dir, { recursive: true });
        this.logger.success(`Directory ready: ${name}`, { directory: dir });
      } catch (error) {
        this.logger.error(`Failed to create directory ${name}`, error, { directory: dir });
      }
    }

    this.logger.success('Pipeline initialized successfully');
  }

  async processFolder(folderPath, options = {}) {
    this.logger.info(`Processing folder: ${folderPath}`);

    try {
      const files = await require('fs').promises.readdir(folderPath, { withFileTypes: true });
      const imageFiles = files
        .filter(file => file.isFile() && this.isImageFile(file.name))
        .map(file => require('path').join(folderPath, file.name));

      this.logger.info(`Found ${imageFiles.length} image files`, {
        folderPath,
        imageCount: imageFiles.length
      });

      if (this.config.pipeline.parallelProcessing) {
        await this.processBatch(imageFiles, options);
      } else {
        for (const imagePath of imageFiles) {
          await this.processSingleImage(imagePath, options);
        }
      }

      this.logger.printStats();
      return this.getStats();
    } catch (error) {
      this.logger.error('Error processing folder', error, { folderPath });
      throw error;
    }
  }

  // ... other methods would be similarly updated
}

// Example 5: CSV Handler integration
class ExampleCSVHandler {
  constructor() {
    this.logger = getGlobalLogger();
  }

  async updateBooksCSV(imagePath, context) {
    const { metadata, bookInfo, category } = context;
    const csvPath = require('path').join(__dirname, '../../src/_data/books.csv');

    this.logger.debug('Updating books CSV', {
      csvPath,
      imagePath,
      hasBookInfo: !!bookInfo,
      category
    });

    try {
      // ... CSV processing code ...

      this.logger.success('Books CSV updated successfully', {
        csvPath,
        recordType: existingRecord ? 'updated' : 'created',
        title: bookInfo?.title || metadata?.title
      });

    } catch (error) {
      this.logger.error('Failed to update books CSV', error, {
        csvPath,
        imagePath
      });
      // Don't re-throw if not critical
    }
  }
}

// Example 6: Error reporting and statistics
async function generateProcessingReport() {
  const logger = getGlobalLogger();

  // Generate comprehensive report
  const report = await logger.generateReport(true);

  logger.info('Processing report generated', {
    reportPath: require('path').join(logger.config.logDir, `report-${Date.now()}.json`),
    summary: report.summary
  });

  // Print stats to console
  logger.printStats();

  return report;
}

// Example 7: Cleanup and shutdown
async function shutdownPipeline() {
  const logger = getGlobalLogger();

  logger.info('Shutting down image processing pipeline');

  // Generate final report
  await generateProcessingReport();

  // Cleanup logger resources
  await logger.cleanup();
}

module.exports = {
  ExampleImageOptimizer,
  ExampleImagePipeline,
  ExampleCSVHandler,
  generateProcessingReport,
  shutdownPipeline
};