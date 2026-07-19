---
name: add-book
description: Use when the user says "add book", "add to Hudson Street Library", or "add to the collection", or shares a publisher URL for a new book, zine, or photobook to catalog.
user_invocable: true
---

# Add Book to Hudson Street Library

**Use this skill to add new books to the Hudson Street Library collection.**

## Quick Reference

| Step | Action | Tool |
|------|--------|------|
| 1 | Parse input (title / author / URL / ISBN) | — |
| 2 | Research → invoke `/research-asst` → `book_data_{slug}.json` + cover | Skill |
| 3 | Ingest → `node scripts/add-book-from-text.js --json book_data_{slug}.json --yes` | Bash |
| 4 | CSV validation (runs automatically) | — |
| 5 | Verify cover + enriched fields landed, then commit | Bash |

## When to Use

- User asks to add a book to the collection
- User mentions adding a new book, zine, magazine, or publication
- User provides book details (title, author, publisher info)
- User shares a publisher URL for a book

## When NOT to Use

- **Editing an existing record** — edit the CSV row directly, or re-run `/research-asst` for that one title. This skill is for *new* acquisitions.
- **Research only, no catalog** — use `/research-asst` on its own; it stops at the JSON.
- **Bulk re-fetch of the whole collection** — that's a maintenance script, not a per-book add.
- **Any project other than Hudson Street Library** — paths, CSV schema, and cover dirs are specific to `~/Projects/Hudson_Street_Library`.

## CRITICAL RULES

### Never Include Prices
**The `price` field must ALWAYS be empty.** Never add price information to book records, even if found in metadata sources. This is a strict policy.

### Tag Formatting Requirements
Tags MUST be comma-separated (e.g., `"Art, Photography, Zines"`):
- Templates use `book.tags.split(',')` to parse tags
- **Wrong:** `"Art; Photography; Zines"` (semicolons render as single tag)
- **Correct:** `"Art, Photography, Zines"` (comma-separated)
- Each tag should be short, descriptive, and properly capitalized

### Preserve All User Metadata
When user provides book details, capture EVERYTHING valuable:
- Related URLs (exhibition pages, reviews, related works)
- OCLC numbers, LCC classifications
- Exhibition dates, context, background
- Designer, editor, contributor names
- Detailed notes or descriptions

Don't discard information because it doesn't fit an obvious field. Put it in notes rather than losing it.

## Overview

`add-book` is the **orchestrator** for adding a book. It does not research books itself —
it delegates the research step to the `research-asst` skill (the canonical multi-source
research stage), then ingests the resulting JSON into the collection: writes the CSV row,
validates structure, handles the cover image, and confirms the enriched fields landed.

Flow: parse input → `/research-asst` → `book_data_{slug}.json` → ingest with `--json` →
validate → cover → verify.

## Process

### 1. Parse Input

Extract book information from user's text:
```
Author: Title
Publisher, Year | Binding | Pages | Details
https://publisher-url.com/product-page
```

Supports flexible formats:
- "Author: Title" or just "Title"
- Publisher name and year (extracts 4-digit years)
- Binding type detection (hardcover, softcover, paperback)
- Page count extraction ("X pages")
- Automatic URL detection for publisher websites

### 2. Research (delegated to research-asst)

Do not research the book here. Invoke the **`research-asst`** skill (via the Skill tool /
the `/research-asst` slash command — a skill invocation, not a shell command) with the
parsed input (ISBN, title + author, or publisher URL):

```
/research-asst <input>
```

It runs the full multi-source pipeline (LOC, WorldCat, publisher site, art distributors,
artist/exhibition research) and produces, in the current directory:
- `book_data_{slug}.json` — the structured record
- `research_log_{slug}.txt` — source provenance
- the cover image in `src/assets/images/books/`

The research method, distributor list, and JSON schema are the single source of truth in
`skills/research-asst/SKILL.md`. Don't restate them here.

research-asst ends by offering to add the book itself — **decline that offer**. add-book
owns ingestion (step 3) so the ID, validation, and cover flow stay in one place. Only the
JSON + cover are needed from research-asst.

### 3. Ingest the JSON

Feed the record produced by research-asst into the collection. The `{slug}` is
`{artist_last}_{title-kebab}_{next_id}`; research-asst prints the exact name, or find it
with `ls book_data_*.json` in the current directory.

```bash
node scripts/add-book-from-text.js --json book_data_{slug}.json --yes
```

This maps the JSON to CSV columns, downloads/links the cover, validates structure, and adds the row with the next sequential ID. It **appends only the new row** (via `CSVHandler.appendBook`), so `books.csv` isn't rewritten — the diff is exactly one added line, no whole-file re-quoting churn. `--yes` skips the confirmation prompt so the ingest runs non-interactively; drop it if you want to review the parsed record and confirm by hand.

### 4. Automatic Validation

After adding to CSV, automatically runs:
- `validate-csv-structure.js`. Ensures correct column count.
- Exits with error if validation fails
- Prevents column misalignment issues

### 5. Cover Image Generation

Generates filename following the strict convention in `references/add-book-reference.md`.

## Usage

All script invocations run from the project root:

```bash
cd ~/Projects/Hudson_Street_Library
```

### Primary: ingest a research-asst record (default)

```bash
node scripts/add-book-from-text.js --json book_data_{slug}.json --yes
```

This is the documented path — research happens in `research-asst`, ingestion happens here.

### Fallback: text modes (no research-asst)

The script also has built-in API search for when you already have the details or research-asst isn't available. These do their own lightweight metadata lookup:

```bash
node scripts/add-book-from-text.js --interactive            # paste a description
node scripts/add-book-from-text.js --file books-to-add.txt  # batch
node scripts/add-book-from-text.js --text $'Author: Title\nPublisher, Year'
```

Paste format for `--interactive`:
```
Roe Ethridge: In the Beginning
Loose Joints Publishing, 2026 | Three volume set
https://loosejoints.biz/products/in-the-beginning
```

## Complete Workflow

**Step 1 — Research** is a Skill invocation, not a shell command: invoke `/research-asst <input>`.
It writes `book_data_{slug}.json` and the cover. Then run the rest from the project root:

```bash
cd ~/Projects/Hudson_Street_Library

# 2. Ingest the JSON (CSV validation runs automatically)
node scripts/add-book-from-text.js --json book_data_{slug}.json --yes

# 3. Cover: verify it exists; auto-crop product-shot trim if needed
python3 scripts/auto-crop-covers.py --input src/assets/images/books/[filename].jpg --overwrite
# If no cover was found, ask the user to add it at the path above

# 4. Run full test suite
npm test

# 5. Build site
npm run build

# 6. Commit and push
git add src/_data/books.csv src/assets/images/books/
git commit -m "Add: [Book Title]"
git push
```

## What Gets Auto-Filled

**From research-asst's JSON (mapped by `--json` ingest — put it all in the JSON):**
- ISBN, publisher + publisher_url, publication year, page count, binding/format
- Description (research-asst's `description.extended`, falling back to `main`)
- Tags (JSON array → comma-separated), language
- `height_cm` / `width_cm` / `depth_cm`, `weight_g` — supply cm **explicitly**; the ingest never parses the `dimensions` string, because publishers list H×W and W×H inconsistently
- `edition` → edition_printrun, `signed` (bool) → is_signed_inscribed
- `designer` / `editor` (or a `contributors[]` entry whose `role` matches design/editor), remaining `contributors[]` → contributors column
- `collection_grouping`, `classification`, `notes`
- `artist_url` (from `authors[0].url`, else `artist_links[0].url`), cover image

**Always auto-generated:**
- ID (next sequential number)
- Accession date (today as YYYY-MM-DD)
- Location ("Hudson Street Library, NYC")
- Cover filename (following convention)

**Rich records are one-shot.** Because the fields above all map from the JSON, a complete
research-asst record — dimensions, designer, edition, signed, weight, grouping, notes and
all — lands in a single `--json --yes` run. Author the full JSON; don't split it into a
base add plus manual patching.

**Manual entry (only the few columns the ingest doesn't map):**
- `bisac`, `lcc`, `num_images`, `featured`, `custom_page_url`
- Add these with a surgical one-row edit (see the *Enriching unmapped columns* gotcha), never a whole-file `CSVHandler.write`.

**Never auto-filled (policy):**
- Price (must always be empty)

## CSV Error Prevention

**Critical prevention strategies:**

1. **Use the script**. Ensures correct column count automatically.
2. **Validation runs automatically**. Catches errors immediately.
3. **Never manually add CSV rows via bash/heredoc**. Error-prone.
4. **Run `node scripts/validate-csv-structure.js` after manual edits**

The script ensures:
- Exactly 36 columns per row
- No column misalignment
- Proper field escaping
- Automatic backup creation

## Gotchas

- **Book added twice.** research-asst ends by offering to ingest the JSON itself. If you accept *and* run step 3, the book lands in `books.csv` twice with two IDs. Decline research-asst's offer — add-book owns ingestion.
- **`--json` ingest fails with "file not found".** The script resolves paths relative to CWD. Run it from `~/Projects/Hudson_Street_Library` and pass the `book_data_{slug}.json` path research-asst wrote (current dir), not an absolute guess.
- **Thin or empty JSON from research-asst.** Don't patch the CSV by hand. Re-run `/research-asst` for that title — it owns the multi-source research and produces a complete record.
- **Cover looks like a product shot (white border / trim).** research-asst downloads the cover but doesn't always crop it. Run `python3 scripts/auto-crop-covers.py --input <path> --overwrite` after ingest.
- **Wrong or colliding ID.** The next sequential ID is computed from `books.csv` at ingest time. Don't run two adds in parallel, and don't pre-write an ID into the JSON.
- **Enriching unmapped columns (`bisac`/`lcc`/`num_images`/`featured`/`custom_page_url`).** After the add, edit the row surgically — never `CSVHandler.write` (it re-quotes every empty field and churns all ~1800 rows). Raw-parse with `csv-parse/sync` (arrays, `relax_column_count:true` only — not `CSVHandler.read`, whose `trim`/auto-correct mutate other rows), change just the target cells, then `csv-stringify/sync` the whole array with `{ header:false, quoted:true, quoted_empty:false }` and match the trailing newline. This round-trips byte-for-byte (verified on the full file, incl. multi-line description fields), so `git diff` shows only the cells you touched. Confirm `git diff --numstat` and `npm run test:csv`.

## Post-Add Verification Checklist

After adding a book, verify:

1. **Cover image exists and quality is good**
   ```bash
   ls -lh src/assets/images/books/[expected_filename].jpg
   ```
   - Check file size (50KB-500KB typical)
   - Verify no trailing spaces in filename
   - Ask user to add if missing

2. **CSV record is complete**
   - ISBN present (if available)
   - Tags are comma-separated
   - No price data included
   - All user-provided metadata captured

3. **CSV validation passed**
   - Script runs automatically after adding
   - Check output shows: `CSV validation passed`

4. **Accession date is correct**
   - Format: `YYYY-MM-DD` for newest books
   - Example: `2026-03-19` appears before `March 2026`
   - Controls position on Recently Added page

## Notes for Claude

### Execution Rules (CRITICAL)

**Always execute the script directly**. Never tell the user to run it themselves:
- **DO:** `cd ~/Projects/Hudson_Street_Library && node scripts/add-book-from-text.js --json book_data_{slug}.json --yes`
- **DON'T:** "You'll need to run this command..." or "Start a new session from..."
- If current directory is wrong, `cd` to the project directory first
- Don't ask for permission to use WebFetch, Bash, or Read tools. Just use them.
- Don't stop at permission requests. The add-book workflow requires these tools.

**For batch additions** (multiple books):
1. Run `/research-asst` for each title to produce its JSON
2. Ingest each with `--json`, or use `--file books-to-add.txt` for the text fallback
3. Don't suggest interactive mode when batch is clearly intended

**For URL-only input** (e.g., `https://www.steidl.de/Books/...`):
1. Pass the URL straight to `/research-asst` — it resolves author/title and researches
2. Ingest the resulting JSON
3. Don't ask user for details that can be researched

### Data Handling

The script enforces structure (it validates immediately after adding), and the Critical
Rules above cover price/tags/metadata. The only manual care beyond those:
- **Edit the CSV only via the Node script** (`csv-parse`/`stringify`), never a bash heredoc.
- **Confirm the cover is a valid JPEG** after ingest: `file src/assets/images/books/<filename>`.
- If the cover is missing, ask: "Cover image needed for: [Book Title]. Add it to the books directory as: [filename]".

## Book Page Enrichment (Post-Addition)

The book page's `description` is ingested from research-asst's `description.extended` (it falls back to the short `main`). After ingest, read the CSV `description` and confirm it is a properly authored page, not a thin stub. It must:

- **lead with a top-line framing/review sentence** — what the work is and why it matters; this line also becomes the Recently-Added snippet, so it has to stand alone;
- give a **proper summary** of the book (contents, approach, publication/exhibition context);
- include **artist + other-works context** when the artist has a body of work;
- run **~800–1300 chars** as `<p>` paragraphs (framing line first, then `<p class="mt-6">`; never a single blob), matching existing entries.

`artist_bio` and `exhibition_context` are **not** separate CSV columns — their substance must be folded into `description`. If what landed is the short `main` (thin, no framing, no artist context), re-run `/research-asst` for that title rather than hand-writing prose here.

## Reference Files

- `references/add-book-reference.md`: cover-image naming convention, troubleshooting, implementation / file-map.
- `references/rubric.md`: quality rubric used to evaluate this skill.
