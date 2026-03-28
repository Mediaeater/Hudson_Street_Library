# Hudson Street Library - Backup System

## Overview

Comprehensive multi-layered backup system for the critical `books.csv` file with automated scheduling, multiple backup locations, and intelligent rotation.

## Quick Start

### Initial Setup

```bash
# Run the setup script
./scripts/setup-backup-cron.sh
```

Choose your backup frequency (recommended: every 6 hours).

### Manual Backup

```bash
# Run backup immediately
./scripts/backup-books-csv.sh
```

### Check Status

```bash
# View backup logs
tail -f logs/backup.log

# List current cron jobs
crontab -l

# Check backup locations
ls -lh src/_data/backups/
ls -lh ~/.hudson-library-backups/{hourly,daily,weekly}
```

## Backup Architecture

### Three-Tier Protection

1. **Local Project Backups** (`src/_data/backups/`)
   - One backup per day
   - Keeps 30 days
   - Committed to git (excluded from .gitignore)
   - Fast access for quick restores

2. **Safe Directory** (`~/.hudson-library-backups/`)
   - **Outside project directory** (survives project deletion)
   - Three rotation tiers:
     - **Hourly**: 24 most recent (last 24 hours)
     - **Daily**: 30 most recent (last month)
     - **Weekly**: 12 most recent (last 3 months)
   - Protected from accidental project cleanup

3. **Git Commits**
   - Automatic commit if CSV changes detected
   - Full version history
   - Can push to remote for off-site backup
   - Includes change statistics in commit message

### Backup Flow

```
books.csv
    │
    ├─→ Local backup (daily)
    │   └─ src/_data/backups/books_backup_YYYY-MM-DD.csv
    │
    ├─→ Safe backups (outside project)
    │   ├─ hourly/books_YYYY-MM-DD_HHMMSS.csv (24 kept)
    │   ├─ daily/books_YYYY-MM-DD.csv (30 kept)
    │   └─ weekly/books_YYYY-WXX.csv (12 kept)
    │
    └─→ Git commit (if changes)
        └─ "Automatic backup: books.csv updated"
```

## Automation

### Cron Schedule Options

| Schedule | Cron Expression | Description |
|----------|----------------|-------------|
| Every 6 hours (recommended) | `0 */6 * * *` | 4 backups/day |
| Every 4 hours | `0 */4 * * *` | 6 backups/day |
| Every 12 hours | `0 */12 * * *` | 2 backups/day |
| Daily at 2 AM | `0 2 * * *` | 1 backup/day |
| Every hour | `0 * * * *` | 24 backups/day |

### Recommended: Every 6 Hours

Balances protection with reasonable storage:
- **~1,460 backups per year** (4 per day × 365 days)
- **After rotation**: ~65 backups total (24 hourly + 30 daily + 12 weekly)
- **Storage**: ~45 MB (65 backups × ~700 KB each)

## Retention Policy

| Type | Retention | Max Backups | Purpose |
|------|-----------|-------------|---------|
| Hourly | Last 24 hours | 24 files | Recent changes recovery |
| Daily | Last 30 days | 30 files | Short-term history |
| Weekly | Last 12 weeks | 12 files | Long-term snapshots |
| Local | Last 30 days | ~30 files | Quick access |
| Git | Forever | Unlimited | Full version history |

**Total storage**: ~45-50 MB for all backups

## Recovery Procedures

### Recent Changes (Last 24 Hours)

```bash
# List recent hourly backups
ls -lt ~/.hudson-library-backups/hourly/

# Restore from specific time
cp ~/.hudson-library-backups/hourly/books_2026-03-28_143000.csv src/_data/books.csv
```

### Last Few Days

```bash
# List daily backups
ls -lt ~/.hudson-library-backups/daily/

# Restore from specific date
cp ~/.hudson-library-backups/daily/books_2026-03-25.csv src/_data/books.csv
```

### Weeks Ago

```bash
# List weekly backups
ls -lt ~/.hudson-library-backups/weekly/

# Restore from specific week
cp ~/.hudson-library-backups/weekly/books_2026-W12.csv src/_data/books.csv
```

### From Git History

```bash
# View git log
git log --oneline src/_data/books.csv

# Restore from specific commit
git checkout <commit-hash> src/_data/books.csv

# Or restore from specific date
git log --since="2026-03-20" --until="2026-03-21" -- src/_data/books.csv
git checkout <commit-hash> src/_data/books.csv
```

## Verification

### Check Backup Integrity

```bash
# Run test backup
./scripts/backup-books-csv.sh

# Should show:
# ✓ File size verification
# ✓ All three backup locations
# ✓ Backup count summary
```

### Compare Backups

```bash
# Compare current with backup
diff src/_data/books.csv ~/.hudson-library-backups/daily/books_2026-03-28.csv

# Count records in both
wc -l src/_data/books.csv ~/.hudson-library-backups/daily/books_2026-03-28.csv
```

### Backup Statistics

```bash
# Count all backups
echo "Local: $(ls src/_data/backups/books_backup_*.csv 2>/dev/null | wc -l)"
echo "Hourly: $(ls ~/.hudson-library-backups/hourly/books_*.csv 2>/dev/null | wc -l)"
echo "Daily: $(ls ~/.hudson-library-backups/daily/books_*.csv 2>/dev/null | wc -l)"
echo "Weekly: $(ls ~/.hudson-library-backups/weekly/books_*.csv 2>/dev/null | wc -l)"

# Total storage used
du -sh ~/.hudson-library-backups/
du -sh src/_data/backups/
```

## Troubleshooting

### Cron Not Running

**Check if cron is enabled:**
```bash
crontab -l
launchctl list | grep cron
```

**macOS specific:**
- Go to System Settings > Privacy & Security > Full Disk Access
- Add Terminal or your shell to allowed apps

### Backups Not Created

**Check logs:**
```bash
tail -50 logs/backup.log
```

**Test manually:**
```bash
./scripts/backup-books-csv.sh
```

**Check permissions:**
```bash
ls -la scripts/backup-books-csv.sh  # Should be executable (-rwxr-xr-x)
```

### Disk Space Issues

**Clean old backups manually:**
```bash
# Remove hourly backups older than 1 day
find ~/.hudson-library-backups/hourly -name "books_*.csv" -mtime +1 -delete

# Remove daily backups older than 30 days
find ~/.hudson-library-backups/daily -name "books_*.csv" -mtime +30 -delete
```

### Git Commits Failing

**Check git status:**
```bash
cd /Users/m/Projects/Hudson_Street_Library
git status
```

**If unstaged changes:**
```bash
# Backup script uses --no-verify to avoid hooks
# Check if there are uncommitted changes blocking
```

## Maintenance

### Monthly Tasks

1. **Verify backups exist:**
   ```bash
   ls -lh ~/.hudson-library-backups/{hourly,daily,weekly}
   ```

2. **Check backup logs:**
   ```bash
   tail -100 logs/backup.log | grep -i error
   ```

3. **Test a restore:**
   ```bash
   # Copy backup to temp location and verify
   cp ~/.hudson-library-backups/daily/books_$(date +%Y-%m-%d).csv /tmp/test_restore.csv
   wc -l /tmp/test_restore.csv
   ```

### Quarterly Tasks

1. **Review retention policy** - adjust if needed
2. **Archive old weekly backups** to external drive
3. **Verify git remote backups** - push to GitHub

## Off-Site Backups

### GitHub (Automatic)

If you push to GitHub regularly:
```bash
git push origin main
```

Your books.csv is backed up to GitHub in every commit.

### Manual External Drive Backup

```bash
# Copy all safe backups to external drive
cp -r ~/.hudson-library-backups/ /Volumes/ExternalDrive/hudson-library-backups-$(date +%Y-%m-%d)/
```

### Cloud Sync (Optional)

Consider syncing `~/.hudson-library-backups/` with:
- Dropbox
- Google Drive
- iCloud Drive
- Backblaze

**Setup example with iCloud:**
```bash
# Create symlink from iCloud to backup directory
ln -s ~/.hudson-library-backups ~/Library/Mobile\ Documents/com~apple~CloudDocs/hudson-library-backups
```

## Files

```
scripts/
├── backup-books-csv.sh           # Main backup script
└── setup-backup-cron.sh          # Cron configuration helper

src/_data/
├── books.csv                     # The critical file
└── backups/                      # Local backups (30 days)

~/.hudson-library-backups/        # Safe location (outside project)
├── hourly/                       # 24 most recent
├── daily/                        # 30 most recent
└── weekly/                       # 12 most recent

logs/
└── backup.log                    # Cron job logs
```

## Security Considerations

1. **Safe directory** (`~/.hudson-library-backups/`) is outside project:
   - Survives `rm -rf` of project directory
   - Not affected by git operations
   - Protected from accidental cleanup scripts

2. **Permissions**:
   - Backup directory: `drwxr-xr-x` (755)
   - Backup files: `-rw-r--r--` (644)
   - Scripts: `-rwxr-xr-x` (755)

3. **Git commits**:
   - Uses `--no-verify` to avoid hook failures
   - Clearly marked as automatic backups
   - Includes change statistics

## Integration

### With Other Scripts

```bash
# Before risky operations, create a backup
./scripts/backup-books-csv.sh

# Then proceed with operation
node scripts/some-risky-operation.js
```

### Pre-commit Hook

Already integrated - manual backups created in:
- `src/_data/backups/` before CSV modifications
- Automatic backup commits when changes detected

## Summary

✅ **Three backup locations** (local, safe, git)
✅ **Intelligent rotation** (hourly/daily/weekly)
✅ **Automated scheduling** (cron)
✅ **File verification** (size checks)
✅ **Easy recovery** (multiple timeframes)
✅ **Low overhead** (~50 MB total)

**Result**: Books.csv is protected with multiple layers of redundancy and point-in-time recovery options from the last hour to the last 3 months.

---

**Setup**: Run `./scripts/setup-backup-cron.sh`
**Manual**: Run `./scripts/backup-books-csv.sh`
**Status**: Check `tail -f logs/backup.log`
