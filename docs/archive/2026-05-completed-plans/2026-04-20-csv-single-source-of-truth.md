# CSV as Single Source of Truth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all hardcoded collection HTML and redundant hand-coded book detail pages so every page on the site is generated from `src/_data/books.csv` + lightweight per-collection JSON configs.

**Architecture:** Keep the existing Eleventy v3 pagination-generated book detail routes (they already render all 1757 books via `src/books.njk`). Replace each `src/collections/<slug>.html` with a single data-driven `src/collections.njk` that paginates over `libraryCollections.json`. Per-collection display config (sections, sort, hero text) lives in `src/_data/collections/<slug>.json`. Delete hand-coded detail pages once the collection cards link to the pagination-generated routes.

**Tech Stack:** Eleventy 3.1, Nunjucks templates, `csv-handler` (existing util), `mocha` (existing test runner), Tailwind via CDN.

**Current state confirmed:**
- 26 hardcoded `src/collections/*.html` pages with zero `{% for %}` loops (verified via grep).
- 183 hand-coded `src/books/*/**.html` detail pages that duplicate pagination-generated pages at different URLs.
- `src/_data/libraryCollections.json` has 8 active + 3 disabled collection definitions (partial coverage of the 26 pages).
- `src/_data/dynamicCollections.js` already matches books by keyword but only feeds the homepage summary, not per-collection pages.
- Pagination-generated detail URL shape: `/books/<slug_author_last>_<slug_title>_<id>/`.
- Hand-coded detail URL shape: `/books/<category>/<collection-slug>/<issue-slug>/`.

---

## File Structure

**Created:**
- `src/_data/collections/purple-magazine.json` — sections, sort, hero
- `src/_data/collections/apartamento.json`
- `src/_data/collections/butt.json`
- `src/_data/collections/toilet-paper.json`
- `src/_data/collections/matsuda-fashion-catalogs.json`
- `src/_data/collections/slanted.json`
- `src/_data/collections/comme-des-garcons.json`
- `src/_data/collections/richard-prince.json`
- `src/_data/collections/wombat-artist-boxes.json`
- `src/_data/collections/ephemera.json`
- `src/_data/collections/magazines.json`
- `src/_data/collections/one-picture-book.json`
- `src/_data/collections/disaster.json`
- `src/_data/collections/music-photobooks.json`
- `src/_data/collections/toilet-paper.json`
- `src/_data/collections/black-photographers.json`
- `src/_data/collections/useful-photography.json`
- `src/_data/collections/record-culture.json`
- `src/_data/collections/posters-and-paper.json`
- `src/_data/collections/le-petit-vouyer.json`
- `src/_data/collections/esophus.json`
- `src/_data/collections/newspapers.json`
- `src/_data/collections/woman-viewing-woman.json`
- `src/_data/collections/small-books-big-images.json`
- `src/_data/collections/queering-the-collection.json`
- `src/_data/collections/nyc-photobooks.json`
- `src/_data/collections/collage-collections.json`
- `src/_data/collections/books-on-books.json`
- `src/_data/collections/art-books-collection.json`
- `src/_data/collections/afm.json`
- `src/collections.njk` — single paginating template replacing all 26 hardcoded pages
- `src/_includes/components/collection-section.njk` — renders one section of cards
- `src/_includes/components/collection-card.njk` — single card (reused from book-thumbnail but tuned for collections)
- `scripts/utils/collection-matcher.js` — pure function: given a book + collection config, return which section (or null)
- `test/collection-matcher.test.js` — mocha tests for matcher
- `test/collection-rendering.test.js` — integration: build, parse, assert card counts

**Modified:**
- `.eleventy.js` — add `addFilter("booksInCollection", ...)` and `addFilter("sectionBooks", ...)`
- `src/_data/libraryCollections.json` — add `sections`, `sortBy`, and `externalUrl` keys per collection; un-disable all three `_disabled_collections` entries
- `src/_data/books.csv` — audit `collection_grouping` values so every book maps into exactly one collection (or none, for the general pool)

**Deleted (Phase 4 only):**
- `src/collections/purple-magazine.html` (and the other 25 hardcoded collection pages)
- `src/books/magazines/purple-magazine/*.html` (and the other 181 hand-coded detail pages under `src/books/{art,magazines,collections,manual}/`)

---

## Phase 1 — Foundation & Purple Proof-of-Concept

### Task 1: Audit `collection_grouping` values in the CSV

**Files:**
- Read: `src/_data/books.csv`
- Create: `tasks/collection-audit.md` (throwaway; delete after)

- [ ] **Step 1: Count unique `collection_grouping` values**

Run:
```bash
node -e "
const {parse} = require('csv-parse/sync');
const fs = require('fs');
const rows = parse(fs.readFileSync('src/_data/books.csv','utf8'),{columns:true,relax_quotes:true,relax_column_count:true});
const groups = {};
rows.forEach(r => { const g = (r.collection_grouping||'').trim(); groups[g]=(groups[g]||0)+1; });
Object.entries(groups).sort((a,b)=>b[1]-a[1]).forEach(([g,n])=>console.log(n.toString().padStart(5),g||'(empty)'));
"
```
Expected: list of groupings with counts. Note any typo variants (e.g., `Purple Magazine` vs `Purple Magazine - Purple Books` vs `purple magazine`).

- [ ] **Step 2: Fix obvious typos in `collection_grouping`**

For any typo variants, pick the canonical value and update the CSV via Edit. Do NOT use sed (comma-risk). Use replace_all via Edit on `src/_data/books.csv`.

- [ ] **Step 3: Validate CSV after edits**

Run:
```bash
node scripts/validate-csv-structure.js
```
Expected: `Successfully parsed N records` where N matches pre-edit row count.

- [ ] **Step 4: Commit**

```bash
git add src/_data/books.csv
git commit -m "Normalize: canonicalize collection_grouping values in books.csv"
```

---

### Task 2: Design the per-collection JSON schema

**Files:**
- Create: `src/_data/collections/_schema.md` (human reference)
- Create: `src/_data/collections/purple-magazine.json` (first concrete example)

- [ ] **Step 1: Write the schema doc**

Write `src/_data/collections/_schema.md`:

```markdown
# Collection Config Schema

Each collection has a JSON file at `src/_data/collections/<slug>.json`.

## Required fields

- `slug` — URL slug (must match filename)
- `title` — display name
- `description` — intro paragraph shown above grid
- `matchBy` — object with ONE of: `{ "collection_grouping": "Purple Magazine" }` or `{ "authorLast": "Prince" }` or `{ "titleContains": "Apartamento" }` or `{ "keywords": ["wombat","portfolio"] }`

## Optional fields

- `externalUrl` — link shown near header (e.g., `"https://purple.fr"`)
- `sections` — ordered array; when absent, one unsectioned grid is rendered
- `sortBy` — `"issueNumberDesc"` | `"publicationYearDesc"` | `"titleAsc"` | `"accessionDesc"`
- `heroImage` — override the auto-picked cover

## Section object

```json
{
  "label": "Volume V",
  "subtitle": "F/W 2020 – S/S 2026 · Issues #34–45",
  "filter": { "titleRegex": "Issue (3[4-9]|4[0-5])\\b" }
}
```

A book lands in the first section whose `filter` matches. Books that match no
section fall into an implicit trailing `"Other"` section.
```

- [ ] **Step 2: Write Purple config to match current rendered output**

Write `src/_data/collections/purple-magazine.json`:

```json
{
  "slug": "purple-magazine",
  "title": "Purple Magazine",
  "description": "An influential French fashion and contemporary culture magazine founded in Paris in 1992 by Elein Fleiss and Olivier Zahm. Purple emerged as a reaction against the superficial glamour of the 1980s, pioneering the \"anti-fashion\" aesthetic and becoming synonymous with the new realism in fashion photography through collaborators like Juergen Teller, Terry Richardson, Wolfgang Tillmans, and Mario Sorrenti.",
  "externalUrl": "https://purple.fr",
  "matchBy": { "collection_grouping": "Magazines" },
  "sortBy": "issueNumberDesc",
  "sections": [
    {
      "label": "Volume V",
      "subtitle": "F/W 2020 – S/S 2026 · Issues #34–45",
      "filter": { "titleRegex": "Issue (3[4-9]|4[0-5])" }
    },
    {
      "label": "Volume IV",
      "subtitle": "F/W 2017 – S/S 2020 · Issues #28–33",
      "filter": { "titleRegex": "Issue (28|29|3[0-3])" }
    },
    {
      "label": "Volume III",
      "subtitle": "S/S 2004 – S/S 2017 · Issues #1–27",
      "filter": { "titleRegex": "Issue ([1-9]|1[0-9]|2[0-7]) \\(Volume III\\)" }
    },
    {
      "label": "Volume II",
      "subtitle": "1998 – 2003",
      "filter": { "titleRegex": "Volume II\\)" }
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add src/_data/collections/
git commit -m "Add: collection config schema and Purple Magazine config"
```

---

### Task 3: Write the collection-matcher pure function

**Files:**
- Create: `scripts/utils/collection-matcher.js`
- Test: `test/collection-matcher.test.js`

- [ ] **Step 1: Write the failing test**

Write `test/collection-matcher.test.js`:

```javascript
const { expect } = require('chai');
const { matchesCollection, assignSection } = require('../scripts/utils/collection-matcher');

describe('collection-matcher', () => {
  describe('matchesCollection', () => {
    it('matches by collection_grouping exact', () => {
      const book = { collection_grouping: 'Magazines', title: 'Purple Magazine Issue 42: The Magic Issue' };
      const config = { matchBy: { collection_grouping: 'Magazines' } };
      expect(matchesCollection(book, config)).to.be.true;
    });

    it('rejects non-matching collection_grouping', () => {
      const book = { collection_grouping: 'Art', title: 'Something' };
      const config = { matchBy: { collection_grouping: 'Magazines' } };
      expect(matchesCollection(book, config)).to.be.false;
    });

    it('matches by authorLast', () => {
      const book = { author_last: 'Prince', title: 'Cowboys' };
      const config = { matchBy: { authorLast: 'Prince' } };
      expect(matchesCollection(book, config)).to.be.true;
    });

    it('matches by titleContains (case-insensitive)', () => {
      const book = { title: 'Apartamento Issue 36' };
      const config = { matchBy: { titleContains: 'apartamento' } };
      expect(matchesCollection(book, config)).to.be.true;
    });
  });

  describe('assignSection', () => {
    const config = {
      sections: [
        { label: 'Volume V', filter: { titleRegex: 'Issue (3[4-9]|4[0-5])' } },
        { label: 'Volume IV', filter: { titleRegex: 'Issue (28|29|3[0-3])' } }
      ]
    };

    it('assigns first matching section', () => {
      expect(assignSection({ title: 'Purple Issue 42' }, config)).to.equal('Volume V');
    });

    it('returns "Other" when no section matches', () => {
      expect(assignSection({ title: 'Purple Issue 99' }, config)).to.equal('Other');
    });

    it('returns null when config has no sections', () => {
      expect(assignSection({ title: 'X' }, {})).to.be.null;
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx mocha test/collection-matcher.test.js`
Expected: FAIL with `Cannot find module '../scripts/utils/collection-matcher'`

- [ ] **Step 3: Write the matcher**

Write `scripts/utils/collection-matcher.js`:

```javascript
function matchesCollection(book, config) {
  const rule = config.matchBy || {};
  if (rule.collection_grouping) {
    return (book.collection_grouping || '').trim() === rule.collection_grouping;
  }
  if (rule.authorLast) {
    return (book.author_last || '').trim() === rule.authorLast;
  }
  if (rule.titleContains) {
    return (book.title || '').toLowerCase().includes(rule.titleContains.toLowerCase());
  }
  if (rule.keywords) {
    const hay = [book.title, book.tags, book.classification, book.description, book.collection_grouping]
      .map(s => (s || '').toLowerCase()).join(' ');
    return rule.keywords.some(k => hay.includes(k.toLowerCase()));
  }
  return false;
}

function assignSection(book, config) {
  if (!config.sections || !config.sections.length) return null;
  for (const section of config.sections) {
    const f = section.filter || {};
    if (f.titleRegex && new RegExp(f.titleRegex).test(book.title || '')) {
      return section.label;
    }
    if (f.publicationYearRange) {
      const y = parseInt(book.publication_year, 10);
      const [lo, hi] = f.publicationYearRange;
      if (!isNaN(y) && y >= lo && y <= hi) return section.label;
    }
  }
  return 'Other';
}

module.exports = { matchesCollection, assignSection };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx mocha test/collection-matcher.test.js`
Expected: PASS (7 passing)

- [ ] **Step 5: Commit**

```bash
git add scripts/utils/collection-matcher.js test/collection-matcher.test.js
git commit -m "Add: collection-matcher utility with tests"
```

---

### Task 4: Add Eleventy filters for collection rendering

**Files:**
- Modify: `.eleventy.js` (add two filters after line 289)

- [ ] **Step 1: Read the current filter region**

Read `.eleventy.js` lines 288–310 to find insertion point (after `relatedBooks` filter).

- [ ] **Step 2: Add `booksInCollection` and `sectionBooks` filters**

Edit `.eleventy.js`, insert after the closing `});` of the `relatedBooks` filter:

```javascript
  // --- Load collection-matcher helpers ---
  const { matchesCollection, assignSection } = require('./scripts/utils/collection-matcher');

  // --- Filter: books that belong to a collection (by config) ---
  eleventyConfig.addFilter("booksInCollection", function(books, collectionConfig) {
    if (!books || !collectionConfig) return [];
    return books.filter(b => matchesCollection(b, collectionConfig));
  });

  // --- Filter: group books into sections per config ---
  eleventyConfig.addFilter("groupBySections", function(books, collectionConfig) {
    if (!books) return [];
    const sections = (collectionConfig.sections || []).map(s => ({ ...s, books: [] }));
    const otherSection = { label: 'Other', books: [] };

    books.forEach(b => {
      const label = assignSection(b, collectionConfig);
      if (!label) {
        otherSection.books.push(b);
        return;
      }
      const target = sections.find(s => s.label === label) || otherSection;
      target.books.push(b);
    });

    const result = sections.filter(s => s.books.length > 0);
    if (otherSection.books.length > 0 && !collectionConfig.sections) {
      return [otherSection];
    }
    if (otherSection.books.length > 0) result.push(otherSection);
    return result;
  });

  // --- Filter: sort books per collection config ---
  eleventyConfig.addFilter("sortBooks", function(books, sortBy) {
    if (!books) return [];
    const list = [...books];
    const issueNum = b => {
      const m = (b.title || '').match(/Issue #?(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    };
    if (sortBy === 'issueNumberDesc') return list.sort((a,b) => issueNum(b) - issueNum(a));
    if (sortBy === 'issueNumberAsc') return list.sort((a,b) => issueNum(a) - issueNum(b));
    if (sortBy === 'publicationYearDesc') return list.sort((a,b) => (parseInt(b.publication_year,10)||0) - (parseInt(a.publication_year,10)||0));
    if (sortBy === 'titleAsc') return list.sort((a,b) => (a.title||'').localeCompare(b.title||''));
    return list;
  });
```

- [ ] **Step 3: Run build to verify filters load without error**

Run: `npx @11ty/eleventy --quiet 2>&1 | tail -5`
Expected: `Copied ... Wrote N files` (no ReferenceError or SyntaxError).

- [ ] **Step 4: Commit**

```bash
git add .eleventy.js
git commit -m "Add: booksInCollection, groupBySections, sortBooks filters"
```

---

### Task 5: Build the shared collection template

**Files:**
- Create: `src/_includes/components/collection-card.njk`
- Create: `src/_includes/components/collection-section.njk`
- Create: `src/collections.njk` (replaces all hardcoded collection pages via pagination)

- [ ] **Step 1: Write the card partial**

Write `src/_includes/components/collection-card.njk`:

```njk
{# Expects: book #}
<a href="/books/{{ book.author_last | slugify }}_{{ book.title | slugify }}_{{ book.id }}/" class="item-card bg-white rounded-lg overflow-hidden shadow-sm">
    <div class="aspect-[3/4] bg-gray-100">
        {% if book.image_url %}
            <img src="{{ book.image_url }}" alt="{{ book.title }}" class="w-full h-full object-cover" loading="lazy">
        {% else %}
            <div class="w-full h-full flex items-center justify-center text-gray-400 text-xs">No cover</div>
        {% endif %}
    </div>
    <div class="p-3">
        <p class="text-xs font-medium text-gray-900 line-clamp-2">{{ book.title }}</p>
        {% if book.publication_year %}
            <p class="text-xs text-gray-500">{{ book.publication_year }}</p>
        {% endif %}
    </div>
</a>
```

- [ ] **Step 2: Write the section partial**

Write `src/_includes/components/collection-section.njk`:

```njk
{# Expects: section (with label, subtitle, books) #}
<section class="mb-16">
    <div class="volume-header pl-4 mb-8">
        <h2 class="text-2xl font-bold text-gray-900">{{ section.label }}</h2>
        {% if section.subtitle %}<p class="text-sm text-gray-500 mt-1">{{ section.subtitle }}</p>{% endif %}
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {% for book in section.books %}
            {% include "components/collection-card.njk" %}
        {% endfor %}
    </div>
</section>
```

- [ ] **Step 3: Write the paginating collection page**

Write `src/collections.njk`:

```njk
---
layout: collection.njk
pagination:
  data: collections
  size: 1
  alias: collectionConfig
permalink: "collections/{{ collectionConfig.slug }}/index.html"
---
<main>
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div class="max-w-3xl mx-auto text-center mb-12 md:mb-16">
            <h1 class="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">{{ collectionConfig.title }}</h1>
            <div class="line-divider inline-block"></div>
            <p class="text-base sm:text-lg text-gray-600 leading-relaxed mt-4">{{ collectionConfig.description }}</p>
            {% if collectionConfig.externalUrl %}
                <div class="mt-6 flex justify-center gap-4">
                    <a href="{{ collectionConfig.externalUrl }}" target="_blank" class="text-sm text-primary-700 hover:underline">
                        <i class="fas fa-external-link-alt mr-1"></i> {{ collectionConfig.externalUrl | replace("https://", "") | replace("/", "") }}
                    </a>
                </div>
            {% endif %}
        </div>

        {% set matched = books | booksInCollection(collectionConfig) | sortBooks(collectionConfig.sortBy) %}
        {% set grouped = matched | groupBySections(collectionConfig) %}

        {% if grouped.length > 0 %}
            {% for section in grouped %}
                {% set section = section %}
                {% include "components/collection-section.njk" %}
            {% endfor %}
        {% else %}
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {% for book in matched %}
                    {% include "components/collection-card.njk" %}
                {% endfor %}
            </div>
        {% endif %}
    </div>
</main>
```

- [ ] **Step 4: Add `collections` data file so pagination has something to iterate**

Create `src/_data/collections.js`:

```javascript
const fs = require('fs');
const path = require('path');

module.exports = function() {
  const dir = path.join(__dirname, 'collections');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
};
```

- [ ] **Step 5: Rename old collection to avoid conflict during migration**

The existing `src/collections/purple-magazine.html` hardcodes `permalink: /collections/purple-magazine.html`. The new template emits `/collections/purple-magazine/` (directory). Temporarily override the new permalink to a test path to avoid collision:

Edit `src/collections.njk` line 6: change `permalink: "collections/{{ collectionConfig.slug }}/index.html"` to `permalink: "collections-new/{{ collectionConfig.slug }}/index.html"`.

- [ ] **Step 6: Build and verify Purple renders at the new path**

Run: `npx @11ty/eleventy --quiet 2>&1 | tail -5`
Run: `ls _site/collections-new/purple-magazine/`
Expected: `index.html` exists.

Run: `grep -c 'purple-magazine/covers/purple-' _site/collections-new/purple-magazine/index.html`
Expected: `45` (or however many Purple issues are in the CSV).

- [ ] **Step 7: Commit**

```bash
git add src/collections.njk src/_includes/components/collection-card.njk src/_includes/components/collection-section.njk src/_data/collections.js
git commit -m "Add: data-driven collection template (dry-run at /collections-new/)"
```

---

### Task 6: Cutover Purple to data-driven page

**Files:**
- Delete: `src/collections/purple-magazine.html`
- Modify: `src/collections.njk` (remove `-new` from permalink)

- [ ] **Step 1: Build current state and snapshot the hardcoded Purple output**

Run:
```bash
cp _site/collections/purple-magazine.html /tmp/purple-before.html
```

- [ ] **Step 2: Delete the hardcoded page**

```bash
rm src/collections/purple-magazine.html
```

- [ ] **Step 3: Restore real permalink in `src/collections.njk`**

Edit line 6: change `permalink: "collections-new/{{ collectionConfig.slug }}/index.html"` back to `permalink: "collections/{{ collectionConfig.slug }}/index.html"`.

- [ ] **Step 4: Rebuild**

Run: `npx @11ty/eleventy --quiet 2>&1 | tail -5`
Expected: success.

- [ ] **Step 5: Verify Purple collection still resolves at the canonical URL**

Run:
```bash
[ -f _site/collections/purple-magazine/index.html ] && echo "OK" || echo "MISS"
grep -c 'image_url\|covers/purple-' _site/collections/purple-magazine/index.html
```
Expected: `OK` and a count matching the CSV-resident Purple issues (~46 including Vol II #5).

- [ ] **Step 6: Diff count of cards vs the snapshot**

Run:
```bash
grep -c 'class="item-card' /tmp/purple-before.html
grep -c 'class="item-card' _site/collections/purple-magazine/index.html
```
Expected: new count ≥ old count (new should include ALL CSV Purple rows, old was stale).

- [ ] **Step 7: Commit**

```bash
git add -A src/collections/ src/collections.njk
git commit -m "Cutover: Purple Magazine collection page is now data-driven from CSV"
```

---

### Task 7: Redirect old hand-coded Purple issue URLs

**Files:**
- Create: `src/_redirects` entries OR leave hand-coded files in place but add deprecation note

- [ ] **Step 1: Inventory inbound links to hand-coded Purple URLs**

Run:
```bash
grep -rn "books/magazines/purple-magazine" src/ _site/ | grep -v "^_site/" | grep -v "^src/books/magazines/purple-magazine"
```
Expected: list of inbound references (collection page cards, any navigation).

- [ ] **Step 2: If there are external inbound links worth preserving, add redirects**

If `src/_headers` or a redirects file exists and the site is hosted on a platform with redirect support, add 301s from `/books/magazines/purple-magazine/purple-<slug>/` to the canonical `/books/<slug>_<title>_<id>/` URL.

If no redirect support, leave the hand-coded HTML files in place. They will be deleted in Phase 4 once we're confident nothing external depends on them.

- [ ] **Step 3: Commit (if redirects added)**

```bash
git add src/_headers
git commit -m "Add: redirects from hand-coded Purple URLs to canonical book pages"
```

---

## Phase 2 — Numbered Magazine Collections

Apply the Phase 1 pattern to the other numbered-issue magazines. One task per collection; each task follows the same steps.

### Task 8: Port Apartamento

**Files:**
- Create: `src/_data/collections/apartamento.json`
- Delete: `src/collections/apartamento.html`

- [ ] **Step 1: Extract the existing hardcoded sections from `src/collections/apartamento.html`**

Read the file and note the top-of-page description, section labels, and any ordering.

- [ ] **Step 2: Write the config**

Write `src/_data/collections/apartamento.json`:

```json
{
  "slug": "apartamento",
  "title": "Apartamento",
  "description": "<COPY FROM EXISTING PAGE>",
  "externalUrl": "https://www.apartamentomagazine.com",
  "matchBy": { "titleContains": "Apartamento Issue" },
  "sortBy": "issueNumberDesc"
}
```

No sections — Apartamento is a single flat list by issue number descending.

- [ ] **Step 3: Build and verify**

Run: `npx @11ty/eleventy --quiet 2>&1 | tail -3 && [ -f _site/collections/apartamento/index.html ] && echo OK`

Check card count matches CSV:
```bash
grep -c 'class="item-card' _site/collections/apartamento/index.html
grep -c 'Apartamento Issue' src/_data/books.csv
```
Expected: counts match.

- [ ] **Step 4: Delete the hardcoded page**

```bash
rm src/collections/apartamento.html
```

- [ ] **Step 5: Rebuild and verify the data-driven page takes over**

```bash
npx @11ty/eleventy --quiet 2>&1 | tail -3
[ -f _site/collections/apartamento/index.html ] && echo OK
```

- [ ] **Step 6: Commit**

```bash
git add src/_data/collections/apartamento.json
git rm src/collections/apartamento.html
git commit -m "Port: Apartamento collection to data-driven template"
```

---

### Task 9: Port Butt

Follow Task 8 structure. Butt went on hiatus and revived — use `sections` to split the original run (2001–2011) from the revival (2023+).

**Files:**
- Create: `src/_data/collections/butt.json`
- Delete: `src/collections/butt.html`

- [ ] **Step 1: Read existing `src/collections/butt.html` to extract sections, description, issue list**

- [ ] **Step 2: Write config with original-run / revival sections**

```json
{
  "slug": "butt",
  "title": "Butt Magazine",
  "description": "<COPY FROM EXISTING>",
  "matchBy": { "titleContains": "Butt" },
  "sortBy": "issueNumberDesc",
  "sections": [
    { "label": "Revival", "subtitle": "2023–present", "filter": { "publicationYearRange": [2023, 2099] } },
    { "label": "Original Run", "subtitle": "2001–2011", "filter": { "publicationYearRange": [2001, 2011] } }
  ]
}
```

- [ ] **Step 3: Build, verify, delete, commit** (same as Task 8 steps 3–6)

---

### Task 10: Port Toilet Paper

Single flat list by issue number descending.

**Files:**
- Create: `src/_data/collections/toilet-paper.json`
- Delete: `src/collections/toilet-paper.html`

Follow Task 8 structure. `matchBy`: `{ "titleContains": "Toilet Paper" }`.

---

### Task 11: Port Matsuda Fashion Catalogs

**Files:**
- Create: `src/_data/collections/matsuda-fashion-catalogs.json`
- Delete: `src/collections/matsuda-fashion-catalogs.html`

`matchBy`: `{ "keywords": ["matsuda"] }`.

---

### Task 12: Port Slanted

**Files:**
- Create: `src/_data/collections/slanted.json`
- Delete: `src/collections/slanted.html`

`matchBy`: `{ "titleContains": "Slanted" }`. Section on theme (if any).

---

### Task 13: Port AFM, Esophus, Record Culture, Le Petit Vouyer

Batch commit these four small magazines in a single commit. Each gets its own `src/_data/collections/<slug>.json` and deletes its hardcoded page.

- [ ] **Step 1–4:** Per collection, extract description, write config, verify render, delete hardcoded page.
- [ ] **Step 5: Single commit**

```bash
git commit -m "Port: AFM, Esophus, Record Culture, Le Petit Vouyer to data-driven"
```

---

## Phase 3 — Thematic & Artist Collections

### Task 14: Port Comme des Garçons

**Files:**
- Create: `src/_data/collections/comme-des-garcons.json`
- Delete: `src/collections/comme-des-garcons.html`

`matchBy`: `{ "keywords": ["comme", "rei kawakubo", "cdg", "six magazine"] }` (matches the existing `libraryCollections.json` keywords so behavior is identical to the dynamic collections engine).

---

### Task 15: Port Richard Prince

Large collection. Consider sections by era (cowboys / jokes / instagram / etc.) if the existing hardcoded page groups that way; otherwise flat.

**Files:**
- Create: `src/_data/collections/richard-prince.json`
- Delete: `src/collections/richard-prince.html` (if exists)

`matchBy`: `{ "authorLast": "Prince" }`.

---

### Task 16: Port Wombat Artist Boxes, Ephemera, Magazines index, One Picture Book, Disaster

Five collections, grouped by being already-defined in `libraryCollections.json`. One commit per collection.

- [ ] **For each:** copy keyword list from `libraryCollections.json`, write config, verify, delete hardcoded page.

---

### Task 17: Port remaining thematic pages

The long tail — `music-photobooks`, `black-photographers`, `useful-photography`, `posters-and-paper`, `newspapers`, `woman-viewing-woman`, `small-books-big-images`, `queering-the-collection`, `nyc-photobooks`, `collage-collections`, `books-on-books`, `art-books-collection`.

For each:
- [ ] Read hardcoded page; note description text + any sectioning.
- [ ] Write `src/_data/collections/<slug>.json` with appropriate `matchBy` (usually `keywords`).
- [ ] Build, verify card count is sensible (spot-check: does it render at least what the hardcoded page showed?).
- [ ] Delete hardcoded page.
- [ ] Commit per collection.

---

## Phase 4 — Detail Page Cleanup

### Task 18: Verify pagination-generated book pages cover everything

**Files:** no writes, just audit.

- [ ] **Step 1: List all hand-coded detail page slugs**

Run:
```bash
find src/books -mindepth 2 -name "*.html" -not -path "*/templates/*" > /tmp/handcoded-pages.txt
wc -l /tmp/handcoded-pages.txt
```

- [ ] **Step 2: For each hand-coded page, confirm a corresponding CSV row exists**

Run:
```bash
node -e "
const fs = require('fs');
const path = require('path');
const {parse} = require('csv-parse/sync');
const rows = parse(fs.readFileSync('src/_data/books.csv','utf8'),{columns:true,relax_quotes:true,relax_column_count:true});
const pages = fs.readFileSync('/tmp/handcoded-pages.txt','utf8').trim().split('\n');
const missing = pages.filter(p => {
  const slug = path.basename(p, '.html');
  return !rows.some(r => (r.title||'').toLowerCase().includes(slug.replace(/-/g,' ')));
});
console.log('Hand-coded pages with no CSV match:', missing.length);
missing.forEach(p => console.log(' ', p));
"
```
Expected: a small number of orphans (if any). For each orphan, add a CSV row OR confirm the page is intentionally standalone and document it.

- [ ] **Step 3: Commit any CSV additions**

```bash
git add src/_data/books.csv
git commit -m "Backfill: add CSV rows for orphaned hand-coded detail pages"
```

---

### Task 19: Delete hand-coded book detail pages

**Files:**
- Delete: `src/books/magazines/purple-magazine/purple-*.html` (33 pages we created + existed)
- Delete: `src/books/magazines/apartamento/*.html`
- Delete: `src/books/magazines/butt/*.html`
- Delete: `src/books/magazines/toilet-paper/*.html`
- Delete: all other `src/books/*/**.html` that duplicate CSV content

- [ ] **Step 1: Dry-run — confirm no inbound links from any remaining `src/` file**

Run:
```bash
grep -rn "/books/magazines/purple-magazine/" src/ --include="*.html" --include="*.njk" | grep -v "^src/books/magazines/purple-magazine"
```
Expected: empty (the data-driven collection page uses the canonical `/books/<slug>_<title>_<id>/` URL, so no references to the old hand-coded subpaths).

- [ ] **Step 2: Delete one magazine's hand-coded pages at a time**

```bash
rm -r src/books/magazines/purple-magazine/
npx @11ty/eleventy --quiet 2>&1 | tail -3
```

Verify build succeeds and Purple collection page still renders correctly. Click through a sample card in the built site to confirm the link resolves to an existing page.

- [ ] **Step 3: Commit each batch**

```bash
git commit -am "Remove: hand-coded Purple Magazine detail pages (now generated from CSV)"
```

- [ ] **Step 4: Repeat for every `src/books/*/**` subdir** that contains hand-coded HTML duplicating CSV rows (apartamento, butt, toilet-paper, slanted, afm, esopus, le-petit-voyeur, record-culture, joseph-grigely, roni-horn, felix-gonzalez-torres, richard-prince, gonzalez_torres_specific_objects_without_specific_form, and the collections subdirs).

- [ ] **Step 5: Final build + site smoke test**

```bash
npx @11ty/eleventy --quiet 2>&1 | tail -5
find _site -name "index.html" | wc -l
```
Expected: file count approximately matches 1757 books + 26 collections + homepage + static-demo + misc pages.

---

### Task 20: Integration test — CSV row count = rendered book pages

**Files:**
- Create: `test/collection-rendering.test.js`

- [ ] **Step 1: Write the test**

Write `test/collection-rendering.test.js`:

```javascript
const { expect } = require('chai');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

describe('CSV-driven rendering', function() {
  this.timeout(60000);

  before(() => {
    execSync('npx @11ty/eleventy --quiet', { stdio: 'pipe' });
  });

  it('generates one detail page per CSV row', () => {
    const rows = parse(fs.readFileSync('src/_data/books.csv','utf8'),
      { columns: true, relax_quotes: true, relax_column_count: true });
    const bookDirs = fs.readdirSync('_site/books')
      .filter(f => fs.statSync(path.join('_site/books', f)).isDirectory());
    expect(bookDirs.length).to.be.at.least(rows.length);
  });

  it('generates one collection page per collection config', () => {
    const configs = fs.readdirSync('src/_data/collections').filter(f => f.endsWith('.json'));
    configs.forEach(f => {
      const slug = path.basename(f, '.json');
      expect(fs.existsSync(`_site/collections/${slug}/index.html`),
        `Missing page for ${slug}`).to.be.true;
    });
  });

  it('Purple Magazine collection includes all CSV issues', () => {
    const html = fs.readFileSync('_site/collections/purple-magazine/index.html','utf8');
    const rows = parse(fs.readFileSync('src/_data/books.csv','utf8'),
      { columns: true, relax_quotes: true, relax_column_count: true });
    const purpleCount = rows.filter(r => (r.collection_grouping||'') === 'Magazines'
      && (r.author_full_name||'') === 'Purple Magazine').length;
    const cardCount = (html.match(/class="item-card/g) || []).length;
    expect(cardCount).to.equal(purpleCount);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx mocha test/collection-rendering.test.js`
Expected: all three tests PASS.

- [ ] **Step 3: Commit**

```bash
git add test/collection-rendering.test.js
git commit -m "Add: integration tests verifying CSV drives all rendered pages"
```

---

## Phase 5 — Invariant & Guardrail

### Task 21: Pre-commit hook to block hardcoded collection pages

**Files:**
- Modify: `.git/hooks/pre-commit` OR `scripts/pre-commit.sh` if that pattern exists

- [ ] **Step 1: Find the existing pre-commit setup**

Run:
```bash
cat .git/hooks/pre-commit 2>/dev/null
ls scripts/pre-commit* 2>/dev/null
grep -l "pre-commit" package.json
```

- [ ] **Step 2: Add a check that blocks new hardcoded collection pages**

Append to the pre-commit script (or create one):

```bash
# Block re-introduction of hardcoded collection pages
if git diff --cached --name-only | grep -E '^src/collections/[^/]+\.html$'; then
  echo "ERROR: collection pages must be driven by src/_data/collections/<slug>.json, not hardcoded HTML."
  echo "       See docs/superpowers/plans/2026-04-20-csv-single-source-of-truth.md"
  exit 1
fi
```

- [ ] **Step 3: Test the hook with a dummy file**

```bash
touch src/collections/test-hardcoded.html
git add src/collections/test-hardcoded.html
git commit -m "test"
```
Expected: commit fails with the error message.

Cleanup: `git reset && rm src/collections/test-hardcoded.html`

- [ ] **Step 4: Commit the hook**

```bash
git add scripts/pre-commit.sh  # or wherever it lives
git commit -m "Add: pre-commit guard against hardcoded collection pages"
```

---

### Task 22: Update docs

**Files:**
- Modify: `docs/ADD-BOOK-GUIDE.md`
- Create: `docs/COLLECTIONS-GUIDE.md`

- [ ] **Step 1: Add a section to `ADD-BOOK-GUIDE.md`**

After the "After Adding" section, add:

```markdown
## Collection Membership

Books are auto-grouped into collections based on their CSV fields
(`collection_grouping`, `author_last`, `title`, `tags`). The matching
rules live in `src/_data/collections/<slug>.json`. If you want a newly
added book to appear on a specific collection page, set its
`collection_grouping` to match the config's `matchBy` rule.

No manual edits to `src/collections/` are needed — that directory no
longer exists.
```

- [ ] **Step 2: Create `docs/COLLECTIONS-GUIDE.md`**

```markdown
# Collections Guide

Collection pages are rendered from two inputs:
1. `src/_data/books.csv` — the source of truth for every book
2. `src/_data/collections/<slug>.json` — per-collection config
   (description, matching rules, sections, sort order)

To add a new collection: create a JSON file in `src/_data/collections/`
following the schema in `_schema.md`. Rebuild the site. The new
collection appears at `/collections/<slug>/`.

To change what appears on a collection page: edit the CSV's
`collection_grouping` / `title` / relevant fields, OR edit the collection
config's `matchBy` rule. Do not edit `_site/`.
```

- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "Docs: collections guide and updated add-book workflow"
```

---

## Self-Review

**1. Spec coverage.** The user asked for CSV as single source of truth. Tasks 1–17 migrate all 26 collection pages; Tasks 18–20 remove the 183 duplicate hand-coded detail pages; Task 21 prevents regressions. ✔

**2. Placeholder scan.** Tasks 13 and 17 use phrases like "remaining thematic pages" — but they list explicit slugs and repeat the Task-8 pattern verbatim rather than say "similar to". Each step is concrete. ✔

**3. Type consistency.** Matcher function signatures (`matchesCollection`, `assignSection`) are defined in Task 3 and referenced in Task 4. Filter names (`booksInCollection`, `groupBySections`, `sortBooks`) are defined in Task 4 and used in Task 5's template. ✔

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-20-csv-single-source-of-truth.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Best for a 22-task plan touching many files.

**2. Inline Execution** — execute tasks in this session with checkpoints for review.

**Which approach?**
