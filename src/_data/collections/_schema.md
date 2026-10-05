# Collection Config Schema

Each curated collection has a JSON file at `src/_data/collections/<slug>.json`.
`scripts/utils/collections-index.js` reads them all. The rules they sit inside
(facets, thresholds, tag ownership, built versus listed) are in
`docs/COLLECTIONS-GUIDE.md`.

## Required fields

The build fails, naming the config, when `slug`, `title` or `matchBy` is missing.

- `slug`: the URL slug. Use the filename.
- `title`: display name.
- `description`: the paragraph under the title. Also the text on the explore page.
- `matchBy`: an object with exactly one of the four rules below.

## matchBy

- `{ "tag": "Queer Culture" }` or `{ "tag": ["A", "B"] }`: exact match against
  the book's comma-split tag list, in any letter case. The config becomes the
  page for every tag it names, so no generated page is built for them and those
  tags on a book page link here.
- `{ "collection_grouping": "Collage" }`: exact match on the shelf column.
- `{ "titleRegex": "^Purple (Fashion|Magazine)" }`: case-insensitive regex on
  the title. For identity collections (a magazine run). Anchor it with `^`.
- `{ "authorLast": "Prince" }`: exact match on `author_last`.
- `{ "person": "Richard Prince" }`: books by or about one person. Matches when
  `author_first` + `author_last` spell the name exactly, or when a tag does.
  A book that only mentions the name in its title or contributors needs the tag.

Any other key fails the build with `collection "<slug>": unknown matchBy rule
"<key>"`. `keywords`, `titleContains` and `coversTags` no longer exist. Two
configs in one wing naming the same tag also fail the build.

## Optional fields

- `wing`: the wing the collection belongs to. Defaults to the art wing. The
  page publishes at `/collections/<slug>.html` in the art wing and at
  `/<wing>/collections/<slug>.html` elsewhere.
- `allWings`: `true` to match books from every wing, not just the config's own.
  The page still publishes under the config's wing. With `matchBy.tag`, the
  config is the page for that tag in every wing: no wing builds its own page
  for the tag, and the tag links here from any book. A wing's own config naming
  the same tag keeps it for that wing. Used by `ephemera`, `surveillance-index`
  and `surveillance-index-edition-two`.
- `sortBy`: `"authorAsc"` (default) | `"titleAsc"` | `"publicationYearDesc"` |
  `"issueNumberDesc"` | `"issueNumberAsc"` | `"newestFirst"` (catalogue order
  reversed). Issue numbers are read from
  "Issue 5", "#5", "No. 5" or "N°5" in the title.
- `intro`: array of paragraphs shown under the title in place of `description`,
  for a page that needs more than a blurb. Inline HTML (`<em>`) is allowed.
  `description` is still required: it stays the text on the explore page.
- `coversFirst`: `true` to move books without a cover file to the end.
- `sections`: ordered array, see below. When absent, the page is one grid with
  no heading.
- `image`: the picture on the explore page. When absent, the newest member's
  cover is used.
- `featured`: `true` to list the collection after the others in the curated
  group on the explore page. Defaults to `false`.
- `category`: an id from `categories` in `src/_data/libraryCollections.json`,
  carried into the JSON endpoint (`/cms/data/libraryCollections.json`). No page
  reads it.
- `externalUrl`: a link shown under the description (e.g. `"https://purple.fr"`).
- `headerImage`: `{ "src", "alt", "caption" }`, a figure under the masthead.
- `relatedLinks`: array of `{ "label", "url", "source" }`, listed at the foot of
  the page. A `url` starting with `/` opens in the same tab.

## Section object

```json
{
  "label": "Volume V",
  "subtitle": "F/W 2020 – S/S 2026 · Issues #34–45",
  "filter": { "titleRegex": "Issue (3[4-9]|4[0-5])\\b" }
}
```

`filter` is `{ "titleRegex": "..." }` (case-sensitive here) or
`{ "publicationYearRange": [1998, 2003] }`. A book lands in the first section
whose `filter` matches. Books that match no section fall into a trailing
`"Other"` section, which appears only when there are such books.

An optional `url` links the section heading to another page, for a section
that has a collection page of its own.

## Exclusive tags

`EXCLUSIVE_TAGS` in `scripts/utils/collection-matcher.js` (currently `Queer Culture`)
lists tags that claim their books outright. A book carrying one appears in that tag's
collection and in no other subject collection, whether curated (`matchBy.tag`,
`collection_grouping`) or generated from a tag, a publication decade or a
classification. It still appears in identity collections that name a title or an
author (`titleRegex`, `authorLast`, `person`, a generated author page), such as the BUTT page.
The generated tier applies the same rule when it counts books toward the threshold,
so a page's count matches what it renders.
