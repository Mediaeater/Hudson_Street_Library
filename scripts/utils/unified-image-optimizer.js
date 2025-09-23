/**
 * Unified Image Optimization Module for Hudson Street Library
 *
 * Consolidates functionality from:
 * - scripts/optimize-all-images.js (uses @11ty/eleventy-img)
 * - scripts/image-pipeline/modules/optimizer.js (referenced but not fully shown)
 *
 * Features:
 * - Single unified API for all image optimization tasks
 * - Integrates with centralized image-config.js
 * - Uses the logger and image cache systems
 * - Supports batch and single image optimization
 * - Multiple output formats (WebP, JPEG) and sizes
 * - Progress tracking and detailed reporting
 * - Collection-specific optimization settings
 * - Responsive image generation with HTML output
 */

const Image = require('@11ty/eleventy-img');
const fs = require('fs').promises;
const path = require('path');
const { imageConfig } = require('../config/image-config');
const { getGlobalLogger } = require('./logger');
const { getCache } = require('./image-cache');

class UnifiedImageOptimizer {
  constructor(config = {}) {
    // Merge provided config with global image config
    this.config = {
      ...imageConfig,
      ...config
    };

    // Initialize logger with optimization-specific settings
    this.logger = getGlobalLogger({
      level: this.config.logging.level,
      logDir: this.config.logging.logDirectory,
      includeEmojis: true
    });

    // Cache instance (initialized lazily)
    this.cache = null;

    // Optimization statistics
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      totalInputSize: 0,
      totalOutputSize: 0,
      startTime: null,
      endTime: null,
      operations: []
    };
  }

  /**
   * Initialize the optimizer (lazy initialization)
   */
  async initialize() {
    if (!this.cache) {
      this.cache = await getCache();
    }

    // Ensure output directories exist
    for (const dirKey of this.config.directories.ensureExists) {
      const dirPath = this.config.directories[dirKey];
      if (dirPath) {
        await fs.mkdir(dirPath, { recursive: true });
      }
    }

    this.logger.info('Unified Image Optimizer initialized', {
      outputFormats: this.config.optimization.formats,
      sizes: this.config.optimization.sizes,
      quality: this.config.optimization.quality
    });
  }

  /**
   * Optimize a single image with comprehensive options
   * @param {string} inputPath - Path to the input image
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeImage(inputPath, options = {}) {
    await this.initialize();

    const operationId = this.logger.trackOperation('optimize-single', 'started', { inputPath });

    try {
      this.logger.logImageProcess(inputPath, 'Starting optimization');

      // Merge options with defaults
      const opts = this.mergeOptimizationOptions(options);

      // Get input file stats
      const inputStats = await fs.stat(inputPath);
      this.stats.totalInputSize += inputStats.size;

      // Generate optimized images using eleventy-img
      const metadata = await this.generateOptimizedImages(inputPath, opts);

      // Generate thumbnails if enabled
      let thumbnailMetadata = {};
      if (opts.generateThumbnails) {
        thumbnailMetadata = await this.generateThumbnails(inputPath, opts);
      }

      // Calculate optimization statistics
      const optimizationStats = this.calculateOptimizationStats(
        inputPath,
        inputStats,
        metadata,
        thumbnailMetadata
      );

      // Create result object
      const result = {
        inputPath,
        success: true,
        metadata,
        thumbnailMetadata,
        stats: optimizationStats,
        outputPaths: this.getOptimizedPaths(metadata),
        thumbnailPaths: this.getOptimizedPaths(thumbnailMetadata),
        mainImage: this.getMainImagePath(metadata),
        responsiveHTML: opts.generateHTML ? this.generateResponsiveHTML(metadata, opts) : null
      };

      // Update cache if image data provided
      if (opts.imageData && this.cache) {
        try {
          await this.cache.addImage({
            url: opts.imageData.url,
            localPath: inputPath,
            bookData: opts.imageData.bookData
          }, {
            validate: true,
            tags: ['optimized'],
            source: 'unified-optimizer'
          });
        } catch (cacheError) {
          this.logger.warn('Failed to update cache', { error: cacheError.message });
        }
      }

      // Update statistics
      this.stats.successful++;
      this.stats.totalOutputSize += optimizationStats.totalOptimizedSize;

      this.logger.updateOperation(operationId, 'completed', {
        outputCount: result.outputPaths.length + result.thumbnailPaths.length,
        compressionRatio: optimizationStats.compressionRatio
      });

      this.logger.logOptimization(inputPath, [...result.outputPaths, ...result.thumbnailPaths], optimizationStats);

      return result;

    } catch (error) {
      this.stats.failed++;
      this.logger.updateOperation(operationId, 'failed', { error: error.message });
      this.logger.error(`Optimization failed for ${path.basename(inputPath)}`, error);

      return {
        inputPath,
        success: false,
        error: error.message,
        metadata: {},
        thumbnailMetadata: {},
        stats: {},
        outputPaths: [],
        thumbnailPaths: []
      };
    } finally {
      this.stats.totalProcessed++;
    }
  }

  /**
   * Optimize multiple images in batches
   * @param {Array<string>} inputPaths - Array of image paths
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Batch optimization result
   */
  async optimizeBatch(inputPaths, options = {}) {
    await this.initialize();

    this.stats.startTime = Date.now();
    const batchOperationId = this.logger.startBatch('image-optimization', inputPaths.length);

    try {
      const batchSize = options.batchSize || this.config.pipeline.batchSize;
      const results = [];
      let batchNumber = 1;

      this.logger.info(`Starting batch optimization of ${inputPaths.length} images`, {
        batchSize,
        totalBatches: Math.ceil(inputPaths.length / batchSize)
      });

      // Process images in batches
      for (let i = 0; i < inputPaths.length; i += batchSize) {
        const batch = inputPaths.slice(i, i + batchSize);
        const batchProgress = `${batchNumber}/${Math.ceil(inputPaths.length / batchSize)}`;

        this.logger.processing(`Processing batch ${batchProgress} (${batch.length} images)`);

        // Process batch in parallel or sequentially based on config
        const batchPromises = batch.map(async (imagePath, index) => {
          const imageOptions = {
            ...options,
            // Add batch context
            batchInfo: {
              batchNumber,
              indexInBatch: index,
              totalInBatch: batch.length,
              globalIndex: i + index,
              totalImages: inputPaths.length
            }
          };

          return this.optimizeImage(imagePath, imageOptions);
        });

        const batchResults = this.config.pipeline.parallelProcessing
          ? await Promise.all(batchPromises)
          : await this.processSequentially(batchPromises);

        results.push(...batchResults);

        // Progress reporting
        const successfulInBatch = batchResults.filter(r => r.success).length;
        this.logger.info(`Batch ${batchProgress} completed: ${successfulInBatch}/${batch.length} successful`);

        // Add delay between batches if configured
        if (i + batchSize < inputPaths.length && this.config.rateLimiting.batchDelay > 0) {
          await this.delay(this.config.rateLimiting.batchDelay);
        }

        batchNumber++;
      }

      this.stats.endTime = Date.now();

      // Generate comprehensive batch report
      const batchReport = this.generateBatchReport(results);

      this.logger.endBatch(batchOperationId, {
        processed: this.stats.totalProcessed,
        successful: this.stats.successful,
        failed: this.stats.failed,
        duration: this.stats.endTime - this.stats.startTime,
        compressionRatio: batchReport.averageCompressionRatio
      });

      return {
        success: true,
        results,
        summary: batchReport,
        stats: this.getOptimizationStats()
      };

    } catch (error) {
      this.logger.error('Batch optimization failed', error);
      this.logger.updateOperation(batchOperationId, 'failed', { error: error.message });

      return {
        success: false,
        error: error.message,
        results: [],
        summary: {},
        stats: this.getOptimizationStats()
      };
    }
  }

  /**
   * Optimize images for a specific collection with tailored settings
   * @param {string} inputPath - Image path
   * @param {string} collectionType - Type of collection (book-covers, gallery, etc.)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Optimization result
   */
  async optimizeForCollection(inputPath, collectionType, options = {}) {
    const collectionSettings = this.getCollectionSettings(collectionType);

    const mergedOptions = {
      ...collectionSettings,
      ...options,
      collectionType,
      outputDir: options.outputDir || path.join(this.config.directories.optimized, collectionType),
      generateThumbnails: collectionSettings.generateThumbnails !== false
    };

    return this.optimizeImage(inputPath, mergedOptions);
  }

  /**
   * Find and optimize all images in a directory
   * @param {string} directory - Directory to scan
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} Batch optimization result
   */
  async optimizeDirectory(directory, options = {}) {
    await this.initialize();

    this.logger.info(`Scanning directory for images: ${directory}`);

    try {
      const imagePaths = await this.findAllImages(directory, options.recursive !== false);

      if (imagePaths.length === 0) {
        this.logger.warn('No images found in directory', { directory });
        return {
          success: true,
          results: [],
          summary: { message: 'No images found' }
        };
      }

      this.logger.info(`Found ${imagePaths.length} images to optimize`);

      return this.optimizeBatch(imagePaths, options);

    } catch (error) {
      this.logger.error('Failed to scan directory', error, { directory });
      throw error;
    }
  }

  /**
   * Generate responsive image variants with HTML output
   * @param {string} inputPath - Input image path
   * @param {Array<number>} sizes - Array of widths to generate
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Responsive variants result
   */
  async createResponsiveVariants(inputPath, sizes = [], options = {}) {
    const responsiveSizes = sizes.length > 0 ? sizes : this.config.optimization.sizes;

    const opts = {
      ...options,
      sizes: responsiveSizes,
      generateHTML: true,
      outputDir: options.outputDir || this.config.directories.optimized
    };

    const result = await this.optimizeImage(inputPath, opts);

    if (result.success) {
      return {
        success: true,
        metadata: result.metadata,
        variants: result.outputPaths,
        html: result.responsiveHTML,
        srcset: this.generateSrcSet(result.metadata),
        picture: this.generatePictureElement(result.metadata, options)
      };
    }

    return result;
  }

  // Private helper methods

  /**
   * Generate optimized images using eleventy-img
   */
  async generateOptimizedImages(inputPath, options) {
    const outputDir = options.outputDir || this.config.directories.optimized;

    return await Image(inputPath, {
      widths: options.sizes || this.config.optimization.sizes,
      formats: options.formats || this.config.optimization.formats,
      outputDir: outputDir,
      urlPath: options.urlPath || "/assets/images/optimized/",
      filenameFormat: (id, src, width, format) => {
        const name = path.basename(src, path.extname(src));
        const suffix = options.suffix || '';
        return `${name}${suffix}-${width}w.${format}`;
      },
      sharpWebpOptions: {
        quality: options.quality?.webp || this.config.optimization.quality.webp,
        effort: 6
      },
      sharpJpegOptions: {
        quality: options.quality?.jpeg || this.config.optimization.quality.jpeg,
        progressive: this.config.optimization.progressive,
        mozjpeg: true
      },
      sharpPngOptions: {
        quality: options.quality?.png || this.config.optimization.quality.png,
        compressionLevel: 9
      }
    });
  }

  /**
   * Generate thumbnail images
   */
  async generateThumbnails(inputPath, options) {
    if (!options.generateThumbnails) return {};

    const thumbnailSizes = options.thumbnailSizes || this.config.optimization.thumbnailSizes;
    const outputDir = options.thumbnailOutputDir || this.config.directories.thumbnails;

    return await Image(inputPath, {
      widths: thumbnailSizes,
      formats: options.formats || this.config.optimization.formats,
      outputDir: outputDir,
      urlPath: "/assets/images/thumbnails/",
      filenameFormat: (id, src, width, format) => {
        const name = path.basename(src, path.extname(src));
        return `${name}-thumb-${width}w.${format}`;
      },
      sharpWebpOptions: {
        quality: Math.max(70, (options.quality?.webp || this.config.optimization.quality.webp) - 10)
      },
      sharpJpegOptions: {
        quality: Math.max(75, (options.quality?.jpeg || this.config.optimization.quality.jpeg) - 10),
        progressive: true
      }
    });
  }

  /**
   * Merge optimization options with defaults
   */
  mergeOptimizationOptions(options) {
    return {
      formats: this.config.optimization.formats,
      sizes: this.config.optimization.sizes,
      quality: this.config.optimization.quality,
      generateThumbnails: this.config.features.enableThumbnails,
      generateHTML: false,
      ...options
    };
  }

  /**
   * Get collection-specific optimization settings
   */
  getCollectionSettings(collectionType) {
    const collectionSettings = {
      'book-covers': {
        sizes: [200, 400, 600, 800],
        formats: ['webp', 'jpeg'],
        quality: { webp: 85, jpeg: 90 },
        generateThumbnails: true,
        thumbnailSizes: [100, 200]
      },
      'collection-heroes': {
        sizes: [800, 1200, 1600, 2400],
        formats: ['webp', 'jpeg'],
        quality: { webp: 80, jpeg: 85 },
        generateThumbnails: false
      },
      'gallery': {
        sizes: [400, 800, 1200, 1600],
        formats: ['webp', 'jpeg'],
        quality: { webp: 80, jpeg: 85 },
        generateThumbnails: true,
        thumbnailSizes: [150, 300]
      },
      'thumbnails': {
        sizes: [100, 150, 200, 300],
        formats: ['webp', 'jpeg'],
        quality: { webp: 75, jpeg: 80 },
        generateThumbnails: false
      },
      'news': {
        sizes: [400, 600, 800],
        formats: ['webp', 'jpeg'],
        quality: { webp: 75, jpeg: 80 },
        generateThumbnails: true,
        thumbnailSizes: [150, 200]
      }
    };

    return collectionSettings[collectionType] || {
      sizes: this.config.optimization.sizes,
      formats: this.config.optimization.formats,
      quality: this.config.optimization.quality,
      generateThumbnails: true
    };
  }

  /**
   * Find all images in a directory
   */
  async findAllImages(dir, recursive = true) {
    const images = [];
    const validExtensions = this.config.validation.validFormats;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && recursive) {
          const subImages = await this.findAllImages(fullPath, recursive);
          images.push(...subImages);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (validExtensions.includes(ext)) {
            images.push(fullPath);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to read directory: ${dir}`, error);
    }

    return images;
  }

  /**
   * Process promises sequentially
   */
  async processSequentially(promises) {
    const results = [];
    for (const promise of promises) {
      if (typeof promise === 'function') {
        results.push(await promise());
      } else {
        results.push(await promise);
      }
    }
    return results;
  }

  /**
   * Calculate optimization statistics
   */
  calculateOptimizationStats(inputPath, inputStats, metadata, thumbnailMetadata = {}) {
    const inputSize = inputStats.size;
    let totalOptimizedSize = 0;
    let imageCount = 0;

    // Count optimized images
    for (const format in metadata) {
      metadata[format].forEach(image => {
        if (image.size) {
          totalOptimizedSize += image.size;
          imageCount++;
        }
      });
    }

    // Count thumbnails
    for (const format in thumbnailMetadata) {
      thumbnailMetadata[format].forEach(image => {
        if (image.size) {
          totalOptimizedSize += image.size;
          imageCount++;
        }
      });
    }

    const averageOptimizedSize = imageCount > 0 ? totalOptimizedSize / imageCount : 0;
    const compressionRatio = inputSize > 0 ?
      Math.round(((inputSize - averageOptimizedSize) / inputSize) * 100) : 0;

    return {
      inputSize,
      totalOptimizedSize,
      averageOptimizedSize,
      compressionRatio,
      imageCount,
      formatsGenerated: Object.keys(metadata).length,
      thumbnailCount: Object.keys(thumbnailMetadata).reduce((sum, format) =>
        sum + thumbnailMetadata[format].length, 0)
    };
  }

  /**
   * Get optimized image paths from metadata
   */
  getOptimizedPaths(metadata) {
    const paths = [];

    for (const format in metadata) {
      metadata[format].forEach(image => {
        paths.push({
          format,
          width: image.width,
          height: image.height,
          path: image.outputPath,
          url: image.url,
          size: image.size || null
        });
      });
    }

    return paths.sort((a, b) => a.width - b.width);
  }

  /**
   * Get the main image path (largest JPEG)
   */
  getMainImagePath(metadata) {
    const jpegImages = metadata.jpeg || [];
    return jpegImages.length > 0 ? jpegImages[jpegImages.length - 1].outputPath : null;
  }

  /**
   * Generate responsive HTML
   */
  generateResponsiveHTML(metadata, options = {}) {
    const alt = options.alt || '';
    const className = options.className || '';
    const sizes = options.sizes || '100vw';
    const loading = options.loading || 'lazy';

    return Image.generateHTML(metadata, {
      alt,
      sizes,
      loading,
      decoding: 'async',
      class: className
    });
  }

  /**
   * Generate srcset string
   */
  generateSrcSet(metadata) {
    const srcsets = {};

    for (const format in metadata) {
      const images = metadata[format];
      srcsets[format] = images
        .map(img => `${img.url} ${img.width}w`)
        .join(', ');
    }

    return srcsets;
  }

  /**
   * Generate picture element
   */
  generatePictureElement(metadata, options = {}) {
    const alt = options.alt || '';
    const className = options.className || '';
    const sizes = options.sizes || '100vw';

    let html = '<picture';
    if (className) html += ` class="${className}"`;
    html += '>\n';

    // Add source elements for each format (WebP first)
    const formats = ['webp', 'jpeg', 'png'].filter(format => metadata[format]);

    for (let i = 0; i < formats.length - 1; i++) {
      const format = formats[i];
      const images = metadata[format];
      const srcset = images.map(img => `${img.url} ${img.width}w`).join(', ');
      html += `  <source type="image/${format}" srcset="${srcset}" sizes="${sizes}">\n`;
    }

    // Add fallback img element
    if (formats.length > 0) {
      const fallbackFormat = formats[formats.length - 1];
      const fallbackImages = metadata[fallbackFormat];
      const fallbackSrc = fallbackImages[0]?.url || '';
      const fallbackSrcset = fallbackImages.map(img => `${img.url} ${img.width}w`).join(', ');

      html += `  <img src="${fallbackSrc}" srcset="${fallbackSrcset}" sizes="${sizes}" alt="${alt}" loading="lazy">\n`;
    }

    html += '</picture>';
    return html;
  }

  /**
   * Generate batch optimization report
   */
  generateBatchReport(results) {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const totalInputSize = successful.reduce((sum, r) => sum + (r.stats?.inputSize || 0), 0);
    const totalOutputSize = successful.reduce((sum, r) => sum + (r.stats?.totalOptimizedSize || 0), 0);

    const averageCompressionRatio = successful.length > 0 ?
      successful.reduce((sum, r) => sum + (r.stats?.compressionRatio || 0), 0) / successful.length : 0;

    return {
      totalImages: results.length,
      successful: successful.length,
      failed: failed.length,
      successRate: results.length > 0 ? (successful.length / results.length * 100).toFixed(2) + '%' : '0%',
      totalInputSize,
      totalOutputSize,
      totalSavings: totalInputSize - totalOutputSize,
      averageCompressionRatio: Math.round(averageCompressionRatio),
      processingTime: this.stats.endTime - this.stats.startTime,
      errors: failed.map(r => ({ path: r.inputPath, error: r.error }))
    };
  }

  /**
   * Get current optimization statistics
   */
  getOptimizationStats() {
    return {
      ...this.stats,
      duration: this.stats.endTime ? this.stats.endTime - this.stats.startTime : null,
      successRate: this.stats.totalProcessed > 0 ?
        (this.stats.successful / this.stats.totalProcessed * 100).toFixed(2) + '%' : '0%',
      averageCompressionRatio: this.stats.totalInputSize > 0 ?
        Math.round(((this.stats.totalInputSize - this.stats.totalOutputSize) / this.stats.totalInputSize) * 100) : 0
    };
  }

  /**
   * Utility method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup and generate final report
   */
  async cleanup() {
    if (this.logger) {
      const finalStats = this.getOptimizationStats();
      this.logger.info('Image optimizer cleanup completed', finalStats);
      await this.logger.cleanup();
    }
  }
}

// Export the unified optimizer and convenience functions
module.exports = {
  UnifiedImageOptimizer,

  // Convenience factory function
  createOptimizer: (config = {}) => new UnifiedImageOptimizer(config),

  // Direct optimization functions for backward compatibility
  optimizeImage: async (inputPath, options = {}) => {
    const optimizer = new UnifiedImageOptimizer();
    return optimizer.optimizeImage(inputPath, options);
  },

  optimizeBatch: async (inputPaths, options = {}) => {
    const optimizer = new UnifiedImageOptimizer();
    return optimizer.optimizeBatch(inputPaths, options);
  },

  optimizeDirectory: async (directory, options = {}) => {
    const optimizer = new UnifiedImageOptimizer();
    return optimizer.optimizeDirectory(directory, options);
  },

  createResponsiveVariants: async (inputPath, sizes = [], options = {}) => {
    const optimizer = new UnifiedImageOptimizer();
    return optimizer.createResponsiveVariants(inputPath, sizes, options);
  },

  optimizeForCollection: async (inputPath, collectionType, options = {}) => {
    const optimizer = new UnifiedImageOptimizer();
    return optimizer.optimizeForCollection(inputPath, collectionType, options);
  }
};