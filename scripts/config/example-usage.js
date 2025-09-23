/**
 * Example Usage of Centralized Image Configuration
 *
 * This file demonstrates how to use the centralized image-config.js
 * in various parts of the Hudson Street Library project.
 */

const {
  imageConfig,
  getConfigSection,
  validateEnvironment,
  // Quick access imports
  apis,
  directories,
  validation,
  rateLimiting
} = require('./image-config');

// ===== BASIC USAGE EXAMPLES =====

// Example 1: Using the full configuration object
console.log('Full config available:', !!imageConfig);
console.log('API timeout:', imageConfig.apis.timeout);
console.log('Batch size:', imageConfig.rateLimiting.batchSize);

// Example 2: Using quick access imports
console.log('Books directory:', directories.books);
console.log('Valid formats:', validation.validFormats);
console.log('Base delay:', rateLimiting.baseDelay);

// Example 3: Getting specific configuration sections
const optimizationConfig = getConfigSection('optimization');
console.log('WEBP quality:', optimizationConfig.quality.webp);

const cachingConfig = getConfigSection('cache');
console.log('Cache enabled:', cachingConfig.enabled);

// ===== ENVIRONMENT VALIDATION =====

// Check if environment is properly configured
const envCheck = validateEnvironment();
if (!envCheck.valid) {
  console.warn('Environment validation failed:', envCheck.warnings);
} else {
  console.log('Environment validation passed');
}

console.log('Optional env vars set:', envCheck.optional.set);

// ===== MIGRATION EXAMPLES =====

// Before (from acquire-covers.js):
// const config = {
//     baseDelay: parseInt(process.env.BASE_DELAY_MS) || 1000,
//     maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
//     // ...
// };

// After (using centralized config):
const legacyConfig = {
  baseDelay: rateLimiting.baseDelay,
  maxRetries: rateLimiting.maxRetries,
  retryDelay: rateLimiting.retryDelay,
  backoffMultiplier: rateLimiting.backoffMultiplier,
  authorMatchThreshold: validation.authorMatchThreshold,
  titleMatchThreshold: validation.titleMatchThreshold
};

// Before (from image-processor.js):
// static VALID_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
// static MIN_SIZE = 3000;
// static MAX_SIZE = 5000000;

// After:
const processorConfig = {
  VALID_FORMATS: validation.validFormats,
  MIN_SIZE: validation.minSize,
  MAX_SIZE: validation.maxSize,
  MIN_DIMENSIONS: validation.minDimensions
};

// Before (from pipeline-config.js):
// directories: {
//     incoming: path.join(__dirname, '../../incoming-images'),
//     processing: path.join(__dirname, '../../temp-processing'),
//     // ...
// }

// After:
const pipelineDirectories = directories; // Already properly configured

// ===== ADVANCED USAGE PATTERNS =====

// Pattern 1: Feature flag checking
if (imageConfig.features.enableWebp) {
  console.log('WebP generation is enabled');
}

// Pattern 2: Environment-specific configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const effectiveTimeout = isDevelopment ?
  imageConfig.apis.timeout * 2 : // Longer timeout in dev
  imageConfig.apis.timeout;

// Pattern 3: Dynamic API URL construction
const buildApiUrl = (provider, isbn) => {
  const template = imageConfig.apis[provider];
  if (!template) {
    throw new Error(`Unknown API provider: ${provider}`);
  }
  return template.replace('{isbn}', isbn);
};

// Example: const url = buildApiUrl('openLibrary', '9780123456789');

// Pattern 4: Safe configuration access with fallbacks
const getSafeConfig = (path, fallback) => {
  try {
    return path.split('.').reduce((obj, key) => obj[key], imageConfig);
  } catch (error) {
    return fallback;
  }
};

// Example: const quality = getSafeConfig('optimization.quality.webp', 80);

// ===== TESTING HELPERS =====

// Helper function to create test configuration overrides
const createTestConfig = (overrides = {}) => {
  return {
    ...imageConfig,
    ...overrides,
    directories: {
      ...imageConfig.directories,
      ...overrides.directories
    }
  };
};

// Example test configuration with different directories
const testConfig = createTestConfig({
  directories: {
    books: '/tmp/test-books',
    processing: '/tmp/test-processing'
  },
  rateLimiting: {
    baseDelay: 0, // No delays in tests
    maxRetries: 1
  }
});

// ===== VALIDATION HELPERS =====

// Helper to validate directory structure
const validateDirectories = () => {
  const fs = require('fs');
  const issues = [];

  for (const [name, path] of Object.entries(directories)) {
    if (typeof path === 'string' && !fs.existsSync(path)) {
      issues.push(`Directory missing: ${name} at ${path}`);
    }
  }

  return {
    valid: issues.length === 0,
    issues
  };
};

// Helper to check API accessibility
const checkApiEndpoints = async () => {
  const fetch = require('node-fetch');
  const results = {};

  for (const [provider, url] of Object.entries(apis)) {
    if (typeof url === 'string' && url.startsWith('http')) {
      try {
        // Simple HEAD request to check if endpoint is reachable
        const testUrl = url.replace('{isbn}', '1234567890');
        const response = await fetch(testUrl, {
          method: 'HEAD',
          timeout: 5000
        });
        results[provider] = {
          accessible: response.status < 500,
          status: response.status
        };
      } catch (error) {
        results[provider] = {
          accessible: false,
          error: error.message
        };
      }
    }
  }

  return results;
};

// Export examples for potential use in other files
module.exports = {
  legacyConfig,
  processorConfig,
  createTestConfig,
  validateDirectories,
  checkApiEndpoints,
  buildApiUrl,
  getSafeConfig
};