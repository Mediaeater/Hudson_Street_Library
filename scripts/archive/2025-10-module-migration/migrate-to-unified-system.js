#!/usr/bin/env node

/**
 * Migration Script: Unified System Integration
 *
 * This script migrates the existing codebase to use the new consolidated modules:
 * - book-api-client.js
 * - image-core.js
 * - logger.js
 * - image-cache.js
 * - centralized config
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class MigrationManager {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '../..');
    this.backupDir = path.join(__dirname, 'backups', new Date().toISOString().split('T')[0]);
    this.migrationLog = [];
    this.errors = [];
    this.startTime = new Date();
  }

  async initialize() {
    console.log('🚀 Starting Hudson Street Library Unified System Migration');
    console.log('📁 Project root: ' + this.projectRoot);
    console.log('💾 Backup directory: ' + this.backupDir);

    // Create backup directory
    await fs.mkdir(this.backupDir, { recursive: true });
    console.log('✅ Backup directory created');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.migrationLog.push(logEntry);

    const icon = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '✅';
    console.log('${icon} ' + message);
  }

  async createBackup(filePath) {
    try {
      const relativePath = path.relative(this.projectRoot, filePath);
      const backupPath = path.join(this.backupDir, relativePath);

      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Copy original file
      await fs.copyFile(filePath, backupPath);
      this.log(`Backed up: ${relativePath}`);

      return backupPath;
    } catch (error) {
      this.log(`Failed to backup ${filePath}: ${error.message}`, 'error');
      this.errors.push({ file: filePath, error: error.message, step: 'backup' });
      throw error;
    }
  }

  async findTargetFiles() {
    const targetFiles = {
      'acquire-covers.js': null,
      'cover-utils.js': null,
      'image-pipeline.js': path.join(this.projectRoot, 'scripts/image-pipeline/image-pipeline.js'),
      'cli.js': path.join(this.projectRoot, 'scripts/image-pipeline/cli.js'),
      'check-missing-covers.js': path.join(this.projectRoot, 'scripts/check-missing-covers.js'),
      'optimize-all-images.js': path.join(this.projectRoot, 'scripts/optimize-all-images.js')
    };

    // Find acquire-covers.js and cover-utils.js
    const searchDirs = [
      path.join(this.projectRoot, 'scripts'),
      path.join(this.projectRoot, 'src'),
      path.join(this.projectRoot, 'utils')
    ];

    for (const dir of searchDirs) {
      try {
        const files = await this.findFilesRecursively(dir, /\.(js|ts)$/);
        for (const file of files) {
          const basename = path.basename(file);
          if (basename === 'acquire-covers.js') {
            targetFiles['acquire-covers.js'] = file;
          } else if (basename === 'cover-utils.js') {
            targetFiles['cover-utils.js'] = file;
          }
        }
      } catch (error) {
        // Directory might not exist, continue
      }
    }

    return targetFiles;
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

  async migrateBookApiUsage(filePath) {
    if (!filePath) {
      this.log('acquire-covers.js not found, skipping book API migration', 'warning');
      return false;
    }

    const content = await fs.readFile(filePath, 'utf8');

    // Check if already migrated
    if (content.includes('book-api-client.js')) {
      this.log('acquire-covers.js already uses book-api-client.js');
      return false;
    }

    let newContent = content;

    // Add book-api-client import
    const importStatement = "const BookApiClient = require('../utils/book-api-client.js');
";

    if (newContent.includes('require(')) {
      // Add after existing requires
      const lastRequireMatch = newContent.lastIndexOf('require(');
      const lineEnd = newContent.indexOf('
', lastRequireMatch);
      newContent = newContent.slice(0, lineEnd + 1) + importStatement + newContent.slice(lineEnd + 1);
    } else {
      // Add at the beginning
      newContent = importStatement + '
' + newContent;
    }

    // Replace inline API calls with BookApiClient usage
    newContent = newContent.replace(
      /fetch\(['"`]https:\/\/openlibrary\.org[^)]+\)/g,
      'BookApiClient.searchByISBN(isbn)'
    );

    newContent = newContent.replace(
      /fetch\(['"`]https:\/\/www\.googleapis\.com\/books[^)]+\)/g,
      'BookApiClient.searchGoogleBooks(query)'
    );

    await fs.writeFile(filePath, newContent);
    this.log(`Migrated book API usage in: ${path.relative(this.projectRoot, filePath)}`);
    return true;
  }

  async migrateCoverUtils(filePath) {
    if (!filePath) {
      this.log('cover-utils.js not found, skipping cover utils migration', 'warning');
      return false;
    }

    const content = await fs.readFile(filePath, 'utf8');

    // Check if already migrated
    if (content.includes('image-core.js')) {
      this.log('cover-utils.js already uses image-core.js');
      return false;
    }

    let newContent = content;

    // Add image-core import
    const importStatement = "const ImageCore = require('../utils/image-core.js');
";

    if (newContent.includes('require(')) {
      const lastRequireMatch = newContent.lastIndexOf('require(');
      const lineEnd = newContent.indexOf('
', lastRequireMatch);
      newContent = newContent.slice(0, lineEnd + 1) + importStatement + newContent.slice(lineEnd + 1);
    } else {
      newContent = importStatement + '
' + newContent;
    }

    // Replace sharp operations with ImageCore
    newContent = newContent.replace(
      /sharp\([^)]+\)\.resize\([^)]+\)/g,
      'ImageCore.resizeImage(imagePath, { width, height })'
    );

    newContent = newContent.replace(
      /sharp\([^)]+\)\.jpeg\([^)]+\)/g,
      'ImageCore.optimizeImage(imagePath, { format: "jpeg" })'
    );

    await fs.writeFile(filePath, newContent);
    this.log(`Migrated cover utils to use image-core: ${path.relative(this.projectRoot, filePath)}`);
    return true;
  }

  async migrateImagePipeline(filePath) {
    if (!filePath) return false;

    const content = await fs.readFile(filePath, 'utf8');

    // Check if already migrated
    if (content.includes('../utils/logger.js') && content.includes('../utils/image-cache.js')) {
      this.log('image-pipeline.js already migrated');
      return false;
    }

    let newContent = content;

    // Add new imports
    const imports = [
      "const Logger = require('../utils/logger.js');",
      "const ImageCache = require('../utils/image-cache.js');",
      "const ImageCore = require('../utils/image-core.js');"
    ];

    for (const importStmt of imports) {
      if (!newContent.includes(importStmt)) {
        if (newContent.includes('require(')) {
          const lastRequireMatch = newContent.lastIndexOf('require(');
          const lineEnd = newContent.indexOf('
', lastRequireMatch);
          newContent = newContent.slice(0, lineEnd + 1) + importStmt + '
' + newContent.slice(lineEnd + 1);
        } else {
          newContent = importStmt + '
' + newContent;
        }
      }
    }

    // Add logger initialization in constructor
    if (newContent.includes('constructor()') && !newContent.includes('this.logger = new Logger')) {
      newContent = newContent.replace(
        'constructor() {',
        `constructor() {
    this.logger = new Logger({ component: 'ImagePipeline' });
    this.imageCache = new ImageCache();`\n      );
    }

    // Replace console.log with logger calls
    newContent = newContent.replace(/console\.log\(/g, 'this.logger.info(');
    newContent = newContent.replace(/console\.error\(/g, 'this.logger.error(');
    newContent = newContent.replace(/console\.warn\(/g, 'this.logger.warn(');

    await fs.writeFile(filePath, newContent);
    this.log(`Migrated image pipeline: ${path.relative(this.projectRoot, filePath)}`);
    return true;
  }

  async migrateConfigUsage(filePath) {
    if (!filePath) return false;

    const content = await fs.readFile(filePath, 'utf8');

    // Check if already uses centralized config
    if (content.includes('../config/image-config.js')) {
      this.log(`${path.basename(filePath)} already uses centralized config`);
      return false;
    }

    let newContent = content;

    // Add centralized config import
    const configImport = "const imageConfig = require('../config/image-config.js');
";

    if (newContent.includes('require(')) {
      const lastRequireMatch = newContent.lastIndexOf('require(');
      const lineEnd = newContent.indexOf('
', lastRequireMatch);
      newContent = newContent.slice(0, lineEnd + 1) + configImport + newContent.slice(lineEnd + 1);
    } else {
      newContent = configImport + '
' + newContent;
    }

    // Replace hardcoded paths with config references
    newContent = newContent.replace(
      /['"`]\.\.\/src\/assets\/images\/books['"`]/g,
      'imageConfig.directories.books'
    );

    newContent = newContent.replace(
      /['"`]\.\.\/.*\/covers['"`]/g,
      'imageConfig.directories.covers'
    );

    await fs.writeFile(filePath, newContent);
    this.log(`Updated config usage in: ${path.relative(this.projectRoot, filePath)}`);
    return true;
  }

  async addLoggerIntegration(filePath) {
    if (!filePath) return false;

    const content = await fs.readFile(filePath, 'utf8');

    // Check if already has logger
    if (content.includes('Logger') || content.includes('logger.js')) {
      this.log(`${path.basename(filePath)} already has logger integration`);
      return false;
    }

    let newContent = content;

    // Add logger import
    const loggerImport = "const Logger = require('./utils/logger.js');
";

    if (newContent.includes('require(')) {
      const lastRequireMatch = newContent.lastIndexOf('require(');
      const lineEnd = newContent.indexOf('
', lastRequireMatch);
      newContent = newContent.slice(0, lineEnd + 1) + loggerImport + newContent.slice(lineEnd + 1);
    } else {
      newContent = loggerImport + '
' + newContent;
    }

    // Add logger initialization
    const loggerInit = `const logger = new Logger({ component: '${path.basename(filePath, '.js')}' });
`;
    newContent = newContent.replace(loggerImport, loggerImport + loggerInit);

    // Replace console.log calls
    newContent = newContent.replace(/console\.log\(/g, 'logger.info(');
    newContent = newContent.replace(/console\.error\(/g, 'logger.error(');
    newContent = newContent.replace(/console\.warn\(/g, 'logger.warn(');

    await fs.writeFile(filePath, newContent);
    this.log(`Added logger integration to: ${path.relative(this.projectRoot, filePath)}`);
    return true;
  }

  async integrateImageCache(filePath) {
    if (!filePath) return false;

    const content = await fs.readFile(filePath, 'utf8');

    // Check if already has image cache
    if (content.includes('ImageCache') || content.includes('image-cache.js')) {
      this.log(`${path.basename(filePath)} already has image cache integration`);
      return false;
    }

    // Only add to files that handle images
    if (!content.includes('image') && !content.includes('cover')) {
      return false;
    }

    let newContent = content;

    // Add image cache import
    const cacheImport = "const ImageCache = require('./utils/image-cache.js');
";

    if (newContent.includes('require(')) {
      const lastRequireMatch = newContent.lastIndexOf('require(');
      const lineEnd = newContent.indexOf('
', lastRequireMatch);
      newContent = newContent.slice(0, lineEnd + 1) + cacheImport + newContent.slice(lineEnd + 1);
    } else {
      newContent = cacheImport + '
' + newContent;
    }

    // Add cache initialization
    const cacheInit = `const imageCache = new ImageCache();
`;
    newContent = newContent.replace(cacheImport, cacheImport + cacheInit);

    await fs.writeFile(filePath, newContent);
    this.log(`Added image cache integration to: ${path.relative(this.projectRoot, filePath)}`);
    return true;
  }

  async generateMigrationReport() {
    const reportPath = path.join(__dirname, 'migration-report.json');
    const endTime = new Date();
    const duration = endTime - this.startTime;

    const report = {
      timestamp: endTime.toISOString(),
      duration: `${Math.round(duration / 1000)}s`,
      success: this.errors.length === 0,
      migrations: this.migrationLog,
      errors: this.errors,
      backupLocation: this.backupDir,
      summary: {
        totalFiles: this.migrationLog.filter(l => l.message.includes('Migrated')).length,
        errorCount: this.errors.length,
        backupCount: this.migrationLog.filter(l => l.message.includes('Backed up')).length
      }
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    this.log(`Migration report saved: ${reportPath}`);

    return report;
  }

  async createRollbackScript() {
    const rollbackPath = path.join(__dirname, 'rollback.js');
    const rollbackScript = '#!/usr/bin/env node

/**
 * Rollback Script for Unified System Migration
 * Generated on: ${new Date().toISOString()}
 */

const fs = require('fs').promises;
const path = require('path');

class RollbackManager {
  constructor() {
    this.backupDir = '${this.backupDir}';
    this.projectRoot = '' + this.projectRoot + '';
  }

  async rollback() {
    console.log('🔄 Starting rollback process...');

    try {
      const backupFiles = await this.findBackupFiles(this.backupDir);

      for (const backupFile of backupFiles) {
        const relativePath = path.relative(this.backupDir, backupFile);
        const originalPath = path.join(this.projectRoot, relativePath);

        await fs.copyFile(backupFile, originalPath);
        console.log('✅ Restored: ' + relativePath);
      }

      console.log('🎉 Rollback completed successfully');

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      process.exit(1);
    }
  }

  async findBackupFiles(dir) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...await this.findBackupFiles(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }

    return files;
  }
}

if (require.main === module) {
  const rollback = new RollbackManager();
  rollback.rollback();
}

module.exports = RollbackManager;
';

    await fs.writeFile(rollbackPath, rollbackScript);
    await fs.chmod(rollbackPath, 0o755);
    this.log(`Rollback script created: ${rollbackPath}`);
  }

  async run() {
    try {
      await this.initialize();

      // Find all target files
      this.log('🔍 Finding target files...');
      const targetFiles = await this.findTargetFiles();

      // Create backups
      this.log('💾 Creating backups...');
      for (const [name, filePath] of Object.entries(targetFiles)) {
        if (filePath && await fs.access(filePath).then(() => true).catch(() => false)) {
          await this.createBackup(filePath);
        }
      }

      // Run migrations
      this.log('🔄 Running migrations...');

      // 1. Migrate book API usage
      await this.migrateBookApiUsage(targetFiles['acquire-covers.js']);

      // 2. Migrate cover utils
      await this.migrateCoverUtils(targetFiles['cover-utils.js']);

      // 3. Migrate image pipeline
      await this.migrateImagePipeline(targetFiles['image-pipeline.js']);

      // 4. Update config usage in all files
      for (const [name, filePath] of Object.entries(targetFiles)) {
        if (filePath) {
          await this.migrateConfigUsage(filePath);
        }
      }

      // 5. Add logger integration
      for (const [name, filePath] of Object.entries(targetFiles)) {
        if (filePath && name !== 'image-pipeline.js') { // Already done for pipeline
          await this.addLoggerIntegration(filePath);
        }
      }

      // 6. Integrate image cache
      for (const [name, filePath] of Object.entries(targetFiles)) {
        if (filePath && name !== 'image-pipeline.js') { // Already done for pipeline
          await this.integrateImageCache(filePath);
        }
      }

      // Generate report and rollback script
      const report = await this.generateMigrationReport();
      await this.createRollbackScript();

      // Final summary
      console.log('\n🎉 Migration completed!');
      console.log('📊 Migrated ' + report.summary.totalFiles + ' files');
      console.log('💾 Created ' + report.summary.backupCount + ' backups');

      if (this.errors.length > 0) {
        console.log('⚠️  ' + this.errors.length + ' errors occurred');
        this.errors.forEach(error => {
          console.log('   - ${error.file}: ' + error.error);
        });
      }

      console.log('\n📋 Migration report: ' + path.join(__dirname, 'migration-report.json'));
      console.log('🔄 Rollback script: ' + path.join(__dirname, 'rollback.js'));

    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error');
      console.error('💥 Migration failed:', error.message);
      process.exit(1);
    }
  }
}

// Run migration if called directly
if (require.main === module) {
  const migration = new MigrationManager();
  migration.run();
}

module.exports = MigrationManager;