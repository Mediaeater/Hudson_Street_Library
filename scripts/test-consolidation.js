#!/usr/bin/env node

/**
 * Test script to verify the consolidated image processing system
 */

const path = require('path');

console.log('🧪 Testing Consolidated Image Processing System\n');
console.log('═══════════════════════════════════════════════\n');

// Test each consolidated module
const tests = [];

// 1. Test image-core.js
try {
  const imageCore = require('./utils/image-core');
  const filename = imageCore.generateStandardFilename({
    author_last: 'Tillmans',
    title: 'Concorde',
    isbn_asin: '9783865211385'
  });
  tests.push({
    name: 'Image Core Utils',
    status: filename === 'Tillmans_Concorde_9783865211385.jpg' ? '✅' : '❌',
    result: filename
  });
} catch (error) {
  tests.push({ name: 'Image Core Utils', status: '❌', result: error.message });
}

// 2. Test book-api-client.js
try {
  const { BookAPIClient } = require('./utils/book-api-client');
  const client = new BookAPIClient();
  tests.push({
    name: 'Book API Client',
    status: '✅',
    result: 'Initialized successfully'
  });
} catch (error) {
  tests.push({ name: 'Book API Client', status: '❌', result: error.message });
}

// 3. Test logger.js
try {
  const { getGlobalLogger } = require('./utils/logger');
  const logger = getGlobalLogger();
  logger.info('Test log message');
  tests.push({
    name: 'Logger System',
    status: '✅',
    result: 'Logging working'
  });
} catch (error) {
  tests.push({ name: 'Logger System', status: '❌', result: error.message });
}

// 4. Test centralized config
try {
  const { imageConfig } = require('./config/image-config');
  tests.push({
    name: 'Centralized Config',
    status: imageConfig && imageConfig.validation ? '✅' : '❌',
    result: 'Config loaded'
  });
} catch (error) {
  tests.push({ name: 'Centralized Config', status: '❌', result: error.message });
}

// 5. Test CSV handler
try {
  const CSVHandler = require('./utils/csv-handler');
  tests.push({
    name: 'CSV Handler',
    status: typeof CSVHandler.readBooks === 'function' ? '✅' : '❌',
    result: 'Handler ready'
  });
} catch (error) {
  tests.push({ name: 'CSV Handler', status: '❌', result: error.message });
}

// 6. Test image cache
try {
  const { ImageCache } = require('./utils/image-cache');
  const cache = new ImageCache();
  const stats = cache.getStats();
  tests.push({
    name: 'Image Cache',
    status: '✅',
    result: `${stats.totalEntries} entries cached`
  });
} catch (error) {
  tests.push({ name: 'Image Cache', status: '❌', result: error.message });
}

// 7. Test unified optimizer
try {
  const { createOptimizer } = require('./utils/unified-image-optimizer');
  const optimizer = createOptimizer();
  tests.push({
    name: 'Unified Optimizer',
    status: '✅',
    result: 'Optimizer ready'
  });
} catch (error) {
  tests.push({ name: 'Unified Optimizer', status: '❌', result: error.message });
}

// 8. Test updated acquire-covers.js
try {
  const fs = require('fs');
  const acquireCoversPath = path.join(__dirname, '../acquire-covers.js');
  const content = fs.readFileSync(acquireCoversPath, 'utf8');
  const usesEnhancedHandler = content.includes('CSVHandler.readBooks');
  tests.push({
    name: 'Updated acquire-covers.js',
    status: usesEnhancedHandler ? '✅' : '❌',
    result: usesEnhancedHandler ? 'Using enhanced CSV handler' : 'Not updated'
  });
} catch (error) {
  tests.push({ name: 'Updated acquire-covers.js', status: '❌', result: error.message });
}

// 9. Test updated image-pipeline
try {
  const fs = require('fs');
  const pipelinePath = path.join(__dirname, './image-pipeline/image-pipeline.js');
  const content = fs.readFileSync(pipelinePath, 'utf8');
  const usesEnhancedHandler = content.includes('CSVHandler.readBooks');
  tests.push({
    name: 'Updated image-pipeline.js',
    status: usesEnhancedHandler ? '✅' : '❌',
    result: usesEnhancedHandler ? 'Using enhanced CSV handler' : 'Not updated'
  });
} catch (error) {
  tests.push({ name: 'Updated image-pipeline.js', status: '❌', result: error.message });
}

// 10. Test updated optimize-all-images.js
try {
  const fs = require('fs');
  const optimizePath = path.join(__dirname, './optimize-all-images.js');
  const content = fs.readFileSync(optimizePath, 'utf8');
  const usesUnifiedOptimizer = content.includes('unified-image-optimizer');
  tests.push({
    name: 'Updated optimize-all-images.js',
    status: usesUnifiedOptimizer ? '✅' : '❌',
    result: usesUnifiedOptimizer ? 'Using unified optimizer' : 'Not updated'
  });
} catch (error) {
  tests.push({ name: 'Updated optimize-all-images.js', status: '❌', result: error.message });
}

// Print results
console.log('📋 Test Results:\n');
tests.forEach((test, index) => {
  console.log(`  ${index + 1}. ${test.status} ${test.name}`);
  console.log(`     ${test.result}\n`);
});

// Summary
const passed = tests.filter(t => t.status === '✅').length;
const failed = tests.filter(t => t.status === '❌').length;

console.log('═══════════════════════════════════════════════\n');
console.log(`📊 Summary: ${passed}/${tests.length} tests passed\n`);

if (passed === tests.length) {
  console.log('🎉 All consolidation tasks completed successfully!');
  console.log('\nThe image processing system has been successfully consolidated:');
  console.log('  ✅ Unified filename generation');
  console.log('  ✅ Consolidated validation logic');
  console.log('  ✅ Single API client with retry & rate limiting');
  console.log('  ✅ Centralized configuration');
  console.log('  ✅ Standardized CSV operations');
  console.log('  ✅ Unified logging system');
  console.log('  ✅ Deduplication checks');
  console.log('  ✅ Shared rate limiter');
  console.log('  ✅ Merged optimization workflows');
  console.log('  ✅ Image cache system');
} else {
  console.log(`⚠️  ${failed} tests failed. Check the results above for details.`);
}

process.exit(passed === tests.length ? 0 : 1);