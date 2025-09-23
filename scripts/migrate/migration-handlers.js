/**
 * Migration Handlers
 *
 * Specific handlers for different types of code migrations
 */

const fs = require('fs').promises;
const path = require('path');

class MigrationHandlers {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }

  /**
   * Migrate file to use book-api-client.js
   */
  async migrateBookApiUsage(filePath) {
    const content = await fs.readFile(filePath, 'utf8');

    // Check if already migrated
    if (content.includes('book-api-client.js')) {
      return { migrated: false, reason: 'Already uses book-api-client.js' };
    }

    let newContent = content;
    const changes = [];

    // Add import statement
    const importStatement = "const BookApiClient = require('../utils/book-api-client.js');
";

    if (newContent.includes('require(')) {
      // Add after existing requires
      const requireLines = newContent.split('\\n').filter(line => line.includes('require('));
      const lastRequireLine = requireLines[requireLines.length - 1];
      const lastRequireIndex = newContent.lastIndexOf(lastRequireLine);
      const lineEnd = newContent.indexOf('\\n', lastRequireIndex);

      newContent = newContent.slice(0, lineEnd + 1) + importStatement + newContent.slice(lineEnd + 1);
    } else {
      // Add at the beginning after shebang
      if (newContent.startsWith('#!')) {
        const firstLineEnd = newContent.indexOf('\\n');
        newContent = newContent.slice(0, firstLineEnd + 1) + '
' + importStatement + newContent.slice(firstLineEnd + 1);
      } else {
        newContent = importStatement + '
' + newContent;
      }
    }

    changes.push('Added BookApiClient import');

    // Replace Open Library API calls
    const openLibraryPattern = /fetch\(\s*['"`]https:\/\/openlibrary\.org\/api\/books\?bibkeys=ISBN:([^&'"]+)[^)]*\)/g;
    let match;
    while ((match = openLibraryPattern.exec(content)) !== null) {
      const isbn = match[1];
      const replacement = `BookApiClient.searchByISBN('${isbn}')`;
      newContent = newContent.replace(match[0], replacement);
      changes.push(`Replaced Open Library API call for ISBN ${isbn}`);
    }

    // Replace Google Books API calls
    const googleBooksPattern = /fetch\(\s*['"`]https:\/\/www\.googleapis\.com\/books\/v1\/volumes\?q=([^'"&)]+)[^)]*\)/g;
    while ((match = googleBooksPattern.exec(content)) !== null) {
      const query = match[1];
      const replacement = `BookApiClient.searchGoogleBooks('${query}')`;
      newContent = newContent.replace(match[0], replacement);
      changes.push(`Replaced Google Books API call for query ${query}`);
    }

    // Replace direct ISBN searches
    const isbnSearchPattern = /isbn\s*:\s*['"`]([^'"]+)['"`]/gi;
    while ((match = isbnSearchPattern.exec(content)) !== null) {
      const isbn = match[1];
      if (!newContent.includes(`BookApiClient.searchByISBN('${isbn}')`)) {
        changes.push(`Found ISBN search pattern: ${isbn}`);
      }
    }

    // Add initialization if class-based
    if (newContent.includes('class ') && newContent.includes('constructor')) {
      const constructorMatch = newContent.match(/constructor\s*\([^)]*\)\s*\{/);
      if (constructorMatch && !newContent.includes('this.bookApiClient')) {
        const insertPoint = constructorMatch.index + constructorMatch[0].length;
        const initStatement = '
    this.bookApiClient = new BookApiClient();';
        newContent = newContent.slice(0, insertPoint) + initStatement + newContent.slice(insertPoint);
        changes.push('Added BookApiClient initialization in constructor');
      }
    }

    await fs.writeFile(filePath, newContent);

    return {
      migrated: true,
      changes: changes,
      linesChanged: newContent.split('\\n').length - content.split('\\n').length
    };
  }

  /**
   * Migrate file to use image-core.js
   */
  async migrateImageProcessing(filePath) {
    const content = await fs.readFile(filePath, 'utf8');

    if (content.includes('image-core.js')) {
      return { migrated: false, reason: 'Already uses image-core.js' };
    }

    let newContent = content;
    const changes = [];

    // Add import
    const importStatement = "const ImageCore = require('../utils/image-core.js');
";
    newContent = this.addImportStatement(newContent, importStatement);
    changes.push('Added ImageCore import');

    // Replace Sharp operations
    const sharpPatterns = [
      {
        pattern: /sharp\(([^)]+)\)\.resize\((\d+),?\s*(\d+)?\)/g,
        replacement: (match, imagePath, width, height) => {
          const options = height ? `{ width: ${width}, height: ${height} }` : `{ width: ${width} }`;
          return `ImageCore.resizeImage(${imagePath}, ${options})`;
        },
        description: 'resize operations'
      },
      {
        pattern: /sharp\(([^)]+)\)\.jpeg\(([^)]*)\)/g,
        replacement: (match, imagePath, options) => {
          return `ImageCore.optimizeImage(${imagePath}, { format: 'jpeg'${options ? ', ' + options : ''} })`;
        },
        description: 'JPEG optimization'
      },
      {
        pattern: /sharp\(([^)]+)\)\.png\(([^)]*)\)/g,
        replacement: (match, imagePath, options) => {
          return `ImageCore.optimizeImage(${imagePath}, { format: 'png'${options ? ', ' + options : ''} })`;
        },
        description: 'PNG optimization'
      },
      {
        pattern: /sharp\(([^)]+)\)\.webp\(([^)]*)\)/g,
        replacement: (match, imagePath, options) => {
          return `ImageCore.optimizeImage(${imagePath}, { format: 'webp'${options ? ', ' + options : ''} })`;
        },
        description: 'WebP optimization'
      }
    ];

    for (const { pattern, replacement, description } of sharpPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        newContent = newContent.replace(pattern, replacement);
        changes.push(`Replaced Sharp ${description} (${matches.length} instances)`);
      }
    }

    // Replace manual thumbnail generation
    const thumbnailPattern = /\.resize\((\d+),?\s*(\d+)?\).*\.toFile\(([^)]+)\)/g;
    let match;
    while ((match = thumbnailPattern.exec(content)) !== null) {
      const [fullMatch, width, height, outputPath] = match;
      const options = height ? `{ width: ${width}, height: ${height} }` : `{ width: ${width} }`;
      const replacement = `ImageCore.generateThumbnail(inputPath, ${outputPath}, ${options})`;
      newContent = newContent.replace(fullMatch, replacement);
      changes.push('Replaced manual thumbnail generation');
    }

    await fs.writeFile(filePath, newContent);

    return {
      migrated: true,
      changes: changes,
      linesChanged: newContent.split('\\n').length - content.split('\\n').length
    };
  }

  /**
   * Migrate file to use centralized config
   */
  async migrateConfigUsage(filePath) {
    const content = await fs.readFile(filePath, 'utf8');

    if (content.includes('image-config.js')) {
      return { migrated: false, reason: 'Already uses centralized config' };
    }

    let newContent = content;
    const changes = [];

    // Add config import
    const importStatement = "const imageConfig = require('../config/image-config.js');
";
    newContent = this.addImportStatement(newContent, importStatement);
    changes.push('Added centralized config import');

    // Replace hardcoded paths
    const pathReplacements = [
      {
        pattern: /['"`]\.\.\/src\/assets\/images\/books\/?['"`]/g,
        replacement: 'imageConfig.directories.books',
        description: 'books directory path'
      },
      {
        pattern: /['"`]\.\.\/.*\/covers\/?['"`]/g,
        replacement: 'imageConfig.directories.covers',
        description: 'covers directory path'
      },
      {
        pattern: /['"`]\.\.\/.*\/optimized\/?['"`]/g,
        replacement: 'imageConfig.directories.optimized',
        description: 'optimized directory path'
      },
      {
        pattern: /['"`]\.\.\/.*\/thumbnails\/?['"`]/g,
        replacement: 'imageConfig.directories.thumbnails',
        description: 'thumbnails directory path'
      }
    ];

    for (const { pattern, replacement, description } of pathReplacements) {
      const matches = content.match(pattern);
      if (matches) {
        newContent = newContent.replace(pattern, replacement);
        changes.push(`Replaced hardcoded ${description} (${matches.length} instances)`);
      }
    }

    // Replace hardcoded image sizes
    const sizePattern = /\b(200|300|400|800|1200)\b/g;
    const sizesInContent = content.match(sizePattern);
    if (sizesInContent && sizesInContent.length > 2) {
      // Only replace if there are multiple size references (likely configuration)
      changes.push('Found hardcoded image sizes - consider using imageConfig.sizes');
    }

    await fs.writeFile(filePath, newContent);

    return {
      migrated: true,
      changes: changes,
      linesChanged: newContent.split('\\n').length - content.split('\\n').length
    };
  }

  /**
   * Add logger integration to file
   */
  async addLoggerIntegration(filePath) {
    const content = await fs.readFile(filePath, 'utf8');

    if (content.includes('logger.js') || content.includes('Logger')) {
      return { migrated: false, reason: 'Already has logger integration' };
    }

    // Check if file has enough console statements to warrant logger
    const consoleCount = (content.match(/console\./g) || []).length;
    if (consoleCount < 3) {
      return { migrated: false, reason: 'Insufficient console usage to warrant logger' };
    }

    let newContent = content;
    const changes = [];

    // Add logger import
    const importStatement = "const Logger = require('../utils/logger.js');
";
    newContent = this.addImportStatement(newContent, importStatement);
    changes.push('Added Logger import');

    // Add logger initialization
    const filename = path.basename(filePath, '.js');
    const loggerInit = `const logger = new Logger({ component: '${filename}' });
`;

    // Find a good place to add initialization
    const firstFunctionIndex = newContent.search(/(function|class|\w+\s*=\s*(async\s+)?function)/);
    if (firstFunctionIndex !== -1) {
      newContent = newContent.slice(0, firstFunctionIndex) + loggerInit + '
' + newContent.slice(firstFunctionIndex);
    } else {
      // Add after imports
      const lastImportIndex = newContent.lastIndexOf('require(');
      if (lastImportIndex !== -1) {
        const lineEnd = newContent.indexOf('\\n', lastImportIndex);
        newContent = newContent.slice(0, lineEnd + 1) + loggerInit + newContent.slice(lineEnd + 1);
      }
    }

    changes.push('Added logger initialization');

    // Replace console calls
    const replacements = [
      { pattern: /console\.log\(/g, replacement: 'logger.info(', description: 'console.log' },
      { pattern: /console\.error\(/g, replacement: 'logger.error(', description: 'console.error' },
      { pattern: /console\.warn\(/g, replacement: 'logger.warn(', description: 'console.warn' },
      { pattern: /console\.info\(/g, replacement: 'logger.info(', description: 'console.info' }
    ];

    for (const { pattern, replacement, description } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        newContent = newContent.replace(pattern, replacement);
        changes.push(`Replaced ${description} (${matches.length} instances)`);
      }
    }

    await fs.writeFile(filePath, newContent);

    return {
      migrated: true,
      changes: changes,
      linesChanged: newContent.split('\\n').length - content.split('\\n').length
    };
  }

  /**
   * Add image cache integration to file
   */
  async addImageCacheIntegration(filePath) {
    const content = await fs.readFile(filePath, 'utf8');

    if (content.includes('image-cache.js') || content.includes('ImageCache')) {
      return { migrated: false, reason: 'Already has image cache integration' };
    }

    // Check if file handles images or downloads
    const imagePatterns = ['image', 'cover', 'download', 'fetch', 'api'];
    const hasImageHandling = imagePatterns.some(pattern =>
      content.toLowerCase().includes(pattern)
    );

    if (!hasImageHandling) {
      return { migrated: false, reason: 'File does not handle images or downloads' };
    }

    let newContent = content;
    const changes = [];

    // Add cache import
    const importStatement = "const ImageCache = require('../utils/image-cache.js');
";
    newContent = this.addImportStatement(newContent, importStatement);
    changes.push('Added ImageCache import');

    // Add cache initialization
    const cacheInit = `const imageCache = new ImageCache();
`;

    // Find good place for initialization
    const lastImportIndex = newContent.lastIndexOf('require(');
    if (lastImportIndex !== -1) {
      const lineEnd = newContent.indexOf('\\n', lastImportIndex);
      newContent = newContent.slice(0, lineEnd + 1) + cacheInit + newContent.slice(lineEnd + 1);
    }

    changes.push('Added image cache initialization');

    // Add cache usage hints in comments
    const cacheHints = `\n// TODO: Consider adding cache usage:
// - imageCache.get(key) to check for cached images
// - imageCache.set(key, data) to cache downloaded images
// - imageCache.has(key) to check cache existence
`;

    // Add hints before first function
    const firstFunctionIndex = newContent.search(/(async\s+)?function|\w+\s*=\s*(async\s+)?function|class\s+\w+/);
    if (firstFunctionIndex !== -1) {
      newContent = newContent.slice(0, firstFunctionIndex) + cacheHints + '
' + newContent.slice(firstFunctionIndex);
      changes.push('Added cache usage hints in comments');
    }

    await fs.writeFile(filePath, newContent);

    return {
      migrated: true,
      changes: changes,
      linesChanged: newContent.split('\\n').length - content.split('\\n').length
    };
  }

  /**
   * Helper method to add import statements properly
   */
  addImportStatement(content, importStatement) {
    if (content.includes(importStatement.trim())) {
      return content;
    }

    if (content.includes('require(')) {
      // Add after existing requires
      const requireLines = content.split('\\n').filter(line => line.includes('require('));
      const lastRequireLine = requireLines[requireLines.length - 1];
      const lastRequireIndex = content.lastIndexOf(lastRequireLine);
      const lineEnd = content.indexOf('\\n', lastRequireIndex);

      return content.slice(0, lineEnd + 1) + importStatement + content.slice(lineEnd + 1);
    } else {
      // Add at the beginning after shebang
      if (content.startsWith('#!')) {
        const firstLineEnd = content.indexOf('\\n');
        return content.slice(0, firstLineEnd + 1) + '
' + importStatement + content.slice(firstLineEnd + 1);
      } else {
        return importStatement + '
' + content;
      }
    }
  }

  /**
   * Update package.json if needed
   */
  async updatePackageJson(packagePath) {
    try {
      const content = await fs.readFile(packagePath, 'utf8');
      const packageData = JSON.parse(content);
      const changes = [];

      // Add migration script
      if (!packageData.scripts) {
        packageData.scripts = {};
      }

      if (!packageData.scripts['migrate:unified']) {
        packageData.scripts['migrate:unified'] = 'node scripts/migrate/migrate-to-unified-system.js';
        changes.push('Added migration script to package.json');
      }

      if (!packageData.scripts['migrate:rollback']) {
        packageData.scripts['migrate:rollback'] = 'node scripts/migrate/backups/*/restore.js';
        changes.push('Added rollback script to package.json');
      }

      if (changes.length > 0) {
        await fs.writeFile(packagePath, JSON.stringify(packageData, null, 2));
      }

      return { migrated: changes.length > 0, changes };

    } catch (error) {
      return { migrated: false, error: error.message };
    }
  }
}

module.exports = MigrationHandlers;