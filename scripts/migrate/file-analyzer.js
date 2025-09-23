/**
 * File Analyzer for Migration
 *
 * Analyzes existing codebase to identify files that need migration
 * and their dependencies on old patterns.
 */

const fs = require('fs').promises;
const path = require('path');

class FileAnalyzer {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.analysisResults = {
      bookApiUsage: [],
      imageProcessing: [],
      configUsage: [],
      loggingCandidates: [],
      cachingCandidates: []
    };
  }

  async analyzeCodebase() {
    console.log('🔍 Analyzing codebase for migration candidates...');

    const jsFiles = await this.findJavaScriptFiles();

    for (const filePath of jsFiles) {
      await this.analyzeFile(filePath);
    }

    return this.analysisResults;
  }

  async findJavaScriptFiles() {
    const files = [];
    const searchDirs = [
      path.join(this.projectRoot, 'scripts'),
      path.join(this.projectRoot, 'src'),
      path.join(this.projectRoot, 'utils')
    ];

    for (const dir of searchDirs) {
      try {
        const dirFiles = await this.findFilesRecursively(dir, /\.(js|ts)$/);
        files.push(...dirFiles);
      } catch (error) {
        // Directory might not exist, continue
      }
    }

    // Filter out node_modules and .git
    return files.filter(file =>
      !file.includes('node_modules') &&
      !file.includes('.git') &&
      !file.includes('backup')
    );
  }

  async findFilesRecursively(dir, pattern) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...await this.findFilesRecursively(fullPath, pattern));
        } else if (entry.isFile() && pattern.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors or missing directories
    }

    return files;
  }

  async analyzeFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(this.projectRoot, filePath);

      // Analyze for book API usage
      if (this.hasBookApiPatterns(content)) {
        this.analysisResults.bookApiUsage.push({
          file: relativePath,
          patterns: this.extractBookApiPatterns(content),
          priority: this.calculatePriority(content, 'bookApi')
        });
      }

      // Analyze for image processing
      if (this.hasImageProcessingPatterns(content)) {
        this.analysisResults.imageProcessing.push({
          file: relativePath,
          patterns: this.extractImageProcessingPatterns(content),
          priority: this.calculatePriority(content, 'imageProcessing')
        });
      }

      // Analyze for config usage
      if (this.hasConfigPatterns(content)) {
        this.analysisResults.configUsage.push({
          file: relativePath,
          patterns: this.extractConfigPatterns(content),
          priority: this.calculatePriority(content, 'config')
        });
      }

      // Analyze for logging candidates
      if (this.hasLoggingPatterns(content)) {
        this.analysisResults.loggingCandidates.push({
          file: relativePath,
          patterns: this.extractLoggingPatterns(content),
          priority: this.calculatePriority(content, 'logging')
        });
      }

      // Analyze for caching candidates
      if (this.hasCachingPatterns(content)) {
        this.analysisResults.cachingCandidates.push({
          file: relativePath,
          patterns: this.extractCachingPatterns(content),
          priority: this.calculatePriority(content, 'caching')
        });
      }

    } catch (error) {
      console.warn('⚠️  Could not analyze ${filePath}: ' + error.message);
    }
  }

  hasBookApiPatterns(content) {
    const patterns = [
      /fetch\(['"`]https:\/\/openlibrary\.org/,
      /fetch\(['"`]https:\/\/www\.googleapis\.com\/books/,
      /axios\.get\(['"`]https:\/\/openlibrary\.org/,
      /axios\.get\(['"`]https:\/\/www\.googleapis\.com\/books/,
      /isbn.*api/i,
      /book.*search/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  extractBookApiPatterns(content) {
    const patterns = [];

    if (/openlibrary\.org/.test(content)) {
      patterns.push('Open Library API usage');
    }
    if (/googleapis\.com\/books/.test(content)) {
      patterns.push('Google Books API usage');
    }
    if (/isbn/i.test(content)) {
      patterns.push('ISBN processing');
    }

    return patterns;
  }

  hasImageProcessingPatterns(content) {
    const patterns = [
      /sharp\(/,
      /\.resize\(/,
      /\.jpeg\(/,
      /\.png\(/,
      /\.webp\(/,
      /image.*optimize/i,
      /cover.*process/i,
      /thumbnail/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  extractImageProcessingPatterns(content) {
    const patterns = [];

    if (/sharp/.test(content)) {
      patterns.push('Sharp image processing');
    }
    if (/resize/.test(content)) {
      patterns.push('Image resizing');
    }
    if (/optimize/i.test(content)) {
      patterns.push('Image optimization');
    }
    if (/thumbnail/i.test(content)) {
      patterns.push('Thumbnail generation');
    }

    return patterns;
  }

  hasConfigPatterns(content) {
    const patterns = [
      /['"`]\.\.\/.*\/images\/books['"`]/,
      /['"`]\.\.\/.*\/covers['"`]/,
      /path\.join.*assets/,
      /hardcoded.*path/i,
      /config.*directory/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  extractConfigPatterns(content) {
    const patterns = [];

    if (/images\/books/.test(content)) {
      patterns.push('Hardcoded books directory');
    }
    if (/covers/.test(content)) {
      patterns.push('Hardcoded covers directory');
    }
    if (/assets/.test(content)) {
      patterns.push('Assets path usage');
    }

    return patterns;
  }

  hasLoggingPatterns(content) {
    const patterns = [
      /console\.log/,
      /console\.error/,
      /console\.warn/,
      /console\.info/
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  extractLoggingPatterns(content) {
    const patterns = [];
    const logCount = (content.match(/console\./g) || []).length;

    if (logCount > 5) {
      patterns.push(`High console usage (${logCount} calls)`);
    } else if (logCount > 0) {
      patterns.push(`Console usage (${logCount} calls)`);
    }

    return patterns;
  }

  hasCachingPatterns(content) {
    const patterns = [
      /image.*download/i,
      /api.*request/i,
      /fetch.*book/i,
      /expensive.*operation/i,
      /cache/i
    ];

    return patterns.some(pattern => pattern.test(content));
  }

  extractCachingPatterns(content) {
    const patterns = [];

    if (/download/i.test(content)) {
      patterns.push('Download operations');
    }
    if (/api.*request/i.test(content)) {
      patterns.push('API requests');
    }
    if (/fetch/i.test(content)) {
      patterns.push('Network fetching');
    }

    return patterns;
  }

  calculatePriority(content, type) {
    let score = 0;

    // Base priority by type
    const typeScores = {
      bookApi: 3,
      imageProcessing: 4,
      config: 2,
      logging: 1,
      caching: 3
    };

    score += typeScores[type] || 1;

    // Increase priority based on usage frequency
    const usageCount = (content.match(/console\.|fetch\(|sharp\(/g) || []).length;
    score += Math.min(usageCount / 5, 3);

    // File size factor
    const lineCount = content.split('\n').length;
    if (lineCount > 200) score += 2;
    else if (lineCount > 100) score += 1;

    return Math.min(score, 5); // Cap at 5
  }

  generateAnalysisReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: Object.values(this.analysisResults).reduce((sum, arr) => sum + arr.length, 0),
        bookApiFiles: this.analysisResults.bookApiUsage.length,
        imageProcessingFiles: this.analysisResults.imageProcessing.length,
        configFiles: this.analysisResults.configUsage.length,
        loggingCandidates: this.analysisResults.loggingCandidates.length,
        cachingCandidates: this.analysisResults.cachingCandidates.length
      },
      details: this.analysisResults,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Book API recommendations
    if (this.analysisResults.bookApiUsage.length > 0) {
      recommendations.push({
        category: 'Book API Migration',
        priority: 'High',
        description: `${this.analysisResults.bookApiUsage.length} files using external book APIs should be migrated to use book-api-client.js`,
        files: this.analysisResults.bookApiUsage.map(f => f.file)
      });
    }

    // Image processing recommendations
    if (this.analysisResults.imageProcessing.length > 0) {
      recommendations.push({
        category: 'Image Processing Migration',
        priority: 'High',
        description: `${this.analysisResults.imageProcessing.length} files with image processing should use image-core.js`,
        files: this.analysisResults.imageProcessing.map(f => f.file)
      });
    }

    // Config recommendations
    if (this.analysisResults.configUsage.length > 0) {
      recommendations.push({
        category: 'Configuration Centralization',
        priority: 'Medium',
        description: `${this.analysisResults.configUsage.length} files with hardcoded paths should use centralized config`,
        files: this.analysisResults.configUsage.map(f => f.file)
      });
    }

    // Logging recommendations
    if (this.analysisResults.loggingCandidates.length > 3) {
      recommendations.push({
        category: 'Logging Integration',
        priority: 'Low',
        description: `${this.analysisResults.loggingCandidates.length} files could benefit from structured logging`,
        files: this.analysisResults.loggingCandidates.slice(0, 5).map(f => f.file)
      });
    }

    return recommendations;
  }
}

module.exports = FileAnalyzer;