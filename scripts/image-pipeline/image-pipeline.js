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
    // TODO: Update CSV/JSON records with new image paths
    // This would integrate with the existing book database
    console.log(`📊 Would update records for: ${imagePath}`);
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