# Collection Processing Scripts

Scripts for processing and updating specific book collections and curated pages.

## Scripts

**update-matsuda-page.js** - Matsuda collection page updater
- Updates the Matsuda book collection page
- Regenerates collection listings

**update-music-page.js** - Music collection page updater
- Updates the music book collection page
- Maintains music-specific metadata

**process-matsuda-catalogs.js** - Matsuda catalog processor
- Processes Matsuda catalog data
- Generates structured collection data

**process-music-books.js** - Music book processor
- Processes music book metadata
- Updates music collection data

**scrape-apartamento-details.js** - Apartamento magazine scraper
- Scrapes Apartamento magazine details
- Updates magazine metadata and descriptions

## Common Usage

### Update Matsuda collection
```bash
node scripts/collections/update-matsuda-page.js
```

### Update music collection
```bash
node scripts/collections/update-music-page.js
```

### Process Apartamento data
```bash
node scripts/collections/scrape-apartamento-details.js
```
