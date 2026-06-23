# Research Assistant Skill

## Overview

Comprehensive book research assistant for Hudson Street Library that automates the process of gathering rich metadata from authoritative sources.

## What It Does

Takes minimal input (ISBN, title, or URL) and produces publication-ready book metadata by:

1. **Querying bibliographic sources** (Library of Congress, WorldCat, Google Books, Open Library)
2. **Searching art book distributors** (DAP, Twelvebooks, IDEA Books, Printed Matter, Walther König)
3. **Researching artists** (official sites, gallery representation, museum collections)
4. **Finding exhibition details** (institutions, dates, curators)
5. **Writing curatorial descriptions** (main, extended, artist bio, exhibition context)
6. **Downloading cover images** (properly named and formatted)

## Usage

```bash
/research-asst <search-query>
```

**Input formats**:
- ISBN: `/research-asst 9786185039455`
- Title + Author: `/research-asst "The Mad and the Lonely by George Condo"`
- Publisher URL: `/research-asst https://deste.gr/publications/...`

**Time**: 10-15 minutes per book

## Output

Creates two files:

1. **`book_data_{slug}.json`** - Comprehensive structured metadata
2. **`research_log_{slug}.txt`** - All URLs fetched for provenance

Then offers to add book to library via:
```bash
node scripts/add-book-from-text.js --json book_data_{slug}.json
```

## Web Scraping Best Practices

Implements GitHub-researched best practices:

- **Rate limiting**: 2 requests/second with throttled queue
- **Retry logic**: Exponential backoff + 30% jitter, 3 attempts
- **Caching**: 24-hour TTL to prevent redundant requests
- **Polite User-Agent**: Identifies bot with contact info
- **robots.txt compliance**: Respects Crawl-delay directives
- **Error handling**: Smart retry for 5xx/429, no retry for 4xx

## Key Files

### Skill Definition
- `~/.claude/skills/research-asst/SKILL.md` - Skill instructions
- `~/.claude/skills/research-asst/README.md` - Full documentation

### Implementation
- `scripts/utils/book-research-client.js` - Web scraping client with rate limiting
- `scripts/add-book-from-text.js` - Modified to accept `--json` flag

### Dependencies
- `axios` (already installed) - HTTP client
- `node-cache` (newly added) - In-memory caching
- `fast-xml-parser` (newly added) - XML parsing for LOC API

## JSON Output Schema

Full schema includes:

```json
{
  "page_slug": "author_title_id",
  "cover_image": { "url": "...", "local_path": "..." },
  "title": "...",
  "authors": [{ "name": "...", "role": "...", "url": "..." }],
  "contributors": [...],
  "publisher": { "name": "...", "url": "...", "location": "..." },
  "year": 2026,
  "isbn": { "isbn13": "...", "isbn10": "..." },
  "format": "Hardcover",
  "pages": 200,
  "dimensions": "10 × 10 in",
  "images": { "total": 150, "color": 140, "bw": 10 },
  "loc_data": {
    "lc_control_number": "...",
    "subject_headings": [...],
    "lc_classification": "...",
    "oclc_number": "..."
  },
  "description": {
    "main": "2-3 sentence summary (fallback only)",
    "extended": "PAGE DESCRIPTION: framing/review line -> summary -> artist/other-works context, as <p> paragraphs",
    "artist_bio": "3-4 sentence artist bio (fold into extended; not a separate CSV column)",
    "exhibition_context": "2-3 sentence exhibition context (fold into extended)"
  },
  "exhibition": {
    "title": "...",
    "institution": "...",
    "dates": { "start": "...", "end": "..." }
  },
  "tags": ["Art", "Photography", "Exhibition Catalog"],
  "distributors": [{ "name": "...", "url": "...", "available": true }],
  "artist_links": [
    { "label": "Official Site", "url": "...", "type": "artist_site" },
    { "label": "Gallery", "url": "...", "type": "gallery" },
    { "label": "Museum", "url": "...", "type": "museum" }
  ],
  "research_log": {
    "sources_checked": [...],
    "confidence_score": "high",
    "unresolved_fields": [...],
    "last_researched": "2026-03-28"
  }
}
```

## Critical Rules

⚠️ **NEVER save price data** - project policy

⚠️ **Tags MUST be comma-separated** - `"Art, Photography, Zines"`

⚠️ **Verify all URLs** - check 200 status before including

⚠️ **Download cover images** - save with proper naming: `{author}_{title}_{isbn}.jpg`

## Content Writing Style

**Tone**: Authoritative, curatorial, informative (museum wall text register)

**Avoid**:
- Marketing language: "stunning," "groundbreaking," "must-have"
- Hyperbole and promotional language

**Use**:
- Precise, descriptive language
- Multiple-source paraphrasing (never copy single source)
- Focus on content, context, significance

**`extended` is the shipped page description** — author it as `<p>` paragraphs:
1. Top-line framing/review (stands alone; becomes the Recently-Added snippet)
2. Summary of the book
3. Artist + other-works context (when the artist has a body of work)

Target ~800–1300 chars; > 500 chars use `<p class="mt-6">` breaks. add-book ingests `extended` (fallback `main`) and verifies it landed.

## Integration

Works seamlessly with existing workflow:

1. Research with skill → outputs JSON
2. Add to library → `--json` flag reads JSON
3. Downloads cover image if not present
4. Maps JSON to CSV columns (including comma-separated tags)
5. Validates CSV structure (36 columns)
6. Updates Datasette catalog

## Example Progress Output

```
🔍 Searching Library of Congress...
✓ Found LOC record with 5 subject headings

🔍 Checking 6 art book distributors...
✓ Available from DAP and Twelvebooks

🔍 Researching artist background...
✓ Found gallery representation and museum collections

✍️ Writing descriptions...
✓ Curatorial descriptions complete

📸 Downloading cover image...
✓ Saved to src/assets/images/books/

✅ Research complete! Confidence: high

Add this book to library now? (y/n)
```

## Error Handling

Handles common scenarios gracefully:

- **No ISBN**: Uses title + author search
- **Publisher is gallery**: Still checks distributors
- **Historical exhibition**: Focuses on LOC/WorldCat
- **Emerging artist**: Flags medium confidence
- **Conflicting data**: Prefers LOC → publisher → DAP → WorldCat
- **Non-English**: Notes language, writes descriptions in English

## Libraries Used

Based on GitHub research of best practices:

- **axios** - HTTP client with interceptors
- **node-cache** - In-memory caching with TTL
- **fast-xml-parser** - XML parsing for LOC SRU API responses

Alternative libraries considered but not used:
- `retry-axios` / `axios-retry` - Built custom retry logic instead
- `throttled-queue` - Built simple queue implementation
- `robots-parser` - Built basic robots.txt parser
- `node-isbn` - Using direct API calls for better control

## API Access

### Free (No Auth Required)
- Library of Congress SRU API
- Google Books API
- Open Library API

### Optional (Recommended)
- **OCLC WSkey** for WorldCat API
  - Free for non-commercial use
  - Provides proper API access vs. HTML scraping
  - Sign up: https://www.oclc.org/developer/

## Future Enhancements

Potential improvements:

1. OCLC API integration with WSkey
2. Publisher-specific scrapers for enhanced metadata
3. Distributor stock status parsing
4. Batch processing from CSV
5. Update mode for refreshing existing book metadata
6. Image OCR for additional metadata extraction
7. Auto-suggest related books

## Testing

Test the skill with:

```bash
# Basic ISBN search
/research-asst 9786185039455

# Title + author search
/research-asst "The Mad and the Lonely by George Condo"

# Test JSON integration
node scripts/add-book-from-text.js --json book_data_test.json
```

## Troubleshooting

**Rate limiting**:
- Normal with automatic retry
- Adjust `requestsPerSecond` in BookResearchClient if needed

**No LOC record**:
- Try alternate search method
- Some books not in catalog (recent/self-published)

**Download failures**:
- May need manual download
- Add image to `src/assets/images/books/` manually

**Low confidence**:
- Manual verification recommended
- Some fields may need completion

**CSV validation fails**:
- Run: `node scripts/validate-csv-structure.js`
- Check 36 columns present
- Verify comma-separated tags

## Resources

- [LOC SRU API Documentation](https://www.loc.gov/apis/additional-apis/search-retrieval-via-url/)
- [WorldCat Search API](https://www.oclc.org/developer/api/oclc-apis/worldcat-search-api.en.html)
- [Web Scraping Best Practices](https://www.scrapehero.com/rate-limiting-in-web-scraping/)
- [Rate Limiting with Exponential Backoff](https://substack.thewebscraping.club/p/rate-limit-scraping-exponential-backoff)

---

**Created**: 2026-03-28
**Status**: Complete and ready for use
**Location**: `~/.claude/skills/research-asst/`
