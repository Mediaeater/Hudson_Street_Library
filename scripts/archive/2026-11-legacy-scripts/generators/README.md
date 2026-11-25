# Page Generation Scripts

Scripts for generating static pages and collections from book data.

## Active Scripts

**generate-book-pages.js** - Main book page generator
- Generates individual book pages from `src/_data/catalog/art.csv`
- Creates book detail pages with metadata and cover images
- Usage: `npm run build:books` or `node scripts/generators/generate-book-pages.js`

**generate-apartamento-pages.js** - Apartamento magazine page generator
- Generates pages for Apartamento magazine issues
- Creates magazine-specific layouts and collections

## Archived Scripts

Deprecated generators are in `scripts/archive/deprecated-generators/`:
- `generate-prince-collection.js` - Original version
- `generate-prince-collection-secure.js` - Secure variant

## Common Usage

### Generate all book pages
```bash
npm run build:books
```

