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
