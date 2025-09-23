/**
 * Centralized Image Configuration for Hudson Street Library
 *
 * This file consolidates all image-related configuration from:
 * - acquire-covers.js (lines 107-118)
 * - scripts/image-pipeline/pipeline-config.js
 * - scripts/utils/image-processor.js (lines 12-15)
 * - scripts/utils/image-core.js (IMAGE_CONFIG)
 *
 * Provides a single source of truth for all image processing operations.
 */

const path = require('path');

/**
 * Base paths relative to project root
 */
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * Create a frozen configuration object that consolidates all image settings
 */
const createImageConfig = () => {
  const config = {
    // ===== API CONFIGURATION =====
    apis: {
      // External cover image sources
      openLibrary: 'https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg',
      googleBooks: 'https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}',
      worldcat: 'http://covers.oclc.org/ImageWebSvc/GetCover?isbn={isbn}&size=L',

      // API Keys (from environment variables)
      googleBooksKey: process.env.GOOGLE_BOOKS_API_KEY || null,
      worldcatKey: process.env.WORLDCAT_API_KEY || null,

      // Request configuration
      userAgent: process.env.USER_AGENT || 'Hudson Street Library Cover Acquisition Tool',
      timeout: parseInt(process.env.API_TIMEOUT_MS) || 30000, // 30 seconds
    },

    // ===== RATE LIMITING & RETRY CONFIGURATION =====
    rateLimiting: {
      // Base delays between requests
      baseDelay: parseInt(process.env.BASE_DELAY_MS) || 1000,
      batchDelay: parseInt(process.env.BATCH_DELAY_MS) || 10000, // 10 seconds between batches

      // Retry configuration
      maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
      retryDelay: parseInt(process.env.RETRY_DELAY_MS) || 2000,
      backoffMultiplier: parseFloat(process.env.BACKOFF_MULTIPLIER) || 1.5,

      // Batch processing
      batchSize: parseInt(process.env.BATCH_SIZE) || 10,
      parallelProcessing: process.env.PARALLEL_PROCESSING !== 'false', // Default true
    },

    // ===== DIRECTORY STRUCTURE =====
    directories: {
      // Source directories
      csvPath: path.join(PROJECT_ROOT, 'src/_data/books.csv'),
      assets: path.join(PROJECT_ROOT, 'src/assets/images'),
      books: path.join(PROJECT_ROOT, 'src/assets/images/books'),

      // Processing directories
      incoming: path.join(PROJECT_ROOT, 'incoming-images'),
      processing: path.join(PROJECT_ROOT, 'temp-processing'),

      // Output directories
      optimized: path.join(PROJECT_ROOT, '_site/assets/images/optimized'),
      thumbnails: path.join(PROJECT_ROOT, '_site/assets/images/thumbnails'),

      // Ensure these directories exist at runtime
      ensureExists: [
        'books',
        'incoming',
        'processing',
        'optimized',
        'thumbnails'
      ]
    },

    // ===== IMAGE VALIDATION & REQUIREMENTS =====
    validation: {
      // File size constraints
      minSize: parseInt(process.env.MIN_IMAGE_SIZE) || 3000,     // 3KB minimum
      maxSize: parseInt(process.env.MAX_IMAGE_SIZE) || 5000000,  // 5MB maximum (warning only)

      // Dimension requirements
      minDimensions: {
        width: parseInt(process.env.MIN_WIDTH) || 200,
        height: parseInt(process.env.MIN_HEIGHT) || 300
      },

      // Supported formats
      validFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff'],

      // Validation strictness
      strictMode: process.env.STRICT_VALIDATION === 'true',

      // Matching thresholds for cover acquisition
      authorMatchThreshold: parseFloat(process.env.AUTHOR_MATCH_THRESHOLD) || 0.8,
      titleMatchThreshold: parseFloat(process.env.TITLE_MATCH_THRESHOLD) || 0.8,
    },

    // ===== IMAGE OPTIMIZATION SETTINGS =====
    optimization: {
      // Responsive image sizes
      sizes: [300, 600, 900, 1200],
      thumbnailSizes: [150, 300],

      // Output formats and quality
      formats: ['webp', 'jpeg'],
      quality: {
        webp: parseInt(process.env.WEBP_QUALITY) || 80,
        jpeg: parseInt(process.env.JPEG_QUALITY) || 85,
        png: parseInt(process.env.PNG_QUALITY) || 90
      },

      // Optimization flags
      progressive: process.env.PROGRESSIVE_JPEG !== 'false', // Default true
      stripMetadata: process.env.STRIP_METADATA !== 'false', // Default true
    },

    // ===== FILE NAMING CONVENTIONS =====
    naming: {
      // Filename pattern (supports {author_last}, {author_first}, {title}, {isbn})
      pattern: process.env.FILENAME_PATTERN || '{author_last}_{title}_{isbn}',

      // Sanitization settings
      sanitize: process.env.SANITIZE_FILENAMES !== 'false', // Default true
      maxLength: parseInt(process.env.MAX_FILENAME_LENGTH) || 100,

      // Default extension
      extension: process.env.DEFAULT_EXTENSION || '.jpg',

      // Filename generation options
      includeAuthorFirst: process.env.INCLUDE_AUTHOR_FIRST === 'true',
      lowercaseFilenames: process.env.LOWERCASE_FILENAMES === 'true',
    },

    // ===== DEDUPLICATION SETTINGS =====
    deduplication: {
      checkSize: process.env.CHECK_SIZE_DUPLICATES !== 'false', // Default true
      checkFilename: process.env.CHECK_FILENAME_DUPLICATES === 'true',
      fuzzyMatch: process.env.FUZZY_MATCH_DUPLICATES === 'true',

      // Hash-based deduplication (future feature)
      enableHashing: process.env.ENABLE_HASH_DEDUP === 'true',
      hashAlgorithm: process.env.HASH_ALGORITHM || 'md5',
    },

    // ===== PIPELINE CONFIGURATION =====
    pipeline: {
      // Processing steps in order
      steps: [
        'validate',
        'extract_metadata',
        'find_missing_images',
        'optimize',
        'categorize',
        'organize',
        'update_records'
      ],

      // Pipeline behavior
      parallelProcessing: process.env.PIPELINE_PARALLEL !== 'false', // Default true
      batchSize: parseInt(process.env.PIPELINE_BATCH_SIZE) || 10,
      continueOnError: process.env.CONTINUE_ON_ERROR === 'true',

      // Skip steps (comma-separated list)
      skipSteps: process.env.SKIP_PIPELINE_STEPS ?
        process.env.SKIP_PIPELINE_STEPS.split(',').map(s => s.trim()) : [],
    },

    // ===== LOGGING & MONITORING =====
    logging: {
      level: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
      logDirectory: path.join(PROJECT_ROOT, 'scripts/logs'),

      // Log file settings
      maxLogFiles: parseInt(process.env.MAX_LOG_FILES) || 10,
      maxLogSize: parseInt(process.env.MAX_LOG_SIZE) || 10 * 1024 * 1024, // 10MB

      // Progress reporting
      progressReporting: process.env.PROGRESS_REPORTING !== 'false', // Default true
      progressInterval: parseInt(process.env.PROGRESS_INTERVAL) || 100, // Every 100 operations
    },

    // ===== COLLECTION MAPPING =====
    collections: {
      // Collection directories (inherited from pipeline-config.js)
      mapping: {
        fiction: 'fiction',
        nonfiction: 'non-fiction',
        biography: 'biography',
        history: 'history',
        science: 'science',
        technology: 'technology',
        arts: 'arts',
        reference: 'reference'
      },

      // Auto-categorization
      enableAutoCategorization: process.env.AUTO_CATEGORIZE === 'true',
      defaultCollection: process.env.DEFAULT_COLLECTION || 'uncategorized',
    },

    // ===== CACHE CONFIGURATION =====
    cache: {
      enabled: process.env.ENABLE_CACHE !== 'false', // Default true
      ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour in seconds
      maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 1000, // Max cached items

      // Cache storage
      directory: path.join(PROJECT_ROOT, 'temp-cache'),
      cleanupInterval: parseInt(process.env.CACHE_CLEANUP_INTERVAL) || 86400, // 24 hours
    },

    // ===== FEATURE FLAGS =====
    features: {
      enableWebp: process.env.ENABLE_WEBP !== 'false', // Default true
      enableThumbnails: process.env.ENABLE_THUMBNAILS !== 'false', // Default true
      enableOptimization: process.env.ENABLE_OPTIMIZATION !== 'false', // Default true
      enableProgressiveJpeg: process.env.ENABLE_PROGRESSIVE !== 'false', // Default true

      // Experimental features
      enableAITitleMatching: process.env.ENABLE_AI_MATCHING === 'true',
      enableColorAnalysis: process.env.ENABLE_COLOR_ANALYSIS === 'true',
    }
  };

  // Freeze the configuration to prevent accidental mutations
  return Object.freeze(config);
};

/**
 * Get a specific configuration section
 * @param {string} section - Configuration section name
 * @returns {Object} The requested configuration section
 */
const getConfigSection = (section) => {
  const config = createImageConfig();
  if (!(section in config)) {
    throw new Error(`Unknown configuration section: ${section}`);
  }
  return config[section];
};

/**
 * Validate that required environment variables are set
 * @returns {Object} Validation result with missing variables
 */
const validateEnvironment = () => {
  const required = [
    // Add any truly required environment variables here
    // Most have sensible defaults, but some APIs might require keys
  ];

  const optional = [
    'GOOGLE_BOOKS_API_KEY',
    'WORLDCAT_API_KEY',
    'BASE_DELAY_MS',
    'MAX_RETRIES',
    'LOG_LEVEL'
  ];

  const missing = required.filter(var_name => !process.env[var_name]);
  const present = optional.filter(var_name => process.env[var_name]);

  return {
    valid: missing.length === 0,
    missing,
    optional: {
      set: present,
      available: optional
    },
    warnings: missing.length === 0 ? [] : [
      `Missing required environment variables: ${missing.join(', ')}`
    ]
  };
};

/**
 * Create the main configuration object
 */
const imageConfig = createImageConfig();

// Export the frozen configuration and utilities
module.exports = {
  // Main configuration object (frozen)
  default: imageConfig,
  imageConfig,

  // Utility functions
  getConfigSection,
  validateEnvironment,

  // Quick access to commonly used sections
  apis: imageConfig.apis,
  directories: imageConfig.directories,
  validation: imageConfig.validation,
  optimization: imageConfig.optimization,
  naming: imageConfig.naming,
  rateLimiting: imageConfig.rateLimiting,
  pipeline: imageConfig.pipeline,

  // Constants for backward compatibility
  CSV_PATH: imageConfig.directories.csvPath,
  IMAGES_DIR: imageConfig.directories.books,
  USER_AGENT: imageConfig.apis.userAgent,
  VALID_FORMATS: imageConfig.validation.validFormats,
  MIN_SIZE: imageConfig.validation.minSize,
  MAX_SIZE: imageConfig.validation.maxSize,
  MIN_DIMENSIONS: imageConfig.validation.minDimensions,
};