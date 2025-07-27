# Book Cover Acquisition Improvements

## Summary of Changes to `acquire-covers-free.js`

### 1. Enhanced Search Capabilities for Books Without ISBNs

All API functions now accept both ISBN and book metadata (title/author) parameters, enabling searches even when ISBN is not available.

### 2. Improved Google Books API Search

- **Multiple search strategies**: 
  - First tries ISBN if available
  - Then tries exact title/author search with `intitle:` and `inauthor:` operators
  - Falls back to general keyword search if needed
- **Better matching**: When multiple results are returned, finds the best match by comparing titles and authors
- **URL improvements**: Removes zoom parameters and ensures HTTPS

### 3. Enhanced Open Library Search

- **Fallback to search API**: When ISBN cover check fails, uses Open Library's search API
- **Multiple cover ID types**: Tries cover_i, ISBN, OCLC, and LCCN identifiers
- **Title/author search**: Full support for searching by title and author

### 4. Improved Archive.org Search

- **Multiple search strategies**:
  - Exact title AND author search with quotes
  - Title and author search without quotes
  - General text search as last resort
- **Better cover detection**: Prioritizes files with "cover" in the name
- **Multiple results handling**: Checks multiple results until finding one with a cover

### 5. Extended HathiTrust Support

- **Title/author search**: Added fallback to catalog search when ISBN fails
- **Larger images**: Increased width parameter from 250 to 400 pixels

### 6. Enhanced DPLA Search

- **Structured queries**: Uses AND operators and exact phrase matching
- **Image type filtering**: Filters for image resources
- **Better matching**: Checks if items mention "cover" or match book metadata

### 7. Improved Europeana Search

- **Field-specific search**: Uses title/what and who/creator fields
- **MIME type filtering**: Filters for JPEG images
- **Cover detection**: Looks for items mentioning "cover" or "couverture"

### 8. Better Progress Reporting

- **API attempt logging**: Shows which API is being tried for each book
- **ISBN statistics**: Reports how many books have/don't have ISBNs
- **Search visibility**: Makes it clear when using title/author search vs ISBN

### 9. Helper Functions

Added `normalizeSearchQuery()` function to clean and standardize search queries for better results.

## Usage Examples

### Run with standard limit:
```bash
node acquire-covers-free.js --limit 50
```

### Test the search improvements:
```bash
node test-cover-search.js
```

## Key Benefits

1. **No ISBN Required**: The script now effectively finds covers for books without ISBNs
2. **Better Success Rate**: Multiple search strategies increase the chance of finding covers
3. **Smarter Matching**: Better algorithms for finding the correct book among search results
4. **Free APIs Only**: All improvements maintain the zero-cost approach
5. **Detailed Logging**: Clear visibility into what the script is doing

## Example Output

```
🚀 Starting FREE book cover acquisition (limit: 50)
📚 Using only free APIs - no costs involved!

📚 Found 234 books needing covers
   📖 Books with valid ISBN: 156
   📚 Books without ISBN: 78 (will use title/author search)

[1/50] The Americans by Robert Frank
   ISBN: No ISBN
   🔍 Trying Open Library...
   🔍 Trying Google Books...
   ✅ Downloaded from Google Books (FREE)
```