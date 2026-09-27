# add-book — Reference

Lookup material for the `add-book` skill. The workflow and critical gotchas live in
`SKILL.md`; this file holds the JSON-to-column mapping, the redirect stub shape, the
cover-image naming convention, troubleshooting, and the file map.

## JSON-to-Column Mapping

| CSV column | From the JSON |
|------------|---------------|
| `title` | `title`, plus `: subtitle` when `subtitle` is set and not already in the title |
| `author_full_name` | every `authors[].name`, comma-joined |
| `author_last`, `author_first` | `authors[0].last` / `.first`, else a name split |
| `publisher`, `publisher_url` | `publisher.name` / `.url`, or string `publisher` + top-level `publisher_url` |
| `isbn_asin` | `isbn.isbn13`, else `isbn.isbn10`, or a string `isbn` |
| `publication_year`, `page_count`, `binding`, `language` | `year`, `pages`, `format`, `language` (default English) |
| `description` | `description.extended`, else `description.main` |
| `tags` | `tags[]`, joined with `, ` |
| `dimensions`, `height_cm`, `width_cm`, `depth_cm`, `weight_g`, `num_images` | same-named fields |
| `edition_printrun`, `is_signed_inscribed` | `edition`, `signed` (boolean) |
| `designer`, `editor`, `contributors` | top-level fields, else `contributors[]` routed by `role` |
| `collection_grouping`, `classification` | same-named fields |
| `notes` | `notes`, plus LOC subject headings from `loc_data.subject_headings` |
| `artist_url` | `authors[0].url` (the artist's own site), else `artist_links[0].url` |
| `image_url` | `cover_image.local_path`, or the downloaded cover's path |

**Generated:** id, intake date, location, cover filename.

**Not mapped:** `bisac`, `lcc`, `featured`, `custom_page_url`. Set these after ingest with
`set-book-fields.js`. `price` is never set.

## Redirect Stub

One entry per moved URL in `src/_data/redirects.json`. `out` is the old URL plus
`index.html`; the build writes a static page there that forwards to `to`.

```json
{
  "from": "/books/toloui_dollars-for-3-minutes_1175/",
  "to": "/books/toloui_5-dollars-for-3-minutes_1175/",
  "out": "/books/toloui_dollars-for-3-minutes_1175/index.html"
}
```

After a second rename of the same id, update `to` on the older entries as well.
`node scripts/verify-views.js` fails on a stub whose `to` is not a built page.

## Cover Image Naming Convention

**Standard format:**
```
{author_last}_{author_first}_{title}_{isbn}.jpg
```

**Examples:**
```
ethridge_roe_in_the_beginning_9781912719716.jpg
tillmans_wolfgang_truth_study_center_9783865601234.jpg
fischer_marc_who_shares_the_restroom_code_with_ice_agents.jpg
```

**Rules:**
- All lowercase
- Remove all special characters
- Convert spaces to underscores
- Truncate at 50 chars per section
- ISBN without hyphens
- Always `.jpg` extension

**Known variant:** when the ingest downloads the cover itself (`cover_image.url` set, no
`local_path`), `generateCoverFilename` joins the title words with hyphens
(`giorno_john_the-performative-word_9788867497300.jpg`). Both forms work. What matters is
that `image_url` matches the file on disk exactly.

## Troubleshooting

**Research found nothing?**
- Re-run `research-asst` with a different input: the ISBN, the publisher URL, or an alternative title (subtitle, series name)
- `node scripts/lookup-book.js "Author Title"` or `--isbn <isbn>` queries AbeBooks, Shopify shops and OpenLibrary with no WebSearch calls. Never carry price data out of its results.

**Text-mode publisher scrape failed?** (fallback modes only)
- No pattern for that publisher in `PUBLISHER_PATTERNS` (`scripts/utils/book-metadata-aggregator.js`)
- The other configured sources are still searched

**Wrong author name parsing?**
- The JSON lacked explicit `authors[0].last` / `.first`, so the ingest split the display name
- Fix the row with `node scripts/set-book-fields.js <id> --json fields.json --overwrite`
- If the row is already pushed, the URL moved: add a stub to `src/_data/redirects.json`

**CSV validation failed?**
- Read the error for the file and line
- Run `npm run test:csv` (all wings, id uniqueness). This is the gate; `node scripts/validate-csv-structure.js` is a diagnostic only.
- Fix before committing; one structural error breaks the whole build
- Never fix with a heredoc or a text editor

**Cover image not showing on site?**
- Check filename has no trailing spaces: `ls -la src/assets/images/books/`
- Verify `image_url` field in CSV matches actual filename
- Ensure file extension is `.jpg` not `.jpeg`
- Check file exists: `ls src/assets/images/books/[filename]`

**Tags not displaying correctly?**
- Verify tags are comma-separated: `"Art, Photography, Zines"`
- Not semicolons, pipes, or other separators
- Check for empty tags or trailing commas

**Duplicate warning?**
- See the duplicate gotcha in `SKILL.md`. The guard prompts even with `--yes` and aborts without a terminal.

## Implementation Details

**Key files:**
- `scripts/add-book-from-text.js`: Main script (`--json` ingest and text modes)
- `scripts/set-book-fields.js`: One-row edit after ingest
- `scripts/verify-views.js`: Checks the built site (Recently pages, covers, redirects)
- `scripts/deslop-descriptions.js`: Prose scan, one description per document
- `scripts/auto-crop-covers.py`: Trims product-shot borders; check its result by eye
- `scripts/utils/catalog.js`: Loads and merges every wing
- `src/_data/wings.json`: Wing registry (file, id block, intake mode)
- `scripts/utils/book-metadata-aggregator.js`: Multi-source search (text modes)
- `scripts/utils/book-api-client.js`: API integrations (text modes)
- `scripts/validate-csv-robust.js`: CSV validation run by the ingest and `npm run test:csv`
- `docs/ADD-BOOK-GUIDE.md`: Detailed documentation

**Data sources configuration:**
All sources can be enabled/disabled and prioritized in `book-metadata-aggregator.js`

**Publisher patterns:**
Optimized scraping patterns in `PUBLISHER_PATTERNS` object for major art/photo publishers
