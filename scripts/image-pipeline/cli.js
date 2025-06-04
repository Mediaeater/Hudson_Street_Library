#!/usr/bin/env node

// Image Pipeline CLI Interface
const ImagePipeline = require('./image-pipeline');
const path = require('path');
const fs = require('fs').promises;

class ImagePipelineCLI {
  constructor() {
    this.pipeline = new ImagePipeline();
  }

  async run() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      this.showHelp();
      return;
    }

    const command = args[0];
    const options = this.parseOptions(args.slice(1));

    try {
      await this.pipeline.initialize();
      
      switch (command) {
        case 'upload':
          await this.handleUpload(options);
          break;
        case 'process':
          await this.handleProcess(options);
          break;
        case 'find':
          await this.handleFind(options);
          break;
        case 'optimize':
          await this.handleOptimize(options);
          break;
        case 'categorize':
          await this.handleCategorize(options);
          break;
        case 'report':
          await this.handleReport(options);
          break;
        case 'status':
          await this.handleStatus(options);
          break;
        case 'clean':
          await this.handleClean(options);
          break;
        default:
          console.error(`❌ Unknown command: ${command}`);
          this.showHelp();
          process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Pipeline error: ${error.message}`);
      process.exit(1);
    }
  }

  async handleUpload(options) {
    console.log('📤 Upload Mode\n');
    
    if (!options.path) {
      console.error('❌ Path required. Use --path /path/to/images');
      return;
    }

    const stats = await fs.stat(options.path);
    
    if (stats.isDirectory()) {
      const images = await this.pipeline.uploader.scanFolder(options.path, {
        recursive: options.recursive
      });
      
      if (images.length === 0) {
        console.log('ℹ️  No images found in directory');
        return;
      }

      console.log(`Found ${images.length} images. Uploading...`);
      const results = await this.pipeline.uploader.uploadMultiple(images);
      
      const successful = results.filter(r => r.success).length;
      console.log(`\n✅ Upload complete: ${successful}/${images.length} successful`);
      
    } else {
      const result = await this.pipeline.uploader.uploadImage(options.path);
      console.log(`✅ Uploaded: ${result}`);
    }
  }

  async handleProcess(options) {
    console.log('⚙️  Process Mode\n');
    
    const sourcePath = options.path || this.pipeline.config.directories.incoming;
    
    console.log(`Processing images from: ${sourcePath}`);
    const results = await this.pipeline.processFolder(sourcePath, options);
    
    console.log('\n📊 Processing Complete:');
    this.pipeline.printStats();
    
    return results;
  }

  async handleFind(options) {
    console.log('🔍 Find Images Mode\n');
    
    if (options.isbn) {
      console.log(`Searching for ISBN: ${options.isbn}`);
      const result = await this.pipeline.finder.findBookImage(options.isbn);
      
      if (result) {
        console.log(`✅ Found image: ${result.imageUrl}`);
        console.log(`📥 Downloaded to: ${result.localPath}`);
      } else {
        console.log(`❌ No image found for ISBN: ${options.isbn}`);
      }
      
    } else if (options.missing) {
      // Load books data and find missing images
      const booksPath = path.join(__dirname, '../../src/_data/books.csv');
      
      try {
        const csvContent = await fs.readFile(booksPath, 'utf8');
        const { parse } = require('csv-parse/sync');
        const books = parse(csvContent, { columns: true });
        
        console.log(`Analyzing ${books.length} books for missing images...`);
        const analysis = await this.pipeline.finder.findMissingImages(books);
        
        console.log(`\n📊 Missing Image Analysis:`);
        console.log(`   Books with images: ${analysis.found.length}`);
        console.log(`   Missing images: ${analysis.missing.length}`);
        
        if (options.download && analysis.missing.length > 0) {
          console.log(`\n⬇️  Downloading missing images...`);
          
          for (const book of analysis.missing.slice(0, options.limit || 10)) {
            try {
              const result = await this.pipeline.finder.findBookImage(book.isbn);
              if (result) {
                console.log(`✅ Downloaded: ${book.title}`);
              }
            } catch (error) {
              console.log(`❌ Failed: ${book.title} - ${error.message}`);
            }
          }
        }
        
      } catch (error) {
        console.error(`❌ Failed to load books data: ${error.message}`);
      }
    }
  }

  async handleOptimize(options) {
    console.log('⚡ Optimize Mode\n');
    
    if (!options.path) {
      console.error('❌ Path required. Use --path /path/to/images');
      return;
    }

    const stats = await fs.stat(options.path);
    
    if (stats.isDirectory()) {
      const images = await this.pipeline.uploader.scanFolder(options.path);
      console.log(`Optimizing ${images.length} images...`);
      
      const results = await this.pipeline.optimizer.optimizeBatch(images, options);
      const successful = results.filter(r => r.success).length;
      
      console.log(`\n✅ Optimization complete: ${successful}/${images.length} successful`);
      
    } else {
      console.log(`Optimizing: ${options.path}`);
      const result = await this.pipeline.optimizer.optimizeImage(options.path, options);
      
      console.log(`✅ Generated ${result.optimized.length + result.thumbnails.length} variants`);
      console.log(`📊 Compression: ${result.stats.compressionRatio}%`);
    }
  }

  async handleCategorize(options) {
    console.log('🏷️  Categorize Mode\n');
    
    if (!options.path) {
      console.error('❌ Path required. Use --path /path/to/images');
      return;
    }

    const images = await this.pipeline.uploader.scanFolder(options.path);
    console.log(`Categorizing ${images.length} images...`);
    
    const results = await this.pipeline.categorizer.categorizeMultiple(images);
    
    // Group by category
    const categories = {};
    for (const result of results) {
      if (result.success) {
        if (!categories[result.category]) {
          categories[result.category] = [];
        }
        categories[result.category].push(result.imagePath);
      }
    }
    
    console.log(`\n📊 Categorization Results:`);
    for (const [category, files] of Object.entries(categories)) {
      console.log(`   ${category}: ${files.length} files`);
    }
    
    if (options.organize) {
      console.log(`\n📂 Organizing files...`);
      const imagePaths = results.filter(r => r.success).map(r => r.imagePath);
      const categoryList = results.filter(r => r.success).map(r => r.category);
      
      await this.pipeline.categorizer.organizeByCategory(imagePaths, categoryList);
      console.log(`✅ Files organized by category`);
    }
  }

  async handleReport(options) {
    console.log('📊 Report Mode\n');
    
    // Optimization report
    console.log('🖼️  Optimization Report:');
    const optimizationReport = await this.pipeline.optimizer.getOptimizationReport();
    console.log(`   Optimized images: ${optimizationReport.optimizedCount}`);
    console.log(`   Thumbnails: ${optimizationReport.thumbnailCount}`);
    console.log(`   Total size: ${optimizationReport.totalSizeMB} MB`);
    console.log(`   Formats: ${optimizationReport.formats.join(', ')}`);
    
    // Category stats
    console.log('\n📂 Category Statistics:');
    const categoryStats = await this.pipeline.categorizer.getCategoryStats();
    for (const [category, stats] of Object.entries(categoryStats)) {
      console.log(`   ${category}: ${stats.count} images`);
    }
    
    // Incoming queue
    console.log('\n📥 Incoming Queue:');
    const incomingCount = await this.pipeline.uploader.getIncomingCount();
    console.log(`   Pending images: ${incomingCount}`);
    
    if (options.metadata && options.path) {
      console.log('\n📝 Metadata Report:');
      const images = await this.pipeline.uploader.scanFolder(options.path);
      const metadataReport = await this.pipeline.metadata.generateMetadataReport(images);
      
      console.log(`   Average quality: ${metadataReport.averageScore}/100`);
      console.log(`   With title: ${metadataReport.withTitle}/${metadataReport.totalImages}`);
      console.log(`   With author: ${metadataReport.withAuthor}/${metadataReport.totalImages}`);
      console.log(`   With ISBN: ${metadataReport.withISBN}/${metadataReport.totalImages}`);
    }
  }

  async handleStatus(options) {
    console.log('ℹ️  Pipeline Status\n');
    
    // Check directories
    console.log('📁 Directories:');
    for (const [name, dir] of Object.entries(this.pipeline.config.directories)) {
      try {
        await fs.access(dir);
        const files = await fs.readdir(dir);
        console.log(`   ✅ ${name}: ${dir} (${files.length} files)`);
      } catch {
        console.log(`   ❌ ${name}: ${dir} (not accessible)`);
      }
    }
    
    // Recent activity
    console.log('\n⏰ Recent Activity:');
    try {
      const incomingDir = this.pipeline.config.directories.incoming;
      const files = await fs.readdir(incomingDir);
      const recentFiles = files.slice(-5);
      
      if (recentFiles.length > 0) {
        console.log('   Last 5 uploads:');
        for (const file of recentFiles) {
          console.log(`     - ${file}`);
        }
      } else {
        console.log('   No recent uploads');
      }
    } catch {
      console.log('   Unable to check recent activity');
    }
  }

  async handleClean(options) {
    console.log('🧹 Clean Mode\n');
    
    const days = options.days || 7;
    
    if (options.optimized) {
      const cleaned = await this.pipeline.optimizer.cleanupOptimized(days);
      console.log(`✅ Cleaned ${cleaned} old optimized images`);
    }
    
    if (options.processed) {
      const cleared = await this.pipeline.uploader.clearProcessed();
      console.log(`✅ Cleared ${cleared} processed files`);
    }
    
    if (options.cache) {
      this.pipeline.finder.clearCache();
      console.log(`✅ Cleared image finder cache`);
    }
  }

  parseOptions(args) {
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        const key = arg.substring(2);
        const nextArg = args[i + 1];
        
        if (nextArg && !nextArg.startsWith('--')) {
          options[key] = nextArg;
          i++; // Skip next arg as it's a value
        } else {
          options[key] = true; // Boolean flag
        }
      }
    }
    
    return options;
  }

  showHelp() {
    console.log(`
🖼️  Hudson Street Library - Image Pipeline CLI

USAGE:
  node cli.js <command> [options]

COMMANDS:
  upload     Upload images to pipeline
  process    Process all images through pipeline
  find       Find missing images via APIs
  optimize   Optimize images for web
  categorize Categorize and organize images
  report     Generate pipeline reports
  status     Show pipeline status
  clean      Clean up old files

UPLOAD OPTIONS:
  --path <path>      Path to image file or directory
  --recursive        Scan directories recursively

PROCESS OPTIONS:
  --path <path>      Source directory (default: incoming)
  --book-info        Include book information lookup

FIND OPTIONS:
  --isbn <isbn>      Find image for specific ISBN
  --missing          Find missing images from book database
  --download         Download found images
  --limit <n>        Limit number of downloads

OPTIMIZE OPTIONS:
  --path <path>      Path to images
  --sizes <sizes>    Comma-separated width list
  --formats <fmt>    Comma-separated format list

CATEGORIZE OPTIONS:
  --path <path>      Path to images
  --organize         Move files to category directories

REPORT OPTIONS:
  --path <path>      Path for metadata report
  --metadata         Include metadata analysis

CLEAN OPTIONS:
  --optimized        Clean old optimized images
  --processed        Clear processed files
  --cache            Clear finder cache
  --days <n>         Days threshold (default: 7)

EXAMPLES:
  # Upload folder of images
  node cli.js upload --path ./new-images --recursive

  # Process all incoming images
  node cli.js process

  # Find missing book covers
  node cli.js find --missing --download --limit 20

  # Optimize specific directory
  node cli.js optimize --path ./covers

  # Generate comprehensive report
  node cli.js report --metadata --path ./images

  # Clean old files
  node cli.js clean --optimized --days 30
`);
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new ImagePipelineCLI();
  cli.run().catch(error => {
    console.error(`💥 Fatal error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = ImagePipelineCLI;