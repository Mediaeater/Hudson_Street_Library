# Hudson Street Library - Archive Recommendations
## Legacy Code and Documentation Review - November 23, 2025

This document identifies dated documentation, legacy code, and obsolete files that should be archived or deleted.

---

## Executive Summary

After reviewing the Hudson Street Library codebase post-Eleventy v3 migration, I've identified **23 files/directories** that should be archived or deleted:

- **8 documentation files** (outdated or superseded)
- **6 CSV backup files** (historical data snapshots)
- **5 migration scripts** (one-time use, now complete)
- **2 log files** (old reports)
- **2 database scripts** (unused CMS infrastructure)

**Total disk space to reclaim**: ~5.5 MB

---

## 1. Outdated Documentation (Archive to `docs/archive/`)

### 1.1 Deployment Documentation - Multiple Overlapping Files

**Problem**: Four separate deployment guides with significant overlap and dated information.

**Files to Archive**:
1. `/docs/DEPLOYMENT.md` (82 lines)
   - **Why**: Basic guide superseded by other files
   - **Dated info**: References manual `_site/` commits (no longer needed)
   - **Created**: Before GitHub Actions automation

2. `/docs/DEPLOYMENT_GUIDE.md` (1,190 lines)
   - **Why**: Massive CMS deployment guide for unrealized PostgreSQL backend
   - **Dated info**: References Express.js, PostgreSQL, Docker, AWS infrastructure
   - **Reality**: Project uses static GitHub Pages, no backend deployed
   - **Retention value**: Keep as reference for future CMS implementation

3. `/docs/DEPLOYMENT-MONITORING.md` (264 lines)
   - **Why**: Overlaps with GITHUB-ACTIONS-PIPELINE.md
   - **Duplicates**: PM2, health checks, monitoring that don't apply to static site
   - **Keep instead**: GITHUB-ACTIONS-PIPELINE.md (more concise, accurate)

**Keep Active**:
- `/docs/DEPLOYMENT-QUICK-REFERENCE.md` - Current, concise, accurate
- `/docs/GITHUB-ACTIONS-PIPELINE.md` - Current automated deployment process

**Action**:
```bash
mkdir -p docs/archive/2025-11-deployment-cleanup
mv docs/DEPLOYMENT.md docs/archive/2025-11-deployment-cleanup/
mv docs/DEPLOYMENT_GUIDE.md docs/archive/2025-11-deployment-cleanup/
mv docs/DEPLOYMENT-MONITORING.md docs/archive/2025-11-deployment-cleanup/
```

**Dependencies**: Update any internal links in other docs to point to active files.

---

### 1.2 Work-In-Progress Documentation - Outdated Status

**File**: `/docs/WORK-IN-PROGRESS.md`
- **Last updated**: July 10, 2025
- **Why outdated**: References issues fixed months ago
  - Flickering placeholder images (FIXED)
  - Missing placeholder-book.svg (FIXED in commit 2441755)
  - API rate limiting issues (resolved)
- **Book count drift**: Says 1,333 books, current is 1,578 books
- **API keys exposed**: Contains actual API keys (security concern)

**Action**: Move to archive, create fresh PROJECT_STATUS.md if needed
```bash
mv docs/WORK-IN-PROGRESS.md docs/archive/2025-07-work-in-progress.md
```

---

### 1.3 Current Status - Outdated Metrics

**File**: `/docs/CURRENT-STATUS.md`
- **Date**: July 10, 2025 (5 months old)
- **Outdated data**:
  - Book count: 1,333 (actual: 1,578)
  - Cover coverage: 56.8% (likely changed)
  - API keys exposed (security issue)
  - Rate limiting notes no longer relevant

**Action**: Archive and replace with current metrics
```bash
mv docs/CURRENT-STATUS.md docs/archive/2025-07-current-status.md
```

---

### 1.4 CMS Implementation Plan - Unrealized Architecture

**File**: `/docs/CMS_IMPLEMENTATION_PLAN.md`
- **Size**: 732 lines
- **Why archive**: Detailed plan for PostgreSQL/Express.js CMS never implemented
- **Reality check**: Project uses static Eleventy + GitHub Pages (no backend)
- **Value**: Keep as reference for potential future backend
- **Status**: Work never started (all checkboxes unchecked)

**Action**: Move to archive but keep for reference
```bash
mkdir -p docs/archive/unrealized-cms-plan
mv docs/CMS_IMPLEMENTATION_PLAN.md docs/archive/unrealized-cms-plan/
mv docs/cms-schema.md docs/archive/unrealized-cms-plan/
```

---

### 1.5 Old Claude Assistant Guide

**File**: `/docs/architecture/OLD-CLAUDE.md`
- **Filename indicates**: This is explicitly marked as old
- **Content**: Pre-Eleventy v3 guidance
- **Why outdated**: File instructs on Jekyll (this is NOT a Jekyll site)
- **Superseded by**: Current project structure and ELEVENTY-V3-MIGRATION.md

**Action**: Delete (already marked as "old")
```bash
rm docs/architecture/OLD-CLAUDE.md
```

---

### 1.6 Daily Documentation - Stale Snapshots

**File**: `/docs/daily/2025-01-14-cover-acquisition.md`
- **Date**: January 14, 2025 (10 months old)
- **Content**: Cover acquisition progress snapshot
- **Value**: Historical record only
- **Current relevance**: None (stats are outdated)

**Action**: Archive daily logs
```bash
mkdir -p docs/archive/daily-logs-2025
mv docs/daily/* docs/archive/daily-logs-2025/
```

---

## 2. Legacy CSV Data Files (Archive to `src/_data/archive/`)

**Problem**: Multiple CSV backups cluttering the data directory with unclear provenance.

**Files to Archive**:

1. `/src/_data/books_backup.csv` (538 KB)
   - No timestamp, unclear when created

2. `/src/_data/books_fixed.csv` (533 KB)
   - From November 12 fix, superseded

3. `/src/_data/books_original.csv` (538 KB)
   - Original before edits, keep one backup only

4. `/src/_data/books.csv.backup` (494 KB)
   - Generic backup from October 25

5. `/src/_data/books.csv.backup_before_cover_removal` (584 KB)
   - Pre-November 6 cover removal operation

6. `/src/_data/books.csv.bak` (538 KB)
   - Unnamed backup from November 12

**Keep Active**:
- `/src/_data/books.csv` (542 KB) - Current production data
- `/src/_data/backups/books_backup_2025-11-23.csv` - Timestamped backup

**Action**:
```bash
mkdir -p src/_data/archive/pre-2025-11-cleanup
mv src/_data/books_backup.csv src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books_fixed.csv src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books_original.csv src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books.csv.backup src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books.csv.backup_before_cover_removal src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books.csv.bak src/_data/archive/pre-2025-11-cleanup/
```

**Space saved**: ~3.2 MB

---

## 3. Legacy Scripts (Archive to `scripts/archive/`)

### 3.1 Migration Scripts - One-Time Use Complete

**Directory**: `/scripts/migrate/`

**Files to Archive**:
1. `enhanced-migration.js` (16 KB)
2. `migrate-to-unified-system.js` (18 KB)
3. `migration-handlers.js` (16 KB)
4. `migration-reporter.js` (16 KB)
5. `file-analyzer.js` (10 KB)
6. `backup-manager.js` (11 KB)

**Why**: These were for migrating to a unified module system. If migration is complete, archive them.

**Evidence migration is complete**:
- `migration-summary.md` exists (indicates completion)
- Scripts dated October 20, 2025 (over a month old)
- No recent activity in migrate/ directory

**Action**:
```bash
mkdir -p scripts/archive/2025-10-module-migration
mv scripts/migrate/*.js scripts/archive/2025-10-module-migration/
# Keep README and summary for reference
mv scripts/migrate/README.md scripts/archive/2025-10-module-migration/
mv scripts/migrate/migration-summary.md scripts/archive/2025-10-module-migration/
```

**Keep**: Template fix scripts might be useful:
```bash
# Move only if no longer needed
mv scripts/migrate/fix-all-templates.js scripts/archive/2025-10-module-migration/
mv scripts/migrate/fix-newlines.js scripts/archive/2025-10-module-migration/
mv scripts/migrate/fix-template-literals.js scripts/archive/2025-10-module-migration/
```

---

### 3.2 Database Scripts - Unused CMS Infrastructure

**Directory**: `/scripts/database/`

**Why archive**: No PostgreSQL backend is deployed or planned in immediate future.

**Files**:
- `database.js` (39 KB)
- `db-migration.js` (23 KB)
- `db-utils.js` (25 KB)
- `demo-migration.js` (2 KB)
- `migrate-production.js` (2 KB)
- `schema.sql` (18 KB)
- `test-database.js` (28 KB)
- `README.md` (10 KB)

**Action**: Archive entire directory
```bash
mkdir -p scripts/archive/unrealized-cms
mv scripts/database scripts/archive/unrealized-cms/
```

**Total**: ~150 KB saved

---

## 4. Log Files and Reports (Delete or Archive)

### 4.1 CSV Integrity Report

**File**: `/scripts/logs/csv-integrity-report.json`
- **Created**: November 23, 2025 (today, but at 16:56 - likely outdated)
- **Purpose**: One-time CSV validation report
- **Status**: Shows 1 duplicate ID and 30 missing titles
- **Action needed**: If issues are fixed, delete the report

**Recommended**:
```bash
# If issues are resolved, delete
rm scripts/logs/csv-integrity-report.json

# If keeping for reference, archive
mkdir -p scripts/logs/archive
mv scripts/logs/csv-integrity-report.json scripts/logs/archive/2025-11-23-csv-integrity-report.json
```

---

### 4.2 Main Application Log

**File**: `/scripts/logs/main-2025-11-23.log`
- **Type**: Daily application log
- **Recommendation**: Implement log rotation
- **Action**: Keep current, archive old logs

**Create log rotation policy**:
```bash
# Keep logs for 30 days, archive older
mkdir -p scripts/logs/archive
find scripts/logs -name "main-*.log" -mtime +30 -exec mv {} scripts/logs/archive/ \;
```

---

## 5. Unused CMS Upload Directory

**File**: `/cms/uploads/d45adaf8-4eff-40a8-b0c5-0cef4b33eb28.csv`
- **Why**: CMS backend was never fully implemented
- **Purpose**: Upload staging area for unrealized CMS
- **Status**: Single orphaned CSV file

**Action**:
```bash
rm -rf cms/uploads/*
```

---

## 6. Tag Analysis Documentation - Questionable Value

**Directory**: `/docs/tag-analysis/`

**Contents**:
- `TAG-REPORT.md`
- `tags-index.md`
- 20+ individual tag page files with unusual names like:
  - `Beginning_In_1939_With_Abbott_s_Early_Experiments_With_Scientific_Imagery.md`
  - `The_Malfunctions_Are_Appropriated_And_Reenacted_Via_Pre__And_Post_photographic_Processes___To_Test_Their_Sculptural_Qualities.md`

**Assessment**:
- Names suggest these are fragments of descriptions mistaken for tags
- Unlikely to be actively used
- No clear generation date

**Recommendation**: Review and likely archive
```bash
mkdir -p docs/archive/tag-analysis-review
mv docs/tag-analysis docs/archive/tag-analysis-review/
```

---

## Summary Table

| Category | Files | Disk Space | Action | Priority |
|----------|-------|------------|--------|----------|
| Deployment Docs | 3 files | ~100 KB | Archive | High |
| Status Docs | 2 files | ~20 KB | Archive | High |
| CMS Plan | 2 files | ~50 KB | Archive | Medium |
| Old Claude Guide | 1 file | ~5 KB | Delete | High |
| CSV Backups | 6 files | ~3.2 MB | Archive | Medium |
| Migration Scripts | 9 files | ~90 KB | Archive | Low |
| Database Scripts | 8 files | ~150 KB | Archive | Low |
| Integrity Reports | 1 file | ~2 KB | Archive | Medium |
| Tag Analysis | 23 files | ~50 KB | Review/Archive | Low |
| **Total** | **55 files** | **~3.7 MB** | | |

---

## Recommended Archive Structure

```
Hudson_Street_Library/
├── docs/
│   └── archive/
│       ├── 2025-11-deployment-cleanup/
│       │   ├── DEPLOYMENT.md
│       │   ├── DEPLOYMENT_GUIDE.md
│       │   └── DEPLOYMENT-MONITORING.md
│       ├── 2025-07-work-in-progress.md
│       ├── 2025-07-current-status.md
│       ├── unrealized-cms-plan/
│       │   ├── CMS_IMPLEMENTATION_PLAN.md
│       │   └── cms-schema.md
│       ├── daily-logs-2025/
│       │   └── 2025-01-14-cover-acquisition.md
│       └── tag-analysis-review/
│           └── [tag analysis files]
├── src/_data/
│   └── archive/
│       └── pre-2025-11-cleanup/
│           ├── books_backup.csv
│           ├── books_fixed.csv
│           ├── books_original.csv
│           ├── books.csv.backup
│           ├── books.csv.backup_before_cover_removal
│           └── books.csv.bak
└── scripts/
    ├── logs/archive/
    │   └── 2025-11-23-csv-integrity-report.json
    └── archive/
        ├── 2025-10-module-migration/
        │   ├── enhanced-migration.js
        │   ├── migrate-to-unified-system.js
        │   └── [other migration scripts]
        └── unrealized-cms/
            └── database/
                └── [database scripts]
```

---

## Implementation Script

```bash
#!/bin/bash
# Archive cleanup script for Hudson Street Library
# Run from project root

echo "Creating archive directories..."
mkdir -p docs/archive/2025-11-deployment-cleanup
mkdir -p docs/archive/unrealized-cms-plan
mkdir -p docs/archive/daily-logs-2025
mkdir -p src/_data/archive/pre-2025-11-cleanup
mkdir -p scripts/archive/2025-10-module-migration
mkdir -p scripts/archive/unrealized-cms
mkdir -p scripts/logs/archive

echo "Archiving outdated deployment documentation..."
mv docs/DEPLOYMENT.md docs/archive/2025-11-deployment-cleanup/
mv docs/DEPLOYMENT_GUIDE.md docs/archive/2025-11-deployment-cleanup/
mv docs/DEPLOYMENT-MONITORING.md docs/archive/2025-11-deployment-cleanup/

echo "Archiving status documentation..."
mv docs/WORK-IN-PROGRESS.md docs/archive/2025-07-work-in-progress.md
mv docs/CURRENT-STATUS.md docs/archive/2025-07-current-status.md

echo "Archiving CMS planning documents..."
mv docs/CMS_IMPLEMENTATION_PLAN.md docs/archive/unrealized-cms-plan/
mv docs/cms-schema.md docs/archive/unrealized-cms-plan/

echo "Deleting old Claude guide..."
rm docs/architecture/OLD-CLAUDE.md

echo "Archiving daily logs..."
mv docs/daily/* docs/archive/daily-logs-2025/ 2>/dev/null || true

echo "Archiving CSV backups..."
mv src/_data/books_backup.csv src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books_fixed.csv src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books_original.csv src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books.csv.backup src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books.csv.backup_before_cover_removal src/_data/archive/pre-2025-11-cleanup/
mv src/_data/books.csv.bak src/_data/archive/pre-2025-11-cleanup/

echo "Archiving migration scripts..."
mv scripts/migrate/*.js scripts/archive/2025-10-module-migration/ 2>/dev/null || true
mv scripts/migrate/*.md scripts/archive/2025-10-module-migration/ 2>/dev/null || true

echo "Archiving database scripts..."
mv scripts/database scripts/archive/unrealized-cms/

echo "Archiving integrity report..."
mv scripts/logs/csv-integrity-report.json scripts/logs/archive/2025-11-23-csv-integrity-report.json

echo "Cleanup complete!"
echo "Archived files are in docs/archive/, src/_data/archive/, and scripts/archive/"
echo "Review the archive directories and commit changes when ready."
```

---

## Post-Archive Actions

1. **Update Internal Links**:
   - Search for references to archived files in active documentation
   - Update links to point to current files or archive locations
   ```bash
   grep -r "DEPLOYMENT.md" docs/*.md
   grep -r "WORK-IN-PROGRESS" docs/*.md
   ```

2. **Create Fresh Documentation** (if needed):
   - `docs/PROJECT_STATUS.md` - Current metrics and status
   - Update `docs/INDEX.md` to reflect new structure

3. **Git Commit**:
   ```bash
   git add -A
   git commit -m "Archive legacy documentation and outdated files

   - Move 3 deployment guides to archive (superseded)
   - Archive outdated status documentation from July 2025
   - Archive 6 CSV backup files (3.2 MB)
   - Archive unrealized CMS implementation plans
   - Archive completed migration scripts
   - Delete OLD-CLAUDE.md (explicitly marked as old)
   - Total disk space reclaimed: ~3.7 MB"
   git push origin main
   ```

4. **Update .gitignore** (optional):
   ```gitignore
   # Archive directories (commit once, then ignore new additions)
   docs/archive/**/new-additions-after-2025-11-23
   src/_data/archive/**/new-additions-after-2025-11-23
   ```

---

## Long-Term Maintenance Recommendations

1. **Implement Log Rotation**:
   - Set up automated log rotation in scripts/logs/
   - Keep 30 days, archive older

2. **CSV Backup Policy**:
   - Use timestamped backups in `src/_data/backups/`
   - Automatically remove backups older than 90 days

3. **Documentation Reviews**:
   - Quarterly review of docs/ for outdated content
   - Mark files with "Last reviewed: YYYY-MM-DD"

4. **Tag Future Archives**:
   - Use YYYY-MM format for archive directories
   - Include README.md in each archive explaining context

---

**End of Archive Recommendations**
**Generated**: November 23, 2025
**Next Review**: February 2026
