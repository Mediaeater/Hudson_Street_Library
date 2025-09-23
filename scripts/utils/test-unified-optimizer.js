#!/usr/bin/env node

/**
 * Test Script for Unified Image Optimizer
 *
 * This script tests the functionality of the unified image optimizer
 * with both single image and batch optimization scenarios.
 */

const path = require('path');
const fs = require('fs').promises;
const {
  UnifiedImageOptimizer,
  createOptimizer,
  optimizeImage,
  optimizeBatch,
  createResponsiveVariants,
  optimizeForCollection
} = require('./unified-image-optimizer');

class OptimizerTester {
  constructor() {
    this.testResults = [];
    this.testDir = path.join(__dirname, '../test-images');
    this.outputDir = path.join(__dirname, '../test-output');
  }

  async runAllTests() {
    console.log('🧪 Starting Unified Image Optimizer Tests...\n');

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Run tests
      await this.testSingleImageOptimization();
      await this.testBatchOptimization();
      await this.testCollectionOptimization();
      await this.testResponsiveVariants();
      await this.testOptimizerClass();
      await this.testConvenienceFunctions();

      // Generate report
      this.generateTestReport();

    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    try {
      // Create test directories
      await fs.mkdir(this.testDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });

      // Check if there are any test images
      const testImages = await this.findTestImages();
      if (testImages.length === 0) {
        console.log('⚠️  No test images found, creating mock test environment');
        this.hasTestImages = false;
      } else {
        console.log(`✅ Found ${testImages.length} test images`);
        this.hasTestImages = true;
        this.testImages = testImages;
      }

    } catch (error) {
      throw new Error(`Failed to setup test environment: ${error.message}`);
    }
  }

  async findTestImages() {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const testImages = [];

    // Look for test images in common locations
    const searchDirs = [
      path.join(__dirname, '../../src/assets/images'),
      path.join(__dirname, '../../temp-processing'),
      this.testDir
    ];

    for (const dir of searchDirs) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (imageExtensions.includes(ext)) {
              testImages.push(path.join(dir, entry.name));
              if (testImages.length >= 3) break; // Limit for testing
            }
          }
        }
        if (testImages.length >= 3) break;
      } catch (error) {
        // Directory doesn't exist, skip
      }
    }

    return testImages;
  }

  async testSingleImageOptimization() {
    console.log('🖼️  Testing single image optimization...');

    if (!this.hasTestImages) {
      this.addTestResult('Single Image Optimization', 'SKIPPED', 'No test images available');
      return;
    }

    try {
      const testImage = this.testImages[0];
      const optimizer = createOptimizer({
        directories: {
          optimized: path.join(this.outputDir, 'single'),
          thumbnails: path.join(this.outputDir, 'single-thumbs')
        }
      });

      const result = await optimizer.optimizeImage(testImage, {
        generateThumbnails: true,
        generateHTML: true
      });

      if (result.success) {
        this.addTestResult('Single Image Optimization', 'PASSED', {
          outputPaths: result.outputPaths.length,
          thumbnailPaths: result.thumbnailPaths.length,
          compressionRatio: result.stats.compressionRatio,
          hasHTML: !!result.responsiveHTML
        });
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.addTestResult('Single Image Optimization', 'FAILED', error.message);
    }
  }

  async testBatchOptimization() {
    console.log('📦 Testing batch optimization...');

    if (!this.hasTestImages || this.testImages.length < 2) {
      this.addTestResult('Batch Optimization', 'SKIPPED', 'Need at least 2 test images');
      return;
    }

    try {
      const optimizer = createOptimizer({
        directories: {
          optimized: path.join(this.outputDir, 'batch'),
          thumbnails: path.join(this.outputDir, 'batch-thumbs')
        }
      });

      const result = await optimizer.optimizeBatch(this.testImages, {
        batchSize: 2,
        generateThumbnails: true
      });

      if (result.success) {
        this.addTestResult('Batch Optimization', 'PASSED', {
          totalImages: result.summary.totalImages,
          successful: result.summary.successful,
          failed: result.summary.failed,
          successRate: result.summary.successRate,
          processingTime: result.summary.processingTime
        });
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.addTestResult('Batch Optimization', 'FAILED', error.message);
    }
  }

  async testCollectionOptimization() {
    console.log('🏷️  Testing collection-specific optimization...');

    if (!this.hasTestImages) {
      this.addTestResult('Collection Optimization', 'SKIPPED', 'No test images available');
      return;
    }

    try {
      const testImage = this.testImages[0];
      const optimizer = createOptimizer({
        directories: {
          optimized: path.join(this.outputDir, 'collection'),
          thumbnails: path.join(this.outputDir, 'collection-thumbs')
        }
      });

      const result = await optimizer.optimizeForCollection(testImage, 'book-covers');

      if (result.success) {
        this.addTestResult('Collection Optimization', 'PASSED', {
          collectionType: 'book-covers',
          outputPaths: result.outputPaths.length,
          compressionRatio: result.stats.compressionRatio
        });
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      this.addTestResult('Collection Optimization', 'FAILED', error.message);
    }
  }

  async testResponsiveVariants() {
    console.log('📱 Testing responsive variants generation...');

    if (!this.hasTestImages) {
      this.addTestResult('Responsive Variants', 'SKIPPED', 'No test images available');
      return;
    }

    try {
      const testImage = this.testImages[0];
      const optimizer = createOptimizer({
        directories: {
          optimized: path.join(this.outputDir, 'responsive')
        }
      });

      const result = await optimizer.createResponsiveVariants(testImage, [400, 800, 1200], {
        alt: 'Test image',
        className: 'responsive-test'
      });

      if (result.success) {
        this.addTestResult('Responsive Variants', 'PASSED', {
          variants: result.variants.length,
          hasHTML: !!result.html,
          hasSrcset: !!result.srcset,
          hasPicture: !!result.picture
        });
      } else {
        throw new Error('Responsive variants failed');
      }

    } catch (error) {
      this.addTestResult('Responsive Variants', 'FAILED', error.message);
    }
  }

  async testOptimizerClass() {
    console.log('🔧 Testing UnifiedImageOptimizer class...');

    try {
      const optimizer = new UnifiedImageOptimizer({
        optimization: {
          formats: ['webp', 'jpeg'],
          quality: { webp: 80, jpeg: 85 }
        }
      });

      await optimizer.initialize();

      // Test configuration access
      const hasConfig = optimizer.config && optimizer.config.optimization;
      const hasLogger = optimizer.logger;
      const hasStats = optimizer.stats;

      this.addTestResult('Optimizer Class', 'PASSED', {
        hasConfig,
        hasLogger,
        hasStats,
        initialized: true
      });

    } catch (error) {
      this.addTestResult('Optimizer Class', 'FAILED', error.message);
    }
  }

  async testConvenienceFunctions() {
    console.log('⚡ Testing convenience functions...');

    if (!this.hasTestImages) {
      this.addTestResult('Convenience Functions', 'SKIPPED', 'No test images available');
      return;
    }

    try {
      const testImage = this.testImages[0];

      // Test single optimize function
      const singleResult = await optimizeImage(testImage, {
        outputDir: path.join(this.outputDir, 'convenience'),
        sizes: [400, 800]
      });

      const hasResult = singleResult && singleResult.success;

      this.addTestResult('Convenience Functions', 'PASSED', {
        singleOptimize: hasResult,
        resultHasMetadata: hasResult && !!singleResult.metadata
      });

    } catch (error) {
      this.addTestResult('Convenience Functions', 'FAILED', error.message);
    }
  }

  addTestResult(testName, status, details) {
    this.testResults.push({
      test: testName,
      status,
      details,
      timestamp: new Date().toISOString()
    });

    const statusEmoji = {
      'PASSED': '✅',
      'FAILED': '❌',
      'SKIPPED': '⏭️'
    };

    console.log(`   ${statusEmoji[status]} ${testName}: ${status}`);
    if (details && typeof details === 'object') {
      console.log(`      ${JSON.stringify(details, null, 6)}`);
    } else if (details) {
      console.log(`      ${details}`);
    }
  }

  generateTestReport() {
    console.log('\n📊 Test Results Summary');
    console.log('========================');

    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const skipped = this.testResults.filter(r => r.status === 'SKIPPED').length;
    const total = this.testResults.length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Success Rate: ${total > 0 ? Math.round((passed / (total - skipped)) * 100) : 0}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED')
        .forEach(result => {
          console.log(`   - ${result.test}: ${result.details}`);
        });
    }

    if (skipped > 0) {
      console.log('\n⏭️  Skipped Tests:');
      this.testResults
        .filter(r => r.status === 'SKIPPED')
        .forEach(result => {
          console.log(`   - ${result.test}: ${result.details}`);
        });
    }

    console.log(`\n${failed === 0 ? '🎉' : '⚠️'} Test suite ${failed === 0 ? 'completed successfully' : 'completed with failures'}!`);
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');

    try {
      // Note: In a real scenario, you might want to clean up test outputs
      // For now, we'll leave them for inspection
      console.log(`   Test outputs left in: ${this.outputDir}`);
    } catch (error) {
      console.warn('⚠️  Cleanup failed:', error.message);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new OptimizerTester();
  tester.runAllTests().catch(error => {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  });
}

module.exports = OptimizerTester;