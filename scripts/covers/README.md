# Cover Acquisition Scripts

Scripts for acquiring and managing book cover images.

## Main Script

**acquire-covers.js** - Primary cover acquisition script
- Queries Open Library and Google Books APIs for cover images
- Saves covers with naming pattern: `Author_Name_Book_Title_ISBN.jpg`
- Saves to: `src/assets/images/books/`
- Usage: `node scripts/covers/acquire-covers.js --limit 50`

## Specialized Acquisition Scripts

**acquire-covers-librarything.js** - LibraryThing cover acquisition
**acquire-covers-openlibrary-direct.js** - Direct Open Library API calls
**acquire-isbn-books.js** - ISBN-specific book cover acquisition
**acquire-music-covers.js** - Music book cover acquisition
**download-apartamento-covers.js** - Apartamento magazine cover downloads
**get-google-books-covers.js** - Google Books API cover fetcher
**get-librarything-covers.js** - LibraryThing cover fetcher

## Utilities

**cover-utils.js** - Shared utilities for cover processing
**clean-small-covers.js** - Removes covers below size threshold
**replace-small-covers.js** - Replaces low-quality covers with better versions
**verify-covers.js** - Verifies cover image integrity
**validate-opb-covers.js** - Validates Open Publishing covers

## Common Usage Patterns

### Acquire covers for books without them
```bash
node scripts/covers/acquire-covers.js --limit 50
```

### Replace small/low-quality covers
```bash
node scripts/covers/replace-small-covers.js
```

### Verify cover integrity
```bash
node scripts/covers/verify-covers.js
```

### Clean up undersized covers
```bash
node scripts/covers/clean-small-covers.js
```
