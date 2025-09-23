#!/usr/bin/env node

/**
 * Unified Image Optimizer Usage Examples
 *
 * This script demonstrates various ways to use the unified image optimizer.
 */

const path = require('path');
const {
  UnifiedImageOptimizer,
  createOptimizer,
  optimizeImage,
  optimizeBatch,
  optimizeDirectory,
  createResponsiveVariants,
  optimizeForCollection
} = require('./unified-image-optimizer');

async function runExamples() {
  console.log('🎯 Unified Image Optimizer Usage Examples\n');

  // Example 1: Simple single image optimization
  console.log('📸 Example 1: Simple single image optimization');
  try {
    // Using convenience function
    const result = await optimizeImage('src/assets/images/books-on-books/Unknown_-Richard_Prince_Zach_Sebastian_NULL.jpg', {
      outputDir: 'examples/simple-optimization',
      sizes: [400, 800],
      formats: ['webp', 'jpeg'],
      generateThumbnails: true
    });

    if (result.success) {
      console.log(`   ✅ Generated ${result.outputPaths.length} optimized variants`);
      console.log(`   ✅ Generated ${result.thumbnailPaths.length} thumbnails`);
      console.log(`   📊 Compression: ${result.stats.compressionRatio}%`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Example 2: Collection-specific optimization
  console.log('\n🏷️  Example 2: Collection-specific optimization');
  try {
    const result = await optimizeForCollection(
      'src/assets/images/books-on-books/Unknown_-Richard_Prince_Zach_Sebastian_NULL.jpg',
      'book-covers',
      {
        outputDir: 'examples/book-covers'
      }
    );

    if (result.success) {
      console.log(`   ✅ Book cover optimization complete`);
      console.log(`   📏 Generated sizes: ${result.outputPaths.map(p => p.width + 'w').join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Example 3: Responsive variants with HTML
  console.log('\n📱 Example 3: Responsive variants with HTML');
  try {
    const result = await createResponsiveVariants(
      'src/assets/images/books-on-books/Unknown_-Richard_Prince_Zach_Sebastian_NULL.jpg',
      [400, 800, 1200],
      {
        alt: 'Example book cover',
        className: 'responsive-image',
        outputDir: 'examples/responsive'
      }
    );

    if (result.success) {
      console.log(`   ✅ Responsive variants created`);
      console.log(`   🔗 HTML generated: ${result.html ? 'Yes' : 'No'}`);
      console.log(`   📊 Formats: ${Object.keys(result.srcset).join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Example 4: Using the optimizer class directly
  console.log('\n🔧 Example 4: Using optimizer class with custom configuration');
  try {
    const optimizer = new UnifiedImageOptimizer({
      optimization: {
        formats: ['webp', 'jpeg'],
        sizes: [300, 600, 900],
        quality: {
          webp: 85,
          jpeg: 90
        }
      },
      directories: {
        optimized: 'examples/custom-optimizer',
        thumbnails: 'examples/custom-thumbnails'
      }
    });

    const result = await optimizer.optimizeImage(
      'src/assets/images/books-on-books/Unknown_-Richard_Prince_Zach_Sebastian_NULL.jpg',
      {
        generateThumbnails: true,
        imageData: {
          url: 'https://example.com/cover.jpg',
          bookData: {
            title: 'Example Book',
            author_last: 'Author',
            isbn: '1234567890'
          }
        }
      }
    );

    if (result.success) {
      console.log(`   ✅ Custom optimization complete`);
      console.log(`   🎯 Quality settings: WebP ${optimizer.config.optimization.quality.webp}%, JPEG ${optimizer.config.optimization.quality.jpeg}%`);
    }

    // Get optimizer statistics
    const stats = optimizer.getOptimizationStats();
    console.log(`   📊 Total processed: ${stats.totalProcessed}`);
    console.log(`   📊 Success rate: ${stats.successRate}`);

    await optimizer.cleanup();
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Example 5: Batch processing with progress tracking
  console.log('\n📦 Example 5: Batch processing (if multiple images available)');
  try {
    const testImages = [
      'src/assets/images/books-on-books/Unknown_-Richard_Prince_Zach_Sebastian_NULL.jpg',
      'src/assets/images/books-on-books/Unknown_-Neue_Welt_Cologne_Taschen_NULL.jpg'
    ].filter(img => {
      try {
        require('fs').accessSync(img);
        return true;
      } catch {
        return false;
      }
    });

    if (testImages.length > 0) {
      const result = await optimizeBatch(testImages, {
        batchSize: 2,
        outputDir: 'examples/batch-optimization',
        generateThumbnails: true
      });

      if (result.success) {
        console.log(`   ✅ Batch complete: ${result.summary.successful}/${result.summary.totalImages} images`);
        console.log(`   ⏱️  Processing time: ${Math.round(result.summary.processingTime / 1000)}s`);
        console.log(`   💾 Space saved: ${Math.round(result.summary.totalSavings / 1024)}KB`);
      }
    } else {
      console.log('   ⏭️  Skipped: No additional test images found');
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n🎉 Examples completed!');
  console.log('\n💡 Key Features Demonstrated:');
  console.log('   • Single image optimization with custom settings');
  console.log('   • Collection-specific optimization presets');
  console.log('   • Responsive image generation with HTML/CSS');
  console.log('   • Custom optimizer configuration');
  console.log('   • Batch processing with progress tracking');
  console.log('   • Integration with logger and cache systems');
  console.log('   • Comprehensive statistics and reporting');
}

if (require.main === module) {
  runExamples().catch(error => {
    console.error('💥 Examples failed:', error);
    process.exit(1);
  });
}

module.exports = { runExamples };