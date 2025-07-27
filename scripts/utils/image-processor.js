const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const sizeOf = promisify(require('image-size'));

/**
 * Unified image processing utilities for Hudson Street Library
 * Consolidates image validation, processing, and management
 */

class ImageProcessor {
    static VALID_FORMATS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    static MIN_SIZE = 3000; // 3KB minimum
    static MAX_SIZE = 5000000; // 5MB maximum
    static MIN_DIMENSIONS = { width: 200, height: 300 };

    /**
     * Validate image file
     * @param {string} filePath - Path to image file
     * @returns {Object} Validation result
     */
    static async validate(filePath) {
        const result = {
            valid: true,
            errors: [],
            warnings: [],
            stats: {}
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
            if (!this.VALID_FORMATS.includes(ext)) {
                result.valid = false;
                result.errors.push(`Invalid format: ${ext}`);
            }

            // Check file size
            const stats = fs.statSync(filePath);
            result.stats.size = stats.size;

            if (stats.size < this.MIN_SIZE) {
                result.valid = false;
                result.errors.push(`File too small: ${stats.size} bytes`);
            } else if (stats.size > this.MAX_SIZE) {
                result.warnings.push(`File very large: ${stats.size} bytes`);
            }

            // Check dimensions
            try {
                const dimensions = await sizeOf(filePath);
                result.stats.width = dimensions.width;
                result.stats.height = dimensions.height;
                result.stats.type = dimensions.type;

                if (dimensions.width < this.MIN_DIMENSIONS.width || 
                    dimensions.height < this.MIN_DIMENSIONS.height) {
                    result.warnings.push(`Small dimensions: ${dimensions.width}x${dimensions.height}`);
                }
            } catch (dimError) {
                result.warnings.push('Could not read image dimensions');
            }

            result.stats.path = filePath;
            result.stats.filename = path.basename(filePath);

        } catch (error) {
            result.valid = false;
            result.errors.push(`Validation error: ${error.message}`);
        }

        return result;
    }

    /**
     * Batch validate images in directory
     * @param {string} dirPath - Directory containing images
     * @returns {Object} Validation summary
     */
    static async validateDirectory(dirPath) {
        const files = fs.readdirSync(dirPath)
            .filter(file => this.VALID_FORMATS.includes(path.extname(file).toLowerCase()));

        const results = {
            total: files.length,
            valid: 0,
            invalid: 0,
            warnings: 0,
            errors: [],
            details: []
        };

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const validation = await this.validate(filePath);
            
            if (validation.valid) {
                results.valid++;
            } else {
                results.invalid++;
            }

            if (validation.warnings.length > 0) {
                results.warnings++;
            }

            results.details.push({
                file,
                ...validation
            });
        }

        return results;
    }

    /**
     * Generate standardized filename for book covers
     * @param {Object} bookData - Book information
     * @returns {string} Standardized filename
     */
    static generateFilename(bookData) {
        const parts = [
            bookData.author_last || 'Unknown',
            bookData.title || 'Unknown',
            bookData.isbn_asin || bookData.id || 'NoID'
        ];

        return parts
            .map(part => part.toString().replace(/[^a-zA-Z0-9.-]/g, '_'))
            .join('_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') + '.jpg';
    }

    /**
     * Move and rename image file
     * @param {string} sourcePath - Current file path
     * @param {string} destDir - Destination directory
     * @param {string} newName - New filename
     * @returns {string} New file path
     */
    static async moveAndRename(sourcePath, destDir, newName) {
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        const destPath = path.join(destDir, newName);
        
        // Check if destination already exists
        if (fs.existsSync(destPath)) {
            const timestamp = Date.now();
            const ext = path.extname(newName);
            const base = path.basename(newName, ext);
            newName = `${base}_${timestamp}${ext}`;
        }

        fs.renameSync(sourcePath, path.join(destDir, newName));
        return path.join(destDir, newName);
    }

    /**
     * Clean up temporary or invalid images
     * @param {string} dirPath - Directory to clean
     * @param {Object} options - Cleanup options
     */
    static async cleanup(dirPath, options = {}) {
        const {
            removeSmall = true,
            smallThreshold = 1000,
            removeInvalid = true,
            dryRun = false
        } = options;

        const results = {
            scanned: 0,
            removed: 0,
            errors: 0,
            files: []
        };

        const files = fs.readdirSync(dirPath);

        for (const file of files) {
            const filePath = path.join(dirPath, file);
            results.scanned++;

            try {
                const stats = fs.statSync(filePath);
                let shouldRemove = false;
                let reason = '';

                // Check if too small
                if (removeSmall && stats.size < smallThreshold) {
                    shouldRemove = true;
                    reason = `Too small (${stats.size} bytes)`;
                }

                // Check if invalid format
                if (removeInvalid) {
                    const ext = path.extname(file).toLowerCase();
                    if (!this.VALID_FORMATS.includes(ext)) {
                        shouldRemove = true;
                        reason = `Invalid format (${ext})`;
                    }
                }

                if (shouldRemove) {
                    results.files.push({ file, reason, size: stats.size });
                    if (!dryRun) {
                        fs.unlinkSync(filePath);
                        results.removed++;
                    }
                }
            } catch (error) {
                results.errors++;
            }
        }

        return results;
    }

    /**
     * Find duplicate images by size and name pattern
     * @param {string} dirPath - Directory to scan
     * @returns {Array} Groups of potential duplicates
     */
    static async findDuplicates(dirPath) {
        const files = fs.readdirSync(dirPath)
            .filter(file => this.VALID_FORMATS.includes(path.extname(file).toLowerCase()));

        const fileMap = new Map();

        // Group files by size
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            const key = stats.size;

            if (!fileMap.has(key)) {
                fileMap.set(key, []);
            }
            fileMap.get(key).push({
                file,
                path: filePath,
                size: stats.size
            });
        }

        // Return only groups with duplicates
        return Array.from(fileMap.values())
            .filter(group => group.length > 1);
    }

    /**
     * Get image statistics for reporting
     * @param {string} dirPath - Directory to analyze
     */
    static async getStats(dirPath) {
        const validation = await this.validateDirectory(dirPath);
        const duplicates = await this.findDuplicates(dirPath);

        const stats = {
            total: validation.total,
            valid: validation.valid,
            invalid: validation.invalid,
            warnings: validation.warnings,
            duplicateGroups: duplicates.length,
            totalDuplicates: duplicates.reduce((sum, group) => sum + group.length - 1, 0),
            sizeDistribution: {
                tiny: 0,      // < 1KB
                small: 0,     // 1-10KB
                medium: 0,    // 10-100KB
                large: 0,     // 100KB-1MB
                huge: 0       // > 1MB
            }
        };

        // Calculate size distribution
        for (const detail of validation.details) {
            const size = detail.stats.size || 0;
            if (size < 1000) stats.sizeDistribution.tiny++;
            else if (size < 10000) stats.sizeDistribution.small++;
            else if (size < 100000) stats.sizeDistribution.medium++;
            else if (size < 1000000) stats.sizeDistribution.large++;
            else stats.sizeDistribution.huge++;
        }

        return stats;
    }
}

module.exports = ImageProcessor;