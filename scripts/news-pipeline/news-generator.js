// Automated News Generation System
const fs = require('fs').promises;
const path = require('path');
const collectionsConfig = require('../shared/collections-config');

class NewsGenerator {
  constructor(config = {}) {
    this.config = {
      newsDataPath: path.join(__dirname, '../../src/_data/news.json'),
      booksDataPath: path.join(__dirname, '../../src/_data/books.csv'),
      maxNewsId: 100, // Start high to avoid conflicts
      ...config
    };
  }

  async generateNewsFromBook(bookData, eventType = 'acquisition') {
    console.log(`📰 Generating news item for: ${bookData.title}`);
    
    try {
      // Load existing news data
      const existingNews = await this.loadNewsData();
      
      // Generate new news item
      const newsItem = await this.createNewsItem(bookData, eventType);
      
      // Add to news data
      const updatedNews = this.addNewsItem(existingNews, newsItem);
      
      // Save updated news data
      await this.saveNewsData(updatedNews);
      
      console.log(`✅ News item created: "${newsItem.title}"`);
      return newsItem;
      
    } catch (error) {
      console.error(`❌ Failed to generate news item: ${error.message}`);
      throw error;
    }
  }

  async createNewsItem(bookData, eventType) {
    const newsItem = {
      id: await this.getNextNewsId(),
      date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
      category: this.determineCategory(eventType, bookData),
      featured: this.shouldBeFeatured(bookData, eventType)
    };

    // Generate content based on event type
    switch (eventType) {
      case 'acquisition':
        Object.assign(newsItem, this.generateAcquisitionNews(bookData));
        break;
      case 'collection_addition':
        Object.assign(newsItem, this.generateCollectionNews(bookData));
        break;
      case 'digitization':
        Object.assign(newsItem, this.generateDigitizationNews(bookData));
        break;
      case 'feature':
        Object.assign(newsItem, this.generateFeatureNews(bookData));
        break;
      default:
        Object.assign(newsItem, this.generateGenericNews(bookData, eventType));
    }

    // Add image if available
    newsItem.image = this.findBookImage(bookData);

    return newsItem;
  }

  generateAcquisitionNews(bookData) {
    const { title, author_first_name, author_last_name, publisher, year_published, subjects } = bookData;
    const author = this.formatAuthorName(author_first_name, author_last_name);
    const collection = this.inferCollection(bookData);
    
    // Generate title variations
    const titleVariations = [
      `New Acquisition: ${title}`,
      `${title} Added to Collection`,
      `Latest Addition: ${title} by ${author}`,
      `New Book: ${title}`,
      `Recent Acquisition: ${author}'s ${title}`
    ];

    // Generate excerpt variations
    const excerptVariations = [
      `${title} by ${author} has been added to our ${collection} collection.`,
      `We've acquired ${title}, ${this.getBookDescription(bookData)}.`,
      `Our collection now includes ${title} by ${author}${publisher ? ` (${publisher})` : ''}.`,
      `New addition to the ${collection} collection: ${title}.`
    ];

    // Generate full content
    const content = this.generateAcquisitionContent(bookData, author, collection);

    return {
      title: this.selectVariation(titleVariations, bookData),
      excerpt: this.selectVariation(excerptVariations, bookData),
      content
    };
  }

  generateAcquisitionContent(bookData, author, collection) {
    const { title, publisher, year_published, subjects, summary } = bookData;
    
    let content = `We're pleased to announce the acquisition of "${title}"`;
    
    if (author && author !== 'Unknown Unknown') {
      content += ` by ${author}`;
    }
    
    if (publisher && year_published) {
      content += ` (${publisher}, ${year_published})`;
    } else if (publisher) {
      content += ` (${publisher})`;
    } else if (year_published) {
      content += ` (${year_published})`;
    }
    
    content += `.`;
    
    if (collection && collection !== 'general') {
      content += ` This important work joins our ${collection.replace(/-/g, ' ')} collection.`;
    }
    
    if (summary) {
      content += ` ${summary}`;
    } else if (subjects && subjects.length > 0) {
      content += ` This work explores themes of ${subjects.slice(0, 3).join(', ')}.`;
    }
    
    content += ` The book is now available for viewing by appointment.`;
    
    return content;
  }

  generateCollectionNews(bookData) {
    const collection = this.inferCollection(bookData);
    const { title, author_first_name, author_last_name } = bookData;
    const author = this.formatAuthorName(author_first_name, author_last_name);

    return {
      title: `${collection.replace(/-/g, ' ')} Collection Expanded`,
      excerpt: `${title} by ${author} strengthens our ${collection.replace(/-/g, ' ')} holdings.`,
      content: `Our ${collection.replace(/-/g, ' ')} collection continues to grow with the addition of "${title}" by ${author}. This acquisition enhances our comprehensive coverage of this important area and provides researchers with additional primary source material. The book is available for consultation by appointment.`
    };
  }

  generateDigitizationNews(bookData) {
    const { title, author_first_name, author_last_name } = bookData;
    const author = this.formatAuthorName(author_first_name, author_last_name);

    return {
      title: `Now Online: ${title}`,
      excerpt: `${title} by ${author} is now available in our digital collection.`,
      content: `We're excited to announce that "${title}" by ${author} has been digitized and is now available through our online collection. High-resolution images and detailed catalog information are accessible to researchers worldwide. This digitization is part of our ongoing effort to make our collection more accessible while preserving the original materials.`
    };
  }

  generateFeatureNews(bookData) {
    const { title, author_first_name, author_last_name } = bookData;
    const author = this.formatAuthorName(author_first_name, author_last_name);
    const collection = this.inferCollection(bookData);

    return {
      title: `Featured Work: ${title}`,
      excerpt: `Highlighting ${title} by ${author} from our ${collection.replace(/-/g, ' ')} collection.`,
      content: `This month we're featuring "${title}" by ${author}, a significant work in our ${collection.replace(/-/g, ' ')} collection. ${this.getBookDescription(bookData)} This exemplary piece demonstrates the depth and quality of our holdings and is available for scholarly consultation by appointment.`
    };
  }

  generateGenericNews(bookData, eventType) {
    const { title, author_first_name, author_last_name } = bookData;
    const author = this.formatAuthorName(author_first_name, author_last_name);

    return {
      title: `Collection Update: ${title}`,
      excerpt: `${title} by ${author} - latest ${eventType.replace('_', ' ')} in our collection.`,
      content: `"${title}" by ${author} represents a ${eventType.replace('_', ' ')} in our ongoing collection development. This work is now available for research consultation by appointment.`
    };
  }

  determineCategory(eventType, bookData) {
    const categoryMap = {
      'acquisition': 'acquisitions',
      'collection_addition': 'acquisitions',
      'digitization': 'collections',
      'feature': 'collections',
      'reorganization': 'collections',
      'exhibition': 'announcements'
    };

    return categoryMap[eventType] || 'acquisitions';
  }

  shouldBeFeatured(bookData, eventType) {
    // Auto-feature based on criteria
    const { subjects, year_published, publisher } = bookData;
    
    // Feature if rare/significant
    if (year_published && parseInt(year_published) < 1970) return true;
    
    // Feature if from notable publisher
    const notablePublishers = ['aperture', 'steidl', 'phaidon', 'taschen', 'moma'];
    if (publisher && notablePublishers.some(pub => 
      publisher.toLowerCase().includes(pub))) return true;
    
    // Feature if special event type
    if (['digitization', 'feature', 'exhibition'].includes(eventType)) return true;
    
    // Otherwise don't auto-feature
    return false;
  }

  inferCollection(bookData) {
    const { subjects, title, author_last_name, summary } = bookData;
    
    // Collection inference logic using shared collections config
    const allText = [
      title || '',
      author_last_name || '',
      (subjects || []).join(' '),
      summary || ''
    ].join(' ');

    return collectionsConfig.inferCollection(allText);
  }

  formatAuthorName(firstName, lastName) {
    if (!firstName && !lastName) return 'Unknown';
    if (!firstName) return lastName;
    if (!lastName) return firstName;
    return `${firstName} ${lastName}`;
  }

  getBookDescription(bookData) {
    const { subjects, year_published, summary } = bookData;
    
    if (summary) return summary;
    
    if (subjects && subjects.length > 0) {
      return `exploring ${subjects.slice(0, 2).join(' and ')}`;
    }
    
    if (year_published) {
      return `published in ${year_published}`;
    }
    
    return 'a significant addition to our collection';
  }

  findBookImage(bookData) {
    // Logic to find associated image
    const { title, author_last_name, isbn } = bookData;
    
    // Common image path patterns
    const possiblePaths = [
      `/assets/images/books/${author_last_name}_${title?.replace(/\s+/g, '_')}.jpg`,
      `/assets/images/books/${isbn}.jpg`,
      `/assets/images/books/${title?.replace(/\s+/g, '_')}.jpg`
    ].filter(Boolean);

    // For now, return null - could integrate with image pipeline to check actual files
    return null;
  }

  selectVariation(variations, bookData) {
    // Simple selection - could be made smarter
    const index = (bookData.title?.length || 0) % variations.length;
    return variations[index];
  }

  async loadNewsData() {
    try {
      const content = await fs.readFile(this.config.newsDataPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.log('Creating new news data file...');
      return [];
    }
  }

  async saveNewsData(newsData) {
    const content = JSON.stringify(newsData, null, 2);
    await fs.writeFile(this.config.newsDataPath, content);
  }

  addNewsItem(existingNews, newItem) {
    // Add to beginning of array (newest first)
    return [newItem, ...existingNews];
  }

  async getNextNewsId() {
    const existingNews = await this.loadNewsData();
    const maxId = existingNews.reduce((max, item) => 
      Math.max(max, item.id || 0), 0);
    return maxId + 1;
  }

  async generateBatchNews(booksData, eventType = 'acquisition') {
    console.log(`📰 Generating news for ${booksData.length} books...`);
    
    const results = [];
    for (const bookData of booksData) {
      try {
        const newsItem = await this.generateNewsFromBook(bookData, eventType);
        results.push({ success: true, book: bookData, newsItem });
      } catch (error) {
        results.push({ success: false, book: bookData, error: error.message });
      }
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Generated ${successful}/${booksData.length} news items`);
    
    return results;
  }

  async generateCollectionNews(collectionName, books) {
    console.log(`📰 Generating collection news for: ${collectionName}`);
    
    const newsItem = {
      id: await this.getNextNewsId(),
      date: new Date().toISOString().split('T')[0],
      title: `${collectionName.replace(/-/g, ' ')} Collection Update`,
      excerpt: `New additions to our ${collectionName.replace(/-/g, ' ')} collection.`,
      content: `We've added ${books.length} new ${books.length === 1 ? 'work' : 'works'} to our ${collectionName.replace(/-/g, ' ')} collection. ${books.length === 1 ? 'This addition strengthens' : 'These additions strengthen'} our holdings and provide researchers with expanded access to materials in this important area.`,
      image: null,
      category: 'collections',
      featured: books.length >= 5 // Feature if significant batch
    };

    const existingNews = await this.loadNewsData();
    const updatedNews = this.addNewsItem(existingNews, newsItem);
    await this.saveNewsData(updatedNews);
    
    console.log(`✅ Collection news created: "${newsItem.title}"`);
    return newsItem;
  }
}

module.exports = NewsGenerator;