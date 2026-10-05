# Backup System - Quick Reference

> **Naming changed 2026-10-05.** The art wing moved from `src/_data/books.csv`
> to `src/_data/catalog/art.csv`, and its backup copies are now named
> `catalog_art_…` like every other wing's (`catalog_<wing>_…`). Copies named
> `books_…` are the art wing from before that date and keep their names. The
> examples below that show `books_…` files apply to those older copies; for a
> newer one substitute `catalog_art_…`. In git, use `git log --follow` on the
> new path, and `<commit>:src/_data/books.csv` for commits before the rename.

> **Critical**: books.csv is your most important file. Automated backups run every 6 hours.

## Status Check

```bash
# Check if backups are running
crontab -l

# View recent backup activity
tail -20 logs/backup.log

# Count all backups
echo "Hourly: $(ls ~/.hudson-library-backups/hourly/*.csv 2>/dev/null | wc -l)"
echo "Daily: $(ls ~/.hudson-library-backups/daily/*.csv 2>/dev/null | wc -l)"
echo "Weekly: $(ls ~/.hudson-library-backups/weekly/*.csv 2>/dev/null | wc -l)"
```

## Manual Backup (Before Risky Operations)

```bash
# Create backup now
./scripts/backup-books-csv.sh

# Result: Backs up to 3 locations in ~1 second
```

## Restore Examples

### Last Few Hours

```bash
# List recent backups
ls -lt ~/.hudson-library-backups/hourly/

# Restore specific backup
cp ~/.hudson-library-backups/hourly/books_2026-03-28_193228.csv src/_data/catalog/art.csv
```

### Yesterday or Last Week

```bash
# List daily backups
ls -lt ~/.hudson-library-backups/daily/

# Restore from 3 days ago
cp ~/.hudson-library-backups/daily/books_2026-03-25.csv src/_data/catalog/art.csv
```

### Weeks Ago

```bash
# List weekly backups
ls -lt ~/.hudson-library-backups/weekly/

# Restore from 2 weeks ago
cp ~/.hudson-library-backups/weekly/books_2026-W11.csv src/_data/catalog/art.csv
```

### From Git History

```bash
# See recent commits
git log --oneline -20 --follow -- src/_data/catalog/art.csv

# Restore from specific commit
git checkout <commit-hash> src/_data/catalog/art.csv

# Or by date
git log --since="2026-03-20" --until="2026-03-21" -- src/_data/catalog/art.csv
```

## Backup Locations

```
books.csv
    │
    ├─→ src/_data/backups/              (30 days, local)
    │
    ├─→ ~/.hudson-library-backups/      (outside project)
    │   ├── hourly/  (24 backups)
    │   ├── daily/   (30 backups)
    │   └── weekly/  (12 backups)
    │
    └─→ Git commits                      (forever)
```

## Schedule

**Current**: Every 6 hours (00:00, 06:00, 12:00, 18:00)

**Change schedule**:
```bash
./scripts/setup-backup-cron.sh
```

## Troubleshooting

### Backups Not Running

**Check cron**:
```bash
crontab -l
tail -50 logs/backup.log
```

**macOS: Enable Full Disk Access**:
1. System Settings > Privacy & Security > Full Disk Access
2. Add Terminal
3. Restart Terminal

### Verify Backup Integrity

```bash
# Compare current with backup
diff src/_data/catalog/art.csv ~/.hudson-library-backups/daily/books_$(date +%Y-%m-%d).csv

# Check file sizes
ls -lh src/_data/catalog/art.csv ~/.hudson-library-backups/daily/books_*.csv
```

## Recovery Workflow

1. **Identify when the issue occurred**
2. **Choose appropriate backup tier** (hourly/daily/weekly)
3. **List available backups**: `ls -lt ~/.hudson-library-backups/hourly/`
4. **Copy backup to staging**: `cp backup.csv /tmp/restore_test.csv`
5. **Verify backup**: `wc -l /tmp/restore_test.csv` (should be ~1800 lines)
6. **Restore**: `cp /tmp/restore_test.csv src/_data/catalog/art.csv`
7. **Validate**: `node scripts/validate-csv-structure.js`
8. **Test**: Check a few book pages on the site
9. **Commit**: `git add src/_data/catalog/art.csv && git commit -m "Restore from backup"`

## Emergency Contact

**If backups fail or data is lost**, you have multiple recovery options:

1. Local backups (30 days): `src/_data/backups/`
2. Safe directory (3 months): `~/.hudson-library-backups/`
3. Git history (forever): `git log --follow -- src/_data/catalog/art.csv`
4. GitHub remote (if pushed): `git pull origin main`

## Key Numbers

- **Backup frequency**: Every 6 hours
- **Retention**: 24 hours → 30 days → 3 months
- **Storage**: ~50 MB total for all backups
- **Recovery points**: 65+ individual backups available
- **Safe location**: `~/.hudson-library-backups/` (survives project deletion)

## Full Documentation

For complete details, see [`docs/BACKUP-SYSTEM.md`](./BACKUP-SYSTEM.md)
