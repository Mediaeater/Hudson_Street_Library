---
name: research-asst
description: Build comprehensive book records for Hudson Street Library from ISBN, title, or URL. Queries LOC, WorldCat, publisher sites, and art distributors; outputs structured JSON.
user_invocable: true
---

# Hudson Street Library Book Research Assistant

This is the **canonical research stage** for the Hudson Street Library. The `add-book`
skill delegates its research step here: it invokes this skill to produce
`book_data_{slug}.json`, then ingests that JSON. Keep the multi-source research procedure
(distributors, artist/exhibition research, schema) here — `add-book` should not duplicate it.

## Input Formats

Accept any of:
- ISBN (10 or 13 digit): `9786185039455`
- Title + Author: `"The Mad and the Lonely by George Condo"`
- Publisher URL: `https://deste.gr/...`
- Author + Year: `"George Condo 2026"`

## Research Workflow

### Phase 1: Core Bibliographic Data

Query in parallel (respect rate limits):
1. **Library of Congress SRU API** (`lx2.loc.gov/sru`)
   - Use ISBN or title search
   - Extract: LC Control Number, MARC record, subject headings, classification
   - Subject headings become authoritative Tags
2. **WorldCat** (use public search at worldcat.org — no API key required)
   - Extract: OCLC number, contributor roles, alternate ISBNs, holdings count
   - Cross-check pagination and dimensions

**Rate limiting**: 2 requests/second, 3 retries with exponential backoff + jitter

### Phase 2: Publisher & Distributor Research

Search systematically (parallel where possible):
- **Publisher's official site**: Search via Google `site:publishername.com "book title"`
  - Extract: official description, press release, exhibition dates, cover image URL, purchase link
- **DAP / Distributed Art Publishers** (`artbook.com`)
- **Twelvebooks** (`twelvebooks.com`)
- **IDEA Books** (`ideabooks.nl`)
- **Buchhandlung Walther König** (`buchhandlung-walther-koenig.de`)
- **Printed Matter** (`printedmatter.org`)
- **Mack Books** (`mackbooks.co.uk`)

For each distributor:
- Extract: product description, availability, pricing (DO NOT SAVE), contributor list, product URL
- Mark as available/unavailable

**Rate limiting**: Check robots.txt for each domain, default to 2-second delay between requests to same domain

### Phase 3: Artist/Author Research

- Search artist's **official website**
- Check major gallery representation (Gagosian, Hauser & Wirth, Pace, David Zwirner, Skarstedt)
- Search museum collections (MoMA, Tate, Guggenheim, Metropolitan Museum)
- Extract: 2-3 sentence bio (paraphrased), birth year, nationality, gallery URL, museum collection URLs

**Key**: Build `artist_links` array with official site, gallery, and museum URLs

### Phase 4: Exhibition Research (if catalog)

- Identify originating exhibition from publisher/LOC data
- Search hosting institution's site for exhibition page
- Extract: full title, exact dates, venue name/location, curators, official description

### Phase 5: Academic Cross-Check

For scholarly works, museum catalogs, or artists with significant institutional presence:
- Search JSTOR for academic articles
- Check museum collection databases
- Note accession numbers or collection URLs

## Output Format

Generate three outputs:
1. `book_data_{slug}.json` - Full structured JSON (see schema below), in the current directory
2. `research_log_{slug}.txt` - One URL per line, format: `[SOURCE] URL` (e.g., `[LOC] https://lx2.loc.gov/...`), in the current directory
3. Cover image — download to `src/assets/images/books/` named `{last}_{first}_{title_snake}_{isbn13}.jpg`; set `cover_image.local_path` in JSON accordingly

**Slug format**: `{artist_last}_{title-kebab}_{next_id}` where `next_id` is the next sequential book ID — check `books.csv` to find the current highest ID and increment by 1.

**JSON Schema** (use `null` for unavailable fields):

Field tiers:
- **Required**: `page_slug`, `title`, `authors`, `publisher`, `year`, `isbn`, `format`, `description.main`, `tags`, `research_log`
- **Expected** (fill when sources exist): `cover_image`, `contributors`, `pages`, `dimensions`, `language`, `loc_data`, `description.extended`, `description.artist_bio`, `distributors`, `artist_links`
- **Optional** (omit or null when not applicable): `subtitle`, `images`, `edition`, `print_run`, `exhibition`, `description.exhibition_context`, `related_exhibitions`, `notes`

**CSV-mapped enrichment fields** — top-level, all optional; add-book's `--json` ingest maps each 1:1 to a `books.csv` column, so a complete record lands in one `--json --yes` run with no manual patching. Fill whatever you know:
- `height_cm`, `width_cm`, `depth_cm`, `weight_g` — numbers. **Supply cm explicitly**; the ingest never parses the `dimensions` string (publishers list H×W and W×H inconsistently, so parsing transposes them). Keep the human-readable `dimensions` string too.
- `signed` (boolean → `is_signed_inscribed`), `edition` (→ `edition_printrun`)
- `designer`, `editor` (or tag a `contributors[]` entry with `role: "Design"` / `"Editor"` — the ingest routes by role; remaining contributors land in the `contributors` column)
- `collection_grouping`, `classification` — curatorial; match sibling records already in `books.csv` (e.g. `"Individual Photographer Monographs"`, `"Magazines"`, grouping `"Art"`)

```json
{
  "page_slug": "condo_the-mad-and-the-lonely_1759",
  "cover_image": {
    "url": "https://...",
    "local_path": "/assets/images/books/condo_george_the_mad_and_the_lonely_9786185039455.jpg"
  },
  "title": "The Mad and the Lonely",
  "subtitle": null,
  "authors": [
    {
      "name": "George Condo",
      "role": "Artist",
      "url": "https://georgecondo.com",
      "type": "official_site"
    }
  ],
  "contributors": [
    {
      "name": "Curator Name",
      "role": "Essay",
      "url": null
    }
  ],
  "publisher": {
    "name": "DESTE Foundation for Contemporary Art",
    "url": "https://deste.gr",
    "location": "Athens, Greece",
    "type": "foundation"
  },
  "year": 2026,
  "isbn": {
    "isbn13": "9786185039455",
    "isbn10": null
  },
  "format": "Hardcover",
  "pages": 116,
  "dimensions": "10 × 10 in",
  "images": {
    "total": 85,
    "color": 78,
    "bw": 7
  },
  "language": "English",
  "edition": null,
  "print_run": null,
  "loc_data": {
    "lc_control_number": "...",
    "lc_classification": "...",
    "dewey_decimal": "...",
    "subject_headings": [
      "Condo, George, 1957- -- Exhibitions",
      "Painting, American -- 21st century -- Exhibitions"
    ],
    "oclc_number": "..."
  },
  "description": {
    "main": "2-3 sentence summary suitable for card/search result",
    "extended": "4-6 sentences expanding on content, approach, context, physical nature",
    "artist_bio": "3-4 sentences on significance, major works, representation, recent exhibitions",
    "exhibition_context": "2-3 sentences on institution, venue significance, career fit"
  },
  "exhibition": {
    "title": "The Mad and the Lonely",
    "institution": "DESTE Foundation Project Space, Slaughterhouse",
    "institution_url": "https://deste.gr/project-space/",
    "location": "Hydra, Greece",
    "dates": {
      "start": "2024-06-18",
      "end": "2024-10-31"
    },
    "curators": []
  },
  "tags": [
    "Art",
    "Contemporary Art",
    "Painting",
    "Exhibition Catalog"
  ],
  "distributors": [
    {
      "name": "DAP / Distributed Art Publishers",
      "url": "https://www.artbook.com/9786185039455.html",
      "available": true
    }
  ],
  "artist_links": [
    {
      "label": "Official Site",
      "url": "https://georgecondo.com",
      "type": "artist_site"
    },
    {
      "label": "Skarstedt Gallery",
      "url": "https://www.skarstedt.com/artists/george-condo",
      "type": "gallery"
    },
    {
      "label": "MoMA Collection",
      "url": "https://www.moma.org/artists/1125",
      "type": "museum"
    }
  ],
  "related_exhibitions": [
    {
      "title": "Retrospective Title",
      "institution": "Museum Name",
      "institution_url": "https://...",
      "dates": "October 2025 – February 2026"
    }
  ],
  "notes": "Any special considerations or conflicts found during research",
  "research_log": {
    "sources_checked": [
      "loc.gov",
      "worldcat.org",
      "deste.gr",
      "artbook.com"
    ],
    "confidence_score": "high",  // "high" | "medium" | "low"
    "unresolved_fields": ["isbn10", "print_run"],
    "last_researched": "2026-03-28"
  }
}
```

## Content Writing Guidelines

**Tone**: Authoritative, curatorial, informative. Write the way a museum wall label reads: neutral, precise, focused on what the work is and does rather than how the reader should feel about it. NO marketing language (avoid "stunning," "groundbreaking," "must-have").

**Descriptions** — `extended` is what ships as the book page's description (add-book maps `extended` into the CSV `description` column, falling back to `main`). Author it with care:
- `extended`: **The page description, ~800–1300 chars, curatorial voice, matching existing entries.** Author it as `<p>` paragraphs — never a single blob; HSL renders >500-char descriptions with `<p class="mt-6">` breaks — in three beats:
  1. **Top-line framing/review** (the first `<p>`) — a single sentence that frames the work: what it is and why it matters (e.g. "A layered work of appropriation by the New York conceptual artist Eric Doeringer (b. 1974)…"). It must stand alone — it also becomes the Recently-Added snippet (truncated to ~280 chars).
  2. **Summary** (a `<p class="mt-6">`) — what the book documents/contains, the artist's approach, exhibition or publication context, physical materials/design.
  3. **Artist + other-works context** (a `<p class="mt-6">`) — who the artist is and how this fits their body of work, when there is one. Don't bolt it on. Inline `<em>` for titles.
- `main`: 2–3 sentence summary. Fallback only — used if `extended` is absent.
- `artist_bio`: Significance, major works/collections, representation, recent shows. Paraphrase from multiple sources. Not persisted as its own column, so make sure its substance is folded into `extended`.
- `exhibition_context`: Institution significance, venue, how it fits artist's career. Also fold into `extended` if it belongs on the page.

**Links**: Map every proper noun with authoritative URL to `artist_links` or `distributors` arrays.

## Critical Rules

- **NEVER save price data** — pricing policy prohibits storing prices in any form
- **Tags in JSON are an array** — the add-book script converts to comma-separated for CSV export
- **Verify all URLs** — check that links return 200 before including
- **Back up books.csv** — before running add-book script

## Error Handling

- **No ISBN**: Use title + artist + year as search key. Note in `unresolved_fields`.
- **Publisher is gallery**: Still check DAP/Twelvebooks. Note if only available direct.
- **Historical exhibition (pre-2010)**: LOC/WorldCat primary, skip distributor stock checks.
- **Emerging artist**: Skip museum links unless confirmed. Flag confidence as "medium".
- **Conflicting data**: Default ranking is LOC → publisher → DAP → WorldCat, but verify case-by-case -- LOC records can be outdated or sparse for small-press art books. Document which source was preferred and why in `notes`.
- **Non-English**: Note in `language`, write descriptions in English.

## Integration with Add-Book Script

After generating JSON, offer to add to library:

```bash
node scripts/add-book-from-text.js --json book_data_{slug}.json
```

This will:
1. Parse JSON and map to CSV columns
2. Download cover image from URL
3. Validate CSV structure
4. Add to books.csv with next sequential ID
5. Update Datasette catalog

## Progress Updates

This is a long-running task — provide a brief status line before each phase and a summary when complete.
