// Main Image Pipeline Controller
const fs = require('fs').promises;
const path = require('path');
const config = require('./pipeline-config');
const ImageUploader = require('./modules/uploader');
const ImageFinder = require('./modules/finder');
const ImageOptimizer = require('./modules/optimizer');
const ImageCategorizer = require('./modules/categorizer');
const MetadataProcessor = require('./modules/metadata');

class ImagePipeline {
  constructor(options = {}) {
    this.config = { ...config, ...options };
    this.uploader = new ImageUploader(this.config);
    this.finder = new ImageFinder(this.config);
    this.optimizer = new ImageOptimizer(this.config);
    this.categorizer = new ImageCategorizer(this.config);
    this.metadata = new MetadataProcessor(this.config);
    
    this.stats = {
      processed: 0,
      optimized: 0,
      categorized: 0,
      errors: 0
    };
  }

  async initialize() {
    console.log('🚀 Initializing Image Pipeline...');
    
    // Create necessary directories
    for (const [name, dir] of Object.entries(this.config.directories)) {
      try {
        await fs.mkdir(dir, { recursive: true });
        console.log(`✅ Directory ready: ${name} (${dir})`);
      } catch (error) {
        console.error(`❌ Failed to create directory ${name}:`, error.message);
      }
    }
    
    console.log('✅ Pipeline initialized successfully\n');
  }

  async processFolder(folderPath, options = {}) {
    console.log(`📁 Processing folder: ${folderPath}`);
    
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true });
      const imageFiles = files
        .filter(file => file.isFile() && this.isImageFile(file.name))
        .map(file => path.join(folderPath, file.name));

      console.log(`Found ${imageFiles.length} image files`);

      if (this.config.pipeline.parallelProcessing) {
        await this.processBatch(imageFiles, options);
      } else {
        for (const imagePath of imageFiles) {
          await this.processSingleImage(imagePath, options);
        }
      }

      return this.getStats();
    } catch (error) {
      console.error(`❌ Error processing folder: ${error.message}`);
      throw error;
    }
  }

  async processBatch(imageFiles, options = {}) {
    const batchSize = this.config.pipeline.batchSize;
    
    for (let i = 0; i < imageFiles.length; i += batchSize) {
      const batch = imageFiles.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1} (${batch.length} files)`);
      
      const promises = batch.map(imagePath => 
        this.processSingleImage(imagePath, options).catch(error => {
          console.error(`❌ Error processing ${imagePath}:`, error.message);
          this.stats.errors++;
          return null;
        })
      );

      await Promise.all(promises);
    }
  }

  async processSingleImage(imagePath, options = {}) {
    console.log(`\n🖼️  Processing: ${path.basename(imagePath)}`);
    
    try {
      // Step 1: Validate file
      if (!await this.validateImage(imagePath)) {
        throw new Error('Invalid image file');
      }

      // Step 2: Extract metadata
      const metadata = await this.metadata.extractFromImage(imagePath);
      console.log(`📝 Extracted metadata: ${JSON.stringify(metadata, null, 2)}`);

      // Step 3: Find missing book info if needed
      let bookInfo = options.bookInfo || {};
      if (!bookInfo.isbn && metadata.isbn) {
        bookInfo = await this.finder.findBookInfo(metadata.isbn);
      }

      // Step 4: Optimize image
      const optimizedPaths = await this.optimizer.optimizeImage(imagePath, {
        outputDir: this.config.directories.assets,
        ...options
      });
      console.log(`⚡ Optimized to: ${optimizedPaths.length} variants`);

      // Step 5: Categorize and organize
      const category = await this.categorizer.categorizeImage(imagePath, {
        metadata,
        bookInfo,
        ...options
      });
      console.log(`🏷️  Categorized as: ${category}`);

      // Step 6: Move to organized location
      const finalPath = await this.organizeImage(optimizedPaths.main, category, {
        metadata,
        bookInfo
      });
      console.log(`📂 Organized to: ${finalPath}`);

      // Step 7: Update records
      await this.updateRecords(finalPath, {
        metadata,
        bookInfo,
        category,
        optimizedPaths
      });

      this.stats.processed++;
      this.stats.optimized += optimizedPaths.length;
      this.stats.categorized++;

      return {
        originalPath: imagePath,
        finalPath,
        category,
        metadata,
        bookInfo,
        optimizedPaths
      };

    } catch (error) {
      console.error(`❌ Failed to process ${imagePath}:`, error.message);
      this.stats.errors++;
      throw error;
    }
  }

  async validateImage(imagePath) {
    try {
      const stats = await fs.stat(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      
      return stats.isFile() && 
             this.config.supportedTypes.includes(ext) &&
             stats.size > 0;
    } catch {
      return false;
    }
  }

  async organizeImage(imagePath, category, context = {}) {
    const { metadata, bookInfo } = context;
    
    // Generate organized filename
    const filename = this.generateFilename(metadata, bookInfo);
    const categoryDir = path.join(this.config.directories.assets, category);
    
    // Ensure category directory exists
    await fs.mkdir(categoryDir, { recursive: true });
    
    // Move file to organized location
    const finalPath = path.join(categoryDir, filename);
    await fs.copyFile(imagePath, finalPath);
    
    return finalPath;
  }

  generateFilename(metadata, bookInfo) {
    const template = this.config.naming.pattern;
    let filename = template
      .replace('{author_last}', bookInfo.author_last || metadata.author_last || 'Unknown')
      .replace('{author_first}', bookInfo.author_first || metadata.author_first || '')
      .replace('{title}', bookInfo.title || metadata.title || 'Untitled');

    if (this.config.naming.sanitize) {
      filename = this.sanitizeFilename(filename);
    }

    if (this.config.naming.maxLength) {
      filename = filename.substring(0, this.config.naming.maxLength);
    }

    return filename + path.extname(metadata.originalPath || '.jpg');
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[^\w\-_.]/g, '') // Keep only word characters, hyphens, underscores, dots
      .replace(/_+/g, '_'); // Collapse multiple underscores
  }

  async updateRecords(imagePath, context) {
    console.log(`📊 Updating records for: ${path.basename(imagePath)}`);
    
    try {
      const { metadata, bookInfo, category, optimizedPaths } = context;
      
      // Update books.csv if we have book information
      if (bookInfo && (bookInfo.isbn || (metadata && metadata.isbn))) {
        await this.updateBooksCSV(imagePath, context);
      }
      
      // Create/update image manifest for the categorized collection
      await this.updateImageManifest(imagePath, context);
      
      // Log the update for auditing
      await this.logImageUpdate(imagePath, context);
      
      console.log(`✅ Records updated successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to update records: ${error.message}`);
      throw error;
    }
  }

  async updateBooksCSV(imagePath, context) {
    const { metadata, bookInfo, category } = context;
    const csvPath = path.join(__dirname, '../../src/_data/books.csv');
    
    try {
      // Read existing CSV
      const csvContent = await fs.readFile(csvPath, 'utf8');
      const { parse } = require('csv-parse/sync');
      const stringify = require('csv-stringify/sync');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      const isbn = bookInfo?.isbn || metadata?.isbn;
      const title = bookInfo?.title || metadata?.title;
      
      if (!isbn && !title) {
        console.log(`⚠️  No ISBN or title found, skipping CSV update`);
        return;
      }
      
      // Find existing record
      let existingRecord = null;
      if (isbn) {
        existingRecord = records.find(record => record.isbn === isbn);
      }
      if (!existingRecord && title) {
        existingRecord = records.find(record => 
          record.title && record.title.toLowerCase() === title.toLowerCase()
        );
      }
      
      // Determine image path relative to assets
      const relativePath = path.relative(
        path.join(__dirname, '../../src/assets'),
        imagePath
      );
      const webPath = `/assets/${relativePath.replace(/\\/g, '/')}`;
      
      if (existingRecord) {
        // Update existing record with image path
        existingRecord.cover_image = webPath;
        existingRecord.collection = category;
        existingRecord.updated_at = new Date().toISOString().split('T')[0];
        
        console.log(`📝 Updated existing record: ${existingRecord.title}`);
      } else {
        // Create new record
        const newRecord = {
          isbn: isbn || '',
          title: title || 'Unknown Title',
          author_first_name: bookInfo?.author_first_name || metadata?.author_first_name || '',
          author_last_name: bookInfo?.author_last_name || metadata?.author_last_name || 'Unknown',
          publisher: bookInfo?.publisher || '',
          year_published: bookInfo?.year || metadata?.year || '',
          subjects: Array.isArray(bookInfo?.subjects) ? bookInfo.subjects.join('; ') : (bookInfo?.subjects || ''),
          summary: bookInfo?.description || '',
          cover_image: webPath,
          collection: category,
          created_at: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString().split('T')[0]
        };
        
        records.push(newRecord);
        console.log(`📝 Created new record: ${newRecord.title}`);
      }
      
      // Write updated CSV
      const updatedCsv = stringify(records, { header: true });
      await fs.writeFile(csvPath, updatedCsv);
      
      console.log(`✅ Books CSV updated`);
      
    } catch (error) {
      console.error(`❌ Failed to update books CSV: ${error.message}`);
      // Don't throw - this is not critical
    }
  }

  async updateImageManifest(imagePath, context) {
    const { metadata, bookInfo, category, optimizedPaths } = context;
    const manifestPath = path.join(this.config.directories.assets, category, '_manifest.json');
    
    try {
      // Load existing manifest
      let manifest = [];
      try {
        const manifestContent = await fs.readFile(manifestPath, 'utf8');
        manifest = JSON.parse(manifestContent);
      } catch (error) {
        // File doesn't exist, start with empty array
        console.log(`📋 Creating new manifest for ${category}`);
      }
      
      // Create image entry
      const imageEntry = {
        filename: path.basename(imagePath),
        originalPath: metadata?.originalPath || imagePath,
        relativePath: path.relative(this.config.directories.assets, imagePath),
        metadata: {
          title: bookInfo?.title || metadata?.title,
          author: this.formatAuthorName(
            bookInfo?.author_first_name || metadata?.author_first_name,
            bookInfo?.author_last_name || metadata?.author_last_name
          ),
          isbn: bookInfo?.isbn || metadata?.isbn,
          year: bookInfo?.year || metadata?.year,
          publisher: bookInfo?.publisher,
          fileSize: metadata?.fileSize,
          format: metadata?.format,
          dimensions: metadata?.dimensions
        },
        optimizedPaths: optimizedPaths || [],
        category,
        addedAt: new Date().toISOString(),
        source: 'image-pipeline'
      };
      
      // Remove any existing entry for this file
      manifest = manifest.filter(entry => entry.filename !== imageEntry.filename);
      
      // Add new entry
      manifest.push(imageEntry);
      
      // Sort by addedAt (newest first)
      manifest.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
      
      // Write updated manifest
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
      
      console.log(`📋 Updated manifest for ${category} collection`);
      
    } catch (error) {
      console.error(`❌ Failed to update image manifest: ${error.message}`);
      // Don't throw - this is not critical
    }
  }

  async logImageUpdate(imagePath, context) {
    const logPath = path.join(__dirname, '../logs/image-updates.log');
    
    try {
      // Ensure logs directory exists
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        action: 'image_processed',
        file: path.basename(imagePath),
        category: context.category,
        metadata: {
          title: context.bookInfo?.title || context.metadata?.title,
          isbn: context.bookInfo?.isbn || context.metadata?.isbn
        },
        pipeline_version: '1.0'
      };
      
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logPath, logLine);
      
    } catch (error) {
      console.error(`⚠️  Failed to write log: ${error.message}`);
      // Don't throw - logging is not critical
    }
  }

  formatAuthorName(firstName, lastName) {
    if (!firstName && !lastName) return 'Unknown';
    if (!firstName) return lastName;
    if (!lastName) return firstName;
    return `${firstName} ${lastName}`;
  }

  isImageFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return this.config.supportedTypes.includes(ext);
  }

  getStats() {
    return { ...this.stats };
  }

  printStats() {
    console.log('\n📊 Pipeline Statistics:');
    console.log(`   Processed: ${this.stats.processed}`);
    console.log(`   Optimized: ${this.stats.optimized}`);
    console.log(`   Categorized: ${this.stats.categorized}`);
    console.log(`   Errors: ${this.stats.errors}`);
  }
}

module.exports = ImagePipeline;