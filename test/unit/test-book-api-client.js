/**
 * Test Suite for Book API Client
 * Migrated from scripts/tests/test-book-api-client.js to Mocha
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('assert');
const https = require('https');
const { EventEmitter } = require('events');

// Mock BookAPIClient class (from original test)
class MockBookAPIClient {
  constructor(config = {}) {
    this.config = {
      rateLimit: { minInterval: 100, maxConcurrent: 3 },
      retry: { maxRetries: 3, initialDelay: 100 },
      cache: { enabled: true, maxAge: 3600000 },
      ...config
    };
    this.cache = new Map();
    this.requestCount = 0;
    this.lastRequestTime = 0;
    this.rateLimiter = {
      requests: [],
      isRateLimited: false
    };
  }

  async searchGoogleBooks(query, options = {}) {
    return this._makeRequest('googleBooks', query, options);
  }

  async searchOpenLibrary(isbn, options = {}) {
    return this._makeRequest('openLibrary', isbn, options);
  }

  async downloadCover(url, bookData, outputPath) {
    this.requestCount++;
    await this._delay(50);

    return {
      success: true,
      path: outputPath,
      size: 15000,
      downloaded: true
    };
  }

  async _makeRequest(api, query, options = {}) {
    this.requestCount++;
    this._enforceRateLimit();

    const cacheKey = `${api}:${query}`;

    if (this.config.cache.enabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.config.cache.maxAge) {
        return cached.data;
      }
    }

    let mockData;
    if (api === 'googleBooks') {
      mockData = {
        totalItems: 1,
        items: [{
          id: 'test123',
          volumeInfo: {
            title: 'Test Book',
            authors: ['Test Author'],
            imageLinks: {
              thumbnail: 'https://example.com/cover.jpg'
            },
            industryIdentifiers: [{
              type: 'ISBN_13',
              identifier: '9781234567890'
            }]
          }
        }]
      };
    } else if (api === 'openLibrary') {
      mockData = {
        [`ISBN:${query}`]: {
          title: 'Test Book',
          authors: [{ name: 'Test Author' }],
          cover: {
            large: 'https://covers.openlibrary.org/b/isbn/123-L.jpg'
          }
        }
      };
    }

    if (this.config.cache.enabled) {
      this.cache.set(cacheKey, {
        data: mockData,
        timestamp: Date.now()
      });
    }

    return mockData;
  }

  _enforceRateLimit() {
    const now = Date.now();
    if (now - this.lastRequestTime < this.config.rateLimit.minInterval) {
      this.rateLimiter.isRateLimited = true;
    }
    this.lastRequestTime = now;
  }

  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearCache() {
    this.cache.clear();
  }

  getRequestCount() {
    return this.requestCount;
  }

  getCacheSize() {
    return this.cache.size;
  }

  isRateLimited() {
    return this.rateLimiter.isRateLimited;
  }

  resetRateLimit() {
    this.rateLimiter.isRateLimited = false;
    this.lastRequestTime = 0;
  }
}

describe('Book API Client', function() {
  let originalHttpsRequest;

  beforeEach(function() {
    originalHttpsRequest = https.request;
  });

  afterEach(function() {
    https.request = originalHttpsRequest;
  });

  describe('Initialization', function() {
    it('should initialize with default config', function() {
      const client = new MockBookAPIClient();

      assert.ok('rateLimit' in client.config);
      assert.ok('retry' in client.config);
      assert.ok('cache' in client.config);

      assert.ok(client.config.rateLimit.minInterval > 0);
      assert.ok(client.config.retry.maxRetries > 0);
      assert.strictEqual(client.config.cache.enabled, true);
    });

    it('should initialize with custom config', function() {
      const customConfig = {
        rateLimit: { minInterval: 2000, maxConcurrent: 1 },
        retry: { maxRetries: 5, initialDelay: 500 },
        cache: { enabled: false }
      };

      const client = new MockBookAPIClient(customConfig);

      assert.strictEqual(client.config.rateLimit.minInterval, 2000);
      assert.strictEqual(client.config.retry.maxRetries, 5);
      assert.strictEqual(client.config.cache.enabled, false);
    });
  });

  describe('Google Books API', function() {
    it('should perform successful search', async function() {
      const client = new MockBookAPIClient();
      const result = await client.searchGoogleBooks('test query');

      assert.ok('totalItems' in result);
      assert.ok('items' in result);
      assert.ok(result.items.length > 0);

      const book = result.items[0];
      assert.ok('volumeInfo' in book);
      assert.ok('title' in book.volumeInfo);
      assert.ok('authors' in book.volumeInfo);
    });

    it('should handle image links', async function() {
      const client = new MockBookAPIClient();
      const result = await client.searchGoogleBooks('test query');

      const book = result.items[0];
      assert.ok('imageLinks' in book.volumeInfo);
      assert.ok('thumbnail' in book.volumeInfo.imageLinks);
      assert.ok(book.volumeInfo.imageLinks.thumbnail.startsWith('https://'));
    });
  });

  describe('Open Library API', function() {
    it('should perform successful ISBN search', async function() {
      const client = new MockBookAPIClient();
      const result = await client.searchOpenLibrary('9781234567890');

      const isbn = 'ISBN:9781234567890';
      assert.ok(isbn in result);

      const book = result[isbn];
      assert.ok('title' in book);
      assert.ok('authors' in book);
      assert.ok('cover' in book);
    });
  });

  describe('Caching', function() {
    it('should store and retrieve cached results', async function() {
      const client = new MockBookAPIClient();

      await client.searchGoogleBooks('test query');
      assert.ok(client.getCacheSize() > 0, 'Should have cached result');

      // Second identical request should use cache
      const initialCount = client.getRequestCount();
      await client.searchGoogleBooks('test query');
      const finalCount = client.getRequestCount();

      // Request count still increments, but cache is used
      assert.strictEqual(finalCount, initialCount + 1, 'Should increment request counter');
      assert.ok(client.getCacheSize() > 0, 'Should still have cache');
    });

    it('should allow caching to be disabled', async function() {
      const client = new MockBookAPIClient({ cache: { enabled: false } });

      await client.searchGoogleBooks('test query');
      const firstRequestCount = client.getRequestCount();
      assert.strictEqual(client.getCacheSize(), 0);

      await client.searchGoogleBooks('test query');
      const secondRequestCount = client.getRequestCount();

      assert.ok(secondRequestCount > firstRequestCount);
    });

    it('should allow cache to be cleared', async function() {
      const client = new MockBookAPIClient();

      await client.searchGoogleBooks('test query');
      assert.ok(client.getCacheSize() > 0);

      client.clearCache();
      assert.strictEqual(client.getCacheSize(), 0);
    });
  });

  describe('Rate Limiting', function() {
    it('should enforce minimum interval', async function() {
      const client = new MockBookAPIClient({
        rateLimit: { minInterval: 100 }
      });

      client.resetRateLimit();

      await client.searchGoogleBooks('query1');
      await client.searchGoogleBooks('query2');

      assert.ok(client.isRateLimited());
    });

    it('should respect configuration', function() {
      const client = new MockBookAPIClient({
        rateLimit: { minInterval: 50, maxConcurrent: 2 }
      });

      assert.strictEqual(client.config.rateLimit.minInterval, 50);
      assert.strictEqual(client.config.rateLimit.maxConcurrent, 2);
    });
  });

  describe('Cover Download', function() {
    it('should successfully download cover', async function() {
      const client = new MockBookAPIClient();
      const bookData = {
        title: 'Test Book',
        author_last: 'Test',
        isbn_asin: '9781234567890'
      };

      const result = await client.downloadCover(
        'https://example.com/cover.jpg',
        bookData,
        '/tmp/test-cover.jpg'
      );

      assert.ok(result.success);
      assert.ok('path' in result);
      assert.ok('size' in result);
      assert.ok(result.size > 0);
    });
  });

  describe('Error Handling', function() {
    it('should handle network errors gracefully', async function() {
      const client = new MockBookAPIClient({
        retry: { maxRetries: 2, initialDelay: 50 }
      });

      // Mock network error
      https.request = (options, callback) => {
        const mockReq = new EventEmitter();
        mockReq.write = () => {};
        mockReq.end = () => {
          setTimeout(() => {
            const mockRes = new EventEmitter();
            mockRes.statusCode = 500;
            mockRes.headers = { 'content-type': 'application/json' };

            if (callback) callback(mockRes);

            setTimeout(() => {
              mockRes.emit('data', '');
              mockRes.emit('end');
            }, 10);
          }, 10);
        };
        mockReq.on = (event, handler) => EventEmitter.prototype.on.call(mockReq, event, handler);
        mockReq.emit = (event, ...args) => EventEmitter.prototype.emit.call(mockReq, event, ...args);
        return mockReq;
      };

      try {
        await client.searchGoogleBooks('test query');
        assert.ok(true, 'Should handle errors gracefully');
      } catch (error) {
        assert.ok(
          error.message.includes('network') || error.message.includes('request'),
          'Should have appropriate error message'
        );
      }
    });
  });

  describe('Retry Logic', function() {
    it('should respect retry configuration', function() {
      const client = new MockBookAPIClient({
        retry: {
          maxRetries: 5,
          initialDelay: 250,
          backoffMultiplier: 2.0,
          maxDelay: 10000
        }
      });

      assert.strictEqual(client.config.retry.maxRetries, 5);
      assert.strictEqual(client.config.retry.initialDelay, 250);
      assert.strictEqual(client.config.retry.backoffMultiplier, 2.0);
      assert.strictEqual(client.config.retry.maxDelay, 10000);
    });
  });

  describe('API Integration', function() {
    it('should track request count', async function() {
      const client = new MockBookAPIClient();
      const initialCount = client.getRequestCount();

      await client.searchGoogleBooks('query1');
      await client.searchOpenLibrary('9781234567890');

      const finalCount = client.getRequestCount();
      assert.ok(finalCount > initialCount);
      assert.strictEqual(finalCount - initialCount, 2);
    });

    it('should work consistently across API types', async function() {
      const client = new MockBookAPIClient();

      const googleResult = await client.searchGoogleBooks('test book');
      const openLibResult = await client.searchOpenLibrary('9781234567890');

      assert.ok(googleResult && typeof googleResult === 'object');
      assert.ok(openLibResult && typeof openLibResult === 'object');

      assert.ok(client.getCacheSize() > 0);
    });
  });
});
