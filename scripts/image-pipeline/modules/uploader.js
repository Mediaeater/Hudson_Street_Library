// Image Upload and Folder Management Module
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { getGlobalLogger } = require('../../utils/logger');

class ImageUploader {
  constructor(config) {
    this.config = config;

    // Initialize logger
    this.logger = getGlobalLogger({
      level: config.logging?.level || 'info',
      logDir: config.logging?.logDirectory || path.join(__dirname, '../logs'),
      includeEmojis: true
    });

    // Statistics tracking
    this.stats = {
      totalUploaded: 0,
      successful: 0,
      failed: 0,
      totalSize: 0,
      uploadSources: {},
      lastUploadedAt: null
    };

    // Cloud storage configuration (prepared for future use)
    this.cloudStorage = {
      provider: config.cloudStorage?.provider || 'local', // 'local', 's3', 'gcs', 'azure'
      enabled: config.cloudStorage?.enabled || false,
      config: config.cloudStorage?.config || {}
    };

    // Rate limiting for uploads
    this.rateLimiter = {
      maxConcurrent: config.rateLimiting?.maxConcurrentUploads || 5,
      activeUploads: 0,
      queue: []
    };

    this.logger.info('ImageUploader initialized', {
      storageProvider: this.cloudStorage.provider,
      cloudEnabled: this.cloudStorage.enabled,
      maxConcurrent: this.rateLimiter.maxConcurrent
    });
  }

  async uploadImage(imagePath, options = {}) {
    const operationId = this.logger.trackOperation('upload-image', 'started', { imagePath });
    this.logger.logFileOperation('upload', imagePath, options);

    try {
      // Validate input
      if (!imagePath || !await this.fileExists(imagePath)) {
        throw new Error(`Image file does not exist: ${imagePath}`);
      }

      // Check file type
      if (!this.isImageFile(path.basename(imagePath))) {
        throw new Error(`Unsupported file type: ${path.extname(imagePath)}`);
      }

      // Get file stats for tracking
      const stats = await fs.stat(imagePath);
      const fileSize = stats.size;

      // Check file size limits
      const maxFileSize = this.config.validation?.maxFileSize || 50 * 1024 * 1024; // 50MB
      if (fileSize > maxFileSize) {
        throw new Error(`File too large: ${Math.round(fileSize / 1024 / 1024)}MB > ${Math.round(maxFileSize / 1024 / 1024)}MB`);
      }

      // Wait for rate limiter
      await this.acquireUploadSlot();

      try {
        let uploadPath;

        if (this.cloudStorage.enabled) {
          // Upload to cloud storage
          uploadPath = await this.uploadToCloud(imagePath, options);
        } else {
          // Upload to local storage
          uploadPath = await this.uploadToLocal(imagePath, options);
        }

        // Update statistics
        this.updateStats(imagePath, fileSize, true);
        this.logger.updateOperation(operationId, 'completed', { uploadPath, fileSize });
        this.logger.success(`Image uploaded successfully: ${path.basename(imagePath)}`, { uploadPath });

        return uploadPath;

      } finally {
        this.releaseUploadSlot();
      }

    } catch (error) {
      this.updateStats(imagePath, 0, false);
      this.logger.updateOperation(operationId, 'failed', { error: error.message });
      this.logger.error(`Upload failed for ${path.basename(imagePath)}`, error);
      throw error;
    }
  }

  async uploadMultiple(imagePaths, options = {}) {
    console.log(`📤 Uploading ${imagePaths.length} images...`);
    
    const results = [];
    for (const imagePath of imagePaths) {
      try {
        const uploadedPath = await this.uploadImage(imagePath, options);
        results.push({ 
          success: true, 
          originalPath: imagePath, 
          uploadedPath 
        });
      } catch (error) {
        results.push({ 
          success: false, 
          originalPath: imagePath, 
          error: error.message 
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Successfully uploaded ${successful}/${imagePaths.length} images`);
    
    return results;
  }

  async scanFolder(folderPath, options = {}) {
    console.log(`📁 Scanning folder: ${folderPath}`);
    
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true });
      const imageFiles = [];
      
      for (const file of files) {
        const fullPath = path.join(folderPath, file.name);
        
        if (file.isFile() && this.isImageFile(file.name)) {
          imageFiles.push(fullPath);
        } else if (file.isDirectory() && options.recursive) {
          const subFiles = await this.scanFolder(fullPath, options);
          imageFiles.push(...subFiles);
        }
      }
      
      console.log(`📊 Found ${imageFiles.length} image files`);
      return imageFiles;
      
    } catch (error) {
      console.error(`❌ Scan failed: ${error.message}`);
      throw error;
    }
  }

  async addToIncoming(sourcePath, metadata = {}) {
    console.log(`➕ Adding to incoming: ${path.basename(sourcePath)}`);
    
    try {
      const filename = this.generateDescriptiveFilename(sourcePath, metadata);
      const incomingPath = path.join(this.config.directories.incoming, filename);
      
      await fs.copyFile(sourcePath, incomingPath);
      
      // Create metadata sidecar file
      const metadataPath = incomingPath + '.meta.json';
      await fs.writeFile(metadataPath, JSON.stringify({
        originalPath: sourcePath,
        addedAt: new Date().toISOString(),
        metadata
      }, null, 2));
      
      console.log(`✅ Added to incoming with metadata`);
      return { imagePath: incomingPath, metadataPath };
      
    } catch (error) {
      console.error(`❌ Failed to add to incoming: ${error.message}`);
      throw error;
    }
  }

  async organizeIncoming() {
    console.log(`🗂️  Organizing incoming directory...`);
    
    try {
      const incomingDir = this.config.directories.incoming;
      const files = await fs.readdir(incomingDir);
      
      const organized = {
        images: [],
        metadata: [],
        processed: 0
      };
      
      for (const file of files) {
        const filePath = path.join(incomingDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          if (this.isImageFile(file)) {
            organized.images.push(filePath);
          } else if (file.endsWith('.meta.json')) {
            organized.metadata.push(filePath);
          }
        }
      }
      
      console.log(`📊 Incoming inventory:`);
      console.log(`   Images: ${organized.images.length}`);
      console.log(`   Metadata files: ${organized.metadata.length}`);
      
      return organized;
      
    } catch (error) {
      console.error(`❌ Failed to organize incoming: ${error.message}`);
      throw error;
    }
  }

  async generateUniqueFilename(originalPath) {
    const ext = path.extname(originalPath);
    const basename = path.basename(originalPath, ext);
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(originalPath + timestamp).digest('hex').substring(0, 8);
    
    return `${basename}_${timestamp}_${hash}${ext}`;
  }

  generateDescriptiveFilename(originalPath, metadata = {}) {
    const ext = path.extname(originalPath);
    let name = path.basename(originalPath, ext);
    
    // Add metadata to filename if available
    if (metadata.title) {
      name = this.sanitizeFilename(metadata.title);
    } else if (metadata.isbn) {
      name = `isbn_${metadata.isbn}`;
    }
    
    return `${name}${ext}`;
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^\w\-_.]/g, '')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.config.supportedTypes.includes(ext);
  }

  async getIncomingCount() {
    try {
      const files = await fs.readdir(this.config.directories.incoming);
      return files.filter(file => this.isImageFile(file)).length;
    } catch {
      return 0;
    }
  }

  async clearProcessed() {
    this.logger.processing('Clearing processed files...');

    const processedDir = this.config.directories.processing;
    try {
      const files = await fs.readdir(processedDir);
      let cleared = 0;

      for (const file of files) {
        await fs.unlink(path.join(processedDir, file));
        cleared++;
      }

      this.logger.success(`Cleared ${cleared} processed files`);
      return cleared;
    } catch (error) {
      this.logger.error('Failed to clear processed files', error);
      return 0;
    }
  }

  /**
   * Upload to local storage
   */
  async uploadToLocal(imagePath, options = {}) {
    // Ensure incoming directory exists
    await fs.mkdir(this.config.directories.incoming, { recursive: true });

    // Generate filename
    const filename = options.preserveOriginalName ?
      path.basename(imagePath) :
      await this.generateUniqueFilename(imagePath);

    const uploadPath = path.join(this.config.directories.incoming, filename);

    // Check if file already exists
    if (await this.fileExists(uploadPath) && !options.overwrite) {
      throw new Error(`File already exists: ${filename}`);
    }

    // Copy file to incoming directory
    await fs.copyFile(imagePath, uploadPath);

    // Create metadata sidecar if metadata provided
    if (options.metadata) {
      const metadataPath = uploadPath + '.meta.json';
      await fs.writeFile(metadataPath, JSON.stringify({
        originalPath: imagePath,
        uploadedAt: new Date().toISOString(),
        metadata: options.metadata,
        source: options.source || 'manual'
      }, null, 2));
    }

    return uploadPath;
  }

  /**
   * Upload to cloud storage (placeholder for future implementation)
   */
  async uploadToCloud(imagePath, options = {}) {
    switch (this.cloudStorage.provider) {
      case 's3':
        return this.uploadToS3(imagePath, options);
      case 'gcs':
        return this.uploadToGCS(imagePath, options);
      case 'azure':
        return this.uploadToAzure(imagePath, options);
      default:
        throw new Error(`Unsupported cloud storage provider: ${this.cloudStorage.provider}`);
    }
  }

  /**
   * Upload to AWS S3 (placeholder)
   */
  async uploadToS3(imagePath, options = {}) {
    // Placeholder for S3 upload implementation
    this.logger.warn('S3 upload not yet implemented, falling back to local storage');
    return this.uploadToLocal(imagePath, options);

    // Future implementation would use AWS SDK:
    /*
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3(this.cloudStorage.config.s3);

    const fileBuffer = await fs.readFile(imagePath);
    const key = options.key || path.basename(imagePath);

    const uploadResult = await s3.upload({
      Bucket: this.cloudStorage.config.s3.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: this.getMimeType(imagePath)
    }).promise();

    return uploadResult.Location;
    */
  }

  /**
   * Upload to Google Cloud Storage (placeholder)
   */
  async uploadToGCS(imagePath, options = {}) {
    // Placeholder for GCS upload implementation
    this.logger.warn('GCS upload not yet implemented, falling back to local storage');
    return this.uploadToLocal(imagePath, options);
  }

  /**
   * Upload to Azure Blob Storage (placeholder)
   */
  async uploadToAzure(imagePath, options = {}) {
    // Placeholder for Azure upload implementation
    this.logger.warn('Azure upload not yet implemented, falling back to local storage');
    return this.uploadToLocal(imagePath, options);
  }

  /**
   * Rate limiting: acquire upload slot
   */
  async acquireUploadSlot() {
    return new Promise((resolve) => {
      if (this.rateLimiter.activeUploads < this.rateLimiter.maxConcurrent) {
        this.rateLimiter.activeUploads++;
        resolve();
      } else {
        this.rateLimiter.queue.push(resolve);
      }
    });
  }

  /**
   * Rate limiting: release upload slot
   */
  releaseUploadSlot() {
    this.rateLimiter.activeUploads--;
    if (this.rateLimiter.queue.length > 0) {
      const next = this.rateLimiter.queue.shift();
      this.rateLimiter.activeUploads++;
      next();
    }
  }

  /**
   * Helper method to check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update internal statistics
   */
  updateStats(imagePath, fileSize, success) {
    this.stats.totalUploaded++;
    this.stats.lastUploadedAt = new Date().toISOString();

    if (success) {
      this.stats.successful++;
      this.stats.totalSize += fileSize;

      // Track upload source
      const source = path.dirname(imagePath);
      this.stats.uploadSources[source] = (this.stats.uploadSources[source] || 0) + 1;
    } else {
      this.stats.failed++;
    }
  }

  /**
   * Get module statistics
   */
  getModuleStats() {
    const successRate = this.stats.totalUploaded > 0 ?
      (this.stats.successful / this.stats.totalUploaded * 100).toFixed(2) + '%' : '0%';

    const averageFileSize = this.stats.successful > 0 ?
      Math.round(this.stats.totalSize / this.stats.successful) : 0;

    return {
      ...this.stats,
      successRate,
      averageFileSize,
      averageFileSizeFormatted: this.formatFileSize(averageFileSize),
      totalSizeFormatted: this.formatFileSize(this.stats.totalSize),
      topUploadSources: Object.entries(this.stats.uploadSources)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  }

  /**
   * Format file size for human readability
   */
  formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  /**
   * Get MIME type for file extension
   */
  getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.tiff': 'image/tiff',
      '.bmp': 'image/bmp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Validate uploader configuration
   */
  validateConfig() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check required directories
    const requiredDirs = ['incoming', 'processing'];
    for (const dirKey of requiredDirs) {
      if (!this.config.directories?.[dirKey]) {
        validation.errors.push(`Missing required directory configuration: ${dirKey}`);
        validation.isValid = false;
      }
    }

    // Check supported types
    if (!this.config.supportedTypes || this.config.supportedTypes.length === 0) {
      validation.warnings.push('No supported file types configured');
    }

    // Check cloud storage configuration
    if (this.cloudStorage.enabled) {
      if (!this.cloudStorage.config || Object.keys(this.cloudStorage.config).length === 0) {
        validation.warnings.push('Cloud storage enabled but no configuration provided');
      }
    }

    return validation;
  }

  /**
   * Run tests to verify uploader functionality
   */
  async runTests() {
    this.logger.info('Running uploader tests...');

    const testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Test 1: Configuration validation
    try {
      const configValidation = this.validateConfig();
      if (configValidation.isValid) {
        testResults.tests.push({ name: 'Configuration validation', status: 'passed' });
        testResults.passed++;
      } else {
        testResults.tests.push({
          name: 'Configuration validation',
          status: 'failed',
          error: configValidation.errors.join(', ')
        });
        testResults.failed++;
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Configuration validation',
        status: 'failed',
        error: error.message
      });
      testResults.failed++;
    }

    // Test 2: Directory accessibility
    try {
      const incomingDir = this.config.directories.incoming;
      await fs.access(incomingDir, fs.constants.W_OK).catch(() =>
        fs.mkdir(incomingDir, { recursive: true })
      );
      testResults.tests.push({ name: 'Directory accessibility', status: 'passed' });
      testResults.passed++;
    } catch (error) {
      testResults.tests.push({
        name: 'Directory accessibility',
        status: 'failed',
        error: error.message
      });
      testResults.failed++;
    }

    // Test 3: File type validation
    try {
      const isValidImage = this.isImageFile('test.jpg');
      const isInvalidFile = this.isImageFile('test.txt');
      if (isValidImage && !isInvalidFile) {
        testResults.tests.push({ name: 'File type validation', status: 'passed' });
        testResults.passed++;
      } else {
        testResults.tests.push({
          name: 'File type validation',
          status: 'failed',
          error: 'File type validation logic error'
        });
        testResults.failed++;
      }
    } catch (error) {
      testResults.tests.push({
        name: 'File type validation',
        status: 'failed',
        error: error.message
      });
      testResults.failed++;
    }

    this.logger.info(`Uploader tests completed: ${testResults.passed} passed, ${testResults.failed} failed`);
    return testResults;
  }

  /**
   * Clean up and generate final report
   */
  async cleanup() {
    // Wait for all uploads to complete
    while (this.rateLimiter.activeUploads > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const stats = this.getModuleStats();
    this.logger.info('Image uploader cleanup completed', stats);
  }
}

module.exports = ImageUploader;