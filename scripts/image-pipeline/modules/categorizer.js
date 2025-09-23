// Image Categorization and Organization Module
const fs = require('fs').promises;
const path = require('path');
const { getGlobalLogger } = require('../../utils/logger');

class ImageCategorizer {
  constructor(config) {
    this.config = config;
    this.categories = config.collections;

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
      categoryCounts: {},
      lastProcessedAt: null
    };

    this.logger.info('ImageCategorizer initialized', {
      availableCategories: Object.keys(this.categories).length,
      categories: Object.keys(this.categories)
    });
  }

  async categorizeImage(imagePath, context = {}) {
    const operationId = this.logger.trackOperation('categorize-image', 'started', { imagePath });
    this.logger.logImageProcess(imagePath, 'Starting categorization', context);

    try {
      const { metadata, bookInfo, manual } = context;

      // Validate input
      if (!imagePath || !await this.fileExists(imagePath)) {
        throw new Error(`Image file does not exist: ${imagePath}`);
      }

      // If manually specified, use that
      if (manual && this.isValidCategory(manual)) {
        this.logger.success(`Manual category assigned: ${manual}`);
        this.updateStats(manual, true);
        this.logger.updateOperation(operationId, 'completed', { category: manual, method: 'manual' });
        return manual;
      }

      // Try different categorization methods
      const methods = [
        { name: 'bookInfo', fn: () => this.categorizeByBookInfo(bookInfo) },
        { name: 'metadata', fn: () => this.categorizeByMetadata(metadata) },
        { name: 'filename', fn: () => this.categorizeByFilename(imagePath) },
        { name: 'content', fn: () => this.categorizeByContent(imagePath, context) }
      ];

      for (const method of methods) {
        try {
          this.logger.debug(`Trying categorization method: ${method.name}`);
          const category = await method.fn();

          if (category && this.isValidCategory(category)) {
            this.logger.success(`Categorized as: ${category}`, { method: method.name });
            this.updateStats(category, true);
            this.logger.updateOperation(operationId, 'completed', { category, method: method.name });
            return category;
          }
        } catch (error) {
          this.logger.warn(`Categorization method '${method.name}' failed`, { error: error.message });
          continue;
        }
      }

      // Default to general if no category found
      this.logger.warn('No specific category found, using default', { defaultCategory: 'general' });
      this.updateStats('general', true);
      this.logger.updateOperation(operationId, 'completed', { category: 'general', method: 'default' });
      return 'general';

    } catch (error) {
      this.updateStats(null, false);
      this.logger.updateOperation(operationId, 'failed', { error: error.message });
      this.logger.error(`Categorization failed for ${path.basename(imagePath)}`, error);
      throw error;
    }
  }

  async categorizeByBookInfo(bookInfo) {
    if (!bookInfo) {
      this.logger.debug('No book info provided for categorization');
      return null;
    }

    this.logger.debug('Analyzing book information for categorization', {
      hasTitle: !!bookInfo.title,
      hasAuthors: !!(bookInfo.authors?.length),
      hasCategories: !!(bookInfo.categories?.length),
      hasDescription: !!bookInfo.description
    });

    try {
      const { title, authors, categories, description, subjects } = bookInfo;
      const searchText = [
        title,
        ...(authors || []),
        ...(categories || []),
        description,
        ...(subjects || [])
      ].filter(Boolean).join(' ').toLowerCase();

      if (!searchText.trim()) {
        this.logger.warn('Book info contains no searchable text');
        return null;
      }

      // Check each collection's keywords
      for (const [collection, keywords] of Object.entries(this.categories)) {
        if (!keywords || keywords.length === 0) continue; // Skip collections without keywords

        for (const keyword of keywords) {
          if (searchText.includes(keyword.toLowerCase())) {
            this.logger.info(`Book info matched keyword "${keyword}"`, {
              collection,
              keyword,
              matchedIn: 'bookInfo'
            });
            return collection;
          }
        }
      }

      this.logger.debug('No matching keywords found in book info');
      return null;

    } catch (error) {
      this.logger.error('Error during book info categorization', error);
      return null;
    }
  }

  async categorizeByMetadata(metadata) {
    if (!metadata) return null;
    
    console.log(`🔍 Analyzing image metadata...`);
    
    const { title, description, keywords, subject } = metadata;
    const searchText = [title, description, keywords, subject]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    // Check collection keywords against metadata
    for (const [collection, keywords] of Object.entries(this.categories)) {
      if (keywords.length === 0) continue;
      
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          console.log(`🖼️  Metadata matched "${keyword}" → ${collection}`);
          return collection;
        }
      }
    }

    return null;
  }

  async categorizeByFilename(imagePath) {
    console.log(`🔍 Analyzing filename...`);
    
    const filename = path.basename(imagePath, path.extname(imagePath)).toLowerCase();
    
    // Check for collection names in filename
    for (const collection of Object.keys(this.categories)) {
      const collectionName = collection.replace(/-/g, '');
      if (filename.includes(collectionName) || filename.includes(collection)) {
        console.log(`📁 Filename matched "${collection}"`);
        return collection;
      }
    }

    // Check for collection keywords in filename
    for (const [collection, keywords] of Object.entries(this.categories)) {
      for (const keyword of keywords) {
        if (filename.includes(keyword.toLowerCase().replace(/\s+/g, ''))) {
          console.log(`📁 Filename keyword matched "${keyword}" → ${collection}`);
          return collection;
        }
      }
    }

    return null;
  }

  async categorizeByContent(imagePath, context = {}) {
    console.log(`🔍 Analyzing image content...`);
    
    try {
      // Check if image is in a specific directory that gives us hints
      const relativePath = path.relative(this.config.directories.assets, imagePath);
      const pathParts = relativePath.split(path.sep);
      
      // If already in a collection directory, use that
      if (pathParts.length > 1 && this.isValidCategory(pathParts[0])) {
        console.log(`📂 Found in directory: ${pathParts[0]}`);
        return pathParts[0];
      }

      // Basic content analysis based on file characteristics
      const contentHints = await this.analyzeImageCharacteristics(imagePath);
      if (contentHints.length > 0) {
        console.log(`🎨 Content analysis suggests: ${contentHints.join(', ')}`);
        
        // Return the first valid category found
        for (const hint of contentHints) {
          if (this.isValidCategory(hint)) {
            return hint;
          }
        }
      }
      
      return null;
      
    } catch (error) {
      console.log(`⚠️  Content analysis failed: ${error.message}`);
      return null;
    }
  }

  async analyzeImageCharacteristics(imagePath) {
    const hints = [];
    
    try {
      const stats = await fs.stat(imagePath);
      const buffer = await fs.readFile(imagePath);
      
      // Basic file size and dimension analysis
      const fileSize = stats.size;
      const filename = path.basename(imagePath).toLowerCase();
      
      // Large files might be high-quality art/fashion images
      if (fileSize > 5 * 1024 * 1024) { // > 5MB
        hints.push('art', 'fashion');
      }
      
      // Aspect ratio analysis (if we can get dimensions)
      const dimensions = await this.getImageDimensions(buffer, imagePath);
      if (dimensions) {
        const aspectRatio = dimensions.width / dimensions.height;
        
        // Square or near-square images often album covers or fashion
        if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
          hints.push('music', 'fashion');
        }
        
        // Wide landscape images might be NYC photography
        if (aspectRatio > 1.5) {
          hints.push('nyc', 'posters-and-paper');
        }
        
        // Portrait orientation might be book covers
        if (aspectRatio < 0.8) {
          hints.push('books-on-books');
        }
        
        // Very large images might be posters
        if (dimensions.width > 2000 || dimensions.height > 2000) {
          hints.push('posters-and-paper', 'art');
        }
      }
      
      // File naming pattern analysis
      if (filename.includes('poster') || filename.includes('print')) {
        hints.push('posters-and-paper');
      }
      
      if (filename.includes('cover') || filename.includes('book')) {
        hints.push('books-on-books');
      }
      
      if (filename.includes('fashion') || filename.includes('style')) {
        hints.push('fashion');
      }
      
      if (filename.includes('nyc') || filename.includes('newyork') || filename.includes('manhattan')) {
        hints.push('nyc');
      }
      
      if (filename.includes('music') || filename.includes('album') || filename.includes('concert')) {
        hints.push('music');
      }
      
      if (filename.includes('collage') || filename.includes('mixed')) {
        hints.push('collage');
      }
      
      if (filename.includes('art') || filename.includes('gallery')) {
        hints.push('art');
      }
      
      if (filename.includes('queer') || filename.includes('lgbt') || filename.includes('pride')) {
        hints.push('queer');
      }
      
      return [...new Set(hints)]; // Remove duplicates
      
    } catch (error) {
      console.log(`⚠️  Image characteristics analysis failed: ${error.message}`);
      return [];
    }
  }

  async getImageDimensions(buffer, imagePath) {
    try {
      const ext = path.extname(imagePath).toLowerCase();
      
      if (ext === '.jpg' || ext === '.jpeg') {
        return this.extractJPEGDimensions(buffer);
      }
      
      if (ext === '.png') {
        return this.extractPNGDimensions(buffer);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  extractJPEGDimensions(buffer) {
    try {
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

  async categorizeMultiple(imagePaths, contexts = []) {
    console.log(`🏷️  Batch categorizing ${imagePaths.length} images...`);
    
    const results = [];
    
    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const context = contexts[i] || {};
      
      try {
        const category = await this.categorizeImage(imagePath, context);
        results.push({
          success: true,
          imagePath,
          category,
          context
        });
      } catch (error) {
        console.error(`❌ Failed to categorize ${imagePath}: ${error.message}`);
        results.push({
          success: false,
          imagePath,
          error: error.message,
          context
        });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Successfully categorized ${successful}/${imagePaths.length} images`);
    
    return results;
  }

  async organizeByCategory(imagePaths, categories) {
    console.log(`📂 Organizing images by category...`);
    
    if (imagePaths.length !== categories.length) {
      throw new Error('Image paths and categories arrays must have the same length');
    }

    const organized = {};
    const results = [];

    for (let i = 0; i < imagePaths.length; i++) {
      const imagePath = imagePaths[i];
      const category = categories[i];
      
      try {
        // Ensure category directory exists
        const categoryDir = path.join(this.config.directories.assets, category);
        await fs.mkdir(categoryDir, { recursive: true });
        
        // Generate organized filename
        const filename = path.basename(imagePath);
        const targetPath = path.join(categoryDir, filename);
        
        // Move file
        await fs.rename(imagePath, targetPath);
        
        // Track organization
        if (!organized[category]) {
          organized[category] = [];
        }
        organized[category].push(targetPath);
        
        results.push({
          success: true,
          originalPath: imagePath,
          newPath: targetPath,
          category
        });
        
        console.log(`📁 ${path.basename(imagePath)} → ${category}/`);
        
      } catch (error) {
        console.error(`❌ Failed to organize ${imagePath}: ${error.message}`);
        results.push({
          success: false,
          originalPath: imagePath,
          category,
          error: error.message
        });
      }
    }

    console.log(`📊 Organization summary:`);
    for (const [category, files] of Object.entries(organized)) {
      console.log(`   ${category}: ${files.length} files`);
    }

    return { organized, results };
  }

  async suggestCategories(imagePath, context = {}, limit = 3) {
    console.log(`💡 Suggesting categories for: ${path.basename(imagePath)}`);
    
    const suggestions = [];
    
    // Try each categorization method and collect scores
    const methods = [
      { name: 'bookInfo', fn: () => this.categorizeByBookInfo(context.bookInfo) },
      { name: 'metadata', fn: () => this.categorizeByMetadata(context.metadata) },
      { name: 'filename', fn: () => this.categorizeByFilename(imagePath) }
    ];

    for (const method of methods) {
      try {
        const category = await method.fn();
        if (category && this.isValidCategory(category)) {
          const existing = suggestions.find(s => s.category === category);
          if (existing) {
            existing.confidence += 0.3;
            existing.methods.push(method.name);
          } else {
            suggestions.push({
              category,
              confidence: 0.7,
              methods: [method.name]
            });
          }
        }
      } catch (error) {
        continue;
      }
    }

    // Add general keyword matching for all categories
    const searchTerms = this.extractSearchTerms(imagePath, context);
    for (const [collection, keywords] of Object.entries(this.categories)) {
      if (keywords.length === 0) continue;
      
      let matches = 0;
      for (const keyword of keywords) {
        if (searchTerms.toLowerCase().includes(keyword.toLowerCase())) {
          matches++;
        }
      }
      
      if (matches > 0) {
        const existing = suggestions.find(s => s.category === collection);
        const confidence = Math.min(0.9, 0.3 + (matches * 0.2));
        
        if (existing) {
          existing.confidence = Math.max(existing.confidence, confidence);
          existing.methods.push('keywords');
        } else {
          suggestions.push({
            category: collection,
            confidence,
            methods: ['keywords'],
            matches
          });
        }
      }
    }

    // Sort by confidence and return top suggestions
    suggestions.sort((a, b) => b.confidence - a.confidence);
    const topSuggestions = suggestions.slice(0, limit);
    
    console.log(`💡 Top suggestions:`);
    topSuggestions.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.category} (${Math.round(s.confidence * 100)}% confidence)`);
    });

    return topSuggestions;
  }

  extractSearchTerms(imagePath, context = {}) {
    const terms = [];
    
    // From filename
    terms.push(path.basename(imagePath, path.extname(imagePath)));
    
    // From book info
    if (context.bookInfo) {
      const { title, authors, categories, description } = context.bookInfo;
      terms.push(title, ...(authors || []), ...(categories || []), description);
    }
    
    // From metadata
    if (context.metadata) {
      const { title, description, keywords } = context.metadata;
      terms.push(title, description, keywords);
    }
    
    return terms.filter(Boolean).join(' ');
  }

  isValidCategory(category) {
    return Object.keys(this.categories).includes(category) || category === 'general';
  }

  getAvailableCategories() {
    return [...Object.keys(this.categories), 'general'];
  }

  getCategoryKeywords(category) {
    return this.categories[category] || [];
  }

  async getCategoryStats() {
    const stats = {};

    for (const category of this.getAvailableCategories()) {
      const categoryDir = path.join(this.config.directories.assets, category);

      try {
        const files = await fs.readdir(categoryDir);
        const imageFiles = files.filter(file =>
          this.config.supportedTypes.includes(path.extname(file).toLowerCase())
        );

        stats[category] = {
          count: imageFiles.length,
          files: imageFiles
        };
      } catch (error) {
        stats[category] = {
          count: 0,
          files: [],
          error: error.message
        };
      }
    }

    return stats;
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
  updateStats(category, success) {
    this.stats.totalProcessed++;
    this.stats.lastProcessedAt = new Date().toISOString();

    if (success) {
      this.stats.successful++;
      if (category) {
        this.stats.categoryCounts[category] = (this.stats.categoryCounts[category] || 0) + 1;
      }
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
      mostUsedCategory: Object.keys(this.stats.categoryCounts).reduce((a, b) =>
        this.stats.categoryCounts[a] > this.stats.categoryCounts[b] ? a : b, null)
    };
  }

  /**
   * Validate categorizer configuration
   */
  validateConfig() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check if categories are defined
    if (!this.categories || Object.keys(this.categories).length === 0) {
      validation.errors.push('No categories defined in configuration');
      validation.isValid = false;
    }

    // Check if directories exist
    if (!this.config.directories?.assets) {
      validation.errors.push('Assets directory not configured');
      validation.isValid = false;
    }

    // Check supported types
    if (!this.config.supportedTypes || this.config.supportedTypes.length === 0) {
      validation.warnings.push('No supported file types defined');
    }

    return validation;
  }

  /**
   * Run tests to verify categorizer functionality
   */
  async runTests() {
    this.logger.info('Running categorizer tests...');

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

    // Test 2: Category validation
    try {
      const validCategories = this.getAvailableCategories();
      if (validCategories.length > 0) {
        testResults.tests.push({ name: 'Category validation', status: 'passed' });
        testResults.passed++;
      } else {
        testResults.tests.push({
          name: 'Category validation',
          status: 'failed',
          error: 'No valid categories available'
        });
        testResults.failed++;
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Category validation',
        status: 'failed',
        error: error.message
      });
      testResults.failed++;
    }

    // Test 3: Book info categorization
    try {
      const testBookInfo = {
        title: 'Test Book',
        authors: ['Test Author'],
        categories: ['test'],
        description: 'A test book for testing'
      };

      await this.categorizeByBookInfo(testBookInfo);
      testResults.tests.push({ name: 'Book info categorization', status: 'passed' });
      testResults.passed++;
    } catch (error) {
      testResults.tests.push({
        name: 'Book info categorization',
        status: 'failed',
        error: error.message
      });
      testResults.failed++;
    }

    this.logger.info(`Categorizer tests completed: ${testResults.passed} passed, ${testResults.failed} failed`);
    return testResults;
  }

  /**
   * Clean up and generate final report
   */
  async cleanup() {
    const stats = this.getModuleStats();
    this.logger.info('Image categorizer cleanup completed', stats);
  }
}

module.exports = ImageCategorizer;