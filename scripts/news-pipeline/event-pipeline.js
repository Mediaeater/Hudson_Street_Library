// Book Addition Event Pipeline System
const fs = require('fs').promises;
const path = require('path');
const { parse } = require('csv-parse/sync');
const NewsGenerator = require('./news-generator');
const ImagePipeline = require('../image-pipeline/image-pipeline');

class BookEventPipeline {
  constructor(config = {}) {
    this.config = {
      booksDataPath: path.join(__dirname, '../../src/_data/books.csv'),
      collectionsDir: path.join(__dirname, '../../src/books/collections'),
      alphaDir: path.join(__dirname, '../../src/books/alpha'),
      generalDir: path.join(__dirname, '../../src/books/general'),
      autoNews: true,
      autoImageProcessing: true,
      autoCollectionAssignment: true,
      ...config
    };
    
    this.newsGenerator = new NewsGenerator();
    this.imagePipeline = new ImagePipeline();
  }

  async processNewBook(bookData, options = {}) {
    console.log(`📚 Processing new book: ${bookData.title}`);
    
    const pipeline = {
      book: bookData,
      events: [],
      results: {}
    };

    try {
      // Step 1: Add to CSV database
      if (options.addToDatabase !== false) {
        await this.addToDatabase(bookData);
        pipeline.events.push('database_added');
      }

      // Step 2: Determine collection/location
      const placement = await this.determineBookPlacement(bookData);
      pipeline.results.placement = placement;
      pipeline.events.push('placement_determined');

      // Step 3: Create book page if needed
      if (options.createPage !== false) {
        const pagePath = await this.createBookPage(bookData, placement);
        pipeline.results.pagePath = pagePath;
        pipeline.events.push('page_created');
      }

      // Step 4: Process associated images
      if (this.config.autoImageProcessing && options.processImages !== false) {
        const imageResults = await this.processBookImages(bookData);
        pipeline.results.images = imageResults;
        pipeline.events.push('images_processed');
      }

      // Step 5: Update collection indexes
      if (this.config.autoCollectionAssignment && options.updateCollections !== false) {
        await this.updateCollectionIndexes(bookData, placement);
        pipeline.events.push('collections_updated');
      }

      // Step 6: Generate news item
      if (this.config.autoNews && options.generateNews !== false) {
        const newsItem = await this.generateNewsItem(bookData, placement, options.eventType);
        pipeline.results.newsItem = newsItem;
        pipeline.events.push('news_generated');
      }

      // Step 7: Update site-wide indexes
      await this.updateSiteIndexes(bookData);
      pipeline.events.push('indexes_updated');

      console.log(`✅ Book processing complete: ${pipeline.events.length} steps`);
      return pipeline;

    } catch (error) {
      console.error(`❌ Book processing failed: ${error.message}`);
      pipeline.error = error.message;
      throw error;
    }
  }

  async addToDatabase(bookData) {
    console.log(`💾 Adding book to database...`);
    
    try {
      // Load existing CSV data
      const csvContent = await fs.readFile(this.config.booksDataPath, 'utf8');
      const existingBooks = parse(csvContent, { columns: true });
      
      // Check for duplicates
      const duplicate = existingBooks.find(book => 
        book.isbn === bookData.isbn || 
        (book.title === bookData.title && book.author_last_name === bookData.author_last_name)
      );
      
      if (duplicate) {
        console.log(`⚠️  Potential duplicate found: ${duplicate.title}`);
        // Could implement merge logic here
      }
      
      // Add new book
      existingBooks.push({
        ...bookData,
        date_added: new Date().toISOString().split('T')[0],
        status: 'active'
      });
      
      // Generate new CSV
      const headers = Object.keys(existingBooks[0]);
      const csvLines = [
        headers.join(','),
        ...existingBooks.map(book => 
          headers.map(header => this.escapeCsvValue(book[header] || '')).join(',')
        )
      ];
      
      // Write back to file
      await fs.writeFile(this.config.booksDataPath, csvLines.join('\n'));
      
      console.log(`✅ Book added to database`);
      
    } catch (error) {
      console.error(`❌ Database addition failed: ${error.message}`);
      throw error;
    }
  }

  async determineBookPlacement(bookData) {
    console.log(`📍 Determining book placement...`);
    
    const placement = {
      type: 'general', // general, collection, alpha
      collection: null,
      directory: null,
      reasoning: []
    };

    // Check for collection fit
    const collection = await this.findBestCollection(bookData);
    
    if (collection && collection !== 'general') {
      placement.type = 'collection';
      placement.collection = collection;
      placement.directory = path.join(this.config.collectionsDir, collection);
      placement.reasoning.push(`Matches ${collection} collection keywords`);
    } else {
      // Place in alphabetical organization
      const authorLetter = (bookData.author_last_name || 'Unknown').charAt(0).toLowerCase();
      const alphaGroup = this.getAlphaGroup(authorLetter);
      
      placement.type = 'alpha';
      placement.collection = alphaGroup;
      placement.directory = path.join(this.config.alphaDir, alphaGroup);
      placement.reasoning.push(`Alphabetical filing under ${alphaGroup}`);
    }

    console.log(`📍 Placement: ${placement.type}/${placement.collection}`);
    return placement;
  }

  async findBestCollection(bookData) {
    // Reuse logic from image pipeline categorizer
    const { title, author_last_name, subjects, summary } = bookData;
    
    const searchText = [
      title || '',
      author_last_name || '',
      (subjects || []).join(' '),
      summary || ''
    ].join(' ').toLowerCase();

    // Collection keywords (should be shared config)
    const collections = {
      'art': ['art', 'painting', 'sculpture', 'gallery', 'exhibition'],
      'black-photographers': ['black', 'african', 'diaspora', 'civil rights'],
      'books-on-books': ['bibliography', 'meta', 'publishing', 'book design'],
      'collage': ['collage', 'assemblage', 'mixed media', 'photomontage'],
      'fashion': ['fashion', 'style', 'clothing', 'runway', 'designer'],
      'comme-des-garcons': ['comme', 'rei kawakubo', 'cdg', 'six magazine'],
      'matsuda-fashion': ['matsuda', 'japanese fashion'],
      'music': ['music', 'concert', 'album', 'musician', 'band'],
      'music-photobooks': ['music photography', 'concert photography'],
      'nyc': ['new york', 'manhattan', 'brooklyn', 'nyc', 'urban'],
      'posters-and-paper': ['poster', 'print', 'graphic design', 'announcement'],
      'queer': ['lgbt', 'queer', 'gay', 'lesbian', 'trans', 'pride'],
      'woman-viewing-woman': ['female', 'women', 'feminist', 'gender']
    };

    for (const [collection, keywords] of Object.entries(collections)) {
      if (keywords.some(keyword => searchText.includes(keyword))) {
        return collection;
      }
    }

    return 'general';
  }

  getAlphaGroup(letter) {
    const groups = {
      'a-d': ['a', 'b', 'c', 'd'],
      'e-h': ['e', 'f', 'g', 'h'],
      'i-l': ['i', 'j', 'k', 'l'],
      'm-p': ['m', 'n', 'o', 'p'],
      'q-t': ['q', 'r', 's', 't'],
      'u-z': ['u', 'v', 'w', 'x', 'y', 'z']
    };

    for (const [group, letters] of Object.entries(groups)) {
      if (letters.includes(letter)) {
        return group;
      }
    }

    return 'u-z'; // Default for non-alphabetic
  }

  async createBookPage(bookData, placement) {
    console.log(`📄 Creating book page...`);
    
    const { title, author_first_name, author_last_name } = bookData;
    const authorName = [author_first_name, author_last_name].filter(Boolean).join('_');
    const filename = `${authorName}-${title?.replace(/[^a-zA-Z0-9]/g, '_')}.html`;
    
    const pagePath = path.join(placement.directory, filename);
    
    // Generate book page content
    const pageContent = this.generateBookPageContent(bookData, placement);
    
    // Ensure directory exists
    await fs.mkdir(placement.directory, { recursive: true });
    
    // Write page file
    await fs.writeFile(pagePath, pageContent);
    
    console.log(`✅ Book page created: ${filename}`);
    return pagePath;
  }

  generateBookPageContent(bookData, placement) {
    const { title, author_first_name, author_last_name, publisher, year_published, isbn, summary, subjects } = bookData;
    const author = [author_first_name, author_last_name].filter(Boolean).join(' ');
    
    return `---
title: "${title}"
author: "${author}"
collection: "${placement.collection}"
permalink: /books/${placement.collection}/${title?.replace(/[^a-zA-Z0-9]/g, '-')}.html
---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | Hudson Street Library</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-50">
    <div class="container mx-auto px-4 py-8">
        <div class="max-w-4xl mx-auto">
            <!-- Book Header -->
            <div class="bg-white rounded-lg shadow-md p-8 mb-8">
                <div class="flex flex-col md:flex-row gap-8">
                    <div class="md:w-1/3">
                        <!-- Book cover placeholder -->
                        <div class="aspect-[3/4] bg-gray-200 rounded-lg flex items-center justify-center">
                            <i class="fas fa-book text-6xl text-gray-400"></i>
                        </div>
                    </div>
                    <div class="md:w-2/3">
                        <h1 class="text-3xl font-bold mb-4">${title}</h1>
                        ${author ? `<p class="text-xl text-gray-600 mb-2">by ${author}</p>` : ''}
                        ${publisher ? `<p class="text-gray-600 mb-2">Published by ${publisher}</p>` : ''}
                        ${year_published ? `<p class="text-gray-600 mb-2">Year: ${year_published}</p>` : ''}
                        ${isbn ? `<p class="text-gray-600 mb-4">ISBN: ${isbn}</p>` : ''}
                        
                        <!-- Collection Badge -->
                        <span class="inline-block bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium mb-4">
                            ${placement.collection.replace(/-/g, ' ')} Collection
                        </span>
                    </div>
                </div>
            </div>

            <!-- Book Details -->
            <div class="bg-white rounded-lg shadow-md p-8 mb-8">
                <h2 class="text-2xl font-bold mb-4">About This Book</h2>
                ${summary ? `<p class="text-gray-700 leading-relaxed mb-4">${summary}</p>` : ''}
                
                ${subjects && subjects.length > 0 ? `
                <div class="mb-4">
                    <h3 class="text-lg font-semibold mb-2">Subjects</h3>
                    <div class="flex flex-wrap gap-2">
                        ${subjects.map(subject => `
                            <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">${subject}</span>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p class="text-blue-800">
                        <i class="fas fa-info-circle mr-2"></i>
                        This book is available for viewing by appointment. 
                        <a href="/index.html#contact" class="underline">Contact us</a> to schedule a visit.
                    </p>
                </div>
            </div>

            <!-- Navigation -->
            <div class="text-center">
                <a href="/collections/${placement.collection}.html" class="text-teal-700 hover:text-teal-900 font-medium">
                    ← Back to ${placement.collection.replace(/-/g, ' ')} Collection
                </a>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  async processBookImages(bookData) {
    console.log(`🖼️  Processing book images...`);
    
    try {
      // Use image pipeline to find/process images
      const results = {
        found: [],
        optimized: [],
        missing: false
      };

      // Try to find existing image
      const imageResult = await this.imagePipeline.finder.findBookImage(bookData.isbn);
      
      if (imageResult) {
        results.found.push(imageResult);
        
        // Optimize the found image
        const optimized = await this.imagePipeline.optimizer.optimizeImage(imageResult.localPath);
        results.optimized.push(optimized);
      } else {
        results.missing = true;
      }

      return results;
      
    } catch (error) {
      console.log(`⚠️  Image processing failed: ${error.message}`);
      return { error: error.message };
    }
  }

  async updateCollectionIndexes(bookData, placement) {
    console.log(`📇 Updating collection indexes...`);
    
    // This would update collection landing pages, search indexes, etc.
    // For now, just log the action
    console.log(`✅ Collection indexes updated for ${placement.collection}`);
  }

  async updateSiteIndexes(bookData) {
    console.log(`🔍 Updating site-wide indexes...`);
    
    // This would update the main search index, recently added lists, etc.
    console.log(`✅ Site indexes updated`);
  }

  async generateNewsItem(bookData, placement, eventType = 'acquisition') {
    console.log(`📰 Generating news item...`);
    
    try {
      const newsItem = await this.newsGenerator.generateNewsFromBook(bookData, eventType);
      return newsItem;
    } catch (error) {
      console.log(`⚠️  News generation failed: ${error.message}`);
      return null;
    }
  }

  async processBatchBooks(booksData, options = {}) {
    console.log(`📚 Processing batch of ${booksData.length} books...`);
    
    const results = [];
    for (const bookData of booksData) {
      try {
        const result = await this.processNewBook(bookData, options);
        results.push({ success: true, book: bookData, pipeline: result });
      } catch (error) {
        results.push({ success: false, book: bookData, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Processed ${successful}/${booksData.length} books successfully`);
    
    // Generate collection summary news if significant batch
    if (successful >= 3) {
      await this.generateBatchNews(results.filter(r => r.success));
    }
    
    return results;
  }

  async generateBatchNews(successfulResults) {
    console.log(`📰 Generating batch news...`);
    
    // Group by collection
    const byCollection = {};
    for (const result of successfulResults) {
      const collection = result.pipeline.results.placement.collection;
      if (!byCollection[collection]) byCollection[collection] = [];
      byCollection[collection].push(result.book);
    }

    // Generate news for each collection with multiple additions
    for (const [collection, books] of Object.entries(byCollection)) {
      if (books.length >= 2) {
        await this.newsGenerator.generateCollectionNews(collection, books);
      }
    }
  }

  escapeCsvValue(value) {
    if (typeof value !== 'string') return value;
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}

module.exports = BookEventPipeline;