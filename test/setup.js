/**
 * Global Test Setup
 * Similar to datasette-enrichments conftest.py
 * Runs before all tests to configure the test environment
 */

const path = require('path');

// Set test environment
process.env.NODE_ENV = 'test';

// Configure test paths
global.TEST_ROOT = __dirname;
global.PROJECT_ROOT = path.join(__dirname, '..');

// Make helpers globally available (optional)
global.createFixtures = require('./helpers/fixtures').createFixtures;
global.asyncUtils = require('./helpers/async-utils');

// Global error handlers for unhandled rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in tests:', reason);
});

// Suppress certain warnings during tests
const originalWarn = console.warn;
console.warn = function(...args) {
  const message = args.join(' ');
  // Filter out noise during tests
  if (message.includes('DeprecationWarning')) {
    return;
  }
  originalWarn.apply(console, args);
};

console.log('Test environment initialized');
console.log(`Node version: ${process.version}`);
console.log(`Test directory: ${TEST_ROOT}`);
