# add-book — Reference

Lookup material for the `add-book` skill. The workflow and critical gotchas live in
`SKILL.md`; this file holds the cover-image naming convention, troubleshooting, and
implementation/file-map details.

## Cover Image Naming Convention

**Standard format:**
```
{author_last}_{author_first}_{title}_{isbn}.jpg
```

**Examples:**
```
ethridge_roe_in_the_beginning_9781912719716.jpg
tillmans_wolfgang_truth_study_center_9783865601234.jpg
fischer_marc_who_shares_the_restroom_code_with_ice_agents.jpg
```

**Rules:**
- All lowercase
- Remove all special characters
- Convert spaces to underscores
- Truncate at 50 chars per section
- ISBN without hyphens
- Always `.jpg` extension

## Troubleshooting

**No data found in any source?**
- Add manually later by editing CSV with Node.js script
- Search for ISBN on publisher website
- Check book title spelling
- Try alternative title formats (subtitle, series name)

**Publisher website scraping failed?**
- Pattern not optimized for that publisher
- Will still search other 6 sources
- Can add publisher pattern to `PUBLISHER_PATTERNS` later

**Wrong author name parsing?**
- Complex names (Jr., III, compound last names) may split incorrectly
- Edit CSV directly after adding using Node.js with csv-parse/stringify
- Look for the ID shown in output to find the row

**CSV validation failed?**
- Check error message for specific line
- Run `node scripts/validate-csv-structure.js` for details
- Fix column count issues before committing
- Never use bash heredoc to fix. Use Node.js script.

**Cover image not showing on site?**
- Check filename has no trailing spaces: `ls -la src/assets/images/books/`
- Verify `image_url` field in CSV matches actual filename
- Ensure file extension is `.jpg` not `.jpeg`
- Check file exists: `ls src/assets/images/books/[filename]`

**Tags not displaying correctly?**
- Verify tags are comma-separated: `"Art, Photography, Zines"`
- Not semicolons, pipes, or other separators
- Check for empty tags or trailing commas

**Duplicate ISBN warning?**
- Check if book already exists in collection
- Might be different edition (add edition info to notes)
- Might be multi-volume set (use collection_grouping)

## Implementation Details

**Key files:**
- `scripts/add-book-from-text.js`: Main script
- `scripts/utils/book-metadata-aggregator.js`: Multi-source search
- `scripts/utils/book-api-client.js`: API integrations
- `scripts/validate-csv-structure.js`: CSV validation
- `docs/ADD-BOOK-GUIDE.md`: Detailed documentation

**Data sources configuration:**
All sources can be enabled/disabled and prioritized in `book-metadata-aggregator.js`

**Publisher patterns:**
Optimized scraping patterns in `PUBLISHER_PATTERNS` object for major art/photo publishers

**Security:**
- SSRF protection (whitelisted hosts only)
- Request timeouts and rate limiting
- Size limits on responses
- Safe HTML parsing
