// Image Categorization and Organization Module
const fs = require('fs').promises;
const path = require('path');

class ImageCategorizer {
  constructor(config) {
    this.config = config;
    this.categories = config.collections;
  }

  async categorizeImage(imagePath, context = {}) {
    console.log(`🏷️  Categorizing: ${path.basename(imagePath)}`);
    
    const { metadata, bookInfo, manual } = context;
    
    // If manually specified, use that
    if (manual && this.isValidCategory(manual)) {
      console.log(`✅ Manual category: ${manual}`);
      return manual;
    }

    // Try different categorization methods
    const methods = [
      () => this.categorizeByBookInfo(bookInfo),
      () => this.categorizeByMetadata(metadata),
      () => this.categorizeByFilename(imagePath),
      () => this.categorizeByContent(imagePath, context)
    ];

    for (const method of methods) {
      try {
        const category = await method();
        if (category && this.isValidCategory(category)) {
          console.log(`✅ Categorized as: ${category}`);
          return category;
        }
      } catch (error) {
        console.log(`⚠️  Categorization method failed: ${error.message}`);
        continue;
      }
    }

    // Default to general if no category found
    console.log(`⚠️  No specific category found, using 'general'`);
    return 'general';
  }

  async categorizeByBookInfo(bookInfo) {
    if (!bookInfo) return null;
    
    console.log(`🔍 Analyzing book info...`);
    
    const { title, authors, categories, description, subjects } = bookInfo;
    const searchText = [
      title,
      ...(authors || []),
      ...(categories || []),
      description,
      ...(subjects || [])
    ].filter(Boolean).join(' ').toLowerCase();

    // Check each collection's keywords
    for (const [collection, keywords] of Object.entries(this.categories)) {
      if (keywords.length === 0) continue; // Skip collections without keywords
      
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          console.log(`📚 Matched "${keyword}" → ${collection}`);
          return collection;
        }
      }
    }

    return null;
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
    
    // This is a placeholder for future ML/AI-based image content analysis
    // Could integrate with services like Google Cloud Vision, AWS Rekognition, etc.
    
    try {
      // Check if image is in a specific directory that gives us hints
      const relativePath = path.relative(this.config.directories.assets, imagePath);
      const pathParts = relativePath.split(path.sep);
      
      // If already in a collection directory, use that
      if (pathParts.length > 1 && this.isValidCategory(pathParts[0])) {
        console.log(`📂 Found in directory: ${pathParts[0]}`);
        return pathParts[0];
      }

      // TODO: Implement actual content analysis
      // - OCR for text in images
      // - Object detection
      // - Style analysis
      // - Color analysis
      
      return null;
      
    } catch (error) {
      console.log(`⚠️  Content analysis failed: ${error.message}`);
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
          files: []
        };
      }
    }
    
    return stats;
  }
}

module.exports = ImageCategorizer;