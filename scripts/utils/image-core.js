/**
 * Consolidated Image Utilities Module
 *
 * This module consolidates all image-related functionality that was previously
 * duplicated across multiple files:
 * - acquire-covers.js (line 444)
 * - cover-utils.js (lines 300, 353)
 * - scripts/utils/image-processor.js (lines 128-140)
 * - scripts/image-pipeline/image-pipeline.js (lines 188-204)
 *
 * Provides unified:
 * - Filename generation and sanitization
 * - Image validation with consistent criteria
 * - Configuration management
 * - Deduplication checking
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// Optional dependency - gracefully handle if not available
let sizeOf;
try {
    sizeOf = promisify(require('image-size'));
} catch (error) {
    console.warn('image-size package not available - dimension validation disabled');
    sizeOf = null;
}

/**
 * Shared configuration object for all image-related settings
 */
const IMAGE_CONFIG = {
    // File validation settings
    validation: {
        minSize: 3000,              // 3KB minimum file size
        maxSize: 5000000,           // 5MB maximum file size (warning only)
        minDimensions: {
            width: 200,
            height: 300
        },
        validFormats: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff']
    },

    // Filename generation settings
    naming: {
        pattern: '{author_last}_{title}_{isbn}',
        sanitize: true,
        maxLength: 100,
        extension: '.jpg'
    },

    // Deduplication settings
    deduplication: {
        checkSize: true,
        checkFilename: true,
        fuzzyMatch: false
    }
};

/**
 * Standardized filename generation function
 * Consolidates logic from multiple files with consistent sanitization
 *
 * @param {Object} bookData - Book information object
 * @param {string} bookData.author_last - Author's last name
 * @param {string} bookData.author_first - Author's first name (optional)
 * @param {string} bookData.title - Book title
 * @param {string} bookData.isbn_asin - ISBN or ASIN identifier
 * @param {string} bookData.id - Fallback ID if isbn_asin not available
 * @param {Object} options - Generation options (optional)
 * @param {string} options.pattern - Custom filename pattern
 * @param {string} options.extension - File extension (default: .jpg)
 * @param {number} options.maxLength - Maximum filename length
 * @returns {string} Standardized filename
 */
function generateStandardFilename(bookData, options = {}) {
    const config = { ...IMAGE_CONFIG.naming, ...options };

    // Extract data with fallbacks
    const parts = {
        author_last: bookData.author_last || 'Unknown',
        author_first: bookData.author_first || '',
        title: bookData.title || 'Unknown',
        isbn: bookData.isbn_asin || bookData.id || 'NoID'
    };

    // Build filename from pattern or default structure
    let filename;
    if (config.pattern && config.pattern.includes('{')) {
        // Use pattern-based generation
        filename = config.pattern
            .replace('{author_last}', parts.author_last)
            .replace('{author_first}', parts.author_first)
            .replace('{title}', parts.title)
            .replace('{isbn}', parts.isbn);
    } else {
        // Use standard structure: author_last_title_isbn
        filename = `${parts.author_last}_${parts.title}_${parts.isbn}`;
    }

    // Sanitize filename
    if (config.sanitize) {
        filename = sanitizeFilename(filename);
    }

    // Apply length limit
    if (config.maxLength && filename.length > config.maxLength) {
        filename = filename.substring(0, config.maxLength);
    }

    // Add extension
    const extension = config.extension || '.jpg';
    return filename + extension;
}

/**
 * Sanitize filename by removing invalid characters
 * Consolidates sanitization logic from multiple files
 *
 * @param {string} filename - Raw filename to sanitize
 * @returns {string} Sanitized filename
 */
function sanitizeFilename(filename) {
    return filename
        // Remove invalid filesystem characters
        .replace(/[<>:"/\\|?*]/g, '')
        // Replace spaces and other special chars with underscores
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        // Collapse multiple underscores
        .replace(/_+/g, '_')
        // Remove leading/trailing underscores
        .replace(/^_|_$/g, '');
}

/**
 * Unified image validation with consistent criteria
 * Consolidates validation logic from image-processor.js and other files
 *
 * @param {string} filePath - Path to image file to validate
 * @param {Object} options - Validation options (optional)
 * @returns {Promise<Object>} Validation result object
 */
async function validateImage(filePath, options = {}) {
    const config = { ...IMAGE_CONFIG.validation, ...options };

    const result = {
        valid: true,
        errors: [],
        warnings: [],
        stats: {
            path: filePath,
            filename: path.basename(filePath)
        }
    };

    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            result.valid = false;
            result.errors.push('File does not exist');
            return result;
        }

        // Check file extension
        const ext = path.extname(filePath).toLowerCase();
        if (!config.validFormats.includes(ext)) {
            result.valid = false;
            result.errors.push(`Invalid format: ${ext}. Supported: ${config.validFormats.join(', ')}`);
        }

        // Check file size
        const stats = fs.statSync(filePath);
        result.stats.size = stats.size;

        if (stats.size < config.minSize) {
            result.valid = false;
            result.errors.push(`File too small: ${stats.size} bytes (minimum: ${config.minSize})`);
        } else if (stats.size > config.maxSize) {
            result.warnings.push(`File very large: ${stats.size} bytes (consider optimizing)`);
        }

        // Check dimensions if image-size is available
        if (sizeOf) {
            try {
                const dimensions = await sizeOf(filePath);
                result.stats.width = dimensions.width;
                result.stats.height = dimensions.height;
                result.stats.type = dimensions.type;

                if (dimensions.width < config.minDimensions.width ||
                    dimensions.height < config.minDimensions.height) {
                    result.warnings.push(
                        `Small dimensions: ${dimensions.width}x${dimensions.height} ` +
                        `(recommended minimum: ${config.minDimensions.width}x${config.minDimensions.height})`
                    );
                }
            } catch (dimError) {
                result.warnings.push('Could not read image dimensions');
            }
        }

        // Additional format-specific validation could go here

    } catch (error) {
        result.valid = false;
        result.errors.push(`Validation error: ${error.message}`);
    }

    return result;
}

/**
 * Batch validate multiple images in a directory
 *
 * @param {string} dirPath - Directory containing images to validate
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Batch validation summary
 */
async function validateImageDirectory(dirPath, options = {}) {
    const config = { ...IMAGE_CONFIG.validation, ...options };

    if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath)
        .filter(file => config.validFormats.includes(path.extname(file).toLowerCase()));

    const results = {
        total: files.length,
        valid: 0,
        invalid: 0,
        warnings: 0,
        details: [],
        summary: {
            errors: [],
            commonIssues: new Map()
        }
    };

    for (const file of files) {
        const filePath = path.join(dirPath, file);
        const validation = await validateImage(filePath, options);

        results.details.push({
            file,
            ...validation
        });

        if (validation.valid) {
            results.valid++;
        } else {
            results.invalid++;
            results.summary.errors.push({
                file,
                errors: validation.errors
            });
        }

        if (validation.warnings.length > 0) {
            results.warnings++;
        }

        // Track common issues
        validation.errors.forEach(error => {
            const issue = error.split(':')[0]; // Get error type
            results.summary.commonIssues.set(
                issue,
                (results.summary.commonIssues.get(issue) || 0) + 1
            );
        });
    }

    return results;
}

/**
 * Find duplicate images by size and optionally by filename pattern
 * Consolidates deduplication logic from image-processor.js
 *
 * @param {string} dirPath - Directory to scan for duplicates
 * @param {Object} options - Deduplication options
 * @returns {Promise<Array>} Groups of potential duplicate files
 */
async function findDuplicateImages(dirPath, options = {}) {
    const config = { ...IMAGE_CONFIG.deduplication, ...options };

    if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath)
        .filter(file => IMAGE_CONFIG.validation.validFormats.includes(path.extname(file).toLowerCase()));

    const duplicateGroups = [];

    if (config.checkSize) {
        // Group files by size
        const sizeMap = new Map();

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            try {
                const stats = fs.statSync(filePath);
                const key = stats.size;

                if (!sizeMap.has(key)) {
                    sizeMap.set(key, []);
                }
                sizeMap.get(key).push({
                    file,
                    path: filePath,
                    size: stats.size
                });
            } catch (error) {
                console.warn(`Could not stat file ${file}: ${error.message}`);
            }
        }

        // Find groups with multiple files (potential duplicates)
        for (const [size, fileGroup] of sizeMap.entries()) {
            if (fileGroup.length > 1) {
                duplicateGroups.push({
                    type: 'size',
                    key: `${size}-bytes`,
                    files: fileGroup,
                    count: fileGroup.length
                });
            }
        }
    }

    if (config.checkFilename && config.fuzzyMatch) {
        // Additional filename-based deduplication could be implemented here
        // This would involve comparing normalized filenames for similar patterns
    }

    return duplicateGroups;
}

/**
 * Get comprehensive image statistics for a directory
 *
 * @param {string} dirPath - Directory to analyze
 * @param {Object} options - Analysis options
 * @returns {Promise<Object>} Comprehensive statistics
 */
async function getImageStats(dirPath, options = {}) {
    const validation = await validateImageDirectory(dirPath, options);
    const duplicates = await findDuplicateImages(dirPath, options);

    const stats = {
        directory: dirPath,
        timestamp: new Date().toISOString(),
        files: {
            total: validation.total,
            valid: validation.valid,
            invalid: validation.invalid,
            withWarnings: validation.warnings
        },
        duplicates: {
            groups: duplicates.length,
            totalDuplicateFiles: duplicates.reduce((sum, group) => sum + group.count - 1, 0)
        },
        validation: validation.summary,
        recommendations: []
    };

    // Generate recommendations
    if (stats.files.invalid > 0) {
        stats.recommendations.push(`Fix ${stats.files.invalid} invalid image files`);
    }
    if (stats.duplicates.totalDuplicateFiles > 0) {
        stats.recommendations.push(`Review ${stats.duplicates.totalDuplicateFiles} potential duplicate files`);
    }
    if (stats.files.withWarnings > 0) {
        stats.recommendations.push(`Consider optimizing ${stats.files.withWarnings} files with warnings`);
    }

    return stats;
}

/**
 * Check if a file with the given book data already exists
 * Helps prevent duplicate downloads
 *
 * @param {Object} bookData - Book information
 * @param {string} searchDir - Directory to search in
 * @param {Object} options - Search options
 * @returns {Object} Existence check result
 */
function checkImageExists(bookData, searchDir, options = {}) {
    const expectedFilename = generateStandardFilename(bookData, options);
    const expectedPath = path.join(searchDir, expectedFilename);

    const result = {
        exists: false,
        filename: expectedFilename,
        path: expectedPath,
        alternateMatches: []
    };

    // Check exact match
    if (fs.existsSync(expectedPath)) {
        result.exists = true;
        return result;
    }

    // Check for alternate matches if fuzzy matching is enabled
    if (options.fuzzyMatch && fs.existsSync(searchDir)) {
        const isbn = bookData.isbn_asin || bookData.id;
        if (isbn) {
            const files = fs.readdirSync(searchDir);
            const matches = files.filter(file =>
                file.toLowerCase().includes(isbn.toLowerCase()) ||
                (bookData.author_last && file.toLowerCase().includes(bookData.author_last.toLowerCase()))
            );
            result.alternateMatches = matches;
        }
    }

    return result;
}

module.exports = {
    // Configuration
    IMAGE_CONFIG,

    // Core functions
    generateStandardFilename,
    sanitizeFilename,
    validateImage,
    validateImageDirectory,
    findDuplicateImages,
    getImageStats,
    checkImageExists,

    // Aliases for backward compatibility
    generateFilename: generateStandardFilename,
    validate: validateImage,
    findDuplicates: findDuplicateImages
};