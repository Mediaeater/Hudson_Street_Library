// Metadata Processing Module
const fs = require('fs').promises;
const path = require('path');

class MetadataProcessor {
  constructor(config) {
    this.config = config;
  }

  async extractFromImage(imagePath) {
    console.log(`📝 Extracting metadata from: ${path.basename(imagePath)}`);
    
    try {
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

      // Extract from filename patterns
      const filenameMetadata = this.extractFromFilename(imagePath);
      Object.assign(metadata, filenameMetadata);

      // Extract EXIF data if available
      try {
        const exifData = await this.extractEXIF(imagePath);
        if (exifData) {
          Object.assign(metadata, exifData);
        }
      } catch (error) {
        console.log(`⚠️  EXIF extraction failed: ${error.message}`);
      }
      
      console.log(`✅ Extracted basic metadata`);
      return metadata;

    } catch (error) {
      console.error(`❌ Metadata extraction failed: ${error.message}`);
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
}

module.exports = MetadataProcessor;