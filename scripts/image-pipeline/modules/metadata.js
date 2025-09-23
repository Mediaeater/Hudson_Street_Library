// Metadata Processing Module
const fs = require('fs').promises;
const path = require('path');
const { getGlobalLogger } = require('../../utils/logger');

class MetadataProcessor {
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
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      avgMetadataScore: 0,
      fieldsFound: {
        title: 0,
        author: 0,
        isbn: 0,
        year: 0
      },
      lastProcessedAt: null
    };

    this.logger.info('MetadataProcessor initialized');
  }

  async extractFromImage(imagePath) {
    const operationId = this.logger.trackOperation('extract-metadata', 'started', { imagePath });
    this.logger.logImageProcess(imagePath, 'Starting metadata extraction');

    try {
      // Validate input
      if (!imagePath || !await this.fileExists(imagePath)) {
        throw new Error(`Image file does not exist: ${imagePath}`);
      }

      const metadata = {
        filename: path.basename(imagePath),
        originalPath: imagePath,
        fileSize: 0,
        dimensions: null,
        format: path.extname(imagePath).substring(1).toLowerCase(),
        extractedAt: new Date().toISOString()
      };

      // Get file stats
      const stats = await fs.stat(imagePath);
      metadata.fileSize = stats.size;
      metadata.createdAt = stats.birthtime;
      metadata.modifiedAt = stats.mtime;

      this.logger.debug('Basic file metadata extracted', {
        fileSize: metadata.fileSize,
        format: metadata.format
      });

      // Extract from filename patterns
      try {
        const filenameMetadata = this.extractFromFilename(imagePath);
        Object.assign(metadata, filenameMetadata);
        this.logger.debug('Filename metadata extracted', filenameMetadata);
      } catch (error) {
        this.logger.warn('Filename metadata extraction failed', { error: error.message });
      }

      // Extract EXIF data if available
      try {
        const exifData = await this.extractEXIF(imagePath);
        if (exifData) {
          Object.assign(metadata, exifData);
          this.logger.debug('EXIF data extracted', { hasExif: true });
        }
      } catch (error) {
        this.logger.debug('EXIF extraction failed (this is normal for many images)', { error: error.message });
      }

      // Check for sidecar metadata
      try {
        const sidecarData = await this.extractFromSidecar(imagePath);
        if (sidecarData && Object.keys(sidecarData).length > 0) {
          Object.assign(metadata, sidecarData);
          this.logger.info('Sidecar metadata found and merged');
        }
      } catch (error) {
        this.logger.debug('No sidecar metadata found (this is normal)');
      }

      // Update statistics
      this.updateStats(metadata, true);
      this.logger.updateOperation(operationId, 'completed', { extractedFields: Object.keys(metadata).length });
      this.logger.success('Metadata extraction completed', { fieldsExtracted: Object.keys(metadata).length });

      return metadata;

    } catch (error) {
      this.updateStats(null, false);
      this.logger.updateOperation(operationId, 'failed', { error: error.message });
      this.logger.error(`Metadata extraction failed for ${path.basename(imagePath)}`, error);

      return {
        filename: path.basename(imagePath),
        originalPath: imagePath,
        error: error.message,
        extractedAt: new Date().toISOString()
      };
    }
  }

  extractFromFilename(imagePath) {
    const filename = path.basename(imagePath, path.extname(imagePath));
    const metadata = {};

    // Pattern: Author_Name-Book_Title.ext
    const authorTitlePattern = /^([^-]+)-(.+)$/;
    const match = filename.match(authorTitlePattern);
    
    if (match) {
      const [, authorPart, titlePart] = match;
      
      // Extract author name
      const authorNames = authorPart.replace(/_/g, ' ').split(' ');
      if (authorNames.length >= 2) {
        metadata.author_first_name = authorNames[0];
        metadata.author_last_name = authorNames.slice(1).join(' ');
      } else {
        metadata.author_last_name = authorNames[0];
      }
      
      // Extract title
      metadata.title = titlePart.replace(/_/g, ' ');
    }

    // Pattern: ISBN_XXXXXXXXXX.ext
    const isbnPattern = /isbn[_-]?(\d{10}|\d{13})/i;
    const isbnMatch = filename.match(isbnPattern);
    if (isbnMatch) {
      metadata.isbn = isbnMatch[1];
    }

    // Pattern: Year in filename
    const yearPattern = /(?:19|20)\d{2}/;
    const yearMatch = filename.match(yearPattern);
    if (yearMatch) {
      metadata.year = parseInt(yearMatch[0]);
    }

    // Collection hints from filename
    const collectionHints = this.extractCollectionHints(filename);
    if (collectionHints.length > 0) {
      metadata.collectionHints = collectionHints;
    }

    return metadata;
  }

  extractCollectionHints(filename) {
    const hints = [];
    const lowerFilename = filename.toLowerCase();

    // Check for collection keywords in filename
    for (const [collection, keywords] of Object.entries(this.config.collections)) {
      // Check collection name itself
      if (lowerFilename.includes(collection.replace(/-/g, ''))) {
        hints.push(collection);
      }
      
      // Check keywords
      for (const keyword of keywords) {
        if (lowerFilename.includes(keyword.toLowerCase().replace(/\s+/g, ''))) {
          hints.push(collection);
          break;
        }
      }
    }

    return [...new Set(hints)]; // Remove duplicates
  }

  async extractFromSidecar(imagePath) {
    console.log(`📄 Looking for sidecar metadata...`);
    
    const sidecarPath = imagePath + '.meta.json';
    
    try {
      const sidecarData = await fs.readFile(sidecarPath, 'utf8');
      const metadata = JSON.parse(sidecarData);
      
      console.log(`✅ Found sidecar metadata`);
      return metadata;
      
    } catch (error) {
      console.log(`📄 No sidecar file found`);
      return {};
    }
  }

  async createSidecar(imagePath, metadata) {
    console.log(`💾 Creating sidecar file...`);
    
    const sidecarPath = imagePath + '.meta.json';
    const sidecarData = {
      ...metadata,
      sidecarCreatedAt: new Date().toISOString(),
      version: '1.0'
    };

    try {
      await fs.writeFile(sidecarPath, JSON.stringify(sidecarData, null, 2));
      console.log(`✅ Sidecar created: ${path.basename(sidecarPath)}`);
      return sidecarPath;
    } catch (error) {
      console.error(`❌ Failed to create sidecar: ${error.message}`);
      throw error;
    }
  }

  async enrichWithBookData(metadata, bookInfo) {
    console.log(`📚 Enriching metadata with book data...`);
    
    if (!bookInfo) return metadata;

    const enriched = {
      ...metadata,
      // Book information
      isbn: bookInfo.isbn || metadata.isbn,
      title: bookInfo.title || metadata.title,
      subtitle: bookInfo.subtitle,
      author_first_name: bookInfo.author_first_name || metadata.author_first_name,
      author_last_name: bookInfo.author_last_name || metadata.author_last_name,
      authors: bookInfo.authors,
      publisher: bookInfo.publisher,
      publishedDate: bookInfo.publishedDate,
      year: bookInfo.year || metadata.year || this.extractYearFromDate(bookInfo.publishedDate),
      description: bookInfo.description,
      categories: bookInfo.categories,
      subjects: bookInfo.subjects,
      pageCount: bookInfo.pageCount,
      language: bookInfo.language,
      
      // Enrichment metadata
      enrichedAt: new Date().toISOString(),
      dataSource: bookInfo.source || 'unknown'
    };

    console.log(`✅ Metadata enriched with book data`);
    return enriched;
  }

  async extractEXIF(imagePath) {
    // Basic EXIF extraction without external dependencies
    // This is a simplified implementation - a full EXIF library would be better
    try {
      const stats = await fs.stat(imagePath);
      const buffer = await fs.readFile(imagePath);
      
      const exifData = {
        exif: {}
      };
      
      // Basic image dimensions extraction for JPEG
      if (path.extname(imagePath).toLowerCase() === '.jpg' || 
          path.extname(imagePath).toLowerCase() === '.jpeg') {
        const dimensions = this.extractJPEGDimensions(buffer);
        if (dimensions) {
          exifData.dimensions = dimensions;
          exifData.exif.imageWidth = dimensions.width;
          exifData.exif.imageHeight = dimensions.height;
        }
      }
      
      // Basic PNG dimensions
      if (path.extname(imagePath).toLowerCase() === '.png') {
        const dimensions = this.extractPNGDimensions(buffer);
        if (dimensions) {
          exifData.dimensions = dimensions;
          exifData.exif.imageWidth = dimensions.width;
          exifData.exif.imageHeight = dimensions.height;
        }
      }
      
      return exifData;
      
    } catch (error) {
      console.log(`⚠️  Basic image info extraction failed: ${error.message}`);
      return null;
    }
  }

  extractJPEGDimensions(buffer) {
    try {
      // Look for SOF (Start of Frame) markers in JPEG
      for (let i = 0; i < buffer.length - 4; i++) {
        if (buffer[i] === 0xFF && (buffer[i + 1] === 0xC0 || buffer[i + 1] === 0xC2)) {
          const height = buffer.readUInt16BE(i + 5);
          const width = buffer.readUInt16BE(i + 7);
          return { width, height };
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractPNGDimensions(buffer) {
    try {
      // PNG signature check
      if (buffer.length >= 24 && 
          buffer[0] === 0x89 && buffer[1] === 0x50 && 
          buffer[2] === 0x4E && buffer[3] === 0x47) {
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  extractYearFromDate(dateString) {
    if (!dateString) return null;
    
    const match = dateString.match(/(\d{4})/);
    return match ? parseInt(match[1]) : null;
  }

  async validateMetadata(metadata) {
    console.log(`✅ Validating metadata...`);
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: [],
      score: 0
    };

    // Required fields
    const requiredFields = ['filename', 'originalPath'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        validation.errors.push(`Missing required field: ${field}`);
        validation.isValid = false;
      } else {
        validation.score += 10;
      }
    }

    // Important fields
    const importantFields = ['title', 'author_last_name'];
    for (const field of importantFields) {
      if (!metadata[field]) {
        validation.warnings.push(`Missing important field: ${field}`);
      } else {
        validation.score += 20;
      }
    }

    // Useful fields
    const usefulFields = ['isbn', 'year', 'publisher', 'categories'];
    for (const field of usefulFields) {
      if (metadata[field]) {
        validation.score += 15;
      }
    }

    // Validate ISBN format
    if (metadata.isbn && !this.isValidISBN(metadata.isbn)) {
      validation.warnings.push(`Invalid ISBN format: ${metadata.isbn}`);
    }

    // Validate year
    if (metadata.year) {
      const currentYear = new Date().getFullYear();
      if (metadata.year < 1800 || metadata.year > currentYear + 1) {
        validation.warnings.push(`Suspicious year: ${metadata.year}`);
      }
    }

    validation.score = Math.min(100, validation.score);
    
    console.log(`📊 Metadata validation score: ${validation.score}/100`);
    if (validation.errors.length > 0) {
      console.log(`❌ Errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.log(`⚠️  Warnings: ${validation.warnings.join(', ')}`);
    }

    return validation;
  }

  isValidISBN(isbn) {
    const cleanISBN = isbn.replace(/[-\s]/g, '');
    return /^\d{10}$/.test(cleanISBN) || /^\d{13}$/.test(cleanISBN);
  }

  async generateMetadataReport(imagePaths) {
    console.log(`📊 Generating metadata report for ${imagePaths.length} images...`);
    
    const report = {
      totalImages: imagePaths.length,
      withTitle: 0,
      withAuthor: 0,
      withISBN: 0,
      withYear: 0,
      averageScore: 0,
      missingFields: {},
      validationErrors: [],
      collectionHints: {}
    };

    let totalScore = 0;

    for (const imagePath of imagePaths) {
      try {
        const metadata = await this.extractFromImage(imagePath);
        const validation = await this.validateMetadata(metadata);
        
        totalScore += validation.score;
        
        // Count fields
        if (metadata.title) report.withTitle++;
        if (metadata.author_last_name) report.withAuthor++;
        if (metadata.isbn) report.withISBN++;
        if (metadata.year) report.withYear++;
        
        // Track missing fields
        const requiredFields = ['title', 'author_last_name', 'isbn', 'year'];
        for (const field of requiredFields) {
          if (!metadata[field]) {
            report.missingFields[field] = (report.missingFields[field] || 0) + 1;
          }
        }
        
        // Track collection hints
        if (metadata.collectionHints) {
          for (const hint of metadata.collectionHints) {
            report.collectionHints[hint] = (report.collectionHints[hint] || 0) + 1;
          }
        }
        
        // Track validation errors
        if (validation.errors.length > 0) {
          report.validationErrors.push({
            file: path.basename(imagePath),
            errors: validation.errors
          });
        }
        
      } catch (error) {
        report.validationErrors.push({
          file: path.basename(imagePath),
          errors: [`Processing failed: ${error.message}`]
        });
      }
    }

    report.averageScore = imagePaths.length > 0 ? Math.round(totalScore / imagePaths.length) : 0;
    
    console.log(`📋 Metadata Report:`);
    console.log(`   Average quality score: ${report.averageScore}/100`);
    console.log(`   Images with title: ${report.withTitle}/${report.totalImages}`);
    console.log(`   Images with author: ${report.withAuthor}/${report.totalImages}`);
    console.log(`   Images with ISBN: ${report.withISBN}/${report.totalImages}`);
    console.log(`   Images with year: ${report.withYear}/${report.totalImages}`);

    return report;
  }

  async exportMetadataCSV(imagePaths, outputPath) {
    console.log(`📤 Exporting metadata to CSV...`);
    
    const headers = [
      'filename', 'title', 'author_first_name', 'author_last_name', 
      'isbn', 'year', 'publisher', 'categories', 'fileSize', 'format'
    ];
    
    const rows = [headers.join(',')];
    
    for (const imagePath of imagePaths) {
      try {
        const metadata = await this.extractFromImage(imagePath);
        
        const row = headers.map(header => {
          let value = metadata[header] || '';
          
          // Handle arrays
          if (Array.isArray(value)) {
            value = value.join('; ');
          }
          
          // Escape CSV values
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          
          return value;
        });
        
        rows.push(row.join(','));
        
      } catch (error) {
        console.error(`⚠️  Failed to process ${imagePath}: ${error.message}`);
      }
    }
    
    await fs.writeFile(outputPath, rows.join('\n'));
    console.log(`✅ Exported metadata for ${rows.length - 1} images to ${outputPath}`);
    
    return outputPath;
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
  updateStats(metadata, success) {
    this.stats.totalProcessed++;
    this.stats.lastProcessedAt = new Date().toISOString();

    if (success && metadata) {
      this.stats.successful++;

      // Track field presence
      if (metadata.title) this.stats.fieldsFound.title++;
      if (metadata.author_last_name) this.stats.fieldsFound.author++;
      if (metadata.isbn) this.stats.fieldsFound.isbn++;
      if (metadata.year) this.stats.fieldsFound.year++;
    } else {
      this.stats.failed++;
    }
  }

  /**
   * Get module statistics
   */
  getModuleStats() {
    const successRate = this.stats.totalProcessed > 0 ?
      (this.stats.successful / this.stats.totalProcessed * 100).toFixed(2) + '%' : '0%';

    return {
      ...this.stats,
      successRate,
      fieldCoverageRates: {
        title: this.stats.successful > 0 ? (this.stats.fieldsFound.title / this.stats.successful * 100).toFixed(1) + '%' : '0%',
        author: this.stats.successful > 0 ? (this.stats.fieldsFound.author / this.stats.successful * 100).toFixed(1) + '%' : '0%',
        isbn: this.stats.successful > 0 ? (this.stats.fieldsFound.isbn / this.stats.successful * 100).toFixed(1) + '%' : '0%',
        year: this.stats.successful > 0 ? (this.stats.fieldsFound.year / this.stats.successful * 100).toFixed(1) + '%' : '0%'
      }
    };
  }

  /**
   * Enhanced EXIF extraction with better error handling
   */
  async extractEnhancedEXIF(imagePath) {
    try {
      const buffer = await fs.readFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase();

      const exifData = {
        exif: {},
        technical: {}
      };

      // Basic dimensions for common formats
      const dimensions = this.extractImageDimensions(buffer, ext);
      if (dimensions) {
        exifData.dimensions = dimensions;
        exifData.technical.imageWidth = dimensions.width;
        exifData.technical.imageHeight = dimensions.height;
        exifData.technical.aspectRatio = (dimensions.width / dimensions.height).toFixed(2);
        exifData.technical.megapixels = ((dimensions.width * dimensions.height) / 1000000).toFixed(1);
      }

      // Color space analysis for JPEG
      if (ext === '.jpg' || ext === '.jpeg') {
        const colorSpace = this.analyzeJPEGColorSpace(buffer);
        if (colorSpace) {
          exifData.technical.colorSpace = colorSpace;
        }
      }

      // File format specific metadata
      exifData.technical.format = ext.substring(1).toUpperCase();
      exifData.technical.fileSize = buffer.length;
      exifData.technical.fileSizeFormatted = this.formatFileSize(buffer.length);

      return exifData;

    } catch (error) {
      this.logger.debug('Enhanced EXIF extraction failed', { error: error.message });
      return null;
    }
  }

  /**
   * Extract image dimensions from buffer with support for multiple formats
   */
  extractImageDimensions(buffer, ext) {
    try {
      if (ext === '.jpg' || ext === '.jpeg') {
        return this.extractJPEGDimensions(buffer);
      } else if (ext === '.png') {
        return this.extractPNGDimensions(buffer);
      } else if (ext === '.webp') {
        return this.extractWebPDimensions(buffer);
      } else if (ext === '.gif') {
        return this.extractGIFDimensions(buffer);
      }
    } catch (error) {
      this.logger.debug(`Dimension extraction failed for ${ext}`, { error: error.message });
    }
    return null;
  }

  /**
   * Extract WebP dimensions
   */
  extractWebPDimensions(buffer) {
    try {
      // WebP signature: 'RIFF' + size + 'WEBP'
      if (buffer.length >= 30 &&
          buffer.toString('ascii', 0, 4) === 'RIFF' &&
          buffer.toString('ascii', 8, 12) === 'WEBP') {

        // Simple WebP format (VP8)
        if (buffer.toString('ascii', 12, 16) === 'VP8 ') {
          const width = buffer.readUInt16LE(26) & 0x3FFF;
          const height = buffer.readUInt16LE(28) & 0x3FFF;
          return { width, height };
        }
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  /**
   * Extract GIF dimensions
   */
  extractGIFDimensions(buffer) {
    try {
      // GIF signature: 'GIF87a' or 'GIF89a'
      if (buffer.length >= 10 &&
          (buffer.toString('ascii', 0, 6) === 'GIF87a' ||
           buffer.toString('ascii', 0, 6) === 'GIF89a')) {
        const width = buffer.readUInt16LE(6);
        const height = buffer.readUInt16LE(8);
        return { width, height };
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  /**
   * Analyze JPEG color space
   */
  analyzeJPEGColorSpace(buffer) {
    try {
      // Look for color space markers in JPEG
      for (let i = 0; i < buffer.length - 10; i++) {
        if (buffer[i] === 0xFF && buffer[i + 1] === 0xEE) {
          // Adobe marker found - might contain color space info
          return 'Adobe RGB';
        }
      }
      // Default assumption for JPEG
      return 'sRGB';
    } catch (error) {
      return null;
    }
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
   * Validate metadata completeness
   */
  validateMetadataCompleteness(metadata) {
    const validation = {
      isComplete: true,
      score: 0,
      missing: [],
      present: [],
      recommendations: []
    };

    const essentialFields = [
      { field: 'title', weight: 25, description: 'Book title' },
      { field: 'author_last_name', weight: 20, description: 'Author surname' },
      { field: 'isbn', weight: 20, description: 'ISBN identifier' },
      { field: 'year', weight: 15, description: 'Publication year' },
      { field: 'publisher', weight: 10, description: 'Publisher name' },
      { field: 'dimensions', weight: 10, description: 'Image dimensions' }
    ];

    for (const { field, weight, description } of essentialFields) {
      if (metadata[field] && metadata[field] !== null && metadata[field] !== '') {
        validation.score += weight;
        validation.present.push({ field, description, weight });
      } else {
        validation.missing.push({ field, description, weight });
        validation.isComplete = false;
      }
    }

    // Add recommendations based on missing fields
    if (validation.missing.length > 0) {
      validation.recommendations = validation.missing.map(item =>
        `Consider adding ${item.description} (${item.field}) for better metadata completeness`
      );
    }

    return validation;
  }

  /**
   * Batch metadata extraction with progress tracking
   */
  async extractMetadataBatch(imagePaths, options = {}) {
    this.logger.processing(`Starting batch metadata extraction for ${imagePaths.length} images`);
    const batchOperationId = this.logger.startBatch('metadata-extraction', imagePaths.length);

    const results = [];
    const batchSize = options.batchSize || 10;

    try {
      for (let i = 0; i < imagePaths.length; i += batchSize) {
        const batch = imagePaths.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (imagePath, index) => {
            try {
              const metadata = await this.extractFromImage(imagePath);
              return {
                success: true,
                imagePath,
                metadata,
                validation: this.validateMetadataCompleteness(metadata)
              };
            } catch (error) {
              return {
                success: false,
                imagePath,
                error: error.message
              };
            }
          })
        );

        results.push(...batchResults);

        // Progress update
        const processed = Math.min(i + batchSize, imagePaths.length);
        this.logger.processing(`Processed ${processed}/${imagePaths.length} images`);
      }

      const successful = results.filter(r => r.success).length;
      this.logger.endBatch(batchOperationId, {
        processed: results.length,
        successful,
        failed: results.length - successful
      });

      return {
        success: true,
        results,
        summary: {
          total: imagePaths.length,
          successful,
          failed: results.length - successful,
          averageScore: successful > 0 ?
            results.filter(r => r.success).reduce((sum, r) => sum + r.validation.score, 0) / successful : 0
        }
      };

    } catch (error) {
      this.logger.updateOperation(batchOperationId, 'failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Run tests to verify metadata processor functionality
   */
  async runTests() {
    this.logger.info('Running metadata processor tests...');

    const testResults = {
      passed: 0,
      failed: 0,
      tests: []
    };

    // Test 1: Filename parsing
    try {
      const testPath = '/test/Author_Name-Book_Title.jpg';
      const result = this.extractFromFilename(testPath);
      if (result.title && result.author_last_name) {
        testResults.tests.push({ name: 'Filename parsing', status: 'passed' });
        testResults.passed++;
      } else {
        testResults.tests.push({ name: 'Filename parsing', status: 'failed', error: 'Could not extract title or author' });
        testResults.failed++;
      }
    } catch (error) {
      testResults.tests.push({ name: 'Filename parsing', status: 'failed', error: error.message });
      testResults.failed++;
    }

    // Test 2: ISBN validation
    try {
      const validISBN = this.isValidISBN('9780123456789');
      const invalidISBN = this.isValidISBN('invalid');
      if (validISBN && !invalidISBN) {
        testResults.tests.push({ name: 'ISBN validation', status: 'passed' });
        testResults.passed++;
      } else {
        testResults.tests.push({ name: 'ISBN validation', status: 'failed', error: 'ISBN validation logic error' });
        testResults.failed++;
      }
    } catch (error) {
      testResults.tests.push({ name: 'ISBN validation', status: 'failed', error: error.message });
      testResults.failed++;
    }

    // Test 3: Metadata validation
    try {
      const testMetadata = {
        title: 'Test Book',
        author_last_name: 'Author',
        isbn: '9780123456789',
        year: 2023
      };
      const validation = this.validateMetadataCompleteness(testMetadata);
      if (validation.score > 0) {
        testResults.tests.push({ name: 'Metadata validation', status: 'passed' });
        testResults.passed++;
      } else {
        testResults.tests.push({ name: 'Metadata validation', status: 'failed', error: 'Metadata validation failed' });
        testResults.failed++;
      }
    } catch (error) {
      testResults.tests.push({ name: 'Metadata validation', status: 'failed', error: error.message });
      testResults.failed++;
    }

    this.logger.info(`Metadata processor tests completed: ${testResults.passed} passed, ${testResults.failed} failed`);
    return testResults;
  }

  /**
   * Clean up and generate final report
   */
  async cleanup() {
    const stats = this.getModuleStats();
    this.logger.info('Metadata processor cleanup completed', stats);
  }
}

module.exports = MetadataProcessor;