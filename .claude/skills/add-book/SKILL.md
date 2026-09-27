---
name: add-book
description: Use when the user says "add book", "add to Hudson Street Library", or "add to the collection", or shares a publisher URL for a new book, zine, or photobook to catalog.
user-invocable: true
---

# Add Book to Hudson Street Library

`add-book` is the **orchestrator**. It does not research. It hands research to the
`research-asst` skill, checks the JSON that comes back, ingests it, verifies what landed,
and ships the commit.

## Quick Reference

| Step | Action | Tool |
|------|--------|------|
| 1 | Parse input (title / author / URL / ISBN), pick the wing | — |
| 2 | Research: invoke `research-asst` → `book_data_{slug}.json` + cover | Skill |
| 3 | Check the JSON before it is ingested | Read |
| 4 | Ingest once: `node scripts/add-book-from-text.js --json book_data_{slug}.json --wing <slug> --yes` | Bash |
| 5 | Verify the ingest output, the cover, and the description | Bash, Read |
| 6 | Test, build, `verify-views`, commit, push | Bash |

Run every command from the project root, `~/Projects/Hudson_Street_Library`. Run the
commands yourself; do not hand them to the user.

## When to Use

- The user asks to add a book, zine, magazine, poster, or other publication
- The user shares a publisher URL, an ISBN, or book details for a new item

## When NOT to Use

- **Editing an existing record.** Use `node scripts/set-book-fields.js` (see *Editing a row after ingest*), or re-run `research-asst` for that title.
- **Research only.** Use `research-asst` on its own; it stops at the JSON.
- **A shop screenshot or a list of titles the user has not confirmed.** Catalogue only titles the user named or linked one by one. Restate the list and wait for a yes.
- **Any project other than Hudson Street Library.**

## Rules

| Rule | Detail |
|------|--------|
| Research goes through `research-asst` | Never hand-write `book_data_{slug}.json`. A thin record means re-run research, not patch the CSV. |
| `publisher_url` is the book's own page | Not the publisher homepage, not an image or CDN URL, not a distributor unless it is the only source. |
| Cover comes from the publisher's page | The featured product image, highest resolution offered. Send a `Referer` header if the host requires one. Confirm the file is image data, not HTML. |
| No prices | `price` stays empty. The ingest does not map it and `set-book-fields.js` refuses it. Keep price out of `notes` and `description` too. |
| Tags are comma-separated in the CSV | `"Art, Photography, Zines"`. The template splits on `,`; semicolons render as one tag. In the JSON, `tags` is an array and the ingest joins it. |
| Keep all user metadata | Exhibition context, OCLC, related URLs, designer, editor. If no column fits, it goes in `notes`. Price is the one exception. |
| One add at a time | The id is computed at ingest. Parallel ingests collide. Research can run in parallel; ingest is serial. |

## Process

### 1. Parse input and pick the wing

Take whatever the user gave: `Author: Title`, publisher and year, a URL, an ISBN. Do not
ask for details that research can find.

The catalogue is one CSV per wing, declared in `src/_data/wings.json`. Art and photography
go to the default wing, `art` (`books.csv`). Read `wings.json` for the current slugs and
pick one now. Step 4 passes it explicitly, so the script default never decides.

### 2. Research

Invoke the `research-asst` skill with the parsed input. It writes, in the project root:

- `book_data_{slug}.json`, the structured record
- `research_log_{slug}.txt`, source provenance
- the cover, in `src/assets/images/books/`

`research-asst` owns the research method and the JSON schema
(`.claude/skills/research-asst/references/json-schema.md`). It stops at the JSON. Ingest
happens here, once.

### 3. Check the JSON before ingest

Read `book_data_{slug}.json`. The ingest copies these fields as written, so a fault here
becomes a fault in the row.

| Field | Must be | If wrong |
|-------|---------|----------|
| `research_log` | an object with a `sources_checked` array | the ingest crashes on `.join` |
| `authors[0].last` / `.first` | set explicitly (mononym: `last` only) | the fallback split gets "Sun Yanchu" and "van der …" wrong, and the slug and cover filename follow it |
| `authors[].name` | set on every author | `author_full_name` comes out blank |
| `title` / `subtitle` | full display title in `title`; `subtitle` only if it is a true subtitle | the ingest writes `title: subtitle`, so an edition or series tag there lands in the title |
| `publisher` | `{name, url}` with `url` the book's own page. A string `publisher` needs a top-level `publisher_url`. | see Rules |
| `tags` | an array of strings | a string crashes the join |
| `cover_image.local_path` | starts with `/assets/images/books/`, and the file exists under `src/` | copied to `image_url` verbatim; no leading slash means a 404. With only `cover_image.url` set, the ingest downloads the cover itself. |
| `description.extended` | present, `<p>` paragraphs, framing sentence first | the short `main` ships instead |
| `height_cm` / `width_cm` / `depth_cm` | numbers when known, absent when not | the ingest never parses the `dimensions` string. Never invent a measurement. |
| `id` | absent | ids are assigned at ingest |

This is the last cheap point to fix a record. If a field is wrong or thin, re-run
`research-asst` now, before ingest. Do not edit the JSON to invent data. If the book needs
a column the ingest does not map (see the mapping table in the reference) and its wing is
`hacking` or `media-theory`, read *Editing a row after ingest* first: those files cannot
be edited yet.

### 4. Ingest

Run this once, with the wing chosen in step 1:

```bash
node scripts/add-book-from-text.js --json book_data_{slug}.json --wing <slug> --yes
```

`--wing` beats a `"wing"` field in the JSON, which beats the default. The ingest:

1. checks the whole catalogue for a duplicate (ISBN, or title + surname)
2. downloads the cover only when `cover_image.url` is set and `local_path` is not
3. appends one row with the next free id in the wing's block (`CSVHandler.appendBook`, so the diff is one added line)
4. runs `scripts/validate-csv-robust.js` (the same check as `npm run test:csv`) and exits 1 on failure
5. moves the JSON and research log into `research-archive/`, which is tracked

**The ingest is not transactional.** The row is appended before validation runs, so a
nonzero exit does not mean nothing changed. After any failure or interruption, do not
re-run. Run `git status` and `git diff --stat`, and establish three things: whether the
row is in the CSV, whether the cover is on disk, and whether the JSON is in the root or in
`research-archive/`. If the row is there, carry on from step 5 with that row. If
validation failed, read the error to see whether it names the new row or older data, and
report it. See *Undoing an add* to back out.

### 5. Verify what landed

Read the ingest output first. It prints everything needed for the first pass.

| Output line | Check |
|-------------|-------|
| `Wing:` | the intended wing and file |
| `ID:` | inside that wing's id block |
| `Author sort:` | `last` is the true surname |
| `Intake:` | matches how the library got the book (see *Intake dating*) |
| `Description looks thin` warning | if present, fix it per *Fixing a description that landed thin* |
| `ISBN checksum looks invalid` warning | if present, check the ISBN against the publisher page |
| `CSV validation passed` | present |

Then the cover:

```bash
ls -lh src/assets/images/books/<filename>.jpg && file src/assets/images/books/<filename>.jpg
```

- `file` reports `JPEG image data`. Size is typically 50KB–500KB. Under 2KB is a failed download.
- The filename follows the convention in `references/add-book-reference.md`, with no trailing space.
- Look at the image with Read. A cover runs edge to edge with no frame, border, or shadow.
- If it is a product shot, run `python3 scripts/auto-crop-covers.py --input <path> --overwrite`, then look again. The script prints success even when it leaves a shadowed or non-white background in place. When that happens, crop by hand.
- If `file` reports PNG or WebP, convert it (`sips -s format jpeg <in> --out <out>.jpg`). Renaming the extension is not conversion.
- If no cover was found, tell the user the path to drop one at, and ask whether to hold the push or ship without it.

Then the description. Read the row's `description` and confirm it:

- leads with a framing sentence that stands alone (it is also the Recently Added snippet, cut at ~280 characters)
- summarises the book: contents, approach, publication or exhibition context
- gives artist and other-works context when the artist has a body of work
- runs ~800–1300 characters as `<p>` paragraphs, the later ones `<p class="mt-6">`

`artist_bio` and `exhibition_context` have no columns; their substance belongs in
`description`.

```bash
node scripts/deslop-descriptions.js <id>
```

Exit 0 is clean, 1 means tics found. Publisher blurbs are the usual source.

**Fixing a description that landed thin or with tics.** The row exists now, so a new
ingest would add a second book. For tics, rewrite the sentence plainly (do not reword
around the regex). For a thin description, re-run `research-asst` and take
`description.extended` from the new JSON. Either way, write the corrected text to the
existing id with `set-book-fields.js <id> --json fields.json --overwrite`, re-run the
scan, and move the new JSON and log into `research-archive/` over the old ones. Never
ingest the replacement JSON.

### 6. Ship

```bash
npm test && npm run build && node scripts/verify-views.js

git status --short
git add <wing csv> src/assets/images/books/<filename>.jpg \
  research-archive/book_data_{slug}.json research-archive/research_log_{slug}.txt
git diff --cached --stat
git commit -m "books: add <Surname>, <Title> (id <N>)"
git pull --rebase origin main && git push
```

Stop at the first failing check. Stage only this book's files, plus
`src/_data/redirects.json` if a rename touched it. `git diff --cached --stat` shows one
CSV with one added line, one cover, and two archive files; anything else is someone
else's work and stays out of the commit.

`verify-views.js` reads the built site. It checks that the row is on the right Recently
page, that every `image_url` exists on disk, and that redirects resolve. Do not report the
add as done until it passes.

A backup bot commits to `main` after each push, so the rebase is expected, and its
commits touch only `csv-backups/`. If the rebase brings in anything else or conflicts,
re-run the three checks before pushing. Push without asking. After the deploy, confirm the book page and cover load on the live site (the
`deploy-status` skill covers a push that does not go live).

## What the Ingest Maps

The full JSON-to-column table is in `references/add-book-reference.md`.

- **Generated:** id, intake date, location, cover filename (when the ingest downloads it).
- **Not mapped:** `bisac`, `lcc`, `featured`, `custom_page_url`. Set these after ingest with `set-book-fields.js`.
- **Never set:** `price`.

Get every mapped field right in the JSON before ingest. Edits after ingest are for
unmapped columns, intake exceptions, and corrections found in step 5. They are not a
substitute for complete research.

## Editing a Row After Ingest

```bash
node scripts/set-book-fields.js <id> --json fields.json --dry-run
node scripts/set-book-fields.js <id> --json fields.json [--overwrite]
npm run test:csv
```

`fields.json` is one object of `column: value`. The script finds the row in any wing,
changes only the named cells, and leaves a one-line diff. Write `fields.json` in the
session scratchpad, not the repo.

| It refuses | Why |
|------------|-----|
| a cell that already has a value | pass `--overwrite` to replace it |
| `price`, `id` | policy; ids are fixed by wing block |
| an unknown column, a missing id | typo guard |
| a file that does not round-trip byte-for-byte | an edit would rewrite other rows. `hacking.csv` and `media-theory.csv` are in this state as of 2026-09-27. Stop and tell the user; do not force it with another writer. |

Do not use `CSVHandler.write` for a one-row edit (it re-quotes every row), and do not
hand-edit a CSV with a heredoc or a text editor.

**Changing `author_last` or `title` moves the book's URL**, which is
`/books/{author_last}_{title}_{id}/`. Note the old URL before the edit. If the row has
already been pushed, add a stub to `src/_data/redirects.json` (shape and example in the
reference) and repoint any older stub for the same id. GitHub Pages has no server
redirects, so the stub is the only thing that keeps the old URL alive. `verify-views.js` catches a stub with a dead target; it cannot catch a missing
stub. The cover filename does not follow the rename, which is fine as long as `image_url`
still matches the file on disk.

## Undoing an Add

No script deletes a row, and `set-book-fields.js` cannot change an id or move a row
between wings.

| State | Action |
|-------|--------|
| Not committed, and the add is the only change to that CSV (`git diff --stat` shows one added line) | `git restore <wing csv>`, delete the new cover, move the JSON and log from `research-archive/` back to the root. Then fix the cause and ingest again. |
| Not committed, other uncommitted changes in the same CSV | Stop. Report the row id and the file to the user. |
| Committed or pushed | Stop. Report the row id. The page is or will be live at an id-bearing URL, so removal is the user's call. |

## Intake Dating

| Case | `accession_no` | `cataloged_date` | Appears on |
|------|----------------|------------------|------------|
| Acquisition: the book just arrived | today | empty | Recently Added |
| Catalogue add: owned for a while, entered now | empty | today | Recently Catalogued |

Each wing sets its mode with `intake` in `wings.json`: `acquired` is the default (art),
`catalogued` is declared on wings being entered off the shelves. The ingest applies it and
prints the `Intake:` line.

Patch only when one book runs against its wing's mode. Move the date to the other column
with `set-book-fields.js --overwrite`. Both columns take `YYYY-MM-DD`; a season string
("Fall 2025") hides the row from both Recently pages.

## Gotchas

- **Duplicate prompt appears despite `--yes`.** The guard matched an existing row on ISBN or title + surname, in any wing. A run with no interactive stdin aborts with exit 1 and appends nothing. Read the listed row and compare ISBN, edition, and year. Usually the book is already catalogued or the ISBN in the JSON is wrong. If it is a real second copy or a new edition, tell the user what matched and let them run the ingest in a terminal and answer the prompt (`! node scripts/add-book-from-text.js ...`). Do not pipe an answer into the prompt, and do not change metadata to slip past the guard.
- **Ingest crashes on `.join`.** `research_log` is a string or a bare array. It must be `{"sources_checked": [...]}`.
- **"File not found" on `--json`.** Paths resolve from the CWD. Run from the project root.
- **JSON is gone after ingest.** It moved to `research-archive/`. Read it there, and commit it with the book.
- **Title reads "X: Expanded Edition" or repeats itself.** `subtitle` held an edition or a paraphrase. Fix the row with `set-book-fields.js --overwrite`, and mind the URL change above.
- **Cover 404s on the book page.** `image_url` lacks the leading slash, or does not match the filename on disk. `verify-views.js` reports the second case.
- **Auto-crop reported success, border still there.** It fails on drop shadows and non-white grounds. Check the corners of the result.
- **Row landed in `books.csv` instead of a wing.** `--wing` was omitted and the JSON had no `wing`. Ids are fixed by wing block, so the row cannot be moved by editing. Follow *Undoing an add*, then ingest with the right `--wing`.

## Batch Adds

1. Confirm the final list with the user and wait for an explicit go. A partial answer is not a go.
2. Research can run as parallel background Agents, one per title. Brief each with the path to `research-asst`'s `references/json-schema.md`. Report once when all finish, not per agent.
3. Take the books one at a time through steps 3 to 5: check the JSON, ingest, verify the output, cover, and description. Never run two ingests at once. If a book fails a check that cannot be fixed, leave it out and carry on with the rest.
4. Run the step 6 checks once, after the last book passes step 5. Commit per book, staging each book's own files, then push once.

## Fallback: Text Modes

Use these only when the user asks for them. They skip `research-asst` and the step 3
check, use the script's own lightweight lookup, and produce thinner records. If
`research-asst` fails, report the failure instead of falling back silently. Steps 5 and 6
still apply.

```bash
node scripts/add-book-from-text.js --text $'Author: Title\nPublisher, Year'
node scripts/add-book-from-text.js --file books-to-add.txt
```

`--interactive` (`npm run add`) is for the user at a terminal. Never drive it through stdin.

## Reference Files

- `references/add-book-reference.md`: JSON-to-column mapping, cover filename convention, redirect stub shape, troubleshooting, file map.
- `references/rubric.md`: quality rubric used to evaluate this skill.
