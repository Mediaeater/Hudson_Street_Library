# Book Cover Acquisition Best Practices

## Overview
This guide documents the best practices for acquiring book covers for the Hudson Street Library collection, based on real-world experience processing over 1,300 books.

## API Selection Strategy

### Recommended Free APIs (in order of preference)
1. **Google Books API**
   - **Success Rate**: Highest (~40% of successful finds)
   - **Best For**: Books with ISBNs, modern publications
   - **Limits**: Free tier allows ~1,000 requests/day
   - **No API key required** for basic usage

2. **Open Library**
   - **Success Rate**: Good (~20% of successful finds)
   - **Best For**: Academic books, classics, community-contributed covers
   - **Limits**: No strict limits, very generous
   - **Direct cover URLs** make it fast

3. **Archive.org**
   - **Success Rate**: Moderate (~15% of successful finds)
   - **Best For**: Historical books, out-of-print titles
   - **Limits**: Generous, but slower response times
   - **Scanned covers** often high quality

4. **HathiTrust**
   - **Success Rate**: Lower (~10% of successful finds)
   - **Best For**: Academic publications, university press books
   - **Limits**: Free thumbnail access
   - **Partner with** major academic libraries

## Search Strategy Optimization

### 1. ISBN-First Approach
```javascript
// Always try ISBN first if available
if (isbn && isbn !== 'No ISBN' && isbn.length >= 9) {
    // Search by ISBN - highest accuracy
}
```

### 2. Multi-Strategy Fallback
```javascript
// If ISBN fails, try these in order:
1. Exact title + author in quotes
2. Title + author without quotes
3. Title only (for unique titles)
4. Author + partial title (for common titles)
```

### 3. Handle Edge Cases
- Books marked "NULL", "No ISBN", "rare", "sealed" need special handling
- Remove special characters from search queries
- Handle multi-author books by trying primary author first

## Performance Optimization

### Optimal Delay Settings
```javascript
const DELAY_BETWEEN_CALLS = 500;     // 0.5 seconds
const DELAY_BETWEEN_BATCHES = 10000;  // 10 seconds
const BATCH_SIZE = 25;                // Process 25 books per batch
```

### Why These Settings Work
- **500ms delays**: Fast enough for efficiency, slow enough to avoid rate limits
- **10s batch delays**: Prevents triggering anti-bot measures
- **25 book batches**: Good balance between progress visibility and API courtesy

## File Management

### Naming Convention
```
Author_Full_Name_Book_Title_ISBN.jpg
```

### Rules
1. Replace all special characters with underscores
2. Limit total filename to 200 characters
3. Use "noISBN" or "No_ISBN" when ISBN unavailable
4. Preserve original capitalization for readability

### Examples
```
Wolfgang_Tillmans_Neue_Welt__Cologne__Taschen_NULL.jpg
Sophie_Calle_Take_Care_of_Yourself_9782742768936.jpg
Richard_Prince_American_Dream_noISBN.jpg
```

## Quality Control

### Acceptance Criteria
1. **Strict Mode** (2% success rate):
   - 80%+ title match
   - 80%+ author match
   - Use only for critical accuracy needs

2. **Standard Mode** (67% success rate):
   - Reasonable title similarity
   - At least one matching author
   - Visual verification recommended

### Image Quality Checks
```javascript
// Reject images that are too small
if (stats.size < 1000) {  // Less than 1KB
    reject('Image too small');
}
```

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| HTTP 302/301 | Redirect | Follow redirect or skip |
| HTTP 404 | Not found | Try next API |
| Timeout | Slow server | Implement 10s timeout |
| Image too small | Low quality | Reject and try next source |
| Rate limit | Too many requests | Increase delays |

## Workflow Recommendations

### 1. Initial Bulk Acquisition
```bash
# Start with free API for maximum coverage
node acquire-covers-free.js --limit 500

# Process in batches to monitor progress
node acquire-covers-free.js --limit 100
node acquire-covers-free.js --limit 200
node acquire-covers-free.js --limit 300
```

### 2. Targeted Re-runs
```bash
# For specific artists or publishers
node acquire-covers-enhanced.js --artist "Wolfgang Tillmans"
node acquire-covers-enhanced.js --publisher "Steidl"
```

### 3. Manual Cleanup
- Review books still missing covers
- Check for typos in metadata
- Consider manual upload for rare books

## Metrics and Monitoring

### Track Success Rates
```javascript
console.log(`🎉 Acquisition Complete:
   Processed: ${stats.processed} books
   Successful: ${stats.successful} covers
   Failed: ${stats.failed} attempts
   Success rate: ${Math.round(stats.successful/stats.processed*100)}%`);
```

### Log API Performance
```javascript
📊 API Usage (all free):
   Google Books: 27 covers
   Open Library: 12 covers
   Archive.org: 7 covers
   Publisher Direct: 2 covers
```

## Future Improvements

### 1. Additional Free Sources
- WorldCat.org API
- Museum APIs (MoMA, Met, etc.)
- Publisher RSS feeds
- Library of Congress

### 2. Enhanced Features
- Duplicate detection
- Image quality scoring
- Automatic retry for failures
- Cover version management

### 3. Community Features
- Manual upload interface
- Crowd-sourced corrections
- Cover voting/rating system

## Conclusion
The free API approach with optimized delays provides the best balance of coverage, speed, and reliability. Focus on Google Books and Open Library for best results, with Archive.org as a solid fallback for historical materials.