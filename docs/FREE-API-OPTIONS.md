# Free Book Cover API Options

## Currently Using (Free)

### 1. **Open Library** ✅ FREE
- **No API key required**
- **No rate limits** (reasonable use)
- **Direct cover URLs**: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
- **Coverage**: Good for older/classic books

### 2. **Google Books** ✅ FREE
- **Without API key**: 1,000 requests/day
- **With FREE API key**: 10,000 requests/day
- **How to get key**: Google Cloud Console (no credit card needed)
- **Coverage**: Excellent for contemporary books

## Additional Free Options

### 3. **Archive.org** ✅ FREE
- **Parent of Open Library**
- **Millions of scanned books**
- **Direct image access**: `https://archive.org/services/img/{identifier}`
- **No API key needed**

### 4. **HathiTrust** ✅ FREE
- **Academic library consortium**
- **API**: `https://catalog.hathitrust.org/api/volumes/`
- **Great for academic/scholarly books**
- **No key required for basic access**

### 5. **Europeana** ✅ FREE
- **European cultural heritage**
- **API key**: Free registration
- **Excellent for European publishers**
- **Art/photography book focus**

### 6. **DPLA (Digital Public Library of America)** ✅ FREE
- **API key**: Free with registration
- **Aggregates from 40+ institutions**
- **Strong on historical/cultural materials**

### 7. **Wikimedia Commons** ✅ FREE
- **Book covers under free licenses**
- **API**: MediaWiki API
- **No rate limits**

### 8. **Direct Publisher Sites** ✅ FREE
Many publishers allow cover image hotlinking:

#### Art/Photography Publishers:
- **Steidl**: `https://steidl.de/Books/{ISBN}`
- **Aperture**: Direct image URLs in their catalog
- **MACK**: Open catalog with cover URLs
- **Phaidon**: RSS feeds with covers
- **Thames & Hudson**: Catalog API

### 9. **Library Catalogs** ✅ FREE
- **NYPL Digital Collections**: API available
- **Library of Congress**: Z39.50 protocol
- **British Library**: Open metadata

### 10. **Web Scraping** (Respectful) ✅ FREE
Legal when following robots.txt:
- **Publisher websites**
- **Bookstore catalogs** 
- **Library OPACs**

## Implementation Priority

### Phase 1: Maximize Current Free APIs
```bash
# 1. Get Google Books API key (increases limit 10x)
# 2. Fix Open Library redirect handling
# 3. Add Archive.org as fallback
```

### Phase 2: Add More Free Sources
```javascript
// Example: Archive.org integration
async function getCoverFromArchive(isbn) {
    // Search for book
    const searchUrl = `https://archive.org/advancedsearch.php?q=isbn:${isbn}&output=json&rows=1`;
    const results = await fetch(searchUrl).then(r => r.json());
    
    if (results.response.docs.length > 0) {
        const identifier = results.response.docs[0].identifier;
        return `https://archive.org/services/img/${identifier}`;
    }
    return null;
}
```

### Phase 3: Publisher Direct Access
```javascript
// Example: Steidl direct covers
function getSteidlCover(isbn, publisher) {
    if (publisher?.includes('Steidl')) {
        // Steidl uses predictable URLs
        return `https://steidl.de/getimage.php?isbn=${isbn}&size=large`;
    }
    return null;
}
```

## Cost Comparison

### Free Options Coverage Estimate:
- **Google Books** (with free key): ~40% coverage
- **Open Library**: ~30% coverage  
- **Archive.org**: +10% additional
- **Publisher direct**: +10% for art books
- **Library catalogs**: +5% rare books
- **Total Free Coverage**: ~60-70%

### Paid Options (for comparison):
- Amazon API: $0.0004/request
- ISBNdb: $10-50/month
- BookData: $100+/month

## Recommended Free Stack

1. **Google Books API** (free key)
2. **Open Library** (enhanced)
3. **Archive.org** 
4. **HathiTrust**
5. **Direct publisher URLs**
6. **DPLA** (for historical)

This stack should achieve 60-70% coverage at **$0 cost**.

## Quick Implementation

```bash
# 1. Set up environment variables
export GOOGLE_BOOKS_API_KEY="your-free-key"
export DPLA_API_KEY="your-free-key"
export EUROPEANA_API_KEY="your-free-key"

# 2. Run enhanced script
node acquire-covers-enhanced.js --limit 100

# 3. For problematic publishers, use direct URLs
node acquire-covers-publishers.js --publisher "Steidl"
```

## Rate Limit Management (Free Tier)

| API | Free Limit | Per Second | Strategy |
|-----|------------|------------|----------|
| Google Books | 10,000/day | 10/sec | Use API key |
| Open Library | Unlimited* | Be nice | 1 req/sec |
| Archive.org | Unlimited* | Be nice | 2 req/sec |
| DPLA | 50,000/day | None | Batch requests |
| Europeana | 10,000/day | None | Cache results |

*Reasonable use expected

## ROI Analysis

**Free APIs**:
- Cost: $0
- Coverage: 60-70%
- Time to implement: 1-2 days

**Paid APIs** (Amazon, etc):
- Cost: $20-60/month
- Coverage: 85-95%
- Time to implement: 3-5 days

**Recommendation**: Start with free APIs, which should cover most needs for an art/photography collection.