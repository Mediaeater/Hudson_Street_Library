# Covers

One path. A row names its cover in `image_url`, and the page shows that file.

## See what is missing

```bash
node scripts/covers/report.js                  # every wing
node scripts/covers/report.js --wing hacking
node scripts/covers/report.js --tag "Photography"
node scripts/covers/report.js --grouping Magazines
node scripts/covers/report.js --ids 61,248,1300-1320
node scripts/covers/report.js --summary        # counts only
node scripts/covers/report.js --orphans        # list the unused files too
node scripts/covers/report.js --json
node scripts/covers/report.js --check          # exit 1 on a path that would 404
```

The report loads every wing with `loadCatalogSync()`, reads each row's `image_url`
and checks the file on disk. It lists rows with no cover, rows whose path is broken
or lacks the leading slash, covers under 8 KB, and image files no row names. Scope
flags combine. It fetches nothing and writes nothing.

## Attach a cover

```bash
node scripts/covers/attach.js <id> <file-or-url>
node scripts/covers/attach.js <id> <file-or-url> --dry-run
node scripts/covers/attach.js <id> <file-or-url> --overwrite
```

One row and one image per run. The command:

1. reads the bytes and refuses anything that is not a JPEG, PNG or WebP (an HTML
   error page saved as `.jpg` is the usual failure),
2. converts PNG and WebP to JPEG,
3. names the file `{author_last}_{author_first}_{title}_{isbn}.jpg`, lowercase with
   underscores,
4. saves it to `src/assets/images/books/`,
5. sets `image_url` (with its leading slash) through `CSVHandler`, in the wing file
   that owns the id, and confirms no other cell changed.

It refuses a row that already has a cover unless you pass `--overwrite`. It never
deletes the old file.

Look at the image before you attach it. If it is a product shot, trim it first:

```bash
python3 scripts/auto-crop-covers.py --input <file> --overwrite
```

Exit 0 is a clean crop. 3 means nothing was cropped, 4 means it refused and left the
file alone, 5 means it cropped but a shadow or soft edge remains.

Then run `npm run test:csv` and commit the image and the CSV together.

## What is not here

No bulk downloader. The old acquirers matched guessed filenames, read one wing and
never set `image_url`.
