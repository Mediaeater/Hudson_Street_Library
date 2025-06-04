// Image Optimization Module (integrates with existing @11ty/eleventy-img)
const Image = require('@11ty/eleventy-img');
const fs = require('fs').promises;
const path = require('path');

class ImageOptimizer {
  constructor(config) {
    this.config = config;
  }

  async optimizeImage(inputPath, options = {}) {
    console.log(`⚡ Optimizing: ${path.basename(inputPath)}`);
    
    try {
      const outputDir = options.outputDir || this.config.directories.optimized;
      const settings = { ...this.config.optimization, ...options };
      
      // Generate optimized images using eleventy-img
      const metadata = await Image(inputPath, {
        widths: settings.sizes,
        formats: settings.formats,
        outputDir: outputDir,
        urlPath: "/assets/images/optimized/",
        filenameFormat: (id, src, width, format) => {
          const name = path.basename(src, path.extname(src));
          return `${name}-${width}w.${format}`;
        },
        sharpWebpOptions: {
          quality: settings.quality.webp
        },
        sharpJpegOptions: {
          quality: settings.quality.jpeg,
          progressive: true
        }
      });

      // Generate thumbnails separately
      const thumbnailMetadata = await this.generateThumbnails(inputPath, settings);
      
      const result = {
        main: this.getMainImagePath(metadata),
        optimized: this.getOptimizedPaths(metadata),
        thumbnails: this.getOptimizedPaths(thumbnailMetadata),
        metadata: metadata,
        thumbnailMetadata: thumbnailMetadata,
        stats: this.calculateOptimizationStats(inputPath, metadata, thumbnailMetadata)
      };

      console.log(`✅ Generated ${result.optimized.length + result.thumbnails.length} optimized variants`);
      console.log(`📊 Size reduction: ${result.stats.compressionRatio}%`);
      
      return result;

    } catch (error) {
      console.error(`❌ Optimization failed: ${error.message}`);
      throw error;
    }
  }

  async generateThumbnails(inputPath, settings) {
    console.log(`🖼️  Generating thumbnails...`);
    
    const metadata = await Image(inputPath, {
      widths: settings.thumbnailSizes || [150, 300],
      formats: settings.formats,
      outputDir: this.config.directories.thumbnails,
      urlPath: "/assets/images/thumbnails/",
      filenameFormat: (id, src, width, format) => {
        const name = path.basename(src, path.extname(src));
        return `${name}-thumb-${width}w.${format}`;
      },
      sharpWebpOptions: {
        quality: settings.quality.webp
      },
      sharpJpegOptions: {
        quality: settings.quality.jpeg,
        progressive: true
      }
    });

    return metadata;
  }

  async optimizeBatch(inputPaths, options = {}) {
    console.log(`⚡ Batch optimizing ${inputPaths.length} images...`);
    
    const results = [];
    const batchSize = options.batchSize || this.config.pipeline.batchSize;
    
    for (let i = 0; i < inputPaths.length; i += batchSize) {
      const batch = inputPaths.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}`);
      
      const batchPromises = batch.map(async (inputPath) => {
        try {
          const result = await this.optimizeImage(inputPath, options);
          return { success: true, inputPath, result };
        } catch (error) {
          console.error(`❌ Failed to optimize ${inputPath}: ${error.message}`);
          return { success: false, inputPath, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const successful = results.filter(r => r.success).length;
    console.log(`✅ Successfully optimized ${successful}/${inputPaths.length} images`);
    
    return results;
  }

  async createResponsiveVariants(inputPath, sizes = [], options = {}) {
    console.log(`📱 Creating responsive variants...`);
    
    const responsiveSizes = sizes.length > 0 ? sizes : this.config.optimization.sizes;
    
    const metadata = await Image(inputPath, {
      widths: responsiveSizes,
      formats: this.config.optimization.formats,
      outputDir: options.outputDir || this.config.directories.optimized,
      urlPath: options.urlPath || "/assets/images/optimized/",
      filenameFormat: (id, src, width, format) => {
        const name = path.basename(src, path.extname(src));
        const suffix = options.suffix || '';
        return `${name}${suffix}-${width}w.${format}`;
      }
    });

    return {
      metadata,
      variants: this.getOptimizedPaths(metadata),
      html: this.generateResponsiveHTML(metadata, options)
    };
  }

  generateResponsiveHTML(metadata, options = {}) {
    const alt = options.alt || '';
    const className = options.className || '';
    const sizes = options.sizes || '100vw';
    
    return Image.generateHTML(metadata, {
      alt,
      sizes,
      loading: 'lazy',
      decoding: 'async',
      class: className
    });
  }

  async optimizeForCollection(inputPath, collectionType, options = {}) {
    console.log(`🏷️  Optimizing for collection: ${collectionType}`);
    
    // Collection-specific optimization settings
    const collectionSettings = {
      'book-covers': {
        sizes: [200, 400, 600],
        formats: ['webp', 'jpeg'],
        quality: { webp: 85, jpeg: 90 }
      },
      'collection-heroes': {
        sizes: [800, 1200, 1600, 2000],
        formats: ['webp', 'jpeg'],
        quality: { webp: 80, jpeg: 85 }
      },
      'thumbnails': {
        sizes: [100, 150, 200],
        formats: ['webp', 'jpeg'],
        quality: { webp: 75, jpeg: 80 }
      },
      'gallery': {
        sizes: [400, 800, 1200],
        formats: ['webp', 'jpeg'],
        quality: { webp: 80, jpeg: 85 }
      }
    };

    const settings = collectionSettings[collectionType] || this.config.optimization;
    return await this.optimizeImage(inputPath, { ...settings, ...options });
  }

  getMainImagePath(metadata) {
    // Return the largest JPEG version as the main image
    const jpegImages = metadata.jpeg || [];
    return jpegImages.length > 0 ? jpegImages[jpegImages.length - 1].outputPath : null;
  }

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

  async calculateOptimizationStats(inputPath, metadata, thumbnailMetadata = {}) {
    try {
      const inputStats = await fs.stat(inputPath);
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
        formatsGenerated: Object.keys(metadata).length
      };
      
    } catch (error) {
      console.error(`⚠️  Could not calculate optimization stats: ${error.message}`);
      return {
        inputSize: 0,
        totalOptimizedSize: 0,
        averageOptimizedSize: 0,
        compressionRatio: 0,
        imageCount: 0,
        formatsGenerated: 0
      };
    }
  }

  async cleanupOptimized(olderThanDays = 7) {
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
          const stats = await fs.stat(filePath);
          const ext = path.extname(file).substring(1);
          
          if (dir === this.config.directories.optimized) {
            report.optimizedCount++;
          } else {
            report.thumbnailCount++;
          }
          
          report.totalSize += stats.size;
          report.formats.add(ext);
        }
      } catch (error) {
        console.error(`⚠️  Error reading ${dir}: ${error.message}`);
      }
    }
    
    report.formats = Array.from(report.formats);
    report.totalSizeMB = Math.round(report.totalSize / (1024 * 1024) * 100) / 100;
    
    return report;
  }
}

module.exports = ImageOptimizer;