// Image Pipeline Configuration
const path = require('path');

module.exports = {
  // Directory structure
  directories: {
    incoming: path.join(__dirname, '../../incoming-images'),
    processing: path.join(__dirname, '../../temp-processing'),
    assets: path.join(__dirname, '../../src/assets/images'),
    optimized: path.join(__dirname, '../../_site/assets/images/optimized'),
    thumbnails: path.join(__dirname, '../../_site/assets/images/thumbnails')
  },

  // Collection mapping for automatic categorization
  collections: {
    'art': ['art', 'painting', 'sculpture', 'gallery', 'exhibition'],
    'black-photographers': ['black', 'african', 'diaspora', 'civil rights'],
    'books-on-books': ['bibliography', 'meta', 'publishing', 'book design'],
    'collage': ['collage', 'assemblage', 'mixed media', 'photomontage'],
    'comme-des-garcons': ['comme', 'rei kawakubo', 'cdg', 'six magazine'],
    'ephemera': ['ephemera', 'postcards', 'invitations', 'flyers'],
    'fashion': ['fashion', 'style', 'clothing', 'runway', 'designer'],
    'matsuda-fashion': ['matsuda', 'japanese fashion'],
    'music': ['music', 'concert', 'album', 'musician', 'band'],
    'music-photobooks': ['music photography', 'concert photography'],
    'nyc': ['new york', 'manhattan', 'brooklyn', 'nyc', 'urban'],
    'posters-and-paper': ['poster', 'print', 'graphic design', 'announcement'],
    'queer': ['lgbt', 'queer', 'gay', 'lesbian', 'trans', 'pride'],
    'recently-added': [],
    'small-books-big-images': ['large format', 'oversized'],
    'woman-viewing-woman': ['female', 'women', 'feminist', 'gender']
  },

  // Image optimization settings
  optimization: {
    sizes: [300, 600, 900, 1200],
    thumbnailSizes: [150, 300],
    formats: ['webp', 'jpeg'],
    quality: {
      webp: 80,
      jpeg: 85
    }
  },

  // API endpoints for image fetching
  apis: {
    openLibrary: 'https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg',
    googleBooks: 'https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}',
    worldcat: 'http://covers.oclc.org/ImageWebSvc/GetCover?isbn={isbn}&size=L',
    // Add more APIs as needed
  },

  // File naming conventions
  naming: {
    pattern: '{author_last}_{author_first}-{title}',
    sanitize: true,
    maxLength: 100
  },

  // Supported file types
  supportedTypes: ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.gif'],

  // Pipeline steps configuration
  pipeline: {
    steps: [
      'validate',
      'extract_metadata', 
      'find_missing_images',
      'optimize',
      'categorize',
      'organize',
      'update_records'
    ],
    parallelProcessing: true,
    batchSize: 10
  }
};