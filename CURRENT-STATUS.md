# Hudson Street Library - Current Status

## Date: July 10, 2025

### Book Cover Collection Status

#### Numbers
- **Total books**: 1,333
- **Books with covers**: 757
- **Coverage percentage**: 56.8%
- **Books without covers**: 576

#### Progress Made Today
- **Started with**: 339 covers (25.4%)
- **Added**: 418 new covers
- **Increase**: 123.3%

### Goal Progress
- **Target**: 80% coverage (1,067 covers)
- **Current**: 757 covers
- **Remaining**: 310 covers needed
- **Progress to goal**: 71.0% complete

### API Status

#### Currently Configured
1. **Google Books API** ✅
   - Key: AIzaSyDPLxG-Ht3AesD1zP-Gg03GH2pDYUHHHn0
   - Status: Rate limited (need to wait)

2. **DPLA API** ✅
   - Key: d3352df28c7eb66f23d3a2780a5f1b65
   - Status: Rate limited (need to wait)

#### Available but Not Configured
1. **Europeana API** ❌
   - Register at: https://pro.europeana.eu/page/apis
   - Could provide additional European art book covers

#### Working Without Keys
1. **Archive.org** ✅ (Rate limited)
2. **Open Library** ✅ (Rate limited)

### Tools Created

1. **acquire-covers-free.js**
   - Uses only free APIs
   - Original acquisition script

2. **acquire-covers-enhanced.js**
   - Better error handling
   - Redirect support

3. **acquire-covers-respectful.js**
   - Rate limiting built in
   - 2s delays, 30s between batches
   - Best for avoiding rate limits

4. **delete-covers.js**
   - Interactive tool
   - Remove incorrect covers
   - Search by author/title/ISBN

### Current Issues

#### Rate Limiting
- Hit rate limits on all APIs
- Need to wait 1-2 hours minimum
- Consider running at off-peak times (3-6 AM)

#### Data Quality
- ~800 books have invalid ISBNs
- Many show "No ISBN", "NULL", "First", etc.
- These are harder to find covers for

### Coverage Analysis

#### Well-Covered
- Artists A-P: Good coverage
- Major publishers: Steidl, Hatje Cantz, MACK
- Books with valid ISBNs

#### Gaps
- Artists Q-Z: Limited coverage
- Japanese publishers
- Limited editions
- Self-published works

### Next Steps

#### Immediate (After Rate Limit Reset)
```bash
# Wait 1-2 hours, then try small batches:
node acquire-covers-respectful.js --start 900 --limit 25
```

#### This Week
1. Get Europeana API key
2. Run scripts during off-peak hours
3. Target specific publishers:
   ```bash
   grep -i "steidl" src/_data/books.csv | grep -v "image_url"
   ```

#### Long Term
1. Clean ISBN data in CSV
2. Add OCLC numbers
3. Consider manual acquisition for high-value titles
4. Set up scheduled runs during off-peak

### Quality Metrics

#### Cover Quality
- Most covers: Medium resolution
- File sizes: 20-200 KB average
- Format: JPEG
- Suitable for web display

#### Accuracy
- ~95% accuracy (visual match to edition)
- Some may be different editions
- Use delete-covers.js to remove mismatches

### Commands Reference

```bash
# Check current count
ls -1 src/assets/images/books/*.jpg | wc -l

# Run acquisition (after waiting)
node acquire-covers-respectful.js --start [index] --limit 25

# Delete wrong covers
node delete-covers.js

# Find books without covers
node -e "console.log('Books without covers: ' + (1333 - $(ls -1 src/assets/images/books/*.jpg | wc -l)))"

# Commit changes
git add -A && git commit -m "Add book covers" && git push
```

### Time Estimate to 80%

With rate limiting:
- 310 covers needed
- ~10-20 covers per hour (with delays)
- 15-30 hours of runtime
- Spread over 3-4 days

### Success Metrics

✅ **Doubled coverage** in one day
✅ **Zero cost** - all free APIs
✅ **Sustainable process** documented
✅ **Tools built** for ongoing maintenance

---

*Last updated: July 10, 2025*