# Collection Config Schema

Each collection has a JSON file at `src/_data/collections/<slug>.json`.

## Required fields

- `slug` — URL slug (must match filename)
- `title` — display name
- `description` — intro paragraph shown above grid
- `matchBy` — object with ONE of: `{ "collection_grouping": "Purple Magazine" }`, `{ "tag": "Queer Culture" }` (exact match against the comma-split tag list; a string or an array of aliases), `{ "authorLast": "Prince" }`, `{ "titleContains": "Apartamento" }`, `{ "titleRegex": "^Purple (Fashion|Magazine)" }` (case-insensitive), or `{ "keywords": ["wombat","portfolio"] }`

## Optional fields

- `externalUrl` — link shown near header (e.g., `"https://purple.fr"`)
- `sections` — ordered array; when absent, one unsectioned grid is rendered
- `sortBy` — `"issueNumberDesc"` | `"publicationYearDesc"` | `"titleAsc"` | `"accessionDesc"`
- `heroImage` — override the auto-picked cover
- `allWings` — `true` to match books from every wing, not just the config's own
  (curated configs are scoped to the art wing unless `wing` says otherwise). The
  page still publishes under the config's wing namespace. Used by `ephemera`,
  whose tag spans the art wing and the Ephemera wing.

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

## Exclusive tags

`EXCLUSIVE_TAGS` in `scripts/utils/collection-matcher.js` (currently `Queer Culture`)
lists tags that claim their books outright. A book carrying one appears in that tag's
collection and in no other *subject* collection, whether curated (`matchBy.tag`,
`collection_grouping`, `keywords`) or auto-generated from a tag. It still appears in
identity collections that name a title or author (`titleRegex`, `titleContains`,
`authorLast`), such as the BUTT page. The auto tag tier applies the same rule when it
counts books toward the threshold, so a tag's `bookCount` matches what its page renders.
