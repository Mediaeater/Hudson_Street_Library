# research-asst JSON record — full example

The complete annotated record this skill produces. Field tiers and the CSV-mapped enrichment fields are described in `SKILL.md` (Output Format). Use `null` for unavailable fields.

`wing` is optional and names the catalogue wing the item belongs to (`art`, `cryptology`, `fiction`, `ephemera`, `comics`, `posters`, `artworks` — the slugs in `src/_data/wings.json`). It decides which CSV the row lands in and which id block it draws from. Omit it for an art or photography book and the ingest files it under the default wing; `--wing` on the ingest command overrides whatever the record says.

Give the primary author explicit `last` and `first` — the ingest uses them verbatim for the CSV sort keys, page slug, and cover filename (see SKILL.md Critical Rules); its fallback name-split can't detect family-name-first order or particles ("van der …"). `publisher` should be the `{name, url, …}` object shown here (the ingest tolerates a bare string, but then `publisher_url` is lost).

```json
{
  "page_slug": "condo_the-mad-and-the-lonely_1759",
  "wing": "art",
  "cover_image": {
    "url": "https://...",
    "local_path": "/assets/images/books/condo_george_the_mad_and_the_lonely_9786185039455.jpg"
  },
  "title": "The Mad and the Lonely",
  "subtitle": null,
  "authors": [
    {
      "name": "George Condo",
      "last": "Condo",
      "first": "George",
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
