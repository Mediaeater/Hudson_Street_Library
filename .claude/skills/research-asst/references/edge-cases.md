# research-asst — Edge-Case Handling

Consult these when a title hits one of the situations below. The main workflow lives in `SKILL.md`.

- **No ISBN**: Use title + artist + year as the search key. Note it in `unresolved_fields`.
- **Publisher is a gallery**: Still check DAP / Twelvebooks. Note if the book is only available direct.
- **Historical exhibition (pre-2010)**: LOC/WorldCat are primary; skip distributor stock checks.
- **Emerging artist**: Skip museum links unless confirmed. Flag `research_log.confidence_score` as `"medium"`.
- **Conflicting data**: Default source ranking is LOC → publisher → DAP → WorldCat, but verify case-by-case — LOC records can be outdated or sparse for small-press art books. Document which source you preferred and why in `notes`.
- **Non-English**: Note the language in `language`; write all descriptions in English.
