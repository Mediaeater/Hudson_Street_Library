# Research Assistant Skill

Comprehensive book research assistant for Hudson Street Library. Systematically queries authoritative sources to build rich, curatorial-quality book pages with proper citations and metadata.

## Overview

This skill automates the research process for adding art books and exhibition catalogs to Hudson Street Library. It queries:

- **Bibliographic sources**: Library of Congress SRU API, WorldCat, Google Books, Open Library
- **Art book distributors**: DAP/Artbook.com, Twelvebooks, IDEA Books, Printed Matter, Walther König
- **Publisher sites**: Official publisher pages via targeted search
- **Artist research**: Gallery representation, museum collections, official sites
- **Exhibition data**: Hosting institutions, dates, curators

## Usage

### Basic Invocation

```bash
/research-asst <search-query>
```

**Search query formats**:
- ISBN: `/research-asst 9786185039455`
- Title + Author: `/research-asst "The Mad and the Lonely by George Condo"`
- Publisher URL: `/research-asst https://deste.gr/publications/the-mad-and-the-lonely/`
- Author + Year: `/research-asst "George Condo 2026"`

### Workflow

1. **Research Phase** (8-12 minutes)
   - Queries bibliographic sources in parallel
   - Searches art book distributors
   - Researches artist background and representation
   - Finds exhibition details if catalog
   - Downloads cover image

2. **Output Generation**
   - Creates `book_data_{slug}.json` with full structured metadata
   - Creates `research_log_{slug}.txt` with all URLs fetched
   - Both files saved to current directory

3. **Library Integration**
   - Skill asks: "Add this book to library now? (y/n)"
   - If yes: runs `node scripts/add-book-from-text.js --json book_data_{slug}.json`
   - Downloads cover image to `src/assets/images/books/`
   - Validates CSV structure

## Output Format

### JSON Schema

The skill outputs a comprehensive JSON object with:

```json
{
  "page_slug": "author_title_id",
  "cover_image": {
    "url": "https://...",
    "local_path": "/assets/images/books/..."
  },
  "title": "Book Title",
  "subtitle": "Subtitle if any",
  "authors": [
    {
      "name": "Author Name",
      "role": "Artist/Author",
      "url": "https://official-site.com",
      "type": "official_site"
    }
  ],
  "contributors": [...],
  "publisher": {
    "name": "Publisher Name",
    "url": "https://...",
    "location": "City, Country",
    "type": "publisher/foundation/gallery"
  },
  "year": 2026,
  "isbn": {
    "isbn13": "9781234567890",
    "isbn10": "1234567890"
  },
  "format": "Hardcover/Softcover",
  "pages": 200,
  "dimensions": "10 × 12 in",
  "images": {
    "total": 150,
    "color": 140,
    "bw": 10
  },
  "language": "English",
  "loc_data": {
    "lc_control_number": "...",
    "subject_headings": [...],
    "lc_classification": "...",
    "dewey_decimal": "...",
    "oclc_number": "..."
  },
  "description": {
    "main": "2-3 sentence summary",
    "extended": "4-6 sentence detailed description",
    "artist_bio": "3-4 sentence artist bio",
    "exhibition_context": "2-3 sentence exhibition context"
  },
  "exhibition": {
    "title": "Exhibition Title",
    "institution": "Museum/Gallery Name",
    "institution_url": "https://...",
    "location": "City, Country",
    "dates": {
      "start": "2024-06-18",
      "end": "2024-10-31"
    },
    "curators": [...]
  },
  "tags": ["Art", "Photography", "Exhibition Catalog"],
  "distributors": [
    {
      "name": "DAP / Distributed Art Publishers",
      "url": "https://...",
      "available": true
    }
  ],
  "artist_links": [
    {
      "label": "Official Site",
      "url": "https://...",
      "type": "artist_site"
    },
    {
      "label": "Gallery Name",
      "url": "https://...",
      "type": "gallery"
    },
    {
      "label": "MoMA Collection",
      "url": "https://...",
      "type": "museum"
    }
  ],
  "related_exhibitions": [...],
  "notes": "Special notes or conflicts found",
  "research_log": {
    "sources_checked": ["loc.gov", "worldcat.org", ...],
    "confidence_score": "high/medium/low",
    "unresolved_fields": ["field_name", ...],
    "last_researched": "2026-03-28"
  }
}
```

## Web Scraping Implementation

### Best Practices Applied

Based on GitHub research, the skill implements:

1. **Rate Limiting**
   - 2 requests per second default
   - Throttled queue prevents overwhelming servers
   - Respects `robots.txt` Crawl-delay directives

2. **Retry Logic**
   - 3 retry attempts with exponential backoff
   - Jitter (30% randomization) prevents thundering herd
   - Respects HTTP 429 (rate limit) responses
   - Doesn't retry 4xx client errors (except 429)

3. **Caching**
   - 24-hour in-memory TTL cache
   - Prevents redundant requests for same resource
   - Cache hits logged for transparency

4. **Polite User-Agent**
   ```
   HudsonStreetLibraryBot/1.0 (+https://hudsonstreetlibrary.com; contact@example.com)
   ```

5. **Error Handling**
   - Network errors: retry with backoff
   - 404 Not Found: mark as unavailable, don't retry
   - 429 Rate Limit: exponential backoff
   - 5xx Server errors: retry
   - Timeout: 15 seconds per request

### Libraries Used

- `axios` - HTTP client with interceptors
- `node-cache` - In-memory caching with TTL
- `fast-xml-parser` - Parse LOC SRU XML responses

## Content Writing

### Tone and Style

**Authoritative, curatorial, informative** — matching museum wall text register.

**Avoid marketing language**:
- ❌ "stunning," "groundbreaking," "must-have"
- ✓ "comprehensive," "documents," "features"

### Description Fields

1. **`main`** (2-3 sentences)
   - Lead with primary subject
   - What it documents, who it's about, what it contains
   - Suitable for card/search result

2. **`extended`** (4-6 sentences)
   - Expand on content and approach
   - Exhibition context if catalog
   - Physical nature: materials, design, photography
   - This becomes opening paragraphs of book page

3. **`artist_bio`** (3-4 sentences)
   - Artist's significance
   - Major works and collections
   - Current gallery representation
   - Most recent major exhibition
   - **Paraphrase from multiple sources** (never copy single source)

4. **`exhibition_context`** (2-3 sentences)
   - Hosting institution and significance
   - Venue's importance
   - How exhibition fits artist's broader career
   - Any site-specific or thematic considerations

## Critical Rules

⚠️ **NEVER save price data** — project policy prohibits storing prices

⚠️ **Tags MUST be comma-separated** — templates expect: `"Art, Photography, Zines"`
   - NOT semicolons or other delimiters
   - Used for related books scoring and search

⚠️ **Verify all URLs** — check links return 200 before including

⚠️ **Download cover images** — save to proper location with correct naming:
   ```
   {author_last}_{author_first}_{title}_{isbn}.jpg
   ```
   - All lowercase
   - Underscores for spaces
   - No special characters

⚠️ **Create CSV backup** — before any modifications

## Error Handling

### Common Scenarios

**No ISBN available**:
- Use title + artist + year as primary search key
- Note in `research_log.unresolved_fields`
- Still attempt distributor searches

**Publisher is gallery, not trade publisher**:
- Still check DAP and Twelvebooks (often distributed)
- Note if only available direct from gallery

**Historical exhibition (pre-2010)**:
- LOC and WorldCat will be primary sources
- Skip distributor in-stock checks
- Still include distributor URLs if found

**Emerging artist / less documented**:
- Skip museum collection links unless genuinely confirmed
- Flag confidence as "medium" in research_log
- Focus on gallery representation if available

**Conflicting data**:
- Prefer: LOC → publisher → DAP → WorldCat
- Document conflict in `notes` field
- Choose most authoritative source

**Non-English publications**:
- Note in `language` field
- Extract all metadata
- Write descriptions in English
- Note original language if relevant

## Progress Updates

Since research takes 10-15 minutes, provide status updates:

```
🔍 Searching Library of Congress...
✓ Found LOC record with 5 subject headings

🔍 Checking 6 art book distributors...
✓ Available from DAP and Twelvebooks

🔍 Researching artist background...
✓ Found gallery representation and museum collections

🔍 Searching for exhibition details...
✓ Found exhibition at DESTE Foundation, Hydra

✍️ Writing curatorial descriptions...
✓ Main description, artist bio, exhibition context complete

📸 Downloading cover image...
✓ Cover saved to src/assets/images/books/

✅ Research complete! Confidence: high
   Sources: loc.gov, worldcat.org, deste.gr, artbook.com, twelvebooks.com
```

## API Keys and Authentication

### Required (Free)

- **OCLC WSkey** (optional but recommended for WorldCat)
  - Sign up: https://www.oclc.org/developer/develop/authentication/how-to-request-a-wskey.en.html
  - Free for non-commercial use
  - Provides proper API access vs. HTML scraping

### Not Required

- Library of Congress SRU API - no authentication needed
- Google Books API - no key required for basic queries
- Open Library API - no authentication needed

## Integration with Existing Scripts

### add-book-from-text.js

Modified to accept `--json` flag:

```bash
node scripts/add-book-from-text.js --json book_data_condo_1759.json
```

**Process**:
1. Reads JSON file
2. Maps to CSV column format
3. Downloads cover image if not already present
4. Validates CSV structure (36 columns)
5. Adds to books.csv with next sequential ID

### CSV Column Mapping

```javascript
{
  title: researchData.title,
  author_first: researchData.authors[0]?.name.split(' ')[0],
  author_last: researchData.authors[0]?.name.split(' ').slice(1).join(' '),
  publisher: researchData.publisher?.name,
  publication_year: researchData.year?.toString(),
  isbn_asin: researchData.isbn?.isbn13 || researchData.isbn?.isbn10,
  tags: researchData.tags?.join(', '), // ← CRITICAL: comma-separated
  // ... etc
}
```

## Examples

### Example 1: ISBN Search

```
User: /research-asst 9786185039455

Agent:
🔍 Searching Library of Congress...
✓ Found: "The Mad and the Lonely" by George Condo
  LC Control Number: 2026123456
  Subject headings: 5 found

🔍 Searching WorldCat...
✓ OCLC #123456789

🔍 Checking art book distributors...
  ✓ DAP / Artbook.com - Available
  ✓ Twelvebooks - Available
  ✗ IDEA Books - Not found
  ✗ Printed Matter - Not found

🔍 Researching publisher...
✓ DESTE Foundation for Contemporary Art (Athens, Greece)
  Found official page with exhibition details

🔍 Researching artist...
✓ George Condo (b. 1957, American)
  Represented by: Skarstedt Gallery
  Collections: MoMA, Tate, Metropolitan Museum

✍️ Writing descriptions...
✓ Curatorial descriptions complete

📸 Downloading cover image...
✓ Saved: src/assets/images/books/condo_george_the_mad_and_the_lonely_9786185039455.jpg

✅ Research complete! Confidence: high
   Saved: book_data_condo_the-mad-and-the-lonely_1759.json
   Log: research_log_condo_the-mad-and-the-lonely_1759.txt

Add this book to library now? (y/n)
```

### Example 2: Title + Author Search

```
User: /research-asst "Synthetic Storyteller by Ayoung Kim"

Agent:
🔍 Searching bibliographic sources...
✓ Found LOC record
⚠️ No ISBN in LOC record

🔍 Searching Google Books...
✓ ISBN found: 9781234567890

[... continues with full research process ...]
```

## Files Created

When skill runs, it creates:

1. **`book_data_{slug}.json`** - Full structured metadata
   - Location: current directory
   - Can be moved/renamed as needed

2. **`research_log_{slug}.txt`** - Research provenance
   - Lists all URLs fetched
   - HTTP status codes
   - Timestamps
   - Errors encountered

3. **Cover image** (if downloaded)
   - Location: `src/assets/images/books/`
   - Naming: `{author}_{title}_{isbn}.jpg`

## Troubleshooting

### "Rate limited by source X"
- Normal behavior, skill will automatically retry with backoff
- If persistent, increase delay in `BookResearchClient` options

### "No LOC record found"
- Try alternate search (title instead of ISBN, or vice versa)
- Check spelling of title/author
- Some books may not be in LOC catalog (especially recent or self-published)

### "Cover image download failed"
- URL may be invalid or require authentication
- Manual download may be needed
- Add image manually to `src/assets/images/books/`

### "Confidence: low"
- Only 1 or 0 sources found data
- Manual verification recommended before adding to library
- Some fields may need manual completion

### CSV validation fails after adding
- Run: `node scripts/validate-csv-structure.js`
- Check that all 36 columns are present
- Verify tags are comma-separated, not semicolons
- Check for unescaped quotes in descriptions

## Future Enhancements

Potential improvements:

1. **OCLC API Integration** - Use official WorldCat Search API with WSkey
2. **Publisher Scraping** - Extract metadata from publisher sites (requires per-publisher logic)
3. **Distributor Stock Checks** - Parse availability status from distributor pages
4. **Image OCR** - Extract text from book previews for additional metadata
5. **Related Books** - Auto-suggest related books based on tags/subjects
6. **Batch Mode** - Process multiple ISBNs from CSV file
7. **Update Mode** - Refresh metadata for existing books

## Contributing

To improve the research logic:

1. Edit `~/.claude/skills/research-asst/SKILL.md`
2. Modify `scripts/utils/book-research-client.js` for new data sources
3. Update `scripts/add-book-from-text.js` for new JSON fields

## Resources

- [Library of Congress SRU API](https://www.loc.gov/apis/additional-apis/search-retrieval-via-url/)
- [WorldCat Search API](https://www.oclc.org/developer/api/oclc-apis/worldcat-search-api.en.html)
- [Google Books API](https://developers.google.com/books/docs/v1/using)
- [Open Library API](https://openlibrary.org/developers/api)
- [Web Scraping Best Practices](https://www.scrapehero.com/rate-limiting-in-web-scraping/)
