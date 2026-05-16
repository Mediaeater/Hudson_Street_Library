# Interactive Cover Acquisition Testing Tool

## Overview

The `test-cover-acquisition.js` script provides an interactive workflow for testing cover acquisition one book at a time. It allows you to search for books, preview covers before saving, and approve or reject them interactively.

## Features

- **Interactive Search**: Search by ISBN, artist name, or book title
- **Visual Preview**: Opens cover images in your default image viewer
- **Approval Workflow**: Approve, reject, or skip covers with simple commands
- **Progress Tracking**: Maintains a JSON log of all tested books
- **Session Resume**: Load and review previous session history
- **Dry Run Mode**: Test the workflow without saving any files
- **Multiple API Support**: Tries Google Books, Open Library, WorldCat, and LibraryThing
- **Statistics**: Track requests, cache hits, and downloads

## Installation

No additional installation required beyond the main project dependencies. The tool uses:
- `scripts/utils/csv-handler.js` - For CSV operations
- `scripts/utils/book-api-client.js` - For API interactions
- `scripts/utils/image-core.js` - For image validation

## Usage

### Basic Usage

```bash
node test-cover-acquisition.js
```

### With Options

```bash
# Dry run mode (no files saved)
node test-cover-acquisition.js --dry-run

# Show help
node test-cover-acquisition.js --help
```

## Workflow

### 1. Start the Tool

```bash
node test-cover-acquisition.js
```

You'll see the header:
```
══════════════════════════════════════════════════════════════════════
    Interactive Cover Acquisition Test Tool
══════════════════════════════════════════════════════════════════════
```

### 2. Search for Books

Enter a search term:
```
Enter search term (ISBN, artist, or title) or "q" to quit: Tillmans
```

The tool searches for matches in:
- ISBN/ASIN
- Book title
- Author name (full or last name)

### 3. Select a Book

```
Found 5 matching book(s):

1. Wolfgang Tillmans - Portraits
   Author: Wolfgang Tillmans
   ISBN: 9781891024368
   Status: No cover

2. Wolfgang Tillmans - truth study center
   Author: Wolfgang Tillmans
   ISBN: 9783822830420
   Status: No cover
...

Select book number (1-5) or "c" to cancel: 1
```

### 4. Review Cover

The tool will:
1. Search multiple APIs for the cover
2. Download to temporary location
3. Display cover details (source, URL, size, dimensions)
4. Open the image in your default viewer

Example output:
```
Searching APIs for cover...
  🌐 Trying googleBooks...
  ✅ Found image via Google Books
Found cover via Google Books

Downloading to temporary location...
  📥 Downloading: https://...
  ✅ Downloaded and validated: Tillmans_Portraits_9781891024368.jpg

Cover Details:
  Source: Google Books
  URL: https://books.google.com/books/content?id=...
  Size: 45.2 KB
  Dimensions: 400x600
  Path: /path/to/.temp-covers/Tillmans_Portraits_9781891024368.jpg

Opening image for review...
```

### 5. Approve or Reject

```
Approve this cover? (y=yes, n=no, s=skip, q=quit):
```

**Options:**
- `y` or `yes` - Approve and move to final location (`src/assets/images/books/`)
- `n` or `no` - Reject and delete the cover
- `s` or `skip` - Keep temp file but don't save (for manual review later)
- `q` or `quit` - Exit the tool

### 6. Continue or Exit

```
Test another book? (y/n): y
```

## File Locations

### Input
- **Books CSV**: `src/_data/books.csv`

### Output
- **Final Images**: `src/assets/images/books/`
- **Temp Images**: `.temp-covers/` (for skipped covers)
- **Session Log**: `cover-acquisition-log.json`

## Session Log

The tool maintains a JSON log file (`cover-acquisition-log.json`) with entries like:

```json
[
  {
    "timestamp": "2025-10-19T14:30:45.123Z",
    "book": {
      "title": "Wolfgang Tillmans - Portraits",
      "author": "Wolfgang Tillmans",
      "isbn": "9781891024368",
      "id": "12345"
    },
    "status": "approved",
    "source": "Google Books",
    "url": "https://...",
    "path": "/path/to/final/image.jpg"
  },
  {
    "timestamp": "2025-10-19T14:32:10.456Z",
    "book": {
      "title": "Another Book",
      "author": "Another Author",
      "isbn": "9780000000000",
      "id": "12346"
    },
    "status": "rejected",
    "source": "Open Library",
    "url": "https://..."
  }
]
```

### Status Values
- `approved` - Cover approved and saved
- `rejected` - Cover rejected and deleted
- `skipped` - Cover downloaded but not saved
- `not_found` - No cover found in any API
- `error` - Error occurred during processing

## Session Summary

When you exit, you'll see a summary:

```
══════════════════════════════════════════════════════════════════════
Session Summary
══════════════════════════════════════════════════════════════════════

Books tested:     5
Approved:         3
Rejected:         1
Skipped:          1
Errors:           0

Log file: /path/to/cover-acquisition-log.json
Temp files: /path/to/.temp-covers

API Statistics:
  Total requests: 15
  Cache hits: 2
  Downloads: 4
```

## Advanced Features

### Dry Run Mode

Test the workflow without saving any files:

```bash
node test-cover-acquisition.js --dry-run
```

This mode:
- Simulates all operations
- Shows what would happen
- Doesn't save files or modify the log
- Useful for testing searches and API responses

### Reviewing Skipped Covers

Covers marked as "skipped" are kept in `.temp-covers/`. You can:

1. Review them manually later
2. Move them to the final location if desired
3. Delete them if not needed

```bash
# List skipped covers
ls -lh .temp-covers/

# Move a skipped cover to final location
mv .temp-covers/Some_Book_123.jpg src/assets/images/books/
```

### Resuming Previous Sessions

The tool automatically loads the previous session log on startup:

```
Loaded 15 entries from previous sessions
```

This helps you:
- Track what you've already tested
- Avoid duplicate work
- Review previous decisions

## Tips

1. **Search Strategies**
   - Use last names for artists: `Tillmans` instead of `Wolfgang Tillmans`
   - Use partial ISBNs: `9781891` for books with that prefix
   - Use unique title words: `Portraits` instead of full title

2. **Quality Checking**
   - Check image dimensions (should be at least 200x300)
   - Verify file size (should be > 3KB)
   - Ensure correct book/author match
   - Look for high-resolution versions

3. **Batch Processing**
   - Test a few books first
   - Review the session log
   - Identify patterns in which APIs work best
   - Use the main `acquire-covers.js` for bulk processing

4. **Troubleshooting**
   - If no covers found, try different search terms
   - Check if the book has an ISBN
   - Some books may not be in the APIs
   - Use `--dry-run` to test without side effects

## Example Session

```bash
$ node test-cover-acquisition.js

══════════════════════════════════════════════════════════════════════
    Interactive Cover Acquisition Test Tool
══════════════════════════════════════════════════════════════════════

Loaded 0 entries from previous sessions

Enter search term (ISBN, artist, or title) or "q" to quit: Tillmans
Searching...

Found 5 matching book(s):

1. Wolfgang Tillmans - Portraits
   Author: Wolfgang Tillmans
   ISBN: 9781891024368
   Status: No cover

Select book number (1-5) or "c" to cancel: 1

──────────────────────────────────────────────────────────────────────

Selected Book:
Wolfgang Tillmans - Portraits
   Author: Wolfgang Tillmans
   ISBN: 9781891024368
   Status: No cover

Searching APIs for cover...
  🌐 Trying googleBooks...
  ✅ Found image via Google Books
Found cover via Google Books
Downloading to temporary location...
  📥 Downloading: https://...
  ✅ Downloaded and validated: Tillmans_Portraits_9781891024368.jpg

Cover Details:
  Source: Google Books
  URL: https://books.google.com/books/content?id=...
  Size: 45.2 KB
  Dimensions: 400x600
  Path: /path/to/.temp-covers/Tillmans_Portraits_9781891024368.jpg

Opening image for review...

Approve this cover? (y=yes, n=no, s=skip, q=quit): y
Cover saved to: /path/to/src/assets/images/books/Tillmans_Portraits_9781891024368.jpg

Test another book? (y/n): n

══════════════════════════════════════════════════════════════════════
Session Summary
══════════════════════════════════════════════════════════════════════

Books tested:     1
Approved:         1
Rejected:         0
Skipped:          0
Errors:           0

Log file: /path/to/cover-acquisition-log.json

API Statistics:
  Total requests: 1
  Cache hits: 0
  Downloads: 1
```

## Integration with Main Scripts

This tool complements the main cover acquisition workflow:

1. **Test with this tool** - Test individual books interactively
2. **Review results** - Check quality and API sources
3. **Bulk process** - Use `acquire-covers.js` for batch processing

```bash
# Interactive testing
node test-cover-acquisition.js

# Bulk processing with learned parameters
node acquire-covers.js --artist "Tillmans" --limit 50
```

## Keyboard Shortcuts

- **Ctrl+C** - Graceful exit with session summary
- **q** or **quit** - Exit during search prompt
- **c** or **cancel** - Cancel book selection

## Error Handling

The tool handles various errors gracefully:
- **No books found** - Shows message, allows new search
- **API errors** - Tries next API automatically
- **Download failures** - Shows error, allows retry
- **Invalid images** - Validates and rejects automatically
- **File permission errors** - Shows warning, continues

## API Sources

The tool searches APIs in this order:
1. **Google Books** - Best coverage, high-quality images
2. **Open Library** - Good for older/academic books
3. **WorldCat** - Library catalog images
4. **LibraryThing** - Community-sourced covers (requires API key)

## Requirements

- Node.js 14+
- Dependencies from main project:
  - `csv-parse`
  - `csv-stringify`
  - `image-size` (optional, for dimension checking)
- API keys (optional):
  - LibraryThing API key in `.env`

## License

Part of the Hudson Street Library project.
