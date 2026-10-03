# Collections Guide

## What a collection is

A collection is a page listing every book that shares one term. Terms come from three sources.

1. **Hand tags.** The `tags` column, split on commas. This is the main source and the one to reach for first.
2. **Record terms.** Computed at build from three other columns (publication year, author, classification). They are never written to a CSV. In code they carry `origin: 'derived'` and live in `scripts/utils/derived-terms.js`. A collection page built from them is labelled "From the catalogue record", or "From the catalogue record and tags" when a hand tag of the same name feeds it too. On a book page they sit in their own row, labelled "From the record", apart from the tags.
3. **Curated configs.** `src/_data/collections/<slug>.json`, for sets a tag cannot express: a magazine run matched by title, a shelf matched by `collection_grouping`.

`scripts/utils/collections-index.js` computes all of it once per build. Collection pages, the explore page, wing landing pages, `/tags/`, book-page links, the JSON endpoint (`/cms/data/libraryCollections.json`) and the sitemap all read that index. Nothing else decides membership, counts or URLs.

## Matching is exact

- A tag matches as a whole value after splitting on commas and trimming. No substring matching, no keyword matching, anywhere.
- Two spellings are the same term when `slugifyTag` gives the same slug. That ignores case, accents, apostrophes and hyphen-versus-space ("Black and White" = "black-and-white").
- Different words for one thing are merged by `TAG_ALIASES` in `scripts/utils/tag-vocabulary.js`. Merge in code. Do not bulk-edit the CSVs to merge tags.
- A term is counted inside one wing. A tag common in one wing never publishes a page of another wing's books.

## Facets

Every term belongs to one facet. The facet decides which section lists it.

| Facet | Label | Source | Example |
|---|---|---|---|
| theme | Themes | hand tag | Fashion, Surveillance, Codes and Ciphers |
| medium | Mediums | hand tag | Photography, Painting, Collage |
| genre | Genres | hand tag | Portraiture, Street Photography |
| format | Formats | hand tag + classification | Photobook, Exhibition Catalog, Zines |
| place | Places | hand tag | New York City, Japanese Photography |
| period | Eras | hand tag | 1980s (what the book is about) |
| person | Artists & Authors | author columns + hand tag | Wolfgang Tillmans |
| series | Series & Imprints | hand tag | Surveillance Index, Nazraeli Press |
| published | Published | publication year | Published in the 2010s |

Hand tags get their facet from `TAG_FACETS`. A tag missing from that map is treated as a theme, and `npm run collections:report` lists it so it can be assigned.

## Record terms

Three rules. Each reads one column and matches exactly.

- **Published decade.** `publication_year` must be exactly four digits. 1987 gives "Published in the 1980s", slug `published-1980s`. Empty or malformed years give nothing.
- **Person.** `author_first` and `author_last` must both be filled. The term is "First Last". A row is skipped when either cell contains a comma, ampersand, semicolon, slash, bracket or the word "and", when the two cells are equal, or when either is Anonymous, Various, Artists, Unknown, NA or VA. So periodicals, collectives filed without a first name, `NA VA` anthologies and co-author cells never become people. A hand tag spelling the same name joins the same term.
- **Form.** `classification` must be one of the wing's `classifications` in `wings.json`. The term is that value. A hand tag of the same name joins the same term (Photobook = tagged Photobook or classified Photobook).

If a rule would need a guess, it produces nothing.

## When a term gets a page

- 15 books in its wing. 8 for the person facet. The constants are `THRESHOLD` and `FACET_THRESHOLD` in `tag-vocabulary.js`.
- URL: `/collections/<slug>.html` in the art wing, `/<wing>/collections/<slug>.html` elsewhere. The slug is `slugifyTag(name)`, except for a decade, which is `published-<decade>`.
- Only the art wing and wings marked `live` in `wings.json` get pages.
- Who owns a slug, in order: a curated config that names the tag in `matchBy.tag`; a curated config with the same slug; a static page in `src/collections/` with the same slug (art wing only); otherwise the generated page.

A term a static page owns has no generated page and no link target, because the index cannot know which books a hand-built page lists. Today that is Richard Prince and Magazines in the art wing.

## Built versus listed

Every qualifying term builds its page, so URLs stay put. Two kinds of generated page are built but left out of the explore page and the wing landing pages:

- **Whole-wing.** The term covers 90% or more of its wing (Hacking in the hacking wing). The wing landing page already is that list.
- **Same set.** The term lists exactly the same books as another collection. One is listed (curated first, then hand tag, then record term, then by title) and the others show "Same books as ..." with a link.

Outside the art wing these pages are also left out of the sitemap. In the art wing the sitemap lists every page under `/collections/`, listed or not.

## Exclusive tags

`EXCLUSIVE_TAGS` in `scripts/utils/collection-matcher.js` is `['Queer Culture']`. A book carrying an exclusive tag appears in that tag's collection and in no other tag, shelf, decade or form collection. Pages that name a specific title or author (BUTT, Purple, a person page) are identity pages and are not affected.

## Links

A tag or record term on a book page links to a collection only when that collection lists the book. Otherwise a tag links to the search (`/aggregate-view/?filter=tag&value=...`) with `rel="nofollow"`, a classification shows as plain text, and a decade or author with no page is left off. `tagUrl` and `recordLinks` in the index enforce this, and `scripts/verify-views.js` checks the built pages.

The search matches a tag as a whole value, in any letter case. It does not know the alias map, so a link carrying a merged name finds only the books typed with that spelling.

`/tags/` lists every art-wing hand tag that two or more books carry, under its first letter. A tag with a page links to it. The rest link to the search.

## Curated configs

One JSON file per collection in `src/_data/collections/`. Fields: `slug`, `title`, `description`, `matchBy`, and optionally `wing`, `allWings`, `sections`, `sortBy`, `coversFirst`, `image`, `featured`, `category`, `headerImage`, `relatedLinks`, `externalUrl`. `src/_data/collections/_schema.md` describes each one.

`matchBy` takes exactly one rule:

- `{ "tag": "Disaster" }` or `{ "tag": ["A", "B"] }`: exact tag. The config becomes the page for those tags.
- `{ "collection_grouping": "Collage" }`: exact shelf.
- `{ "titleRegex": "^BUTT Magazine" }`: identity collections only. Anchor it with `^`.
- `{ "authorLast": "Prince" }`: exact `author_last`.

Any other key fails the build with the config's name. `keywords`, `titleContains` and `coversTags` no longer exist.

`sortBy`: `authorAsc` (default), `titleAsc`, `publicationYearDesc`, `issueNumberDesc`, `issueNumberAsc`. Issue numbers are read from "Issue 5", "#5", "No. 5" or "N°5".

`sections` split a page into labelled groups. A config without sections renders one unlabelled group. "Other" appears only when a sectioned config has leftovers.

## Static pages

A few hand-built pages remain in `src/collections/` (Richard Prince, the magazines hub, Toilet Paper and others). They keep their URLs and the index generates nothing on top of them. The two that the explore page lists without a config, Richard Prince and Magazines, are named in `src/_data/libraryCollections.json`. The same file holds the `categories` list that the JSON endpoint publishes. It is no longer the list of collections. Do not add new static pages. Write a config.

## URLs do not disappear

`test/collection-permalinks.test.js` checks a frozen list of published collection URLs, kept in `test/fixtures/collection-permalinks.json`. Each must still build or have a row in `src/_data/redirects.json`. The list is append-only: add new URLs to it, never remove one. When an alias merge moves a page, add the redirect row in the same commit. Never add a redirect for a page that still builds. The build stops and names the row.

## How to

- **Add a collection:** tag the books. At 15 books the page appears.
- **Merge two spellings:** add the variant to `TAG_ALIASES`. If the variant had its own page, add a redirect row.
- **Move a tag to another facet:** edit `TAG_FACETS`.
- **Curate a set a tag cannot express:** write a config.
- **See the state of things:** `npm run collections:report`.

## The report

`npm run collections:report` reads the index and writes nothing. For each wing it prints:

- every page by facet, with its book count and origin (`hand`, `derived`, `hand+derived`, `curated`)
- pages that are built but not listed, with the reason
- published hand tags missing from `TAG_FACETS`
- terms up to three books short of a page, and pages no more than three books above their threshold
- author names that differ only in how the first name is spelled, which usually means one person filed two ways

## Checks before committing

```bash
npm test                      # CSV, design source check, unit and rendering tests
npm run build && node scripts/verify-views.js
npm run test:design           # after any template change
npm run collections:report    # unassigned facets, near-threshold terms, unlisted pages
```
