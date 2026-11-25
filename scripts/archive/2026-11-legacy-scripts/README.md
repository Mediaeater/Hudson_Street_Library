# Archived Legacy Scripts (2026-11)

Moved out of active `scripts/` because they predate the Eleventy v3 / 12-wing 37-column catalogue architecture and either crash or corrupt data if executed:

- **`generators/`**: `generate-book-pages.js` (reads ignored `BOOK-TEMPLATE.html` → `ENOENT`, conflicts with `src/books.njk`) and `generate-apartamento-pages.js` (writes static HTML with baked-in prices and off-palette Tailwind CDN classes).
- **`collections/`**: `process-matsuda-catalogs.js` & `process-music-books.js` (hardcoded `/Users/m/Downloads/` paths, `NaN` IDs, 29-column rows overwriting `art.csv`), `update-matsuda-page.js` & `update-music-page.js` (hardcoded HTML snippets superseded by `src/_data/collections/*.json`), and `scrape-apartamento-details.js` (calls nonexistent `CSVHandler.writeBooksSync`).
- **`news-pipeline/` & `shared/collections-config.js`**: `event-pipeline.js` (overwrites `art.csv` with legacy column names and missing IDs) and `news-generator.js` (wipes `src/_data/news.json` on parse errors, shadowed `generateCollectionNews` method).
