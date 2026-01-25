# Data Analysis Scripts

Scripts for analyzing book data, generating reports, and identifying coverage gaps.

## Scripts

**check-isbn-coverage.js** - ISBN coverage analysis
- Analyzes how many books have ISBNs
- Reports on ISBN coverage statistics
- Identifies books missing ISBN data

**aggregate-tags.js** - Tag aggregation and analysis
- Aggregates tags across all books
- Generates tag frequency reports
- Identifies popular categories and topics

**find-music-isbns.js** - Music book ISBN finder
- Identifies music-related books in the collection
- Checks ISBN presence for music books
- Generates music book reports

## Common Usage

### Check ISBN coverage
```bash
node scripts/data-analysis/check-isbn-coverage.js
```

### Generate tag report
```bash
node scripts/data-analysis/aggregate-tags.js
```

### Find music book ISBNs
```bash
node scripts/data-analysis/find-music-isbns.js
```
