# Catalogue CSV backups

The entire Hudson Street Library site is generated from the catalogue CSVs:
one `src/_data/catalog/<wing>.csv` per wing, declared in
`src/_data/wings.json`. `art.csv` is the art wing. If one of these files is
corrupted, truncated, or accidentally overwritten, the site breaks.

This directory holds **durable, GitHub-hosted snapshots** of each file so a
good copy always exists independently of any local machine.

## File names

- `catalog_<wing>_<stamp>.csv`: a snapshot of `src/_data/catalog/<wing>.csv`.
  The art wing is `catalog_art_<stamp>.csv`.
- `books_<stamp>.csv`: the art wing from before 2026-10-05, when it lived at
  `src/_data/books.csv`. These keep their names. Nothing writes new ones, and
  they are no longer pruned.

## How backups are created

The [`Backup catalogue CSVs`](../.github/workflows/backup-books-csv.yml) GitHub
Actions workflow runs:

- on every push to `main` that changes a file under `src/_data/catalog/`,
- once daily as a safety net (only snapshots a file that actually changed),
- on demand via **Actions → Backup catalogue CSVs → Run workflow**.

Each run:

1. **Validates** every catalogue file (a corrupt catalogue is never backed up).
2. **Commits** a timestamped copy of each changed file here, e.g.
   `catalog_art_2026-10-05_211500.csv`. The 90 most recent snapshots per wing
   are kept.
3. **Uploads** the current files as a workflow artifact named
   `catalogue-csv-backup` with 90-day retention, a fallback if the commit step
   is ever blocked.

## Restoring from a backup

Pick a known-good snapshot and copy it back over the live file:

```bash
# List available snapshots for a wing (newest last)
ls -1 csv-backups/catalog_art_*.csv
ls -1 csv-backups/books_*.csv          # art wing, before 2026-10-05

# Restore a specific snapshot
cp csv-backups/catalog_art_2026-10-05_211500.csv src/_data/catalog/art.csv

# Validate every file plus id uniqueness across files, then commit
npm run test:csv
git add src/_data/catalog/art.csv && git commit -m "restore: art wing from backup"
```

You can also restore any historical version directly from git history without
this directory. The art wing was renamed on 2026-10-05, so follow the rename
and use the path the file had at that commit:

```bash
git log --oneline --follow -- src/_data/catalog/art.csv   # find a good commit
git show <commit>:src/_data/catalog/art.csv > src/_data/catalog/art.csv
git show <commit>:src/_data/books.csv > src/_data/catalog/art.csv   # commits before the rename
```

> Note: `scripts/backup-books-csv.sh` writes the same per-wing copies to a
> local, git-ignored folder and to `~/.hudson-library-backups/`, run by launchd
> every 6 hours. The workflow above is the durable, off-machine backup.
