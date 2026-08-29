---
name: research-asst
description: Use when cataloging a book for Hudson Street Library from an ISBN, title, or publisher URL — builds the structured JSON record (bib data, description, cover) add-book ingests. Publisher-first.
user_invocable: true
---

# Hudson Street Library Book Research Assistant

This is the **canonical research stage** for the Hudson Street Library. The `add-book`
skill delegates its research step here: it invokes this skill to produce
`book_data_{slug}.json`, then ingests that JSON. Keep the multi-source research procedure
(distributors, artist/exhibition research, schema) here — `add-book` must not duplicate it.

## Quick Reference

| Step | Action | Output |
|------|--------|--------|
| 1 | Parse input (ISBN / title / publisher URL) | search key |
| 1a | No publisher yet? **Search-free lookup first** — `node scripts/lookup-book.js "<author> <title>"` — before spending a capped `WebSearch` | ISBN + publisher |
| 2 | **Fast path**: `WebFetch` the publisher page, fill the record, author the description — **stop when core fields + cover are done** | `book_data_{slug}.json` |
| 3 | **Deep sweep** (only for a gap/conflict): LOC, WorldCat, distributors, artist/museum | filled gaps |
| 4 | Download + crop cover → `src/assets/images/books/` | cover `.jpg` |
| 5 | **De-slop the description** — scan it, fix what fires | clean prose |
| 6 | Emit JSON + `research_log`; hand to `add-book` — decline to ingest yourself | outputs |

## When NOT to Use

- **Editing an existing record** — edit the CSV row directly, or re-run for that one title. This skill builds a *new* record.
- **Ingesting into the collection** — that is `add-book`'s job. Produce the JSON + cover and stop; a second ingest trips the ingest's duplicate guard (and, if forced past it, creates duplicate IDs).
- **Any project other than Hudson Street Library** — paths, schema, and cover dirs are HSL-specific.

## Input Formats

Accept any of:
- ISBN (10 or 13 digit): `9786185039455`
- Title + Author: `"The Mad and the Lonely by George Condo"`
- Publisher URL: `https://deste.gr/...`
- Author + Year: `"George Condo 2026"`

## Research Workflow

**Default to the lean, publisher-first path below; the multi-source Deep Sweep (Phases 1–5) is opt-in** — run it only per the escalation triggers. Fanning out to LOC + WorldCat + every distributor + artist/museum sites for a routine title burns ~100K+ tokens on facts the publisher page already lists.

### Fast path (default): publisher-first

1. Start from what the user gave you — a publisher URL, ISBN, or title (an Amazon/retailer listing counts). `WebFetch` the **publisher's own product page first**; it almost always carries ISBN, page count, dimensions, format, description, contributors, and a cover image in one place.
2. If you only have a title, **try the search-free indexes below before spending a WebSearch** — they resolve roughly four out of five ordinary photobooks to an exact ISBN, publisher and cover URL for the cost of a plain HTTP GET. Only when they miss, run ONE `WebSearch` to find the publisher product page, then `WebFetch` it.
3. Fill the JSON from that page and author the description. Set `authors[0].url` to the artist's **own official website** if one exists — a quick targeted `WebSearch`/`WebFetch` when the publisher page doesn't link it; a gallery or museum URL does **not** count and goes in `artist_links` instead (see Critical Rules). **Stop as soon as the Required fields + core Expected fields (`isbn`, `pages`, `dimensions`/`height_cm`+`width_cm`, `format`, `description`, cover, plus the artist's official site if one exists) are populated.** Emit the JSON — do not open more sources.

**Stop rule / budget.** A routine add costs roughly one publisher fetch plus a cover fetch (target ≤ ~10 web calls). The moment the core fields + cover are in hand, you are done.

**Escalate to the Deep Sweep only when:**
- a Required/core field is still missing after the publisher page, or
- two sources conflict on a fact (ISBN, pages, dimensions, year), or
- the book is a major/scholarly title where authoritative LOC/LCSH subject headings materially improve the record.

**Example (fast path).** Given `https://www.versobooks.com/products/3477-how-to-see-like-a-machine`: one `WebFetch` returns ISBN 9781836742166, 192 pp, 21 × 14 cm, hardcover, the publisher description, and the cover image — every core field in a single fetch. Author the description, download + crop the cover, emit the JSON. No LOC/WorldCat/distributor calls needed.

### Search-free lookup — run this *before* any `WebSearch`

`WebSearch` is capped at 200 calls per session, and that cap is what stalls long
cataloguing runs. `WebFetch`, `curl` and public JSON APIs are **not** capped. Search buys
*discovery* — learning which host holds the record; once you know the host you go straight
at it. So spend the search budget only on the one fact nothing else supplies (usually: who
published this), and never on facts the publisher's own page already lists.

In this repo the first three rungs are one command — run it before reaching for search:

```bash
node scripts/lookup-book.js "<author last> <full title>"   # or: --isbn 9784865872941
```

The moves, in order: **AbeBooks keyword search**
(`abebooks.com/servlet/SearchResults?kn=<author+full+title>`, whose HTML embeds a
schema.org `Book` record giving exact title, ISBN-13, publisher, binding and a cover URL —
the highest-yield first stop for anything that ever carried an ISBN) → OpenLibrary
`search.json` / `api/books?bibkeys=ISBN:…&jscmd=data` → the artist's own site (usually a
complete bibliography, and not behind a bot check) → the publisher's WordPress `wp-json`
or Shopify `search/suggest.json` → the publisher's index page grepped for the real
product slug. **Full playbook, with working commands and
the traps in each: `references/no-search.md`.** Read it the moment a search call is
refused — or before starting a batch of 20+ rows, where the cap is a certainty.

**Getty SRU belongs on this list too.** It is a keyless `curl` against a real art-library
catalogue, so it costs nothing from the search budget and often resolves an art title the
trade indexes miss. Full syntax in *Phase 1* below; the one-liner is
`curl -s "https://na01.alma.exlibrisgroup.com/view/sru/01GRI_INST?version=1.2&operation=searchRetrieve&recordSchema=marcxml&maximumRecords=5&query=alma.all_for_ui=%22<author>+<title>%22"`.

Two failure modes to hold in mind while doing this: AbeBooks **never returns empty**, so a
confident-looking set of unrelated books is what a true miss looks like — confirm title
*and* author before believing it. And a 0 from OpenLibrary means almost nothing for a
small-press art photobook.

If the publisher is still unknown after all of that, **stop and say the budget ran out**.
Record what is known and what is missing. Never guess a publisher, title or author.

### Deep sweep (opt-in — only per the escalation triggers above)

### Phase 1: Core Bibliographic Data

Query in parallel (respect rate limits):
1. **Getty Research Institute** — the strongest of the three for art books, and the one to
   try first. The GRI catalogues photobooks, exhibition catalogues and small-press artist
   books that LOC and WorldCat never picked up. Its public face, `https://primo.getty.edu`,
   is an un-fetchable SPA; query the catalogue itself through **Alma SRU, which needs no API
   key** and returns MARCXML to a plain `curl`:

   ```bash
   SRU="https://na01.alma.exlibrisgroup.com/view/sru/01GRI_INST?version=1.2&operation=searchRetrieve&recordSchema=marcxml&maximumRecords=5&query="
   curl -s "${SRU}alma.isbn=9783869309347"                   # exact record
   curl -s "${SRU}alma.creator=araki"                        # 104 records
   curl -s "${SRU}alma.title=%22sentimental+journey%22"      # 32 records
   curl -s "${SRU}alma.all_for_ui=%22guy+bourdin+untouched%22"  # author + title in one
   ```

   Indexes: `alma.isbn`, `alma.title`, `alma.creator`, `alma.all_for_ui` (keyword). **Join
   multi-word terms with `+` inside `%22…%22` quotes** — a bare multi-word term returns a
   `<diagnostics>` block, not results, and `%20` fails the same way.

   Extract: `020` (ISBN-13 and ISBN-10), `100`/`700` with `$e` relator terms (photographer,
   editor, designer — these fill `contributors`, `designer`, `editor`), `245$a/$b/$c`,
   `264` place/publisher/year, `300` pagination + illustration note + **height in cm**, and
   `650` LCSH subject headings, which become authoritative Tags. `001` is the MMS ID; the
   human-readable record is `https://primo.getty.edu/primo-explore/fulldisplay?docid=01GRI_ALMA<mmsid>&vid=GRI`.
2. **Library of Congress SRU API** (`lx2.loc.gov/sru`)
   - Use ISBN or title search
   - Extract: LC Control Number, MARC record, subject headings, classification
   - Subject headings become authoritative Tags
3. **WorldCat** (use public search at worldcat.org — no API key required)
   - Extract: OCLC number, contributor roles, alternate ISBNs, holdings count
   - Cross-check pagination and dimensions

**Be polite**: space out repeated fetches to the same host; if a site 403s or rate-limits, back off (see the *Publisher behind Cloudflare* gotcha) rather than hammering it.

### Phase 2: Publisher & Distributor Research

Search systematically (parallel where possible):
- **Publisher's official site**: try the constructed URL first; fall back to `WebSearch` `site:publishername.com "book title"`, then `WebFetch` the product page
  - Extract: official description, press release, exhibition dates, cover image URL, purchase link
  - Some art publishers/distributors (e.g. Printed Matter) return **403 to `WebFetch`** — fall back to `curl` with a browser `User-Agent`, or use the OpenLibrary cover API
- **DAP / Distributed Art Publishers** (`artbook.com`)
- **Twelvebooks** (`twelvebooks.com`)
- **IDEA Books** (`ideabooks.nl`)
- **Buchhandlung Walther König** (`buchhandlung-walther-koenig.de`)
- **Printed Matter** (`printedmatter.org`)
- **Mack Books** (`mackbooks.co.uk`)

For each distributor:
- Extract: product description, availability, pricing (DO NOT SAVE), contributor list, product URL
- Mark as available/unavailable

### Phase 3: Artist/Author Research

- Search artist's **official website**
- Check major gallery representation (Gagosian, Hauser & Wirth, Pace, David Zwirner, Skarstedt)
- Search museum collections (MoMA, Tate, Guggenheim, Metropolitan Museum)
- Extract: 2-3 sentence bio (paraphrased), birth year, nationality, gallery URL, museum collection URLs

**Key**: the artist's official site becomes `authors[0].url` (the page's main artist link — see Critical Rules); put the gallery and museum URLs in `artist_links`.

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

**Slug format**: `{artist_last}_{title-kebab}_{next_id}`. `next_id` is only a placeholder — **add-book assigns the real sequential ID at ingest**; don't rely on it and never pre-write an `id` into the JSON. A rough guess (`books.csv` highest id + 1) is fine.

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

See **`references/json-schema.md`** for the full annotated JSON example (a complete worked record). Fill every field a source provides; use `null` for the rest.

## Content Writing Guidelines

**Tone**: Authoritative, curatorial, informative. Write the way a museum wall label reads: neutral, precise, focused on what the work is and does, not on the reader's feelings. NO marketing language (avoid "stunning," "groundbreaking," "must-have").

**Descriptions** — `extended` is what ships as the book page's description (add-book maps `extended` into the CSV `description` column, falling back to `main`). Author it with care:
- `extended`: **The page description, ~800–1300 chars, curatorial voice, matching existing entries.** Author it as `<p>` paragraphs — never a single blob; HSL renders >500-char descriptions with `<p class="mt-6">` breaks — in three beats:
  1. **Top-line framing/review** (the first `<p>`) — a single sentence that frames the work: what it is and why it matters (e.g. "A layered work of appropriation by the New York conceptual artist Eric Doeringer (b. 1974)…"). It must stand alone — it also becomes the Recently-Added snippet (truncated to ~280 chars).
  2. **Summary** (a `<p class="mt-6">`) — what the book documents/contains, the artist's approach, exhibition or publication context, physical materials/design.
  3. **Artist + other-works context** (a `<p class="mt-6">`) — who the artist is and how this fits their body of work, when there is one. Don't bolt it on. Inline `<em>` for titles.
- `main`: 2–3 sentence summary. Fallback only, used if `extended` is absent.
- `artist_bio` / `exhibition_context`: raw material for beat 3 — significance, major works, representation, venue, career fit. Neither is a CSV column, so **fold their substance into `extended`** (paraphrase across sources).

**De-slop before you emit.** The description is published prose — run it through the
scanner and fix what fires *before* writing the JSON, while the sources are still in front
of you. Rewriting it later means re-researching the facts the tic was dressing up.

```bash
python3 ~/.claude/skills/de-slop/scripts/scan.py book_data_{slug}.json   # or paste the description into a file
```

Fix by saying the plain thing, not by rewording around the regex. The tics that actually
recur in catalogue copy are the **dash-appositive tail** ("…Steidl, 2019 — the artist's
first monograph"), **participle tails** ("…, underscoring his interest in…"),
**promotional boilerplate** ("boasts", "breathtaking", "hidden gem" — publisher blurbs are
full of it, and copying the publisher's page is how it gets in), **"not just X but Y"**,
and the **AI vocabulary** words (delve, tapestry, meticulous, interplay, vibrant). Curatorial
voice and de-slop pull the same direction: state what the work is, drop the flourish.

**Links**: Map every proper noun with authoritative URL to `artist_links` or `distributors` arrays.

## Critical Rules

- **Artist link = the official site.** `authors[0].url` becomes the page's `artist_url` — the main artist link shown on every book page — so it MUST be the artist's **own official website** whenever one exists (search for it if the publisher page doesn't link it; confirm it returns 200). A gallery or museum URL is NOT a substitute; those go in `artist_links`. Only fall back to a gallery/museum for `authors[0].url` when the artist genuinely has no official site.
- **Set explicit `last`/`first` on `authors[0]`.** The ingest uses them verbatim for the CSV sort keys, page slug, and cover filename; without them it falls back to a name-split heuristic that can't detect family-name-first order ("Sun Yanchu") or particles ("van der …"). Always supply both for the primary author (mononym: `last` only).
- **NEVER save price data** — pricing policy prohibits storing prices in any form
- **Tags in JSON are an array** — the add-book script converts to comma-separated for CSV export
- **Verify all URLs** — check that links return 200 before including
- **Back up books.csv** — before running add-book script

## Gotchas

- **`primo.getty.edu` cannot be scraped — use Alma SRU.** The site is classic Primo (the
  root redirects to `/primo-explore/search?vid=GRI`), an Angular SPA whose HTML carries no
  record data. Its REST endpoints 403 unauthenticated; a guest JWT does authenticate (HTTP
  200) but every `pnxs` query returns `total: 0` on every tab and scope, so that route is a
  dead end — don't rebuild it. And `/primo-explore/fulldisplay?docid=…` returns **200 for
  any docid, including a fabricated one**, so a status check never verifies a Getty record;
  verify against the SRU response instead. Working endpoint and query syntax: *Phase 1*.
- **No LOC/WorldCat record for new or small-press art books.** Common — most 2024–2026 titles and nonprofit-press artist books aren't cataloged yet. Symptom: SRU/search returns zero. Fix: try the Getty first — it holds art books the trade
  catalogues skip. If it misses too, leave `loc_data` null and list it in `unresolved_fields`; if you construct subject headings editorially, say so in `notes` — never present invented headings as LOC-sourced.
- **Subtitle is glued onto the title on ingest.** There is no subtitle column: the `add-book` `--json` ingest writes `title: subtitle` unless `title` already contains the subtitle string. So never put a series tag, edition, or a paraphrase of the title in `subtitle` — that lands in the display title ("Stickers: From Punk Rock…: From Punk Rock… (Stuck-Up…)", "Board: …: Expanded Edition" happened 2026-08-27). Put the full display title in `title` and leave `subtitle` null; edition text goes in `edition`.
- **Ingest-shape fields agents get wrong.** `research_log` must be an object `{"sources_checked": [...]}` (a string or bare array crashes the ingest on `.join`), and `authors[].name` must be set (it becomes `author_full_name`; blank otherwise). When briefing parallel research agents, point them at `references/json-schema.md` instead of paraphrasing the schema.
- **Publisher hero image ≠ front cover.** Publisher pages often lead with an interior spread or a hero crop. `Read` the downloaded image to confirm it is the actual front cover before setting `cover_image`.
- **A missing OpenLibrary cover returns HTTP 200.** `covers.openlibrary.org/b/isbn/{isbn}-L.jpg` serves a 43-byte 1×1 GIF when it has no cover. Always append `?default=false` — then it 404s when absent and 302s to the real image when present.
- **Series covers that differ only in colour.** When volumes share one design (Nocito's three *Pud* books: same die, different cloth and foil), filenames and alt text are unreliable. Match by `md5` against the images on each volume's *own* detail page before installing.
- **Guessed product slugs 404.** Don't build a publisher URL from the title — fetch the catalogue/index page and grep it for real hrefs. Akio Nagasawa's *Record No. 26* is `record-no-26`; *No. 34* is `record-no34`, no hyphen.
- **Angled product-shot cover.** Amazon/dealer covers are often shot at a 3/4 angle on white. Prefer a flat front cover; after download run `python3 scripts/auto-crop-covers.py --input <path> --overwrite` to trim, then verify by `Read`.
- **Eating the whole web.** If you are opening LOC + WorldCat + five distributors + museum sites for a routine title, stop — the publisher page had the core fields. Reserve the Deep Sweep for genuine gaps/conflicts.
- **Publisher or shop behind Cloudflare (403 to `WebFetch` *and* curl).** Some publishers gate the whole site with a Cloudflare CAPTCHA (e.g. Fondazione Prada's bookshop and main site). Fallbacks: (1) static assets often still load via `curl` — try `/wp-content/uploads/...` PDFs/images directly; (2) get the ISBN + cover from an accessible distributor instead — **ARTBOOK / D.A.P.** (`artbook.com/{isbn13}.html`), **IDEA Books** (`ideabooks.nl`, whose `/media/` CDN serves the cover image directly via `curl`), or the ISBN listing on Amazon. Always `Read` the sourced cover to confirm — a distributor's image can be a variant crop of the publisher's.

## Error Handling

Edge-case handling — no ISBN, gallery publisher, historical (pre-2010), emerging artist, conflicting sources, non-English — lives in **`references/edge-cases.md`**. Consult it when a title hits one of those.

Blocked or exhausted sources — `WebSearch` at 200/200, a `403`/`429`/Cloudflare host, a
dead publisher domain, an ambiguous edition — live in **`references/no-search.md`**.

## Handoff to Add-Book

research-asst stops at the JSON + cover. **`add-book` owns ingestion — do NOT run `add-book-from-text.js` yourself.** If both you and add-book ingest, the second run trips the ingest's duplicate guard — a scripted run aborts, and forcing past the prompt lands the book twice with two IDs (add-book's *Book added twice* gotcha). When invoked standalone, print the `book_data_{slug}.json` path and let the caller ingest:

```bash
node scripts/add-book-from-text.js --json book_data_{slug}.json --yes
```

That maps the JSON to CSV columns, downloads the cover, assigns the next sequential ID, and validates.

## Progress Updates

Keep it quiet: one short status line when you start, one summary when the JSON + cover are done — not a line per phase or per source.

**Batch adds (multiple books).** The `add-book` orchestrator may run several research passes as parallel background `Agent`s. Do NOT narrate each agent's completion as it lands — let them all finish, then report once. Per-agent play-by-play is noise.
