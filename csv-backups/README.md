# books.csv backups

The entire Hudson Street Library site is generated from a single file,
`src/_data/books.csv`. That makes it a single point of failure: if it is
corrupted, truncated, or accidentally overwritten, the site breaks.

This directory holds **durable, GitHub-hosted snapshots** of that file so a
good copy always exists independently of any local machine.

## How backups are created

The [`Backup books.csv`](../.github/workflows/backup-books-csv.yml) GitHub
Actions workflow runs:

- on every push to `main` that changes `src/_data/books.csv`,
- once daily as a safety net (only snapshots if the catalog actually changed),
- on demand via **Actions → Backup books.csv → Run workflow**.

Each run:

1. **Validates** `books.csv` (a corrupt catalog is never backed up).
2. **Commits** a timestamped copy here, e.g. `books_2026-05-30_031500.csv`.
   The 90 most recent snapshots are kept.
3. **Uploads** the current `books.csv` as a workflow artifact named
   `books-csv-backup` with 90-day retention — a fallback if the commit step
   is ever blocked.

## Restoring from a backup

Pick a known-good snapshot and copy it back over the live file:

```bash
# List available snapshots (newest last)
ls -1 csv-backups/books_*.csv

# Restore a specific snapshot
cp csv-backups/books_2026-05-30_031500.csv src/_data/books.csv

# Validate, then commit
node scripts/validate-csv-robust.js src/_data/books.csv
git add src/_data/books.csv && git commit -m "restore: books.csv from backup"
```

You can also restore any historical version directly from git history without
this directory:

```bash
git log --oneline -- src/_data/books.csv          # find a good commit
git show <commit>:src/_data/books.csv > src/_data/books.csv
```

> Note: the older `scripts/backup-books-csv.sh` writes backups to a local,
> git-ignored folder and relied on a personal machine's cron. It still works
> for local use, but the workflow above is the durable, off-machine backup.
