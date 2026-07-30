# Data Structures

Hudson Street Library is a static Eleventy site. All authoritative data lives
in plain text files under `src/_data/`. There is no runtime database; the
build reads these files and writes static HTML and JSON.

## Table of Contents

1. [Source of Truth](#source-of-truth)
2. [Books CSV — Schema](#books-csv--schema)
3. [Supporting JSON Files](#supporting-json-files)
4. [Eleventy Ingestion](#eleventy-ingestion)
5. [Validation Rules](#validation-rules)
6. [Sample Records](#sample-records)
7. [Published Data URLs](#published-data-urls)

---

## Source of Truth

```
src/_data/
├── books.csv                       # PRIMARY: all book records (1,722 rows)
├── libraryCollections.json         # Collection metadata
├── news.json                       # News/announcements
├── site.json                       # Site-wide config
└── collections/
    ├── _schema.md                  # JSON schema for per-collection files
    ├── afm.json                    # Per-collection page configs
    ├── black-photographers.json    # ... 17 collections total
    └── ...
```

Books are added by editing `books.csv` directly or via `npm run add` (the
interactive CLI at `scripts/add-book-from-text.js`). Both paths go through
the validation in `scripts/utils/csv-handler.js` and produce backups under
`src/_data/books_backup_<timestamp>.csv`.

---

## Books CSV — Schema

**File:** `src/_data/books.csv`
**Encoding:** UTF-8 with LF line endings, comma delimiter, double-quote text qualifier (`""` to escape).
**Header row:** required; column order matters.

### Columns (36 total)

| # | Column | Type | Example | Notes |
|---:|---|---|---|---|
| 1 | `id` | integer | `1722` | Unique, monotonically assigned by `npm run add`. |
| 2 | `author_last` | string | `Abbott` | |
| 3 | `author_first` | string | `Berenice` | |
| 4 | `author_full_name` | string | `Berenice Abbott` | Display form. |
| 5 | `title` | string | `Documenting Science` | **Required.** |
| 6 | `publisher` | string | `Steidl` | |
| 7 | `publication_year` | integer | `2012` | YYYY. |
| 8 | `height_cm` | decimal | `31.0` | |
| 9 | `width_cm` | decimal | `29.5` | |
| 10 | `depth_cm` | decimal | `2.5` | |
| 11 | `binding` | string | `Hardcover` | |
| 12 | `page_count` | integer | `180` | |
| 13 | `edition_printrun` | string | `1st edition` | |
| 14 | `isbn_asin` | string | `9783869304311` | ISBN-10, ISBN-13, or ASIN. |
| 15 | `editor` | string | `Kurtz, Ron` | |
| 16 | `contributors` | string | `Ron Kurtz, Julia Van Haaften` | Comma-separated. |
| 17 | `is_signed_inscribed` | boolean | `false` | Lowercase `true`/`false`. |
| 18 | `designer` | string | `John Doe` | |
| 19 | `description` | string | Long text | Quoted; may contain commas/newlines. |
| 20 | `artist_url` | URL | `https://example.com` | |
| 21 | `publisher_url` | URL | `https://steidl.de` | |
| 22 | `collection_grouping` | string | `Photography` | Primary collection. |
| 23 | `tags` | string | `Science, Photography` | Comma-separated. |
| 24 | `classification` | string | `Photography; Individual Photographers` | Semicolon-separated hierarchy. |
| 25 | `bisac` | code | `PHO023000` | BISAC subject code. |
| 26 | `lcc` | code | `TR140.A23` | Library of Congress Classification. |
| 27 | `location` | string | `Hudson Street Library, NYC` | Physical location. |
| 28 | `accession_no` | string | `2024.001` | Accession number. |
| 29 | `featured` | boolean | `false` | Featured on the home page. |
| 30 | `image_url` | URL/path | `/assets/images/books/.../cover.jpg` | Cover image. |
| 31 | `price` | string | `$45` | Free-form. |
| 32 | `weight_g` | integer | `1200` | Grams. |
| 33 | `language` | string | `English` | |
| 34 | `num_images` | integer | `120` | Image count in the book. |
| 35 | `notes` | string | Free text | Internal notes. |
| 36 | `custom_page_url` | URL/path | `/books/abbott-documenting-science/` | Override slug. |

---

## Supporting JSON Files

### `libraryCollections.json`

Top-level collection metadata used to render the collections index. See
`src/_data/collections/_schema.md` for the per-collection shape.

### `news.json`

Array of news items. Schema:

```json
{
  "id": 1,
  "date": "2026-05-10",
  "title": "...",
  "excerpt": "...",
  "content": "...",
  "category": "acquisitions",
  "featured": true
}
```

### `site.json`

Site-wide config (URL, title, links) consumed by templates as `{{ site.* }}`.

### `src/_data/collections/*.json`

One JSON per data-driven collection page. The schema is documented in
`src/_data/collections/_schema.md` and the renderer is `src/collections.njk`.

---

## Eleventy Ingestion

Eleventy auto-loads everything in `src/_data/` as global data. Reference it
in templates by filename:

```njk
{% for book in books %}        {# books.csv #}
  {{ book.title }} — {{ book.author_full_name }}
{% endfor %}

{% for item in news %}{{ item.title }}{% endfor %}
{{ site.title }}
```

CSV parsing is configured in `.eleventy.js` using the project's CSV handler
(`scripts/utils/csv-handler.js`), which trims whitespace, normalizes
booleans, and coerces numeric fields.

---

## Validation Rules

Enforced by `npm run test:csv` (which runs `scripts/validate-csv-robust.js`)
and by `npm run add` before a row is appended.

**Required fields**

- `title` — must not be empty
- `author_full_name` — should be populated (empty string allowed if unknown)

**Numeric ranges**

```js
publication_year >= 1000 && publication_year <= new Date().getFullYear() + 1
height_cm > 0 && height_cm < 200
width_cm  > 0 && width_cm  < 150
depth_cm  > 0 && depth_cm  < 50
page_count > 0 && page_count < 10000
```

**ISBN / ASIN**

```js
/^[0-9]{9}[0-9X]$/.test(isbn)    // ISBN-10 (X check digit allowed)
/^[0-9]{13}$/.test(isbn)         // ISBN-13
/^[A-Z0-9]{10}$/.test(asin)      // ASIN
```

**URL**

```js
/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(url)
```

**Type coercion (CSVHandler does this on read)**

```js
publication_year = Number(publication_year)
height_cm        = parseFloat(height_cm)
page_count       = parseInt(page_count)
is_signed_inscribed = value === 'true' || value === '1' || value === 1
```

**Sanitization**

- Trim whitespace on all string fields
- Strip control characters
- Normalize line endings to LF
- Cap field lengths: `title` ≤ 500, `author_full_name` ≤ 200, `tags` ≤ 1000

---

## Sample Records

### As a CSV row

```csv
1,"Abbott","Berenice","Berenice Abbott","Documenting Science","Steidl",2012,31.0,29.5,2.5,"Hardcover",180,"1st edition","9783869304311","Kurtz, Ron","Ron Kurtz, Julia Van Haaften",false,"","Illustrated in tritone throughout...","","https://steidl.de","Photography","Science, Photography","Photography; Individual Photographers","PHO023000","TR140.A23","Hudson Street Library, NYC","2024.001",false,"/assets/images/books/abbott_documenting_science.jpg","",,"English",,"",""
```

### As parsed JSON (what templates see)

```json
{
  "id": 1,
  "author_last": "Abbott",
  "author_first": "Berenice",
  "author_full_name": "Berenice Abbott",
  "title": "Documenting Science",
  "publisher": "Steidl",
  "publication_year": 2012,
  "height_cm": 31.0,
  "width_cm": 29.5,
  "depth_cm": 2.5,
  "binding": "Hardcover",
  "page_count": 180,
  "isbn_asin": "9783869304311",
  "is_signed_inscribed": false,
  "publisher_url": "https://steidl.de",
  "collection_grouping": "Photography",
  "tags": "Science, Photography",
  "classification": "Photography; Individual Photographers",
  "bisac": "PHO023000",
  "lcc": "TR140.A23",
  "location": "Hudson Street Library, NYC",
  "accession_no": "2024.001",
  "image_url": "/assets/images/books/abbott_documenting_science.jpg",
  "language": "English"
}
```

---

## Published Data URLs

Eleventy passthrough copy publishes the source data files unchanged so the
site exposes a small read-only data API:

| URL | Source | Emitted by |
|---|---|---|
| `/cms/data/books.csv` | `src/_data/books.csv` | `.eleventy.js` passthrough |
| `/cms/data/libraryCollections.json` | `src/_data/libraryCollections.json` | `.eleventy.js` passthrough |
| `/cms/data/news.json` | `src/_data/news.json` | `.eleventy.js` passthrough |

The `/cms/` URL prefix is historical; despite the name, no CMS source code
exists. See `docs/archive/2026-05-cms-removal/` for the history.

---

## Related Code References

- `scripts/utils/csv-handler.js` — CSV parsing/serialization
- `scripts/validate-csv-robust.js` — `npm run test:csv` entry point
- `scripts/add-book-from-text.js` — `npm run add` entry point
- `.eleventy.js` — data ingestion, passthrough copy, collection generators
- `src/_data/collections/_schema.md` — per-collection JSON schema
