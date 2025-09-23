/**
 * Backup Manager for Migration
 *
 * Handles creating, managing, and restoring backups during migration.
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class BackupManager {
  constructor(projectRoot, backupDir) {
    this.projectRoot = projectRoot;
    this.backupDir = backupDir || path.join(projectRoot, 'scripts/migrate/backups', this.getTimestamp());
    this.backupManifest = {
      timestamp: new Date().toISOString(),
      projectRoot: this.projectRoot,
      files: [],
      checksums: {}
    };
  }

  getTimestamp() {
    return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  }

  async initialize() {
    console.log('[BACKUP] Initializing backup system...');

    // Create backup directory
    await fs.mkdir(this.backupDir, { recursive: true });

    console.log('[DIR] Backup directory: ' + this.backupDir);
    return this.backupDir;
  }

  async createBackup(filePath, options = {}) {
    try {
      const relativePath = path.relative(this.projectRoot, filePath);
      const backupPath = path.join(this.backupDir, relativePath);

      // Ensure backup directory exists
      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Read original file
      const content = await fs.readFile(filePath, 'utf8');

      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(content).digest('hex');

      // Copy file to backup location
      await fs.copyFile(filePath, backupPath);

      // Add to manifest
      this.backupManifest.files.push({
        original: relativePath,
        backup: path.relative(this.backupDir, backupPath),
        timestamp: new Date().toISOString(),
        size: content.length,
        checksum: checksum
      });

      this.backupManifest.checksums[relativePath] = checksum;

      console.log('[OK] Backed up: ' + relativePath);
      return backupPath;

    } catch (error) {
      console.error('[ERROR] Failed to backup ${filePath}: ' + error.message);
      throw error;
    }
  }

  async backupMultiple(filePaths, options = {}) {
    const results = [];

    console.log('[BACKUP] Creating backups for ' + filePaths.length + ' files...');

    for (const filePath of filePaths) {
      try {
        // Check if file exists
        await fs.access(filePath);
        const backupPath = await this.createBackup(filePath, options);
        results.push({ success: true, original: filePath, backup: backupPath });
      } catch (error) {
        console.warn('[WARNING]  Skipping ${filePath}: ' + error.message);
        results.push({ success: false, original: filePath, error: error.message });
      }
    }

    const successful = results.filter(r => r.success).length;
    console.log('[BACKUP] Backup complete: ${successful}/' + filePaths.length + ' files backed up');

    return results;
  }

  async saveManifest() {
    const manifestPath = path.join(this.backupDir, 'backup-manifest.json');

    this.backupManifest.summary = {
      totalFiles: this.backupManifest.files.length,
      totalSize: this.backupManifest.files.reduce((sum, file) => sum + file.size, 0),
      createdAt: this.backupManifest.timestamp
    };

    await fs.writeFile(manifestPath, JSON.stringify(this.backupManifest, null, 2));

    console.log('[MANIFEST] Backup manifest saved: ' + manifestPath);
    return manifestPath;
  }

  async verifyBackups() {
    console.log('[VERIFY] Verifying backup integrity...');

    const results = {
      verified: 0,
      failed: 0,
      errors: []
    };

    for (const fileInfo of this.backupManifest.files) {
      try {
        const backupPath = path.join(this.backupDir, fileInfo.backup);
        const content = await fs.readFile(backupPath, 'utf8');
        const checksum = crypto.createHash('sha256').update(content).digest('hex');

        if (checksum === fileInfo.checksum) {
          results.verified++;
        } else {
          results.failed++;
          results.errors.push({
            file: fileInfo.original,
            error: 'Checksum mismatch'
          });
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          file: fileInfo.original,
          error: error.message
        });
      }
    }

    console.log('[VERIFY] Verification complete: ${results.verified} verified, ' + results.failed + ' failed');

    if (results.failed > 0) {
      console.warn('[WARNING]  Backup verification issues:');
      results.errors.forEach(error => {
        console.warn('   - ' + error.file + ': ' + error.error);
      });
    }

    return results;
  }

  async createRestoreScript() {
    const scriptPath = path.join(this.backupDir, 'restore.js');

    const restoreScript = '#!/usr/bin/env node

/**
 * Restore Script
 * Generated: ${new Date().toISOString()}
 * Backup: ${this.backupDir}
 */

const fs = require('fs').promises;
const path = require('path');

class RestoreManager {
  constructor() {
    this.backupDir = '${this.backupDir}';
    this.projectRoot = '${this.projectRoot}';
    this.manifest = null;
  }

  async loadManifest() {
    const manifestPath = path.join(this.backupDir, 'backup-manifest.json');
    const content = await fs.readFile(manifestPath, 'utf8');
    this.manifest = JSON.parse(content);
  }

  async restore(options = {}) {
    console.log('[RESTORE] Starting restore process...');

    if (!this.manifest) {
      await this.loadManifest();
    }

    const results = {
      restored: 0,
      failed: 0,
      errors: []
    };

    for (const fileInfo of this.manifest.files) {
      try {
        const backupPath = path.join(this.backupDir, fileInfo.backup);
        const originalPath = path.join(this.projectRoot, fileInfo.original);

        // Ensure target directory exists
        await fs.mkdir(path.dirname(originalPath), { recursive: true });

        // Copy backup to original location
        await fs.copyFile(backupPath, originalPath);

        console.log('[OK] Restored: ' + fileInfo.original);
        results.restored++;

      } catch (error) {
        console.error('[ERROR] Failed to restore ' + fileInfo.original + ': ' + error.message);
        results.failed++;
        results.errors.push({
          file: fileInfo.original,
          error: error.message
        });
      }
    }

    console.log('\n[SUCCESS] Restore complete: ' + results.restored + ' files restored, ' + results.failed + ' failed');

    if (results.failed > 0) {
      console.warn('\n[WARNING]  Restore issues:');
      results.errors.forEach(error => {
        console.warn('   - ' + error.file + ': ' + error.error);
      });
    }

    return results;
  }

  async restoreFile(relativePath) {
    if (!this.manifest) {
      await this.loadManifest();
    }

    const fileInfo = this.manifest.files.find(f => f.original === relativePath);

    if (!fileInfo) {
      throw new Error('File not found in backup: ' + relativePath);
    }

    const backupPath = path.join(this.backupDir, fileInfo.backup);
    const originalPath = path.join(this.projectRoot, fileInfo.original);

    await fs.mkdir(path.dirname(originalPath), { recursive: true });
    await fs.copyFile(backupPath, originalPath);

    console.log('[OK] Restored: ' + relativePath);
    return originalPath;
  }

  async listBackups() {
    if (!this.manifest) {
      await this.loadManifest();
    }

    console.log('\n[MANIFEST] Backup Contents (' + this.manifest.files.length + ' files):');
    console.log('[DATE] Created: ' + this.manifest.timestamp);
    console.log('[DIR] Location: ' + this.backupDir);

    this.manifest.files.forEach((file, index) => {
      console.log('  ' + index + 1 + '. ' + file.original);
      console.log('     Size: ' + file.size + ' bytes');
      console.log('     Backup: ' + file.backup);
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const restore = new RestoreManager();

  try {
    if (args.length === 0 || args[0] === 'all') {
      await restore.restore();
    } else if (args[0] === 'list') {
      await restore.listBackups();
    } else if (args[0] === 'file' && args[1]) {
      await restore.restoreFile(args[1]);
    } else {
      console.log('\n[PACKAGE] Backup Restore Utility

Usage:
  node restore.js [command] [options]

Commands:
  all           Restore all backed up files (default)
  list          List all backed up files
  file <path>   Restore specific file

Examples:
  node restore.js
  node restore.js list
  node restore.js file scripts/image-pipeline.js
`);
    }
  } catch (error) {
    console.error('[ERROR] Restore failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = RestoreManager;
`;

    await fs.writeFile(scriptPath, restoreScript);
    await fs.chmod(scriptPath, 0o755);

    console.log('[RESTORE] Restore script created: ' + scriptPath);
    return scriptPath;
  }

  async createBackupInfo() {
    const infoPath = path.join(this.backupDir, 'README.md');

    const readme = `# Migration Backup

This backup was created during the Hudson Street Library unified system migration.

## Backup Details

- **Created**: ${this.backupManifest.timestamp}
- **Project Root**: ${this.projectRoot}
- **Files Backed Up**: ${this.backupManifest.files.length}
- **Total Size**: ${this.backupManifest.files.reduce((sum, file) => sum + file.size, 0)} bytes

## Files Included

${this.backupManifest.files.map(file => `- ${file.original} (${file.size} bytes)`).join('\\n')}

## Restoration

To restore all files:
```bash
node restore.js
```

To restore a specific file:
```bash
node restore.js file <relative-path>
```

To list all backed up files:
```bash
node restore.js list
```

## Verification

All files include SHA-256 checksums for integrity verification.
See `backup-manifest.json` for detailed file information.
`;

    await fs.writeFile(infoPath, readme);
    console.log('📖 Backup info created: ' + infoPath);

    return infoPath;
  }

  async cleanup(daysOld = 30) {
    console.log('[CLEANUP] Cleaning up backups older than ' + daysOld + ' days...');

    const backupsDir = path.dirname(this.backupDir);

    try {
      const entries = await fs.readdir(backupsDir, { withFileTypes: true });
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      let removed = 0;

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const backupPath = path.join(backupsDir, entry.name);
          const stats = await fs.stat(backupPath);

          if (stats.mtime < cutoffDate) {
            await fs.rmdir(backupPath, { recursive: true });
            console.log('[REMOVED]  Removed old backup: ' + entry.name);
            removed++;
          }
        }
      }

      console.log('[CLEANUP] Cleanup complete: ' + removed + ' old backups removed');
      return removed;

    } catch (error) {
      console.warn('[WARNING]  Cleanup failed: ' + error.message);
      return 0;
    }
  }

  getBackupInfo() {
    return {
      backupDir: this.backupDir,
      fileCount: this.backupManifest.files.length,
      totalSize: this.backupManifest.files.reduce((sum, file) => sum + file.size, 0),
      timestamp: this.backupManifest.timestamp
    };
  }
}

module.exports = BackupManager;