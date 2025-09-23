#!/usr/bin/env node

/**
 * Enhanced Migration Script: Unified System Integration
 *
 * This is the improved version of the migration script that uses
 * the specialized modules for a more robust migration process.
 */

const fs = require('fs').promises;
const path = require('path');
const FileAnalyzer = require('./file-analyzer');
const BackupManager = require('./backup-manager');
const MigrationHandlers = require('./migration-handlers');
const MigrationReporter = require('./migration-reporter');

class EnhancedMigrationManager {
  constructor(options = {}) {
    this.projectRoot = options.projectRoot || path.resolve(__dirname, '../..');
    this.dryRun = options.dryRun || false;
    this.verbose = options.verbose || false;
    this.force = options.force || false;

    // Initialize components
    this.analyzer = new FileAnalyzer(this.projectRoot);
    this.backupManager = new BackupManager(this.projectRoot);
    this.handlers = new MigrationHandlers(this.projectRoot);
    this.reporter = new MigrationReporter(this.projectRoot);

    this.startTime = new Date();
    this.stats = {
      analyzed: 0,
      backedUp: 0,
      migrated: 0,
      skipped: 0,
      errors: 0
    };
  }

  async run() {
    try {
      console.log('🚀 Starting Enhanced Hudson Street Library Migration');
      console.log('📁 Project root: ' + this.projectRoot);
      console.log('🔍 Mode: ' + this.dryRun ? 'DRY RUN' : 'LIVE MIGRATION');
      console.log('');

      // Phase 1: Analysis
      await this.runAnalysisPhase();

      // Phase 2: Backup (skip in dry run)
      if (!this.dryRun) {
        await this.runBackupPhase();
      }

      // Phase 3: Migration
      await this.runMigrationPhase();

      // Phase 4: Reporting
      await this.runReportingPhase();

      // Phase 5: Cleanup and final steps
      await this.runCleanupPhase();

      console.log('\n🎉 Migration completed successfully!');
      this.printFinalSummary();

    } catch (error) {
      console.error('\n💥 Migration failed:', error.message);
      if (this.verbose) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  async runAnalysisPhase() {
    console.log('📊 Phase 1: Analyzing Codebase');
    console.log('═══════════════════════════════');

    const analysis = await this.analyzer.analyzeCodebase();
    this.reporter.setAnalysis(analysis);

    console.log(`\n🔍 Analysis Results:`);
    console.log('   📚 Book API files: ' + analysis.summary.bookApiFiles);
    console.log('   🖼️  Image processing files: ' + analysis.summary.imageProcessingFiles);
    console.log('   ⚙️  Config files: ' + analysis.summary.configFiles);
    console.log('   📝 Logging candidates: ' + analysis.summary.loggingCandidates);
    console.log('   💾 Caching candidates: ' + analysis.summary.cachingCandidates);

    this.stats.analyzed = analysis.summary.totalFiles;

    // Show recommendations
    const report = this.analyzer.generateAnalysisReport();
    if (report.recommendations.length > 0) {
      console.log(`\n💡 Recommendations:');
      report.recommendations.forEach(rec => {
        console.log('   ${rec.priority === 'High' ? '🔴' : rec.priority === 'Medium' ? '🟡' : '🟢'} ' + rec.description);
      });
    }

    return analysis;
  }

  async runBackupPhase() {
    console.log('\n💾 Phase 2: Creating Backups');
    console.log('═══════════════════════════════');

    await this.backupManager.initialize();

    // Get all files that will be modified
    const filesToBackup = await this.getFilesToMigrate();

    if (filesToBackup.length === 0) {
      console.log('ℹ️  No files found for backup');
      return;
    }

    console.log('📦 Backing up ' + filesToBackup.length + ' files...');

    const backupResults = await this.backupManager.backupMultiple(filesToBackup);
    const successfulBackups = backupResults.filter(r => r.success).length;

    this.stats.backedUp = successfulBackups;

    // Save backup manifest
    await this.backupManager.saveManifest();

    // Verify backups
    const verification = await this.backupManager.verifyBackups();

    if (verification.failed > 0) {
      if (this.force) {
        console.warn('⚠️  ' + verification.failed + ' backup verification failures (continuing due to --force)');
      } else {
        throw new Error('Backup verification failed for ' + verification.failed + ' files. Use --force to continue anyway.');
      }
    }

    // Create restore script
    await this.backupManager.createRestoreScript();
    await this.backupManager.createBackupInfo();

    console.log('✅ Backup complete: ${successfulBackups}/' + filesToBackup.length + ' files backed up');
  }

  async runMigrationPhase() {
    console.log('\n🔄 Phase 3: Running Migrations');
    console.log('═══════════════════════════════');

    const analysis = this.reporter.reportData.analysis;
    const migrationTasks = this.buildMigrationTasks(analysis);

    console.log('📝 ' + migrationTasks.length + ' migration tasks identified');

    for (const task of migrationTasks) {
      await this.runMigrationTask(task);
    }

    // Update package.json
    const packagePath = path.join(this.projectRoot, 'package.json');
    try {
      const packageResult = await this.handlers.updatePackageJson(packagePath);
      if (packageResult.migrated) {
        console.log('📦 Updated package.json with migration scripts');
        this.reporter.addMigration({
          file: 'package.json',
          type: 'package-update',
          migrated: true,
          changes: packageResult.changes
        });
      }
    } catch (error) {
      console.warn('⚠️  Could not update package.json:', error.message);
    }

    console.log('\n✅ Migration phase complete: ${this.stats.migrated} migrated, ${this.stats.skipped} skipped, ' + this.stats.errors + ' errors');
  }

  buildMigrationTasks(analysis) {
    const tasks = [];

    // Book API migrations
    analysis.bookApiUsage.forEach(item => {
      tasks.push({
        file: path.join(this.projectRoot, item.file),
        type: 'book-api',
        priority: item.priority,
        handler: 'migrateBookApiUsage'
      });
    });

    // Image processing migrations
    analysis.imageProcessing.forEach(item => {
      tasks.push({
        file: path.join(this.projectRoot, item.file),
        type: 'image-processing',
        priority: item.priority,
        handler: 'migrateImageProcessing'
      });
    });

    // Config migrations
    analysis.configUsage.forEach(item => {
      tasks.push({
        file: path.join(this.projectRoot, item.file),
        type: 'config',
        priority: item.priority,
        handler: 'migrateConfigUsage'
      });
    });

    // Logger integration
    analysis.loggingCandidates
      .filter(item => item.priority >= 3) // Only high-priority logging candidates
      .forEach(item => {
        tasks.push({
          file: path.join(this.projectRoot, item.file),
          type: 'logger',
          priority: item.priority,
          handler: 'addLoggerIntegration'
        });
      });

    // Cache integration
    analysis.cachingCandidates
      .filter(item => item.priority >= 3) // Only high-priority caching candidates
      .forEach(item => {
        tasks.push({
          file: path.join(this.projectRoot, item.file),
          type: 'cache',
          priority: item.priority,
          handler: 'addImageCacheIntegration'
        });
      });

    // Sort by priority (highest first)
    return tasks.sort((a, b) => b.priority - a.priority);
  }

  async runMigrationTask(task) {
    try {
      const relativePath = path.relative(this.projectRoot, task.file);

      if (this.verbose) {
        console.log('\n🔧 Migrating: ' + relativePath);
        console.log('   Type: ' + task.type);
        console.log('   Priority: ' + task.priority);
      }

      if (this.dryRun) {
        console.log('[DRY RUN] Would migrate ${relativePath} (' + task.type + ')');
        this.stats.migrated++;
        return;
      }

      // Check if file exists
      try {
        await fs.access(task.file);
      } catch (error) {
        console.warn('⚠️  File not found: ' + relativePath);
        this.stats.skipped++;
        this.reporter.addMigration({
          file: relativePath,
          type: task.type,
          migrated: false,
          reason: 'File not found'
        });
        return;
      }

      // Run the appropriate handler
      const result = await this.handlers[task.handler](task.file);

      // Record the result
      this.reporter.addMigration({
        file: relativePath,
        type: task.type,
        migrated: result.migrated,
        reason: result.reason,
        changes: result.changes,
        linesChanged: result.linesChanged
      });

      if (result.migrated) {
        this.stats.migrated++;
        if (this.verbose && result.changes) {
          console.log('   ✅ Changes: ' + result.changes.join(', '));
        }
      } else {
        this.stats.skipped++;
        if (this.verbose) {
          console.log('   ⏭️  Skipped: ' + result.reason);
        }
      }

    } catch (error) {
      this.stats.errors++;
      const relativePath = path.relative(this.projectRoot, task.file);

      console.error('❌ Migration failed for ' + relativePath + ': ' + error.message);

      this.reporter.addError({
        file: relativePath,
        step: 'migration',
        error: error.message
      });

      if (!this.force) {
        throw error;
      }
    }
  }

  async runReportingPhase() {
    console.log('\n📊 Phase 4: Generating Reports');
    console.log('═══════════════════════════════');

    const endTime = new Date();
    const duration = endTime - this.startTime;

    this.reporter.setPerformance({
      duration: '${Math.round(duration / 1000)}s`,
      filesPerSecond: this.stats.analyzed > 0 ? (this.stats.analyzed / (duration / 1000)).toFixed(2) : 0,
      startTime: this.startTime.toISOString(),
      endTime: endTime.toISOString()
    });

    const reportDir = path.join(__dirname, 'reports');
    await fs.mkdir(reportDir, { recursive: true });

    const reports = await this.reporter.generateReport(reportDir);

    console.log('📋 Reports generated in: ' + reportDir);
  }

  async runCleanupPhase() {
    console.log('\n🧹 Phase 5: Cleanup');
    console.log('═══════════════════════════');

    if (!this.dryRun) {
      // Create quick access scripts
      await this.createQuickAccessScripts();
    }

    console.log('✅ Cleanup complete');
  }

  async createQuickAccessScripts() {
    // Create a quick test script
    const testScript = path.join(__dirname, 'test-migration.js');
    const testContent = '#!/usr/bin/env node

/**
 * Quick test script for migration results
 */

const fs = require('fs');
const path = require('path');

async function testMigration() {
  console.log('🧪 Testing migration results...');

  const checks = [
    {
      name: 'Book API Client exists',
      path: '${path.join(this.projectRoot, "scripts/utils/book-api-client.js")}'
    },
    {
      name: 'Image Core exists',
      path: '${path.join(this.projectRoot, "scripts/utils/image-core.js")}'
    },
    {
      name: 'Logger exists',
      path: '${path.join(this.projectRoot, "scripts/utils/logger.js")}'
    },
    {
      name: 'Image Cache exists',
      path: '${path.join(this.projectRoot, "scripts/utils/image-cache.js")}'
    },
    {
      name: 'Centralized Config exists',
      path: '' + path.join(this.projectRoot, "scripts/config/image-config.js") + ''
    }
  ];

  let passed = 0;

  for (const check of checks) {
    try {
      fs.accessSync(check.path);
      console.log(\'✅ \$\{check.name\}\`);
      passed++;
    } catch (error) {
      console.log(\`❌ \$\{check.name\}\`);
    }
  }

  console.log(\`\\n📊 Test Results: \$\{passed\}/\$\{checks.length\} passed\`);

  if (passed === checks.length) {
    console.log('🎉 All migration components are in place!');
  } else {
    console.log('⚠️  Some migration components are missing. Check the migration report.');
  }
}

testMigration().catch(console.error);
`;

    await fs.writeFile(testScript, testContent);
    await fs.chmod(testScript, 0o755);

    console.log('🧪 Test script created: ' + testScript);
  }

  async getFilesToMigrate() {
    const analysis = this.reporter.reportData.analysis;
    const files = new Set();

    // Add all files that will be migrated
    analysis.bookApiUsage.forEach(item => files.add(path.join(this.projectRoot, item.file)));
    analysis.imageProcessing.forEach(item => files.add(path.join(this.projectRoot, item.file)));
    analysis.configUsage.forEach(item => files.add(path.join(this.projectRoot, item.file)));
    analysis.loggingCandidates
      .filter(item => item.priority >= 3)
      .forEach(item => files.add(path.join(this.projectRoot, item.file)));
    analysis.cachingCandidates
      .filter(item => item.priority >= 3)
      .forEach(item => files.add(path.join(this.projectRoot, item.file)));

    // Add package.json
    files.add(path.join(this.projectRoot, 'package.json'));

    return Array.from(files);
  }

  printFinalSummary() {
    console.log('\n📊 Final Summary');
    console.log('═══════════════');
    console.log('   📁 Files analyzed: ' + this.stats.analyzed);
    console.log('   💾 Files backed up: ' + this.stats.backedUp);
    console.log('   ✅ Files migrated: ' + this.stats.migrated);
    console.log('   ⏭️  Files skipped: ' + this.stats.skipped);
    console.log('   ❌ Errors: ' + this.stats.errors);

    const endTime = new Date();
    const duration = Math.round((endTime - this.startTime) / 1000);
    console.log('   ⏱️  Duration: ' + duration + 's');

    console.log('\n🎯 Next Steps:');
    console.log('   1. Run: node scripts/migrate/test-migration.js');
    console.log('   2. Test your application thoroughly');
    console.log('   3. Review the migration report in scripts/migrate/reports/');
    console.log('   4. Update your documentation');

    if (!this.dryRun && this.stats.backedUp > 0) {
      console.log('\n🔄 Rollback Available:');
      console.log(`   If needed: node scripts/migrate/backups/*/restore.js`);
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    force: args.includes('--force')
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`\n🚀 Hudson Street Library - Enhanced Migration Tool

Usage:
  node enhanced-migration.js [options]

Options:
  --dry-run      Show what would be migrated without making changes
  --verbose      Show detailed progress information
  --force        Continue migration even if there are backup verification failures
  --help, -h     Show this help message

Examples:
  # Preview what will be migrated
  node enhanced-migration.js --dry-run

  # Run migration with detailed output
  node enhanced-migration.js --verbose

  # Force migration despite warnings
  node enhanced-migration.js --force

Features:
  ✅ Pre-migration analysis and reporting
  ✅ Automatic backup creation with verification
  ✅ Intelligent migration handlers for different code patterns
  ✅ Comprehensive reporting (JSON, Markdown, HTML)
  ✅ Rollback capability
  ✅ Test script generation
  ✅ Package.json updates

Migration Types:
  📚 Book API calls → book-api-client.js
  🖼️  Image processing → image-core.js
  ⚙️  Hardcoded paths → centralized config
  📝 Console logging → structured logger
  💾 API calls → caching system
`);
    return;
  }

  const migration = new EnhancedMigrationManager(options);
  await migration.run();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = EnhancedMigrationManager;