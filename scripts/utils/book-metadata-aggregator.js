/**
 * Book Metadata Aggregator
 *
 * Multi-source intelligent book data gathering system.
 * Priority order:
 *   1. Publisher's website (most accurate, primary source)
 *   2. Library of Congress
 *   3. Internet Archive
 *   4. Google Books API
 *   5. Open Library
 *   6. WorldCat
 *   7. LibraryThing
 *
 * Aggregates and merges data from all sources to create the most
 * comprehensive book record possible.
 */

const https = require('https');
const { BookAPIClient } = require('./book-api-client');

/**
 * High-quality data sources for art and photography books
 */
const DATA_SOURCES = {
  // Publisher websites - highest priority, most accurate
  publishers: {
    priority: 1,
    enabled: true,
    description: 'Publisher website (primary source)'
  },

  // Library of Congress - comprehensive, authoritative
  loc: {
    priority: 2,
    enabled: true,
    baseUrl: 'https://www.loc.gov/books/',
    apiUrl: 'https://www.loc.gov/search/?q={query}&fo=json',
    description: 'Library of Congress'
  },

  // Internet Archive - good for older/rare books
  internetArchive: {
    priority: 3,
    enabled: true,
    apiUrl: 'https://archive.org/advancedsearch.php?q={query}&output=json',
    description: 'Internet Archive'
  },

  // Existing APIs from BookAPIClient
  googleBooks: {
    priority: 4,
    enabled: true,
    description: 'Google Books API'
  },

  openLibrary: {
    priority: 5,
    enabled: true,
    description: 'Open Library'
  },

  worldCat: {
    priority: 6,
    enabled: true,
    description: 'WorldCat'
  },

  libraryThing: {
    priority: 7,
    enabled: true,
    description: 'LibraryThing'
  }
};

/**
 * Known publisher website patterns for scraping
 */
const PUBLISHER_PATTERNS = {
  'walther-koenig.de': {
    titleSelector: 'h1.product-title',
    authorSelector: '.product-author',
    descriptionSelector: '.product-description',
    isbnSelector: '.product-isbn',
    priceSelector: '.product-price',
    imageSelector: '.product-image img',
    specsSelector: '.product-specs'
  },

  'steidl.de': {
    titleSelector: 'h1',
    authorSelector: '.author',
    descriptionSelector: '.description',
    isbnSelector: '[data-isbn]',
    imageSelector: '.book-cover img'
  },

  'aperture.org': {
    titleSelector: 'h1.product-name',
    authorSelector: '.product-author',
    descriptionSelector: '.product-description',
    isbnSelector: '.product-isbn'
  },

  'moma.org': {
    titleSelector: 'h1',
    descriptionSelector: '.description',
    authorSelector: '.artist-name'
  },

  'loosejoints.biz': {
    titleSelector: '.product-title',
    authorSelector: '.product-vendor',
    descriptionSelector: '.product-description',
    priceSelector: '.price'
  },

  'photobooks.io': {
    titleSelector: 'h1',
    authorSelector: '.author',
    descriptionSelector: '.description'
  }
};

class BookMetadataAggregator {
  constructor(config = {}) {
    this.apiClient = new BookAPIClient(config.apiClient || {});
    this.config = {
      timeout: config.timeout || 20000,
      userAgent: config.userAgent || 'Hudson Street Library Metadata Aggregator',
      enablePublisherScraping: config.enablePublisherScraping !== false,
      sources: config.sources || DATA_SOURCES,
      ...config
    };

    this.results = {};
    this.metadata = {};
  }

  /**
   * Main entry point: search all sources and aggregate results
   */
  async searchAll(bookInfo) {
    console.log('\n🔍 COMPREHENSIVE METADATA SEARCH');
    console.log('═══════════════════════════════════════════════════');
    console.log(`Title: ${bookInfo.title}`);
    console.log(`Author: ${bookInfo.author || '(not specified)'}`);
    console.log(`Publisher: ${bookInfo.publisher || '(not specified)'}`);
    console.log(`ISBN: ${bookInfo.isbn || '(not specified)'}`);
    if (bookInfo.publisher_url) {
      console.log(`Publisher URL: ${bookInfo.publisher_url}`);
    }
    console.log('═══════════════════════════════════════════════════\n');

    const sources = this._getEnabledSources();

    // Search each source in priority order
    for (const source of sources) {
      await this._searchSource(source, bookInfo);
    }

    // Aggregate and merge all results
    return this._aggregateResults();
  }

  /**
   * Get enabled sources sorted by priority
   */
  _getEnabledSources() {
    return Object.entries(this.config.sources)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority)
      .map(([name, config]) => ({ name, ...config }));
  }

  /**
   * Search a specific data source
   */
  async _searchSource(source, bookInfo) {
    console.log(`\n📚 [${source.priority}] Searching: ${source.description}`);

    try {
      let result;

      switch (source.name) {
        case 'publishers':
          result = await this._searchPublisherWebsite(bookInfo);
          break;
        case 'loc':
          result = await this._searchLibraryOfCongress(bookInfo);
          break;
        case 'internetArchive':
          result = await this._searchInternetArchive(bookInfo);
          break;
        case 'googleBooks':
          result = await this.apiClient.searchGoogleBooks(bookInfo);
          break;
        case 'openLibrary':
          result = await this.apiClient.searchOpenLibrary(bookInfo);
          break;
        case 'worldCat':
          result = await this.apiClient.searchWorldCat(bookInfo);
          break;
        case 'libraryThing':
          result = await this.apiClient.searchLibraryThing(bookInfo);
          break;
        default:
          console.log(`  ⚠️  Unknown source: ${source.name}`);
          return;
      }

      if (result && result.found) {
        this.results[source.name] = result;
        console.log(`  ✅ Found data in ${source.description}`);
        this._displayResult(result);
      } else {
        console.log(`  ❌ No data found in ${source.description}`);
      }

    } catch (error) {
      console.log(`  ❌ Error searching ${source.description}: ${error.message}`);
      this.results[source.name] = { found: false, error: error.message };
    }
  }

  /**
   * Search publisher's website for book details
   */
  async _searchPublisherWebsite(bookInfo) {
    if (!bookInfo.publisher_url || !this.config.enablePublisherScraping) {
      return { found: false, reason: 'No publisher URL provided' };
    }

    console.log(`  🌐 Fetching: ${bookInfo.publisher_url}`);

    try {
      // Extract domain to determine scraping pattern
      const url = new URL(bookInfo.publisher_url);
      const domain = url.hostname.replace('www.', '');

      // Fetch the page
      const html = await this._fetchURL(bookInfo.publisher_url);

      // Use domain-specific pattern if available, otherwise generic
      const pattern = PUBLISHER_PATTERNS[domain] || this._detectGenericPattern(html);

      // Extract data using pattern
      const extracted = this._extractFromHTML(html, pattern);

      if (Object.keys(extracted).length > 0) {
        return {
          found: true,
          source: 'Publisher Website',
          sourceUrl: bookInfo.publisher_url,
          metadata: {
            ...extracted,
            _confidence: pattern ? 'high' : 'medium',
            _scrapeDate: new Date().toISOString()
          }
        };
      }

      return { found: false, reason: 'Could not extract data from publisher website' };

    } catch (error) {
      return { found: false, error: error.message };
    }
  }

  /**
   * Search Library of Congress
   */
  async _searchLibraryOfCongress(bookInfo) {
    try {
      // Build search query
      let query;
      if (bookInfo.isbn) {
        query = `isbn:${bookInfo.isbn}`;
      } else {
        const parts = [];
        if (bookInfo.title) parts.push(`title:"${bookInfo.title}"`);
        if (bookInfo.author) parts.push(`author:"${bookInfo.author}"`);
        query = parts.join(' AND ');
      }

      if (!query) {
        return { found: false, reason: 'Insufficient search parameters' };
      }

      const url = this.config.sources.loc.apiUrl.replace('{query}', encodeURIComponent(query));
      const data = await this._fetchJSON(url);

      if (data.results && data.results.length > 0) {
        const item = data.results[0];

        return {
          found: true,
          source: 'Library of Congress',
          metadata: {
            title: item.title,
            author: item.contributor ? item.contributor.join(', ') : null,
            publisher: item.publisher,
            publishedDate: item.date,
            description: item.description ? item.description.join(' ') : null,
            subjects: item.subject || [],
            lccn: item.lccn,
            imageUrl: item.image_url
          }
        };
      }

      return { found: false, reason: 'No results in Library of Congress' };

    } catch (error) {
      return { found: false, error: error.message };
    }
  }

  /**
   * Search Internet Archive
   */
  async _searchInternetArchive(bookInfo) {
    try {
      // Build search query
      let query = [];
      if (bookInfo.isbn) {
        query.push(`isbn:${bookInfo.isbn}`);
      }
      if (bookInfo.title) {
        query.push(`title:"${bookInfo.title}"`);
      }
      if (bookInfo.author) {
        query.push(`creator:"${bookInfo.author}"`);
      }

      if (query.length === 0) {
        return { found: false, reason: 'Insufficient search parameters' };
      }

      const queryString = query.join(' AND ') + ' AND mediatype:texts';
      const url = this.config.sources.internetArchive.apiUrl
        .replace('{query}', encodeURIComponent(queryString));

      const data = await this._fetchJSON(url);

      if (data.response && data.response.docs && data.response.docs.length > 0) {
        const item = data.response.docs[0];

        return {
          found: true,
          source: 'Internet Archive',
          metadata: {
            title: item.title,
            author: item.creator,
            publisher: item.publisher,
            publishedDate: item.date,
            description: item.description,
            subjects: item.subject || [],
            isbn: item.isbn,
            pages: item.imagecount,
            archiveUrl: `https://archive.org/details/${item.identifier}`,
            imageUrl: `https://archive.org/services/img/${item.identifier}`
          }
        };
      }

      return { found: false, reason: 'No results in Internet Archive' };

    } catch (error) {
      return { found: false, error: error.message };
    }
  }

  /**
   * Fetch URL and return HTML content
   */
  async _fetchURL(url) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      https.get(url, {
        headers: {
          'User-Agent': this.config.userAgent,
          'Accept': 'text/html,application/xhtml+xml'
        }
      }, (res) => {
        clearTimeout(timeout);

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }).on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * Fetch URL and parse JSON
   */
  async _fetchJSON(url) {
    const html = await this._fetchURL(url);
    return JSON.parse(html);
  }

  /**
   * Extract data from HTML using pattern
   */
  _extractFromHTML(html, pattern) {
    const extracted = {};

    // Simple regex-based extraction (for production, use cheerio or jsdom)
    for (const [field, selector] of Object.entries(pattern)) {
      try {
        // This is a simplified extraction - in production use proper HTML parser
        const match = html.match(new RegExp(`${selector}[^>]*>([^<]+)<`, 'i'));
        if (match && match[1]) {
          const key = field.replace('Selector', '');
          extracted[key] = match[1].trim();
        }
      } catch (e) {
        // Skip extraction errors
      }
    }

    return extracted;
  }

  /**
   * Detect generic HTML patterns for data extraction
   */
  _detectGenericPattern(html) {
    // Look for common meta tags and structured data
    const patterns = {};

    // Common meta tags
    const metaPatterns = {
      'og:title': 'title',
      'og:description': 'description',
      'og:image': 'image',
      'twitter:title': 'title',
      'twitter:description': 'description'
    };

    for (const [metaTag, field] of Object.entries(metaPatterns)) {
      const regex = new RegExp(`<meta[^>]*property=["']${metaTag}["'][^>]*content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      if (match) {
        patterns[`${field}Selector`] = `meta[property="${metaTag}"]`;
      }
    }

    return patterns;
  }

  /**
   * Aggregate results from all sources into comprehensive record
   */
  _aggregateResults() {
    console.log('\n📊 AGGREGATING RESULTS');
    console.log('═══════════════════════════════════════════════════');

    const aggregated = {
      sources: Object.keys(this.results).filter(k => this.results[k].found),
      confidence: this._calculateConfidence(),
      metadata: this._mergeMetadata()
    };

    console.log(`\nFound data in ${aggregated.sources.length} source(s):`);
    aggregated.sources.forEach(source => {
      console.log(`  ✓ ${this.results[source].source}`);
    });

    console.log(`\nConfidence: ${aggregated.confidence}`);
    console.log('\n═══════════════════════════════════════════════════\n');

    return aggregated;
  }

  /**
   * Calculate confidence score based on source agreement
   */
  _calculateConfidence() {
    const foundCount = Object.values(this.results).filter(r => r.found).length;
    const totalSources = Object.keys(this.config.sources).length;

    if (foundCount === 0) return 'none';
    if (foundCount === 1) return 'low';
    if (foundCount >= 2 && foundCount < 4) return 'medium';
    if (foundCount >= 4) return 'high';

    return 'medium';
  }

  /**
   * Merge metadata from all sources (priority-based)
   */
  _mergeMetadata() {
    const merged = {};

    // Fields to merge
    const fields = [
      'title', 'author', 'authors', 'publisher', 'publishedDate',
      'publication_year', 'description', 'isbn', 'pageCount', 'pages',
      'subjects', 'categories', 'imageUrl', 'price', 'binding'
    ];

    // Merge in priority order (earlier sources override later)
    const sortedResults = Object.entries(this.results)
      .filter(([_, result]) => result.found && result.metadata)
      .sort((a, b) => {
        const priorityA = this.config.sources[a[0]]?.priority || 999;
        const priorityB = this.config.sources[b[0]]?.priority || 999;
        return priorityA - priorityB;
      });

    for (const [sourceName, result] of sortedResults) {
      if (!result.metadata) continue;

      for (const field of fields) {
        if (result.metadata[field] && !merged[field]) {
          merged[field] = result.metadata[field];
          merged[`${field}_source`] = sourceName;
        }
      }
    }

    return merged;
  }

  /**
   * Display result in readable format
   */
  _displayResult(result) {
    if (!result.metadata) return;

    const fields = {
      'Title': result.metadata.title,
      'Author': result.metadata.author || result.metadata.authors?.join(', '),
      'Publisher': result.metadata.publisher,
      'Year': result.metadata.publishedDate || result.metadata.publication_year,
      'ISBN': result.metadata.isbn,
      'Pages': result.metadata.pageCount || result.metadata.pages,
      'Description': result.metadata.description?.substring(0, 100)
    };

    for (const [label, value] of Object.entries(fields)) {
      if (value) {
        console.log(`  ${label}: ${value}${value.length > 100 ? '...' : ''}`);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      searchedSources: Object.keys(this.results).length,
      foundSources: Object.values(this.results).filter(r => r.found).length,
      apiStats: this.apiClient.getStats()
    };
  }
}

module.exports = { BookMetadataAggregator, DATA_SOURCES, PUBLISHER_PATTERNS };
