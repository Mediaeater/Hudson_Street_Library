# Book Cover API Coverage Enhancement Plan

## Current API Usage Analysis

### 1. Open Library API
**Current Implementation**: Primary source
- **Endpoint**: `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
- **Success Rate**: ~20-30% for art/photography books
- **Limitations**:
  - Limited coverage for specialized art publishers
  - HTTP 302 redirects causing failures
  - No support for alternative identifiers

### 2. Google Books API
**Current Implementation**: Fallback source
- **Endpoint**: `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`
- **Success Rate**: ~15-25% for our collection
- **Limitations**:
  - Rate limiting without API key
  - Lower quality thumbnails
  - Limited coverage for rare/art books

## Recommended Additional APIs

### 1. **Amazon Product Advertising API** ⭐⭐⭐⭐⭐
**Best for**: Contemporary books, high-quality images
- **Coverage**: 95%+ for books with valid ISBNs
- **Image Quality**: Multiple sizes, high resolution
- **Requirements**: AWS account, approval process
- **Cost**: Pay-per-request (~$0.0004/request)
- **Implementation Priority**: HIGH

### 2. **LibraryThing API** ⭐⭐⭐⭐
**Best for**: Rare books, user-contributed covers
- **Coverage**: Good for obscure/rare titles
- **Unique Feature**: Community-uploaded covers
- **API Key**: Required (free for non-commercial)
- **Rate Limit**: 1,000/day
- **Implementation Priority**: HIGH

### 3. **WorldCat Search API** ⭐⭐⭐⭐
**Best for**: Academic and library collections
- **Coverage**: Extensive for academic publishers
- **OCLC Numbers**: Alternative to ISBN
- **Requirements**: OCLC membership or API key
- **Implementation Priority**: MEDIUM

### 4. **ISBNdb API** ⭐⭐⭐
**Best for**: ISBN validation and metadata
- **Features**: ISBN validation, alternative editions
- **Cost**: $10-50/month depending on usage
- **Coverage**: Good metadata, limited covers
- **Implementation Priority**: MEDIUM

### 5. **Publisher-Specific APIs**

#### Steidl Verlag
- Direct publisher API for their catalog
- High-quality images guaranteed
- Contact: api@steidl.de

#### Aperture Foundation
- Publisher API for photography books
- RSS/XML feed available
- Implementation via web scraping allowed

#### MACK Books
- Modern API with full catalog access
- High-resolution covers
- OAuth authentication

### 6. **Alternative Data Sources**

#### Bookfinder.com Scraping
- Aggregates multiple sources
- Good for rare/out-of-print books
- Requires respectful scraping

#### Publisher Catalogs
- Direct PDF/Excel downloads
- Batch processing possible
- Manual but comprehensive

## Implementation Strategy

### Phase 1: Quick Wins (1-2 days)
1. Add API key to Google Books for higher limits
2. Implement LibraryThing API
3. Fix HTTP 302 redirect handling

### Phase 2: Amazon Integration (3-5 days)
1. Set up AWS account and get API approval
2. Implement Amazon Product API
3. Add caching layer for API responses

### Phase 3: Advanced Sources (1 week)
1. WorldCat API integration
2. Publisher-specific APIs
3. Web scraping for aggregators

### Phase 4: Data Enhancement (ongoing)
1. OCLC number collection
2. Alternative identifier mapping
3. Publisher catalog ingestion

## Code Implementation Example

```javascript
// Enhanced API Manager
class BookCoverAPIManager {
    constructor(config) {
        this.apis = {
            openLibrary: new OpenLibraryAPI(),
            googleBooks: new GoogleBooksAPI(config.googleApiKey),
            amazon: new AmazonAPI(config.aws),
            libraryThing: new LibraryThingAPI(config.libraryThingKey),
            worldcat: new WorldCatAPI(config.worldcatKey)
        };
        this.cache = new Map();
    }

    async findCover(book) {
        const cacheKey = book.isbn || book.oclc || book.title;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Try each API in priority order
        const apiOrder = this.determineAPIOrder(book);
        
        for (const apiName of apiOrder) {
            try {
                const cover = await this.apis[apiName].getCover(book);
                if (cover) {
                    this.cache.set(cacheKey, cover);
                    return { url: cover, source: apiName };
                }
            } catch (error) {
                console.log(`${apiName} failed:`, error.message);
            }
        }
        
        return null;
    }

    determineAPIOrder(book) {
        // Art/photography books
        if (book.publisher?.match(/Steidl|Aperture|MACK/i)) {
            return ['amazon', 'worldcat', 'libraryThing', 'openLibrary', 'googleBooks'];
        }
        
        // Rare/vintage books
        if (parseInt(book.year) < 2000) {
            return ['libraryThing', 'worldcat', 'amazon', 'openLibrary', 'googleBooks'];
        }
        
        // Default order
        return ['amazon', 'openLibrary', 'googleBooks', 'libraryThing', 'worldcat'];
    }
}
```

## Expected Coverage Improvements

### Current Coverage
- Books with covers: 228/1,333 (17.1%)
- Books with valid ISBNs: 387 (29%)
- API success rate: ~32%

### Projected Coverage with Enhancements
- **With Amazon API**: +40-50% coverage
- **With LibraryThing**: +10-15% for rare books
- **With Publisher APIs**: +5-10% for art books
- **Total Expected**: 60-70% coverage (800+ books)

## Cost Analysis

### One-Time Costs
- ISBNdb subscription: $10-50/month
- Development time: 40-60 hours

### Ongoing Costs
- Amazon API: ~$0.40 per 1,000 requests
- API hosting/caching: ~$5-10/month
- Total monthly: ~$20-60

## Risk Mitigation

1. **API Downtime**: Implement fallback chain
2. **Rate Limiting**: Add request queuing and caching
3. **Cost Overruns**: Set monthly limits
4. **Legal Issues**: Respect robots.txt and ToS

## Success Metrics

1. **Coverage Rate**: Target 70% of collection
2. **API Success Rate**: Target 80% for valid ISBNs
3. **Cost per Cover**: Target < $0.01
4. **Processing Time**: < 2 seconds per book

## Next Steps

1. **Immediate Actions**:
   - Get Google Books API key
   - Apply for LibraryThing API
   - Fix redirect handling

2. **Short Term** (This Week):
   - Amazon API application
   - Implement caching layer
   - Add retry logic

3. **Medium Term** (This Month):
   - Publisher API outreach
   - OCLC integration
   - Batch processing tools

## Conclusion

By implementing these API enhancements, we can increase book cover coverage from 17% to 60-70%, significantly improving the user experience and making the Hudson Street Library a more visually engaging resource for photography and art book enthusiasts.