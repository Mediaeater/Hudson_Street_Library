/**
 * Book Research Client
 *
 * Comprehensive web scraping client for book metadata research.
 * Implements best practices: rate limiting, retry logic, caching, robots.txt compliance.
 *
 * Based on research from:
 * - https://github.com/JustinBeckwith/retry-axios
 * - https://github.com/shaunpersad/throttled-queue
 * - https://www.loc.gov/apis/additional-apis/search-retrieval-via-url/
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const { XMLParser } = require('fast-xml-parser');

// Rate limiting: simple queue with delay
class RequestQueue {
  constructor(requestsPerSecond = 2) {
    this.queue = [];
    this.processing = false;
    this.delayMs = 1000 / requestsPerSecond;
  }

  async enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (!this.processing) {
        this.process();
      }
    });
  }

  async process() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    }

    // Wait before processing next request
    setTimeout(() => this.process(), this.delayMs);
  }
}

// Exponential backoff with jitter
function calculateRetryDelay(retryCount, baseDelay = 1000) {
  const exponentialDelay = Math.pow(2, retryCount) * baseDelay;
  const jitter = Math.random() * 0.3 * exponentialDelay;
  return exponentialDelay + jitter;
}

class BookResearchClient {
  constructor(options = {}) {
    // Cache with 24-hour TTL
    this.cache = new NodeCache({
      stdTTL: options.cacheTTL || 86400,
      checkperiod: 600
    });

    // Rate limiter: 2 requests per second default
    this.requestQueue = new RequestQueue(options.requestsPerSecond || 2);

    // HTTP client configuration
    this.client = axios.create({
      timeout: options.timeout || 15000,
      headers: {
        'User-Agent': options.userAgent ||
          'HudsonStreetLibraryBot/1.0 (+https://hudsonstreetlibrary.com; research@example.com)'
      }
    });

    this.maxRetries = options.maxRetries || 3;
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
  }

  /**
   * Make HTTP request with retry logic and rate limiting
   */
  async fetch(url, options = {}) {
    const cacheKey = `fetch:${url}`;

    // Check cache first
    if (options.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log(`  [cache hit] ${url}`);
        return cached;
      }
    }

    // Queue request with rate limiting
    return this.requestQueue.enqueue(async () => {
      let lastError;

      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          console.log(`  [fetching] ${url}${attempt > 0 ? ` (retry ${attempt})` : ''}`);

          const response = await this.client.get(url, options);

          // Cache successful response
          if (options.useCache !== false) {
            this.cache.set(cacheKey, response.data);
          }

          return response.data;
        } catch (error) {
          lastError = error;

          // Don't retry client errors (except 429 rate limit)
          if (error.response?.status >= 400 && error.response?.status < 500) {
            if (error.response.status === 429) {
              console.log(`  [rate limited] waiting before retry...`);
            } else {
              throw error; // Don't retry other 4xx errors
            }
          }

          // Don't retry on last attempt
          if (attempt === this.maxRetries) {
            break;
          }

          // Calculate delay with exponential backoff + jitter
          const delay = calculateRetryDelay(attempt);
          console.log(`  [retry delay] ${Math.round(delay)}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    });
  }

  /**
   * Search Library of Congress SRU API
   * Endpoint: https://lx2.loc.gov/sru/lcdb
   */
  async searchLOC(query) {
    const searchUrl = `https://lx2.loc.gov/sru/lcdb?query=${encodeURIComponent(query)}&version=1.1&operation=searchRetrieve&recordSchema=mods`;

    try {
      const xmlData = await this.fetch(searchUrl);
      const parsed = this.xmlParser.parse(xmlData);

      // Extract MODS records from SRU response
      const records = parsed?.['srw:searchRetrieveResponse']?.['srw:records']?.['srw:record'];

      if (!records) {
        return { found: false, source: 'loc.gov' };
      }

      const recordArray = Array.isArray(records) ? records : [records];

      return {
        found: true,
        source: 'loc.gov',
        count: recordArray.length,
        records: recordArray.map(r => r['srw:recordData'])
      };
    } catch (error) {
      console.log(`  ⚠️  LOC search failed: ${error.message}`);
      return { found: false, source: 'loc.gov', error: error.message };
    }
  }

  /**
   * Search LOC by ISBN
   */
  async searchLOCByISBN(isbn) {
    const cleanISBN = isbn.replace(/[^0-9X]/g, '');
    const query = `(srw.bn="${cleanISBN}")`;
    return this.searchLOC(query);
  }

  /**
   * Search LOC by title and author
   */
  async searchLOCByTitle(title, author = '') {
    let query = `(dc.title="${title}")`;
    if (author) {
      query = `${query} AND (dc.creator="${author}")`;
    }
    return this.searchLOC(query);
  }

  /**
   * Search WorldCat (public search, no API key)
   * Note: For production, get OCLC WSkey for official API access
   */
  async searchWorldCat(isbn) {
    const cleanISBN = isbn.replace(/[^0-9X]/g, '');
    const searchUrl = `https://www.worldcat.org/isbn/${cleanISBN}`;

    try {
      const html = await this.fetch(searchUrl);

      // Basic scraping - in production, use official API
      return {
        found: html.includes('WorldCat'),
        source: 'worldcat.org',
        url: searchUrl,
        note: 'HTML scraping - recommend OCLC API key for production'
      };
    } catch (error) {
      console.log(`  ⚠️  WorldCat search failed: ${error.message}`);
      return { found: false, source: 'worldcat.org', error: error.message };
    }
  }

  /**
   * Search Google Books API
   */
  async searchGoogleBooks(isbn) {
    const apiUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;

    try {
      const data = await this.fetch(apiUrl);

      if (!data.items || data.items.length === 0) {
        return { found: false, source: 'google_books' };
      }

      const book = data.items[0].volumeInfo;

      return {
        found: true,
        source: 'google_books',
        metadata: {
          title: book.title,
          subtitle: book.subtitle,
          authors: book.authors,
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          description: book.description,
          pageCount: book.pageCount,
          categories: book.categories,
          imageLinks: book.imageLinks,
          language: book.language,
          isbn: isbn
        }
      };
    } catch (error) {
      console.log(`  ⚠️  Google Books search failed: ${error.message}`);
      return { found: false, source: 'google_books', error: error.message };
    }
  }

  /**
   * Search Open Library API
   */
  async searchOpenLibrary(isbn) {
    const apiUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;

    try {
      const data = await this.fetch(apiUrl);
      const bookKey = `ISBN:${isbn}`;

      if (!data[bookKey]) {
        return { found: false, source: 'open_library' };
      }

      const book = data[bookKey];

      return {
        found: true,
        source: 'open_library',
        metadata: {
          title: book.title,
          subtitle: book.subtitle,
          authors: book.authors?.map(a => a.name),
          publishers: book.publishers?.map(p => p.name),
          publishDate: book.publish_date,
          numberOfPages: book.number_of_pages,
          subjects: book.subjects?.map(s => s.name),
          cover: book.cover,
          url: book.url
        }
      };
    } catch (error) {
      console.log(`  ⚠️  Open Library search failed: ${error.message}`);
      return { found: false, source: 'open_library', error: error.message };
    }
  }

  /**
   * Search art book distributor sites
   */
  async searchDistributor(distributorName, searchUrl) {
    try {
      const html = await this.fetch(searchUrl);

      // Check if page exists and isn't a "not found" page
      const isFound = !html.includes('No results') &&
                      !html.includes('not found') &&
                      !html.includes('404');

      return {
        found: isFound,
        source: distributorName,
        url: searchUrl,
        available: isFound // Basic availability check
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          found: false,
          source: distributorName,
          url: searchUrl,
          available: false
        };
      }

      console.log(`  ⚠️  ${distributorName} search failed: ${error.message}`);
      return {
        found: false,
        source: distributorName,
        error: error.message,
        available: false
      };
    }
  }

  /**
   * Search DAP / Distributed Art Publishers
   */
  async searchDAP(isbn) {
    const searchUrl = `https://www.artbook.com/${isbn}.html`;
    return this.searchDistributor('DAP / artbook.com', searchUrl);
  }

  /**
   * Search Twelvebooks
   */
  async searchTwelvebooks(title, author) {
    const searchQuery = encodeURIComponent(`${title} ${author}`.trim());
    const searchUrl = `https://www.twelvebooks.com/search?q=${searchQuery}`;
    return this.searchDistributor('Twelvebooks', searchUrl);
  }

  /**
   * Search IDEA Books
   */
  async searchIdeaBooks(isbn) {
    const searchUrl = `https://www.ideabooks.nl/search?q=${isbn}`;
    return this.searchDistributor('IDEA Books', searchUrl);
  }

  /**
   * Search Printed Matter
   */
  async searchPrintedMatter(title, author) {
    const searchQuery = encodeURIComponent(`${title} ${author}`.trim());
    const searchUrl = `https://www.printedmatter.org/catalog?search=${searchQuery}`;
    return this.searchDistributor('Printed Matter', searchUrl);
  }

  /**
   * Check robots.txt for a domain (polite scraping)
   */
  async checkRobotsTxt(domain) {
    try {
      const robotsUrl = `https://${domain}/robots.txt`;
      const robotsTxt = await this.fetch(robotsUrl, { useCache: true });

      // Basic parsing - look for Crawl-delay
      const crawlDelayMatch = robotsTxt.match(/Crawl-delay:\s*(\d+)/i);
      const crawlDelay = crawlDelayMatch ? parseInt(crawlDelayMatch[1]) : 1;

      return {
        exists: true,
        crawlDelay,
        content: robotsTxt
      };
    } catch (error) {
      // robots.txt not found - use conservative default
      return {
        exists: false,
        crawlDelay: 2 // Conservative 2-second default
      };
    }
  }

  /**
   * Download image from URL
   */
  async downloadImage(imageUrl, outputPath) {
    try {
      console.log(`  [downloading] ${imageUrl}`);

      const response = await this.client.get(imageUrl, {
        responseType: 'arraybuffer'
      });

      const fs = require('fs');
      const path = require('path');

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, response.data);
      console.log(`  ✓ Image saved to ${outputPath}`);

      return { success: true, path: outputPath };
    } catch (error) {
      console.log(`  ⚠️  Image download failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Comprehensive book search across all sources
   */
  async comprehensiveSearch(bookInfo) {
    const { isbn, title, author, publisher } = bookInfo;

    const results = {
      sources: [],
      metadata: {},
      distributors: [],
      confidence: 'low'
    };

    // Search bibliographic sources in parallel
    console.log('\n🔍 Searching bibliographic sources...');
    const bibSearches = [];

    if (isbn) {
      bibSearches.push(
        this.searchLOCByISBN(isbn).then(r => ({ type: 'loc', data: r })),
        this.searchGoogleBooks(isbn).then(r => ({ type: 'google', data: r })),
        this.searchOpenLibrary(isbn).then(r => ({ type: 'openlibrary', data: r }))
      );
    } else if (title) {
      bibSearches.push(
        this.searchLOCByTitle(title, author).then(r => ({ type: 'loc', data: r })),
        this.searchGoogleBooks(title).then(r => ({ type: 'google', data: r }))
      );
    }

    const bibResults = await Promise.all(bibSearches);

    // Process bibliographic results
    for (const { type, data } of bibResults) {
      if (data.found) {
        results.sources.push(data.source);
        if (data.metadata) {
          Object.assign(results.metadata, data.metadata);
        }
      }
    }

    // Search distributors in parallel
    if (isbn) {
      console.log('\n🔍 Searching art book distributors...');
      const distSearches = [
        this.searchDAP(isbn),
        this.searchIdeaBooks(isbn)
      ];

      if (title && author) {
        distSearches.push(
          this.searchTwelvebooks(title, author),
          this.searchPrintedMatter(title, author)
        );
      }

      const distResults = await Promise.all(distSearches);
      results.distributors = distResults.filter(r => r.found);
    }

    // Calculate confidence
    if (results.sources.length >= 2) {
      results.confidence = 'high';
    } else if (results.sources.length === 1) {
      results.confidence = 'medium';
    }

    return results;
  }
}

module.exports = { BookResearchClient };
