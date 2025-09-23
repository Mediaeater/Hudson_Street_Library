#!/usr/bin/env node

/**
 * Logger Test Script
 * Demonstrates the unified logging system functionality
 */

const { getGlobalLogger } = require('./logger');
const path = require('path');

async function testLogger() {
  console.log('🧪 Testing Unified Logger System\n');

  // Initialize logger
  const logger = getGlobalLogger({
    level: 'debug',
    logDir: path.join(__dirname, '../logs'),
    includeColors: true,
    includeEmojis: true,
    enableFile: true
  });

  // Test basic logging levels
  console.log('=== Testing Basic Logging Levels ===');
  logger.debug('This is a debug message', { component: 'test' });
  logger.info('This is an info message', { component: 'test' });
  logger.warn('This is a warning message', { component: 'test' });
  logger.error('This is an error message', new Error('Test error'), { component: 'test' });

  // Test specialized logging methods
  console.log('\n=== Testing Specialized Methods ===');
  logger.success('Operation completed successfully', { duration: '1.2s' });
  logger.processing('Processing image file', { fileName: 'test-image.jpg' });
  logger.logImageProcess('/path/to/image.jpg', 'optimization', { format: 'jpeg' });
  logger.logOptimization('/path/to/input.jpg', ['/path/to/output1.jpg', '/path/to/output2.jpg'], {
    compressionRatio: 75,
    originalSize: '2MB',
    newSize: '500KB'
  });
  logger.logFileOperation('upload', '/path/to/file.jpg', { destination: 'assets/images' });

  // Test operation tracking
  console.log('\n=== Testing Operation Tracking ===');
  const opId1 = logger.trackOperation('image-optimization', 'started', { file: 'test1.jpg' });
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate work
  logger.updateOperation(opId1, 'completed', { outputSize: '500KB' });

  const opId2 = logger.trackOperation('image-validation', 'started', { file: 'test2.jpg' });
  await new Promise(resolve => setTimeout(resolve, 50)); // Simulate work
  logger.updateOperation(opId2, 'failed', { reason: 'Invalid format' });

  // Test batch processing
  console.log('\n=== Testing Batch Processing ===');
  const batchId = logger.startBatch('test-batch', 5);

  for (let i = 1; i <= 5; i++) {
    logger.processing(`Processing item ${i}`);
    await new Promise(resolve => setTimeout(resolve, 20)); // Simulate work

    if (i === 4) {
      logger.warn(`Warning on item ${i}`, { issue: 'File size too large' });
    }
  }

  logger.endBatch(batchId, { successful: 4, failed: 1 });

  // Test error aggregation
  console.log('\n=== Testing Error Aggregation ===');
  logger.error('Database connection failed', new Error('Connection timeout'), { host: 'localhost' });
  logger.error('File not found', new Error('ENOENT'), { path: '/missing/file.jpg' });

  // Show statistics
  console.log('\n=== Logger Statistics ===');
  logger.printStats();

  // Generate report
  console.log('\n=== Generating Report ===');
  const report = await logger.generateReport(true);
  console.log('Report summary:', report.summary);

  // Show file logging location
  console.log('\n=== Log Files ===');
  console.log(`Logs are being written to: ${logger.config.logDir}`);
  console.log(`Main log file: ${logger.currentLogFile}`);
  console.log(`Error log file: ${logger.generateLogFileName('error')}`);

  // Cleanup
  await logger.cleanup();

  console.log('\n✅ Logger test completed!');
  console.log('📁 Check the logs directory for generated log files');
}

// Run the test
if (require.main === module) {
  testLogger().catch(console.error);
}

module.exports = { testLogger };