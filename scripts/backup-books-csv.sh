#!/bin/bash
#
# Hudson Street Library - Critical CSV Backup Script
#
# This script creates multiple backup copies of the catalogue CSVs with
# timestamps and rotates old backups to prevent disk space issues. The
# catalogue is src/_data/books.csv (the art wing) plus one
# src/_data/catalog/<wing>.csv per wing; wing copies are named
# catalog_<wing>_… alongside the books_… copies.
#
# Backup locations:
# 1. Local project backups directory (src/_data/backups/)
# 2. Safe directory outside project (/Users/m/.hudson-library-backups/)
# 3. Git commit (if changes detected)
#
# Usage:
#   ./scripts/backup-books-csv.sh            # copies + git backup commit
#   ./scripts/backup-books-csv.sh --no-git   # copies only, no commit
#
# --no-git is what the scheduled LaunchAgent uses. Unattended, the git step
# would commit whatever mid-edit state books.csv happens to be in, and it uses
# --no-verify, which skips the pre-commit hook that validates CSV structure.
# That is the one gate protecting against a structural break, so the scheduled
# run does not touch git. Git snapshots still happen on every push, via the
# "Backup books.csv" GitHub Actions workflow.
#
# Scheduled by: ~/Library/LaunchAgents/com.hudsonstreetlibrary.backup.plist
# Log:          logs/backup.log

set -euo pipefail

SKIP_GIT=0
for arg in "$@"; do
    case "$arg" in
        --no-git) SKIP_GIT=1 ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CSV_FILE="$PROJECT_DIR/src/_data/books.csv"
CATALOG_DIR="$PROJECT_DIR/src/_data/catalog"
LOCAL_BACKUP_DIR="$PROJECT_DIR/src/_data/backups"
SAFE_BACKUP_DIR="$HOME/.hudson-library-backups"
TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
DATE_ONLY=$(date +"%Y-%m-%d")

# Retention policy
KEEP_LOCAL_DAYS=30      # Keep 30 days of local backups
KEEP_SAFE_DAYS=90       # Keep 90 days in safe directory
KEEP_HOURLY=24          # Keep 24 hourly backups (1 day)
KEEP_DAILY=30           # Keep 30 daily backups
KEEP_WEEKLY=12          # Keep 12 weekly backups (3 months)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if CSV file exists
if [[ ! -f "$CSV_FILE" ]]; then
    error "books.csv not found at $CSV_FILE"
    exit 1
fi

# Get file size and record count for verification
FILE_SIZE=$(stat -f%z "$CSV_FILE" 2>/dev/null || stat -c%s "$CSV_FILE" 2>/dev/null)
RECORD_COUNT=$(wc -l < "$CSV_FILE")

log "Starting backup of books.csv"
log "  File size: $FILE_SIZE bytes"
log "  Records: $RECORD_COUNT lines"

# Create directories if they don't exist
mkdir -p "$LOCAL_BACKUP_DIR"
mkdir -p "$SAFE_BACKUP_DIR"/{hourly,daily,weekly}

# ============================================
# Backup 1: Local project directory
# ============================================
LOCAL_BACKUP="$LOCAL_BACKUP_DIR/books_backup_${DATE_ONLY}.csv"

if [[ -f "$LOCAL_BACKUP" ]]; then
    # File already exists for today, create timestamped version
    LOCAL_BACKUP="$LOCAL_BACKUP_DIR/books_backup_${TIMESTAMP}.csv"
fi

cp "$CSV_FILE" "$LOCAL_BACKUP"
log "Local backup: $LOCAL_BACKUP"

# Verify backup
if [[ ! -f "$LOCAL_BACKUP" ]]; then
    error "Local backup failed!"
    exit 1
fi

BACKUP_SIZE=$(stat -f%z "$LOCAL_BACKUP" 2>/dev/null || stat -c%s "$LOCAL_BACKUP" 2>/dev/null)
if [[ "$BACKUP_SIZE" -ne "$FILE_SIZE" ]]; then
    error "Local backup size mismatch! Original: $FILE_SIZE, Backup: $BACKUP_SIZE"
    exit 1
fi

# ============================================
# Backup 2: Safe directory (outside project)
# ============================================

# Hourly backup (with full timestamp)
HOURLY_BACKUP="$SAFE_BACKUP_DIR/hourly/books_${TIMESTAMP}.csv"
cp "$CSV_FILE" "$HOURLY_BACKUP"
log "Safe hourly backup: $HOURLY_BACKUP"

# Daily backup (one per day)
DAILY_BACKUP="$SAFE_BACKUP_DIR/daily/books_${DATE_ONLY}.csv"
if [[ ! -f "$DAILY_BACKUP" ]]; then
    cp "$CSV_FILE" "$DAILY_BACKUP"
    log "Safe daily backup: $DAILY_BACKUP"
fi

# Weekly backup (one per week)
WEEK_NUMBER=$(date +"%Y-W%V")
WEEKLY_BACKUP="$SAFE_BACKUP_DIR/weekly/books_${WEEK_NUMBER}.csv"
if [[ ! -f "$WEEKLY_BACKUP" ]]; then
    cp "$CSV_FILE" "$WEEKLY_BACKUP"
    log "Safe weekly backup: $WEEKLY_BACKUP"
fi

# ============================================
# Backup 1b + 2b: the per-wing files (src/_data/catalog/*.csv)
# ============================================
# Same three copies as books.csv, prefixed catalog_<wing>_ so the rotation
# below can keep each file's history separately.
CATALOG_COUNT=0
for wing_file in "$CATALOG_DIR"/*.csv; do
    [[ -e "$wing_file" ]] || continue
    wing="catalog_$(basename "$wing_file" .csv)"
    CATALOG_COUNT=$((CATALOG_COUNT + 1))

    wing_local="$LOCAL_BACKUP_DIR/${wing}_backup_${DATE_ONLY}.csv"
    [[ -f "$wing_local" ]] && wing_local="$LOCAL_BACKUP_DIR/${wing}_backup_${TIMESTAMP}.csv"
    cp "$wing_file" "$wing_local"
    if [[ "$(stat -f%z "$wing_local" 2>/dev/null || stat -c%s "$wing_local")" -ne "$(stat -f%z "$wing_file" 2>/dev/null || stat -c%s "$wing_file")" ]]; then
        error "Local backup size mismatch for $(basename "$wing_file")"
        exit 1
    fi

    cp "$wing_file" "$SAFE_BACKUP_DIR/hourly/${wing}_${TIMESTAMP}.csv"
    [[ -f "$SAFE_BACKUP_DIR/daily/${wing}_${DATE_ONLY}.csv" ]] || cp "$wing_file" "$SAFE_BACKUP_DIR/daily/${wing}_${DATE_ONLY}.csv"
    [[ -f "$SAFE_BACKUP_DIR/weekly/${wing}_${WEEK_NUMBER}.csv" ]] || cp "$wing_file" "$SAFE_BACKUP_DIR/weekly/${wing}_${WEEK_NUMBER}.csv"
done
log "Wing files backed up: $CATALOG_COUNT (local + safe hourly/daily/weekly)"

# ============================================
# Backup 3: Git commit (if changes detected)
# ============================================
cd "$PROJECT_DIR"

if [[ $SKIP_GIT -eq 1 ]]; then
    log "Git backup skipped (--no-git)"
elif git diff --quiet -- "$CSV_FILE" "$CATALOG_DIR"; then
    log "No changes in the catalogue CSVs since last commit"
else
    log "Changes detected in the catalogue CSVs"

    # Check if we're in a git repo
    if git rev-parse --git-dir > /dev/null 2>&1; then
        # Create automatic backup commit
        git add -- "$CSV_FILE" "$CATALOG_DIR"

        # Get stats for commit message
        ADDITIONS=$(git diff --cached --numstat -- "$CSV_FILE" "$CATALOG_DIR" | awk '{s+=$1} END {print s+0}')
        DELETIONS=$(git diff --cached --numstat -- "$CSV_FILE" "$CATALOG_DIR" | awk '{s+=$2} END {print s+0}')

        COMMIT_MSG="Automatic backup: catalogue CSVs updated (books.csv $RECORD_COUNT lines)

Automated backup commit
Timestamp: $TIMESTAMP
Additions: +$ADDITIONS lines
Deletions: -$DELETIONS lines

This is an automatic backup commit created by backup-books-csv.sh"

        if git commit -m "$COMMIT_MSG" --no-verify 2>/dev/null; then
            success "Git backup commit created"
            log "To push to remote: git push origin main"
        else
            warning "Git commit failed (may need to push manually)"
        fi
    else
        warning "Not in a git repository, skipping git backup"
    fi
fi

# ============================================
# Cleanup: Rotate old backups
# ============================================

log "Rotating old backups..."

# Every copied file has a prefix: "books" for books.csv, "catalog_<wing>" for
# each wing file. Count-based rotation runs per prefix so a run that copies
# seven files does not push the older books.csv copies out early.
PREFIXES=("books")
for wing_file in "$CATALOG_DIR"/*.csv; do
    [[ -e "$wing_file" ]] && PREFIXES+=("catalog_$(basename "$wing_file" .csv)")
done

# rotate_count <dir> <prefix> <keep>: keep only the <keep> most recent files
rotate_count() {
    local dir="$1" prefix="$2" keep="$3" count
    [[ -d "$dir" ]] || return 0
    count=$(find "$dir" -name "${prefix}_*.csv" -type f | wc -l)
    if [[ $count -gt $keep ]]; then
        find "$dir" -name "${prefix}_*.csv" -type f -print0 | \
            xargs -0 ls -t | \
            tail -n +$((keep + 1)) | \
            xargs rm -f
        log "  Rotated $(basename "$dir") ${prefix}_ backups (keeping $keep most recent)"
    fi
}

# Clean up local backups older than KEEP_LOCAL_DAYS
if [[ -d "$LOCAL_BACKUP_DIR" ]]; then
    DELETED_LOCAL=$(find "$LOCAL_BACKUP_DIR" \( -name "books_backup_*.csv" -o -name "catalog_*_backup_*.csv" \) -type f -mtime +${KEEP_LOCAL_DAYS} -delete -print | wc -l)
    if [[ $DELETED_LOCAL -gt 0 ]]; then
        log "  Deleted $DELETED_LOCAL old local backup(s) (>$KEEP_LOCAL_DAYS days)"
    fi
fi

# Hourly: keep KEEP_HOURLY most recent per file
for prefix in "${PREFIXES[@]}"; do
    rotate_count "$SAFE_BACKUP_DIR/hourly" "$prefix" "$KEEP_HOURLY"
done

# Clean up daily backups
if [[ -d "$SAFE_BACKUP_DIR/daily" ]]; then
    DELETED_DAILY=$(find "$SAFE_BACKUP_DIR/daily" \( -name "books_*.csv" -o -name "catalog_*.csv" \) -type f -mtime +${KEEP_DAILY} -delete -print | wc -l)
    if [[ $DELETED_DAILY -gt 0 ]]; then
        log "  Deleted $DELETED_DAILY old daily backup(s) (>$KEEP_DAILY days)"
    fi
fi

# Weekly: keep KEEP_WEEKLY most recent per file
for prefix in "${PREFIXES[@]}"; do
    rotate_count "$SAFE_BACKUP_DIR/weekly" "$prefix" "$KEEP_WEEKLY"
done

# ============================================
# Summary
# ============================================

# Count total backups
TOTAL_LOCAL=$(find "$LOCAL_BACKUP_DIR" \( -name "books_backup_*.csv" -o -name "catalog_*_backup_*.csv" \) -type f 2>/dev/null | wc -l)
TOTAL_HOURLY=$(find "$SAFE_BACKUP_DIR/hourly" \( -name "books_*.csv" -o -name "catalog_*.csv" \) -type f 2>/dev/null | wc -l)
TOTAL_DAILY=$(find "$SAFE_BACKUP_DIR/daily" \( -name "books_*.csv" -o -name "catalog_*.csv" \) -type f 2>/dev/null | wc -l)
TOTAL_WEEKLY=$(find "$SAFE_BACKUP_DIR/weekly" \( -name "books_*.csv" -o -name "catalog_*.csv" \) -type f 2>/dev/null | wc -l)

success "Backup complete!"
log "Summary:"
log "  Local backups: $TOTAL_LOCAL files in $LOCAL_BACKUP_DIR"
log "  Safe backups: $TOTAL_HOURLY hourly, $TOTAL_DAILY daily, $TOTAL_WEEKLY weekly"
log "  Safe location: $SAFE_BACKUP_DIR"
log ""
log "Backup locations:"
log "  1. Local:  $LOCAL_BACKUP"
log "  2. Safe:   $HOURLY_BACKUP"
log "  3. Git:    $(git log -1 --format='%h %s' 2>/dev/null || echo 'N/A')"

# Return success
exit 0
