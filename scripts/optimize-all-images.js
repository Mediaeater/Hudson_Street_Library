#!/usr/bin/env node

/**
 * Image Optimization Script - Updated to use Unified Image Optimizer
 *
 * This script has been updated to use the new unified image optimizer
 * which consolidates optimization functionality across the project.
 */

const path = require('path');
const { optimizeDirectory, createOptimizer } = require('./utils/unified-image-optimizer');

async function main() {
  console.log('🚀 Starting Image Optimization with Unified Optimizer...\n');

  const assetsDir = path.join(__dirname, '../src/assets/images');

  try {
    // Create optimizer instance with custom config
    const optimizer = createOptimizer({
      optimization: {
        // Keep the original sizes from the old script
        sizes: [300, 600, 900, 1200],
        formats: ['webp', 'jpeg']
      }
    });

    // Use the unified optimizer to process the directory
    const result = await optimizer.optimizeDirectory(assetsDir, {
      batchSize: 5,
      recursive: true,
      generateThumbnails: true
    });

    if (result.success) {
      const summary = result.summary;
      console.log('\n✅ Optimization Complete!');
      console.log(`   Processed: ${summary.totalImages} images`);
      console.log(`   Successful: ${summary.successful} images`);
      console.log(`   Failed: ${summary.failed} images`);
      console.log(`   Success Rate: ${summary.successRate}`);
      console.log(`   Total Space Saved: ${Math.round(summary.totalSavings / 1024)} KB`);
      console.log(`   Average Compression: ${summary.averageCompressionRatio}%`);
      console.log(`   Processing Time: ${Math.round(summary.processingTime / 1000)}s`);

      if (summary.failed > 0) {
        console.log('\n⚠️  Failed Images:');
        summary.errors.forEach(error => {
          console.log(`   - ${path.basename(error.path)}: ${error.error}`);
        });
      }
    } else {
      console.error('❌ Optimization failed:', result.error);
      process.exit(1);
    }

    // Clean up
    await optimizer.cleanup();

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Legacy exports for backward compatibility
async function optimizeImage(imagePath, options = {}) {
  const { optimizeImage: unifiedOptimizeImage } = require('./utils/unified-image-optimizer');
  return unifiedOptimizeImage(imagePath, {
    sizes: [300, 600, 900, 1200],
    formats: ['webp', 'jpeg'],
    ...options
  });
}

async function findAllImages(dir) {
  const optimizer = createOptimizer();
  await optimizer.initialize();
  return optimizer.findAllImages(dir, true);
}

if (require.main === module) {
  main();
}

module.exports = { optimizeImage, findAllImages };