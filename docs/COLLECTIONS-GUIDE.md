# Collections Guide

Collection pages are rendered from two inputs:

1. `src/_data/books.csv` — the source of truth for every book
2. `src/_data/collections/<slug>.json` — per-collection config (description, match rules, sections, sort)

There is **no hardcoded HTML** for data-driven collections. `src/collections.njk` paginates over the JSON configs and renders each at `/collections/<slug>/` using the filters `booksInCollection`, `groupBySections`, and `sortBooks` defined in `.eleventy.js`.

## Adding a new collection

1. Create `src/_data/collections/<slug>.json` following `src/_data/collections/_schema.md`.
2. Rebuild: `npx @11ty/eleventy`.
3. New collection appears at `/collections/<slug>/`.

## Changing what appears on a collection page

Edit the CSV, or edit the collection's `matchBy` rule. Do not edit `_site/`.

## Editing a book's metadata

Edit the row in `src/_data/books.csv`. The book detail page at `/books/<author_slug>_<title_slug>_<id>/` regenerates on next build. Never edit `_site/books/` or `src/books/` — the latter holds legacy hand-coded pages pending cleanup.

## Match rules (`matchBy`)

A collection config selects books via one of:

- `{ "collection_grouping": "Magazines" }` — exact match on the `collection_grouping` CSV column
- `{ "authorLast": "Prince" }` — exact match on `author_last`
- `{ "titleContains": "Apartamento" }` — case-insensitive substring in title
- `{ "titleRegex": "^Purple (Fashion|Magazine)" }` — case-insensitive regex on title
- `{ "keywords": ["wombat", "portfolio"] }` — case-insensitive OR across title, tags, classification, description, and collection_grouping

Use the narrowest rule that captures the right rows. `titleRegex` anchored with `^` is most precise for numbered magazines.

## Sections (optional)

For magazines with volumes/eras, add a `sections` array. Each section has a `filter` — usually `{"titleRegex": "..."}` or `{"publicationYearRange": [1998, 2003]}` — and books land in the first matching section. Books that match the collection but no section fall into an implicit trailing `"Other"` section.

## Pre-commit guard

`.git/hooks/pre-commit` (installed via `bash scripts/install-pre-commit-hook.sh`) blocks new `src/collections/*.html` files. If you need to commit a net-new hardcoded page in the legacy directories, override with `git commit --no-verify` — but first ask whether the same page could be expressed as a JSON config.

## Data debt to resolve

These collections have JSON configs written but still keep hardcoded HTML because their CSV coverage is under 80%:

- `music-photobooks` — 44/63 rows present
- `disaster` — 3/10 rows present
- `black-photographers` — 1/14 rows present (most books lack the tag)
- `useful-photography` — 11/14 rows present

These collections have no config at all (hardcoded-only) pending CSV backfill:

- `toilet-paper` (22 issues)
- `esophus` (7 issues)
- `le-petit-vouyer` (7 issues)
- `purple-books` (text landing)
- `magazines` (index page — may never need porting)
- `queering-the-collection`, `collage-collections`, `art-books-collection`, `small-books-big-images`, `books-on-books`, `posters-and-paper`, `newspapers`

When you backfill a collection's CSV rows, port the page: write the JSON config, verify card count ≥ hardcoded count, then delete the hardcoded HTML.
