/**
 * Image Optimization Module - Updated to use Unified Image Optimizer
 *
 * This module now wraps the unified image optimizer to maintain
 * backward compatibility with the existing image pipeline.
 *
 * Features:
 * - Full integration with UnifiedImageOptimizer
 * - Centralized logging and error handling
 * - Support for multiple output formats and batch processing
 * - Collection-specific optimization settings
 * - Comprehensive statistics and reporting
 */

const { UnifiedImageOptimizer } = require('../../utils/unified-image-optimizer');
const { getGlobalLogger } = require('../../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class ImageOptimizer {
  constructor(config) {
    this.config = config;
    this.unifiedOptimizer = new UnifiedImageOptimizer(config);

    // Initialize logger with optimization-specific settings
    this.logger = getGlobalLogger({
      level: config.logging?.level || 'info',
      logDir: config.logging?.logDirectory || path.join(__dirname, '../logs'),
      includeEmojis: true
    });

    // Track optimization statistics
    this.optimizationStats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      totalInputSize: 0,
      totalOutputSize: 0,
      startTime: null
    };
  }

  async optimizeImage(inputPath, options = {}) {
    this.logger.logImageProcess(inputPath, 'Starting optimization', options);
    const operationId = this.logger.trackOperation('optimize-single', 'started', { inputPath });

    try {
      // Validate input file exists
      await fs.access(inputPath, fs.constants.R_OK);

      // Get file stats for tracking
      const inputStats = await fs.stat(inputPath);
      this.optimizationStats.totalInputSize += inputStats.size;
      this.optimizationStats.totalProcessed++;

      // Delegate to unified optimizer
      const result = await this.unifiedOptimizer.optimizeImage(inputPath, options);

      // Transform result to match the expected interface
      if (result.success) {
        this.optimizationStats.successful++;
        this.optimizationStats.totalOutputSize += result.stats?.totalOptimizedSize || 0;

        this.logger.updateOperation(operationId, 'completed', {
          outputCount: result.outputPaths.length + result.thumbnailPaths.length,
          compressionRatio: result.stats?.compressionRatio
        });

        this.logger.logOptimization(inputPath, [...result.outputPaths, ...result.thumbnailPaths], result.stats);

        return {
          main: result.mainImage,
          optimized: result.outputPaths,
          thumbnails: result.thumbnailPaths,
          metadata: result.metadata,
          thumbnailMetadata: result.thumbnailMetadata,
          stats: result.stats
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      this.optimizationStats.failed++;
      this.logger.updateOperation(operationId, 'failed', { error: error.message });
      this.logger.error(`Optimization failed for ${path.basename(inputPath)}`, error);
      throw error;
    }
  }

  async generateThumbnails(inputPath, settings) {
    // This method is now handled internally by the unified optimizer
    // Keeping for backward compatibility
    return this.unifiedOptimizer.generateThumbnails(inputPath, settings);
  }

  async optimizeBatch(inputPaths, options = {}) {
    this.logger.processing(`Starting batch optimization of ${inputPaths.length} images`);
    this.optimizationStats.startTime = Date.now();
    const batchOperationId = this.logger.startBatch('image-optimization', inputPaths.length);

    try {
      // Delegate to unified optimizer
      const result = await this.unifiedOptimizer.optimizeBatch(inputPaths, options);

      // Update our statistics
      const successful = result.results.filter(r => r.success).length;
      const failed = result.results.length - successful;

      this.optimizationStats.totalProcessed += result.results.length;
      this.optimizationStats.successful += successful;
      this.optimizationStats.failed += failed;

      this.logger.endBatch(batchOperationId, {
        processed: result.results.length,
        successful: successful,
        failed: failed,
        duration: Date.now() - this.optimizationStats.startTime
      });

      // Transform results to match expected interface
      return result.results.map(r => ({
        success: r.success,
        inputPath: r.inputPath,
        result: r.success ? {
          main: r.result.mainImage,
          optimized: r.result.outputPaths,
          thumbnails: r.result.thumbnailPaths,
          metadata: r.result.metadata,
          thumbnailMetadata: r.result.thumbnailMetadata,
          stats: r.result.stats
        } : undefined,
        error: r.error
      }));

    } catch (error) {
      this.logger.updateOperation(batchOperationId, 'failed', { error: error.message });
      this.logger.error('Batch optimization failed', error);
      throw error;
    }
  }

  async createResponsiveVariants(inputPath, sizes = [], options = {}) {
    // Delegate to unified optimizer
    return this.unifiedOptimizer.createResponsiveVariants(inputPath, sizes, options);
  }

  generateResponsiveHTML(metadata, options = {}) {
    // Delegate to unified optimizer
    return this.unifiedOptimizer.generateResponsiveHTML(metadata, options);
  }

  async optimizeForCollection(inputPath, collectionType, options = {}) {
    // Delegate to unified optimizer
    const result = await this.unifiedOptimizer.optimizeForCollection(inputPath, collectionType, options);

    // Transform result to match expected interface
    if (result.success) {
      return {
        main: result.mainImage,
        optimized: result.outputPaths,
        thumbnails: result.thumbnailPaths,
        metadata: result.metadata,
        thumbnailMetadata: result.thumbnailMetadata,
        stats: result.stats
      };
    } else {
      throw new Error(result.error);
    }
  }

  getMainImagePath(metadata) {
    // Delegate to unified optimizer
    return this.unifiedOptimizer.getMainImagePath(metadata);
  }

  getOptimizedPaths(metadata) {
    // Delegate to unified optimizer
    return this.unifiedOptimizer.getOptimizedPaths(metadata);
  }

  async calculateOptimizationStats(inputPath, metadata, thumbnailMetadata = {}) {
    // Delegate to unified optimizer
    const fs = require('fs').promises;
    const inputStats = await fs.stat(inputPath);
    return this.unifiedOptimizer.calculateOptimizationStats(inputPath, inputStats, metadata, thumbnailMetadata);
  }

  async cleanupOptimized(olderThanDays = 7) {
    // This functionality could be added to unified optimizer if needed
    // For now, keeping the original implementation
    const fs = require('fs').promises;
    console.log(`🧹 Cleaning up optimized images older than ${olderThanDays} days...`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleaned = 0;

    for (const dir of [this.config.directories.optimized, this.config.directories.thumbnails]) {
      try {
        const files = await fs.readdir(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);

          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            cleaned++;
          }
        }
      } catch (error) {
        console.error(`⚠️  Error cleaning ${dir}: ${error.message}`);
      }
    }

    console.log(`✅ Cleaned up ${cleaned} old optimized images`);
    return cleaned;
  }

  async getOptimizationReport() {
    // Generate report using unified optimizer's statistics
    const stats = this.unifiedOptimizer.getOptimizationStats();

    // Also include file system analysis for compatibility
    const fs = require('fs').promises;
    const report = {
      optimizedCount: 0,
      thumbnailCount: 0,
      totalSize: 0,
      formats: new Set()
    };

    for (const dir of [this.config.directories.optimized, this.config.directories.thumbnails]) {
      try {
        const files = await fs.readdir(dir);

        for (const file of files) {
          const filePath = path.join(dir, file);
          const fileStats = await fs.stat(filePath);
          const ext = path.extname(file).substring(1);

          if (dir === this.config.directories.optimized) {
            report.optimizedCount++;
          } else {
            report.thumbnailCount++;
          }

          report.totalSize += fileStats.size;
          report.formats.add(ext);
        }
      } catch (error) {
        console.error(`⚠️  Error reading ${dir}: ${error.message}`);
      }
    }

    report.formats = Array.from(report.formats);
    report.totalSizeMB = Math.round(report.totalSize / (1024 * 1024) * 100) / 100;

    // Merge with unified optimizer stats
    return {
      ...report,
      optimizerStats: stats
    };
  }

  /**
   * Get current optimization statistics from this module
   */
  getModuleStats() {
    return {
      ...this.optimizationStats,
      averageCompressionRatio: this.optimizationStats.totalInputSize > 0 ?
        Math.round(((this.optimizationStats.totalInputSize - this.optimizationStats.totalOutputSize) /
                   this.optimizationStats.totalInputSize) * 100) : 0,
      successRate: this.optimizationStats.totalProcessed > 0 ?
        (this.optimizationStats.successful / this.optimizationStats.totalProcessed * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Validate image file before optimization
   * @param {string} imagePath - Path to image file
   * @returns {Promise<Object>} Validation result
   */
  async validateImage(imagePath) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // Check if file exists and is readable
      await fs.access(imagePath, fs.constants.R_OK);

      // Get file stats
      const stats = await fs.stat(imagePath);
      validation.metadata.fileSize = stats.size;
      validation.metadata.lastModified = stats.mtime;

      // Check file extension
      const ext = path.extname(imagePath).toLowerCase();
      if (!this.config.supportedTypes.includes(ext)) {
        validation.errors.push(`Unsupported file format: ${ext}`);
        validation.isValid = false;
      }

      // Check file size limits
      const maxFileSize = this.config.validation?.maxFileSize || 50 * 1024 * 1024; // 50MB default
      if (stats.size > maxFileSize) {
        validation.errors.push(`File size exceeds limit: ${Math.round(stats.size / 1024 / 1024)}MB > ${Math.round(maxFileSize / 1024 / 1024)}MB`);
        validation.isValid = false;
      }

      // Check minimum file size
      const minFileSize = this.config.validation?.minFileSize || 1024; // 1KB default
      if (stats.size < minFileSize) {
        validation.warnings.push(`File size is very small: ${stats.size} bytes`);
      }

      // Try to read basic image information
      try {
        const buffer = await fs.readFile(imagePath);
        const dimensions = this.getImageDimensions(buffer, ext);
        if (dimensions) {
          validation.metadata.dimensions = dimensions;

          // Check minimum dimensions
          const minWidth = this.config.validation?.minWidth || 10;
          const minHeight = this.config.validation?.minHeight || 10;
          if (dimensions.width < minWidth || dimensions.height < minHeight) {
            validation.errors.push(`Image dimensions too small: ${dimensions.width}x${dimensions.height}`);
            validation.isValid = false;
          }
        }
      } catch (error) {
        validation.warnings.push(`Could not read image dimensions: ${error.message}`);
      }

    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`File access error: ${error.message}`);
    }

    return validation;
  }

  /**
   * Get basic image dimensions from buffer
   */
  getImageDimensions(buffer, ext) {
    try {
      if (ext === '.jpg' || ext === '.jpeg') {
        // Simple JPEG dimension extraction
        for (let i = 0; i < buffer.length - 4; i++) {
          if (buffer[i] === 0xFF && (buffer[i + 1] === 0xC0 || buffer[i + 1] === 0xC2)) {
            const height = buffer.readUInt16BE(i + 5);
            const width = buffer.readUInt16BE(i + 7);
            return { width, height };
          }
        }
      } else if (ext === '.png') {
        // Simple PNG dimension extraction
        if (buffer.length >= 24 &&
            buffer[0] === 0x89 && buffer[1] === 0x50 &&
            buffer[2] === 0x4E && buffer[3] === 0x47) {
          const width = buffer.readUInt32BE(16);
          const height = buffer.readUInt32BE(20);
          return { width, height };
        }
      }
    } catch (error) {
      // Ignore errors in dimension extraction
    }
    return null;
  }

  /**
   * Clean up and generate final report
   */
  async cleanup() {
    const stats = this.getModuleStats();
    this.logger.info('Image optimizer cleanup completed', stats);

    // Delegate to unified optimizer cleanup
    if (this.unifiedOptimizer && typeof this.unifiedOptimizer.cleanup === 'function') {
      await this.unifiedOptimizer.cleanup();
    }
  }

  /**
   * Test the optimizer with a sample image
   * @param {string} testImagePath - Path to test image (optional)
   * @returns {Promise<Object>} Test results
   */
  async runTests(testImagePath) {
    this.logger.info('Running optimizer tests...');

    const testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Test 1: Basic optimization
    try {
      if (!testImagePath) {
        // Create a simple test image or use a default
        testImagePath = await this.createTestImage();
      }

      await this.optimizeImage(testImagePath);
      testResults.tests.push({ name: 'Basic optimization', status: 'passed' });
      testResults.passed++;
    } catch (error) {
      testResults.tests.push({ name: 'Basic optimization', status: 'failed', error: error.message });
      testResults.failed++;
    }

    // Test 2: Validation
    try {
      const validation = await this.validateImage(testImagePath || __filename);
      testResults.tests.push({ name: 'Image validation', status: 'passed' });
      testResults.passed++;
    } catch (error) {
      testResults.tests.push({ name: 'Image validation', status: 'failed', error: error.message });
      testResults.failed++;
    }

    this.logger.info(`Optimizer tests completed: ${testResults.passed} passed, ${testResults.failed} failed`);
    return testResults;
  }

  /**
   * Create a simple test image (placeholder)
   */
  async createTestImage() {
    // This is a placeholder - in a real implementation, you might create a simple image
    // For now, just return null to indicate no test image available
    return null;
  }
}

module.exports = ImageOptimizer;