# Hudson Street Library - Unified System Migration

This directory contains a comprehensive migration system to update the existing codebase to use the new consolidated modules:

- `book-api-client.js` - Unified API client for book data
- `image-core.js` - Centralized image processing
- `logger.js` - Structured logging system
- `image-cache.js` - Intelligent caching system
- Centralized configuration

## Quick Start

### 1. Preview Migration (Recommended First Step)

```bash
# See what will be migrated without making changes
node scripts/migrate/enhanced-migration.js --dry-run
```

### 2. Run Migration

```bash
# Run the full migration
node scripts/migrate/enhanced-migration.js --verbose
```

### 3. Test Results

```bash
# Test that all components are in place
node scripts/migrate/test-migration.js
```

## Migration Scripts

### Main Scripts

- **`enhanced-migration.js`** - Complete migration system with analysis, backup, and reporting
- **`migrate-to-unified-system.js`** - Original migration script (simpler version)

### Supporting Modules

- **`file-analyzer.js`** - Analyzes codebase to identify migration candidates
- **`backup-manager.js`** - Creates and manages backups with verification
- **`migration-handlers.js`** - Specific handlers for different types of migrations
- **`migration-reporter.js`** - Generates comprehensive reports

## Command Line Options

```bash
node enhanced-migration.js [options]

Options:
  --dry-run      Show what would be migrated without making changes
  --verbose      Show detailed progress information
  --force        Continue migration even if there are backup verification failures
  --help, -h     Show this help message
```

## Migration Process

### Phase 1: Analysis
- Scans codebase for migration candidates
- Identifies files using book APIs, image processing, hardcoded configs
- Prioritizes files based on usage patterns
- Generates analysis report

### Phase 2: Backup
- Creates timestamped backup directory
- Backs up all files that will be modified
- Verifies backup integrity with checksums
- Creates restore script for rollback

### Phase 3: Migration
- Updates files to use new consolidated modules:
  - Book API calls → `book-api-client.js`
  - Image processing → `image-core.js`
  - Hardcoded paths → centralized config
  - Console logging → structured logger
  - Network operations → caching system
- Updates `package.json` with migration scripts

### Phase 4: Reporting
- Generates comprehensive reports in multiple formats:
  - JSON for programmatic access
  - Markdown for documentation
  - HTML for visual review

### Phase 5: Cleanup
- Creates test scripts
- Sets up quick access utilities

## What Gets Migrated

### Book API Usage
**Before:**
```javascript
const response = await fetch('https://openlibrary.org/api/books?bibkeys=ISBN:' + isbn);
```

**After:**
```javascript
const BookApiClient = require('../utils/book-api-client.js');
const bookApiClient = new BookApiClient();
const result = await bookApiClient.searchByISBN(isbn);
```

### Image Processing
**Before:**
```javascript
await sharp(imagePath).resize(300, 400).jpeg({ quality: 80 }).toFile(outputPath);
```

**After:**
```javascript
const ImageCore = require('../utils/image-core.js');
await ImageCore.resizeImage(imagePath, { width: 300, height: 400 });
```

### Configuration
**Before:**
```javascript
const booksDir = '../src/assets/images/books';
```

**After:**
```javascript
const imageConfig = require('../config/image-config.js');
const booksDir = imageConfig.directories.books;
```

### Logging
**Before:**
```javascript
console.log('Processing image:', filename);
console.error('Failed to process:', error);
```

**After:**
```javascript
const Logger = require('../utils/logger.js');
const logger = new Logger({ component: 'image-processor' });
logger.info('Processing image:', { filename });
logger.error('Failed to process:', { error: error.message });
```

## Rollback

If you need to rollback the migration:

```bash
# Find your backup directory
ls scripts/migrate/backups/

# Run the restore script
node scripts/migrate/backups/[date]/restore.js

# Or restore specific files
node scripts/migrate/backups/[date]/restore.js file path/to/file.js
```

## Generated Reports

After migration, check the reports in `scripts/migrate/reports/`:

- **`migration-report.json`** - Complete migration data
- **`migration-report.md`** - Human-readable summary
- **`migration-report.html`** - Visual report with charts

## File Structure

```
scripts/migrate/
├── README.md                    # This file
├── enhanced-migration.js        # Main migration script
├── migrate-to-unified-system.js # Original migration script
├── file-analyzer.js            # Codebase analysis
├── backup-manager.js           # Backup creation and management
├── migration-handlers.js       # Migration implementations
├── migration-reporter.js       # Report generation
├── backups/                    # Timestamped backups
│   └── [date]/
│       ├── backup-manifest.json
│       ├── restore.js
│       └── [original-files]
└── reports/                    # Migration reports
    ├── migration-report.json
    ├── migration-report.md
    └── migration-report.html
```

## Package.json Integration

The migration automatically adds these scripts to your `package.json`:

```json
{
  "scripts": {
    "migrate:unified": "node scripts/migrate/enhanced-migration.js",
    "migrate:rollback": "node scripts/migrate/backups/*/restore.js"
  }
}
```

Then you can run:

```bash
npm run migrate:unified
npm run migrate:rollback  # if needed
```

## Safety Features

### Backup System
- Creates complete backups before any changes
- Verifies backup integrity with SHA-256 checksums
- Provides easy restore functionality
- Maintains backup manifest for tracking

### Dry Run Mode
- Preview all changes without modifying files
- See exactly what will be migrated
- Understand the scope before committing

### Error Handling
- Continues migration even if individual files fail (with `--force`)
- Detailed error reporting
- Rollback capability if things go wrong

### Analysis and Reporting
- Pre-migration analysis to understand impact
- Comprehensive post-migration reports
- Performance metrics and statistics

## Troubleshooting

### Common Issues

**"File not found" errors:**
- Check if files have been moved or renamed
- Run with `--verbose` to see detailed information

**"Backup verification failed":**
- Check disk space
- Use `--force` to continue despite verification issues
- Verify file permissions

**"Migration handler failed":**
- Check file syntax and structure
- Some files may need manual migration
- Review the error details in the migration report

### Getting Help

1. Run with `--verbose` for detailed output
2. Check the migration report for specific errors
3. Use `--dry-run` to preview changes
4. Review backup files if rollback is needed

## Contributing

When adding new migration handlers:

1. Add detection logic to `file-analyzer.js`
2. Implement migration logic in `migration-handlers.js`
3. Update the report generation if needed
4. Test with `--dry-run` first

## Version Compatibility

This migration system is designed for:
- Node.js 14+
- Hudson Street Library codebase structure
- The consolidated modules created in the utils/ directory