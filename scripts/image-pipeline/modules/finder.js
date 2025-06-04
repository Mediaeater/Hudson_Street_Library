// Image Finder and API Integration Module
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ImageFinder {
  constructor(config) {
    this.config = config;
    this.cache = new Map();
    this.rateLimiter = {
      lastRequest: 0,
      minInterval: 1000 // 1 second between requests
    };
  }

  async findBookImage(isbn, options = {}) {
    console.log(`🔍 Searching for book cover: ISBN ${isbn}`);
    
    // Check cache first
    const cacheKey = `isbn_${isbn}`;
    if (this.cache.has(cacheKey)) {
      console.log(`📋 Found in cache`);
      return this.cache.get(cacheKey);
    }

    try {
      // Try multiple APIs in priority order
      const apis = [
        () => this.tryOpenLibrary(isbn),
        () => this.tryGoogleBooks(isbn),
        () => this.tryWorldCat(isbn)
      ];

      for (const apiCall of apis) {
        try {
          await this.respectRateLimit();
          const result = await apiCall();
          
          if (result && result.imageUrl) {
            console.log(`✅ Found image via ${result.source}`);
            
            // Download and save the image
            const savedPath = await this.downloadImage(result.imageUrl, isbn, options);
            
            const finalResult = {
              ...result,
              localPath: savedPath,
              foundAt: new Date().toISOString()
            };
            
            // Cache the result
            this.cache.set(cacheKey, finalResult);
            return finalResult;
          }
        } catch (error) {
          console.log(`⚠️  API attempt failed: ${error.message}`);
          continue;
        }
      }

      console.log(`❌ No image found for ISBN ${isbn}`);
      return null;

    } catch (error) {
      console.error(`❌ Search failed for ISBN ${isbn}: ${error.message}`);
      return null;
    }
  }

  async tryOpenLibrary(isbn) {
    const url = this.config.apis.openLibrary.replace('{isbn}', isbn);
    console.log(`🌐 Trying Open Library...`);
    
    const response = await axios.head(url, { timeout: 10000 });
    
    if (response.status === 200 && response.headers['content-type']?.startsWith('image/')) {
      return {
        source: 'Open Library',
        imageUrl: url,
        isbn,
        metadata: {
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length']
        }
      };
    }
    
    throw new Error('No image found');
  }

  async tryGoogleBooks(isbn) {
    const url = this.config.apis.googleBooks.replace('{isbn}', isbn);
    console.log(`🌐 Trying Google Books...`);
    
    const response = await axios.get(url, { timeout: 10000 });
    
    if (response.data && response.data.items && response.data.items.length > 0) {
      const book = response.data.items[0];
      const imageLinks = book.volumeInfo?.imageLinks;
      
      if (imageLinks) {
        // Prefer large images
        const imageUrl = imageLinks.extraLarge || 
                         imageLinks.large || 
                         imageLinks.medium || 
                         imageLinks.thumbnail;
        
        if (imageUrl) {
          return {
            source: 'Google Books',
            imageUrl: imageUrl.replace('http:', 'https:'), // Ensure HTTPS
            isbn,
            bookInfo: {
              title: book.volumeInfo?.title,
              authors: book.volumeInfo?.authors,
              publisher: book.volumeInfo?.publisher,
              publishedDate: book.volumeInfo?.publishedDate,
              description: book.volumeInfo?.description
            }
          };
        }
      }
    }
    
    throw new Error('No image found');
  }

  async tryWorldCat(isbn) {
    const url = this.config.apis.worldcat.replace('{isbn}', isbn);
    console.log(`🌐 Trying WorldCat...`);
    
    const response = await axios.head(url, { timeout: 10000 });
    
    if (response.status === 200 && response.headers['content-type']?.startsWith('image/')) {
      return {
        source: 'WorldCat',
        imageUrl: url,
        isbn,
        metadata: {
          contentType: response.headers['content-type'],
          contentLength: response.headers['content-length']
        }
      };
    }
    
    throw new Error('No image found');
  }

  async downloadImage(imageUrl, identifier, options = {}) {
    console.log(`⬇️  Downloading image...`);
    
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Hudson Street Library Image Pipeline/1.0'
        }
      });

      // Determine file extension from content type
      const contentType = response.headers['content-type'];
      const ext = this.getExtensionFromContentType(contentType) || '.jpg';
      
      // Generate filename
      const filename = options.filename || `${identifier}_cover${ext}`;
      const outputPath = path.join(this.config.directories.incoming, filename);
      
      // Save the image
      await fs.writeFile(outputPath, response.data);
      
      console.log(`✅ Downloaded to: ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error(`❌ Download failed: ${error.message}`);
      throw error;
    }
  }

  async findBookInfo(isbn) {
    console.log(`📚 Searching for book info: ISBN ${isbn}`);
    
    try {
      // Use Google Books API for comprehensive book information
      const url = this.config.apis.googleBooks.replace('{isbn}', isbn);
      await this.respectRateLimit();
      
      const response = await axios.get(url, { timeout: 10000 });
      
      if (response.data && response.data.items && response.data.items.length > 0) {
        const book = response.data.items[0].volumeInfo;
        
        const bookInfo = {
          isbn,
          title: book.title,
          subtitle: book.subtitle,
          authors: book.authors || [],
          author_first_name: book.authors?.[0]?.split(' ')[0],
          author_last_name: book.authors?.[0]?.split(' ').slice(1).join(' '),
          publisher: book.publisher,
          publishedDate: book.publishedDate,
          description: book.description,
          categories: book.categories || [],
          pageCount: book.pageCount,
          language: book.language,
          imageLinks: book.imageLinks,
          source: 'Google Books API'
        };
        
        console.log(`✅ Found book info: ${bookInfo.title}`);
        return bookInfo;
      }
      
      console.log(`❌ No book info found for ISBN ${isbn}`);
      return null;

    } catch (error) {
      console.error(`❌ Book info search failed: ${error.message}`);
      return null;
    }
  }

  async findMissingImages(booksData) {
    console.log(`🔍 Finding missing images for ${booksData.length} books...`);
    
    const missing = [];
    const found = [];
    
    for (const book of booksData) {
      // Check if book already has an image
      const hasImage = await this.checkExistingImage(book);
      
      if (!hasImage && book.isbn) {
        console.log(`❓ Missing image for: ${book.title} (${book.isbn})`);
        missing.push(book);
      } else {
        found.push(book);
      }
    }
    
    console.log(`📊 Analysis complete:`);
    console.log(`   Books with images: ${found.length}`);
    console.log(`   Missing images: ${missing.length}`);
    
    return { missing, found };
  }

  async checkExistingImage(book) {
    // Check various possible image locations
    const possiblePaths = [
      `${book.author_last_name}_${book.author_first_name}-${book.title}`,
      `${book.isbn}`,
      book.title?.replace(/\s+/g, '_')
    ].filter(Boolean);

    for (const baseName of possiblePaths) {
      for (const ext of ['.jpg', '.jpeg', '.png', '.webp']) {
        const imagePath = path.join(this.config.directories.assets, 'books', baseName + ext);
        try {
          await fs.access(imagePath);
          return imagePath; // Found existing image
        } catch {
          continue;
        }
      }
    }
    
    return false; // No existing image found
  }

  async respectRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.rateLimiter.lastRequest;
    
    if (timeSinceLastRequest < this.rateLimiter.minInterval) {
      const waitTime = this.rateLimiter.minInterval - timeSinceLastRequest;
      console.log(`⏱️  Rate limiting: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.rateLimiter.lastRequest = Date.now();
  }

  getExtensionFromContentType(contentType) {
    const mimeTypes = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'image/tiff': '.tiff'
    };
    
    return mimeTypes[contentType?.toLowerCase()] || '.jpg';
  }

  clearCache() {
    this.cache.clear();
    console.log(`🗑️  Cleared image finder cache`);
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = ImageFinder;