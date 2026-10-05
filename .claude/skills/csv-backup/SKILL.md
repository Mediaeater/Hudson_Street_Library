---
name: csv-backup
description: Use when verifying, running, or restoring backups of the catalogue CSVs (src/_data/catalog/*.csv) for Hudson Street Library, or when the launchd backup job looks stale. Covers the four protection layers, the 6-hourly job, and restore steps.
user_invocable: true
---

# Catalogue CSV backups

The catalogue is one `src/_data/catalog/<wing>.csv` per wing (`art.csv` is the
art wing), declared in `src/_data/wings.json`. Together they are the only
source of truth. Four things protect them:

1. **GitHub remote**: every change is committed and pushed, so the remote holds
   full history. This is the real protection; the rest are conveniences.
2. **`csv-backups/` in the repo**: a snapshot of each changed file committed by
   the "Backup catalogue CSVs" GitHub Actions workflow
   (`backup-books-csv.yml`) after every push that touches a catalogue CSV
   (`catalog_<wing>_<stamp>.csv`).
3. **`~/.hudson-library-backups/`**: hourly/daily/weekly copies outside the
   project, so they survive deleting the project directory.
4. **`src/_data/backups/`**: same copies inside the project (gitignored).

Every copy carries a `catalog_<wing>_` prefix; rotation keeps each file's
history separately.

**Old names.** Until 2026-10-05 the art wing was `src/_data/books.csv` and its
copies were named `books_…` in all three places. Those copies keep their names.
To restore art from before that date, use a `books_…` file; from after, a
`catalog_art_…` file. Either way the destination is `src/_data/catalog/art.csv`.
The 90 `books_…` snapshots in `csv-backups/` are no longer pruned.

## Scheduled job

Run by launchd every 6 hours plus once at login:

- Agent: `~/Library/LaunchAgents/com.hudsonstreetlibrary.backup.plist`
  (installed 2026-08-09; before that the project docs claimed a 6-hourly job
  that did not exist, and the off-project copies were 14 days stale)
- Verify it is registered: `launchctl list | grep hudson` (second column is the
  last exit status; 0 is good)
- Check runs: `tail -f logs/backup.log`
- Reload after editing the plist:
  `launchctl unload <plist> && launchctl load <plist>`

**The scheduled run uses `--no-git`, deliberately.** The script's git path
commits with `--no-verify`, which skips the pre-commit hook that validates CSV
structure, the one gate against a structural break reaching the repo. Run
unattended it would also commit whatever mid-edit state the file happened to be
in. Git snapshots come from the Actions workflow instead. Do not change this.

## Manual commands

- Backup with the git commit: `./scripts/backup-books-csv.sh`
- Backup, copies only: `./scripts/backup-books-csv.sh --no-git`
- Restore a wing (art included): `cp ~/.hudson-library-backups/daily/catalog_<wing>_YYYY-MM-DD.csv src/_data/catalog/<wing>.csv`
- After any restore, run `npm run test:csv` (validates every file plus id
  uniqueness across files) before committing.
