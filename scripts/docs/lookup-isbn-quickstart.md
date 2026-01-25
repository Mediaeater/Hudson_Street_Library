# ISBN Lookup Tool - Quick Start

## Usage

```bash
# Lookup an ISBN
python3 scripts/lookup-isbn.py 9789685979146

# Get JSON output
python3 scripts/lookup-isbn.py 9789685979146 --json

# ISBNs with hyphens work too
python3 scripts/lookup-isbn.py 978-3-03860-434-1
```

## What It Does

Fetches Library of Congress Classification (LCC) and bibliographic metadata from ISBNs:

- LCC classification (e.g., "ND237.Y87 A4 2006")
- LCCN (Library of Congress Control Number)
- Title, Authors, Publisher, Publication Year
- Subject headings
- CSV-formatted output for easy import

## Data Sources

Tries in order until successful:

1. **OpenLibrary API** - Best coverage, no auth required
2. **Library of Congress SRU** - Authoritative but slower
3. **Google Books** - Fallback (no LCC data)

## Example Output

```
Looking up ISBN: 9789685979146
--------------------------------------------------------------------------------

[1/3] Trying OpenLibrary API...
✓ Found in OpenLibrary

METADATA FOUND:
================================================================================
ISBN:        9789685979146
LCC:         ND237.Y87 A4 2006
LCCN:        2007471413
Title:       Lisa Yuskavage
Authors:     Lisa Yuskavage
Publisher:   Fundación Olga y Rufino Tamayo
Year:        2006

Subjects:
  - Exhibitions
  - Women in art
  - Erotic painting

================================================================================
CSV FORMAT (for copy-paste):
--------------------------------------------------------------------------------
9789685979146|ND237.Y87 A4 2006|2007471413|Lisa Yuskavage|Lisa Yuskavage|Fundación Olga y Rufino Tamayo|2006|Exhibitions; Women in art; Erotic painting
```

## Test Results

Tested with three art/architecture ISBNs:

| ISBN | Book | LCC Found | Source |
|------|------|-----------|--------|
| 9789685979146 | Lisa Yuskavage | ✓ ND237.Y87 A4 2006 | OpenLibrary |
| 978-3-03860-434-1 | Public Spaces, NY | ✗ | OpenLibrary |
| 9781948765992 | Vacant Spaces NY | ✗ | OpenLibrary |

**Finding:** OpenLibrary works best. LCC classification is hit-or-miss, especially for recent European art books.

## When LCC Is Not Available

Recent publications (especially from international art publishers) often don't have LCC classifications assigned yet. The Library of Congress typically lags 6-24 months behind publication for non-US publishers.

For these cases:
1. Check back later (LOC may catalog it eventually)
2. Assign a classification manually based on similar books
3. Use broader subject categories

## Rate Limits

- OpenLibrary: No official limit, be courteous (< 1 req/sec for bulk)
- LOC SRU: No official limit, suggest < 10 req/min
- Google Books: 1000 requests/day without API key

## See Also

- Full API comparison: `scripts/docs/isbn-lookup-api-comparison.md`
- Script source: `scripts/lookup-isbn.py`
