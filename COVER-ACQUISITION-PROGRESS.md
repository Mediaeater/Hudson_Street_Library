# Book Cover Acquisition Progress

## Current Status (as of July 10, 2025)

- **Total books**: 1,333
- **Current covers**: 648 (48.6%)
- **Target**: 1,067 covers (80%)
- **Still needed**: 419 covers

## Progress Summary

### Starting Point
- Initial covers: 138 (10.4%)

### Acquisition Results
- Total added: 510 covers
- Increase: 370% improvement
- Sources used: Google Books, DPLA, Archive.org, Open Library (all free)

## Tools Created

1. **acquire-covers-free.js** - Uses only free APIs
2. **acquire-covers-enhanced.js** - Better redirect handling
3. **acquire-covers-respectful.js** - Rate-limited version with batching
4. **delete-covers.js** - Interactive tool to remove incorrect covers

## API Performance

### Best Performing APIs
1. **Google Books** - Excellent for books with and without ISBNs
2. **Archive.org** - Good for older/rare titles
3. **DPLA** - Strong for cultural/historical items
4. **Open Library** - Good redirect handling needed

### Publisher Coverage
Best coverage for:
- Steidl (31 books)
- Hatje Cantz (18 books)
- MACK/Mack (19 books)
- Phaidon Press (10 books)
- Dashwood Books (18 books)

## Challenges

1. **Invalid ISBNs**: ~800 books have no ISBN or invalid data like:
   - "No ISBN"
   - "NULL"
   - "First", "OOP", "Rare"
   - Numbers like "500", "72"
   - Descriptive text instead of ISBN

2. **Rate Limiting**: Free APIs have limits requiring careful pacing

3. **Rare/Limited Editions**: Many art books are limited editions without digital covers

## Next Steps to Reach 80%

### 1. Continue Automated Acquisition
```bash
# Run with respectful delays
node acquire-covers-respectful.js --start 600 --limit 200

# Focus on books with valid ISBNs
node acquire-covers-enhanced.js --limit 150
```

### 2. Get Additional Free API Keys
- **Europeana**: https://pro.europeana.eu/page/apis
- **HathiTrust**: Already integrated, no key needed
- **Internet Archive**: Already working

### 3. Manual Acquisition Strategy
For high-value titles without automated covers:
1. Search publisher websites directly
2. Check artist/photographer official sites
3. Use reverse image search for similar editions

### 4. Data Quality Improvements
- Clean up ISBN field in CSV
- Add alternative identifiers (OCLC, LCCN)
- Standardize publisher names for better matching

## Estimated Time to 80%

At current acquisition rates:
- Automated: ~50-100 covers per hour
- Need: 419 covers
- Estimated time: 4-8 hours of script runtime
- With manual additions: 2-3 days total

## Commands Reference

```bash
# Check current coverage
ls -1 src/assets/images/books/*.jpg | wc -l

# Run respectful acquisition
node acquire-covers-respectful.js --start [index] --limit [count]

# Delete wrong covers
node delete-covers.js

# Commit changes
git add -f src/assets/images/books/*.jpg
git commit -m "Add X new book covers"
git push origin main
```

## Quality Notes

- Some covers may be low resolution
- Verify covers match the correct edition
- Use delete-covers.js to remove incorrect matches
- Consider image optimization for web performance