/**
 * Consolidated Book API Client
 *
 * This module consolidates and replaces duplicate API logic from:
 * - acquire-covers.js (lines 306-398)
 * - scripts/image-pipeline/modules/finder.js (lines 70-147)
 *
 * Features:
 * - Unified API client for Google Books, LibraryThing, Open Library, and WorldCat
 * - Consistent error handling and exponential backoff retry logic
 * - Shared rate limiter for all API calls
 * - Caching mechanism to prevent re-downloading
 * - Integration with shared configuration from image-core.js
 * - Support for both strict and non-strict matching modes
 * - Environment variable support for API keys (LIBRARY_THING_API_KEY)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { promisify } = require('util');
const { IMAGE_CONFIG, generateStandardFilename, validateImage, checkImageExists } = require('./image-core');

// Default configuration
const DEFAULT_CONFIG = {
    // API endpoints
    apis: {
        googleBooks: 'https://www.googleapis.com/books/v1/volumes?q={query}',
        openLibrary: 'https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data',
        worldcat: 'https://covers.oclc.org/ImageWebSvc/oCoverView.asmx/getCoverView?isbn={isbn}&size=L&format=jpg',
        libraryThing: 'https://covers.librarything.com/devkey/large/isbn/{isbn}'
    },

    // Rate limiting settings
    rateLimit: {
        minInterval: 1000,          // 1 second between requests
        maxConcurrent: 3,           // Maximum concurrent requests
        burstLimit: 10              // Maximum requests in burst window
    },

    // Retry configuration
    retry: {
        maxRetries: 3,
        initialDelay: 1000,         // 1 second initial delay
        backoffMultiplier: 1.5,     // Exponential backoff multiplier
        maxDelay: 30000             // Maximum delay (30 seconds)
    },

    // Matching thresholds for strict mode
    matching: {
        authorThreshold: 0.8,
        titleThreshold: 0.8
    },

    // Cache settings
    cache: {
        enabled: true,
        maxAge: 3600000,            // 1 hour in milliseconds
        maxEntries: 1000
    },

    // Request settings
    request: {
        timeout: 15000,             // 15 seconds
        userAgent: 'Hudson Street Library Cover Acquisition Tool',
        maxRedirects: 5
    }
};

/**
 * String similarity calculation using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const s1 = (str1 || '').toLowerCase().trim();
    const s2 = (str2 || '').toLowerCase().trim();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    const matrix = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= s2.length; j++) {
        for (let i = 1; i <= s1.length; i++) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,      // deletion
                matrix[j - 1][i] + 1,      // insertion
                matrix[j - 1][i - 1] + indicator // substitution
            );
        }
    }

    const maxLength = Math.max(s1.length, s2.length);
    return 1 - (matrix[s2.length][s1.length] / maxLength);
}

/**
 * Rate limiter class for managing API request frequency
 */
class RateLimiter {
    constructor(config) {
        this.config = config;
        this.requests = [];
        this.activeRequests = 0;
        this.lastRequestTime = 0;
    }

    async waitForSlot() {
        const now = Date.now();

        // Respect minimum interval between requests
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.config.minInterval) {
            const waitTime = this.config.minInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        // Check concurrent request limit
        while (this.activeRequests >= this.config.maxConcurrent) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Clean old requests from burst window
        const burstWindow = 60000; // 1 minute
        this.requests = this.requests.filter(time => now - time < burstWindow);

        // Check burst limit
        if (this.requests.length >= this.config.burstLimit) {
            const oldestRequest = Math.min(...this.requests);
            const waitTime = burstWindow - (now - oldestRequest);
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        this.requests.push(now);
        this.lastRequestTime = now;
        this.activeRequests++;
    }

    releaseSlot() {
        this.activeRequests = Math.max(0, this.activeRequests - 1);
    }
}

/**
 * Cache implementation for API responses
 */
class APICache {
    constructor(config) {
        this.config = config;
        this.cache = new Map();
        this.enabled = config.enabled;
    }

    get(key) {
        if (!this.enabled) return null;

        const entry = this.cache.get(key);
        if (!entry) return null;

        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.config.maxAge) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    set(key, data) {
        if (!this.enabled) return;

        // Remove oldest entries if cache is full
        if (this.cache.size >= this.config.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    clear() {
        this.cache.clear();
    }

    getStats() {
        return {
            size: this.cache.size,
            maxEntries: this.config.maxEntries,
            enabled: this.enabled
        };
    }
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    return result;
}

/**
 * Main BookAPIClient class
 */
class BookAPIClient {
    constructor(config = {}) {
        this.config = deepMerge(DEFAULT_CONFIG, config);
        this.rateLimiter = new RateLimiter(this.config.rateLimit);
        this.cache = new APICache(this.config.cache);
        this.stats = {
            requests: 0,
            cacheHits: 0,
            errors: 0,
            downloads: 0
        };
    }

    /**
     * Make HTTP request with retry logic and rate limiting
     */
    async makeRequest(url, options = {}) {
        // Merge options with defaults, ensuring userAgent is properly set
        const config = {
            userAgent: this.config.request.userAgent,
            timeout: this.config.request.timeout,
            ...options
        };
        let lastError;

        for (let attempt = 1; attempt <= this.config.retry.maxRetries; attempt++) {
            try {
                await this.rateLimiter.waitForSlot();

                const result = await this._httpRequest(url, config);
                this.rateLimiter.releaseSlot();
                this.stats.requests++;

                return result;

            } catch (error) {
                this.rateLimiter.releaseSlot();
                lastError = error;

                // Don't retry on certain errors
                if (error.code === 404 || error.code === 401 || error.code === 403) {
                    break;
                }

                if (attempt < this.config.retry.maxRetries) {
                    const delay = Math.min(
                        this.config.retry.initialDelay * Math.pow(this.config.retry.backoffMultiplier, attempt - 1),
                        this.config.retry.maxDelay
                    );

                    console.log(`  Request attempt ${attempt}/${this.config.retry.maxRetries} failed: ${error.message}`);
                    console.log(`  Retrying in ${delay}ms...`);

                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        this.stats.errors++;
        throw new Error(`Request failed after ${this.config.retry.maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Internal HTTP request implementation
     */
    _httpRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const requestOptions = {
                headers: {
                    'User-Agent': options.userAgent || this.config.request.userAgent,
                    'Accept': 'application/json'
                },
                timeout: options.timeout || this.config.request.timeout
            };

            const req = https.get(url, requestOptions, (res) => {
                let data = '';

                res.on('data', chunk => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            // Try to parse as JSON, fall back to raw data
                            const parsed = data.trim() ? JSON.parse(data) : data;
                            resolve(parsed);
                        } catch (e) {
                            resolve(data);
                        }
                    } else if (res.statusCode === 429) {
                        reject(new Error(`Rate limited (HTTP 429)`));
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Search for book cover using Google Books API
     */
    async searchGoogleBooks(book, options = {}) {
        const cacheKey = `google_${book.isbn || book.title}_${book.author}`;
        const cached = this.cache.get(cacheKey);

        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }

        try {
            // Build search query
            let query;
            if (book.isbn && book.isbn.match(/^\d{10,13}$/)) {
                query = `isbn:${book.isbn}`;
            } else {
                const parts = [];
                if (book.author) parts.push(`"${book.author}"`);
                if (book.title) parts.push(`"${book.title}"`);
                query = parts.join(' ');
            }

            if (!query) {
                throw new Error('No valid search parameters provided');
            }

            const url = this.config.apis.googleBooks.replace('{query}', encodeURIComponent(query));
            const data = await this.makeRequest(url);

            if (!data.items || data.items.length === 0) {
                const result = { found: false, source: 'Google Books', reason: 'No results found' };
                this.cache.set(cacheKey, result);
                return result;
            }

            // Process results based on strict mode
            let selectedItem = null;

            if (options.strict) {
                // In strict mode, verify author and title matches
                for (const item of data.items) {
                    const volumeInfo = item.volumeInfo;
                    if (!volumeInfo || !volumeInfo.imageLinks) continue;

                    // Check author match
                    const apiAuthors = volumeInfo.authors || [];
                    let authorMatch = false;
                    for (const apiAuthor of apiAuthors) {
                        if (calculateSimilarity(apiAuthor, book.author) >= this.config.matching.authorThreshold) {
                            authorMatch = true;
                            break;
                        }
                    }

                    // Check title match
                    const titleMatch = calculateSimilarity(volumeInfo.title, book.title) >= this.config.matching.titleThreshold;

                    if (authorMatch && titleMatch) {
                        selectedItem = item;
                        console.log(`  ✓ Strict match found: "${volumeInfo.title}" by ${apiAuthors.join(', ')}`);
                        break;
                    }
                }

                if (!selectedItem) {
                    console.log(`  ✗ No strict match found in ${data.items.length} results`);
                    const result = { found: false, source: 'Google Books', reason: 'No strict matches found' };
                    this.cache.set(cacheKey, result);
                    return result;
                }
            } else {
                // Non-strict mode: take first result with image
                selectedItem = data.items.find(item => item.volumeInfo && item.volumeInfo.imageLinks);

                if (!selectedItem) {
                    const result = { found: false, source: 'Google Books', reason: 'No results with images' };
                    this.cache.set(cacheKey, result);
                    return result;
                }
            }

            // Extract image URL
            const links = selectedItem.volumeInfo.imageLinks;
            let imageUrl = links.extraLarge || links.large || links.medium || links.thumbnail || links.smallThumbnail;

            if (imageUrl && imageUrl.startsWith('http://')) {
                imageUrl = imageUrl.replace('http://', 'https://');
            }

            const result = {
                found: true,
                source: 'Google Books',
                imageUrl,
                metadata: {
                    title: selectedItem.volumeInfo.title,
                    authors: selectedItem.volumeInfo.authors,
                    publisher: selectedItem.volumeInfo.publisher,
                    publishedDate: selectedItem.volumeInfo.publishedDate,
                    description: selectedItem.volumeInfo.description,
                    pageCount: selectedItem.volumeInfo.pageCount,
                    categories: selectedItem.volumeInfo.categories
                }
            };

            this.cache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.log(`  Google Books API error: ${error.message}`);
            const result = { found: false, source: 'Google Books', error: error.message };
            this.cache.set(cacheKey, result);
            return result;
        }
    }

    /**
     * Search for book cover using Open Library API
     */
    async searchOpenLibrary(book) {
        if (!book.isbn || !book.isbn.match(/^\d{10,13}$/)) {
            return { found: false, source: 'Open Library', reason: 'No valid ISBN provided' };
        }

        const cacheKey = `openlibrary_${book.isbn}`;
        const cached = this.cache.get(cacheKey);

        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }

        try {
            const url = this.config.apis.openLibrary.replace('{isbn}', book.isbn);
            const data = await this.makeRequest(url);

            const bookKey = `ISBN:${book.isbn}`;
            if (data[bookKey] && data[bookKey].cover) {
                const cover = data[bookKey].cover;
                const imageUrl = cover.large || cover.medium || cover.small;

                if (imageUrl) {
                    const result = {
                        found: true,
                        source: 'Open Library',
                        imageUrl,
                        metadata: {
                            title: data[bookKey].title,
                            authors: data[bookKey].authors ? data[bookKey].authors.map(a => a.name) : [],
                            publishers: data[bookKey].publishers ? data[bookKey].publishers.map(p => p.name) : [],
                            publishDate: data[bookKey].publish_date,
                            subjects: data[bookKey].subjects ? data[bookKey].subjects.map(s => s.name) : []
                        }
                    };

                    this.cache.set(cacheKey, result);
                    return result;
                }
            }

            const result = { found: false, source: 'Open Library', reason: 'No cover image available' };
            this.cache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.log(`  Open Library API error: ${error.message}`);
            const result = { found: false, source: 'Open Library', error: error.message };
            this.cache.set(cacheKey, result);
            return result;
        }
    }

    /**
     * Search for book cover using WorldCat API
     */
    async searchWorldCat(book) {
        if (!book.isbn || !book.isbn.match(/^\d{10,13}$/)) {
            return { found: false, source: 'WorldCat', reason: 'No valid ISBN provided' };
        }

        const cacheKey = `worldcat_${book.isbn}`;
        const cached = this.cache.get(cacheKey);

        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }

        try {
            const url = this.config.apis.worldcat.replace('{isbn}', book.isbn);

            // For WorldCat, we need to check if the image exists by making a HEAD request
            await this.makeRequest(url, { method: 'HEAD' });

            const result = {
                found: true,
                source: 'WorldCat',
                imageUrl: url,
                metadata: {
                    isbn: book.isbn
                }
            };

            this.cache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.log(`  WorldCat API error: ${error.message}`);
            const result = { found: false, source: 'WorldCat', error: error.message };
            this.cache.set(cacheKey, result);
            return result;
        }
    }

    /**
     * Search for book cover using LibraryThing API
     */
    async searchLibraryThing(book) {
        if (!book.isbn || !book.isbn.match(/^\d{10,13}$/)) {
            return { found: false, source: 'LibraryThing', reason: 'No valid ISBN provided' };
        }

        const cacheKey = `librarything_${book.isbn}`;
        const cached = this.cache.get(cacheKey);

        if (cached) {
            this.stats.cacheHits++;
            return cached;
        }

        try {
            // Get API key from environment or use 'devkey' for free tier
            const apiKey = process.env.LIBRARY_THING_API_KEY || 'devkey';

            const coverUrl = this.config.apis.libraryThing
                .replace('devkey', apiKey)
                .replace('{isbn}', book.isbn);

            // LibraryThing covers are direct image URLs, test with HEAD request
            await this._testImageUrl(coverUrl);

            const result = {
                found: true,
                source: 'LibraryThing',
                imageUrl: coverUrl,
                metadata: {
                    isbn: book.isbn
                }
            };

            this.cache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.log(`  LibraryThing cover API error: ${error.message}`);
            const result = {
                found: false,
                source: 'LibraryThing',
                reason: error.message
            };
            this.cache.set(cacheKey, result);
            return result;
        }
    }

    /**
     * Test if an image URL is accessible
     */
    async _testImageUrl(url) {
        return new Promise((resolve, reject) => {
            const requestOptions = {
                method: 'HEAD',
                headers: {
                    'User-Agent': this.config.request.userAgent,
                },
                timeout: this.config.request.timeout
            };

            const req = https.request(url, requestOptions, (res) => {
                if (res.statusCode === 200 || res.statusCode === 302) {
                    resolve();
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    /**
     * Search all APIs for book cover in priority order
     */
    async findBookCover(book, options = {}) {
        const searchOptions = {
            strict: options.strict || false,
            skipExisting: options.skipExisting !== false,
            apis: options.apis || ['googleBooks', 'libraryThing', 'openLibrary', 'worldCat']
        };

        console.log(`🔍 Searching for book cover: "${book.title}" by ${book.author}`);

        // Check if image already exists
        if (searchOptions.skipExisting && options.outputDir) {
            const existsCheck = checkImageExists(book, options.outputDir, { fuzzyMatch: true });
            if (existsCheck.exists) {
                console.log(`  ✓ Image already exists: ${existsCheck.filename}`);
                return {
                    found: true,
                    source: 'Local Cache',
                    localPath: existsCheck.path,
                    skipped: true
                };
            }
        }

        // Try each API in order
        const apiMethods = {
            googleBooks: () => this.searchGoogleBooks(book, searchOptions),
            libraryThing: () => this.searchLibraryThing(book),
            openLibrary: () => this.searchOpenLibrary(book),
            worldCat: () => this.searchWorldCat(book)
        };

        for (const apiName of searchOptions.apis) {
            if (!apiMethods[apiName]) {
                console.log(`  ⚠️  Unknown API: ${apiName}`);
                continue;
            }

            console.log(`  🌐 Trying ${apiName}...`);

            try {
                const result = await apiMethods[apiName]();

                if (result.found && result.imageUrl) {
                    console.log(`  ✅ Found image via ${result.source}`);
                    return result;
                }

                console.log(`  ❌ ${result.reason || result.error || 'No image found'}`);

            } catch (error) {
                console.log(`  ❌ ${apiName} failed: ${error.message}`);
            }
        }

        console.log(`  ❌ No cover found after trying ${searchOptions.apis.length} APIs`);
        return {
            found: false,
            source: 'All APIs',
            reason: 'No cover found in any API'
        };
    }

    /**
     * Download image from URL to local file
     */
    async downloadImage(imageUrl, book, options = {}) {
        const outputDir = options.outputDir || './images';
        const filename = options.filename || generateStandardFilename(book);
        const filepath = path.join(outputDir, filename);

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Check if file already exists
        if (fs.existsSync(filepath) && !options.overwrite) {
            console.log(`  ⚠️  File already exists: ${filename}`);
            return filepath;
        }

        if (options.dryRun) {
            console.log(`  [DRY RUN] Would download: ${imageUrl} -> ${filename}`);
            return filepath;
        }

        console.log(`  📥 Downloading: ${imageUrl}`);

        try {
            await this._downloadFile(imageUrl, filepath);

            // Validate downloaded image
            const validation = await validateImage(filepath);
            if (!validation.valid) {
                fs.unlinkSync(filepath);
                throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
            }

            if (validation.warnings.length > 0) {
                console.log(`  ⚠️  Image warnings: ${validation.warnings.join(', ')}`);
            }

            this.stats.downloads++;
            console.log(`  ✅ Downloaded and validated: ${filename}`);
            return filepath;

        } catch (error) {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
            }
            throw new Error(`Download failed: ${error.message}`);
        }
    }

    /**
     * Internal file download implementation
     */
    _downloadFile(url, filepath) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filepath);
            const headers = {
                'User-Agent': this.config.request.userAgent
            };

            const options = { headers };

            https.get(url, options, (response) => {
                if (response.statusCode === 200) {
                    response.pipe(file);

                    file.on('finish', () => {
                        file.close();

                        // Verify minimum file size
                        const stats = fs.statSync(filepath);
                        if (stats.size < IMAGE_CONFIG.validation.minSize) {
                            reject(new Error(`Image too small (${stats.size} bytes < ${IMAGE_CONFIG.validation.minSize} bytes)`));
                        } else {
                            resolve();
                        }
                    });

                    file.on('error', (err) => {
                        file.close();
                        reject(err);
                    });
                } else {
                    file.close();
                    reject(new Error(`HTTP ${response.statusCode}`));
                }
            }).on('error', (err) => {
                file.close();
                reject(err);
            });
        });
    }

    /**
     * Get client statistics
     */
    getStats() {
        return {
            ...this.stats,
            cache: this.cache.getStats(),
            rateLimit: {
                activeRequests: this.rateLimiter.activeRequests,
                requestsInWindow: this.rateLimiter.requests.length
            }
        };
    }

    /**
     * Clear cache and reset statistics
     */
    reset() {
        this.cache.clear();
        this.stats = {
            requests: 0,
            cacheHits: 0,
            errors: 0,
            downloads: 0
        };
    }
}

// Export the main class and utility functions
module.exports = {
    BookAPIClient,
    calculateSimilarity,
    DEFAULT_CONFIG
};