// Shared Collections Configuration
// This is the single source of truth for collection keywords and categorization logic

module.exports = {
  // Collection mapping for automatic categorization
  // Used by both image pipeline and news generation
  collections: {
    'art': ['art', 'painting', 'sculpture', 'gallery', 'exhibition'],
    'black-photographers': ['black', 'african', 'diaspora', 'civil rights'],
    'books-on-books': ['bibliography', 'meta', 'publishing', 'book design'],
    'collage': ['collage', 'assemblage', 'mixed media', 'photomontage'],
    'ephemera': ['ephemera', 'postcards', 'invitations', 'flyers'],
    'fashion': ['fashion', 'style', 'clothing', 'runway', 'designer'],
    'fashion/comme-des-garcons': ['comme', 'rei kawakubo', 'cdg', 'six magazine'],
    'fashion/matsuda': ['matsuda', 'japanese fashion'],
    'music': ['music', 'concert', 'album', 'musician', 'band'],
    'music-photobooks': ['music photography', 'concert photography'],
    'nyc': ['new york', 'manhattan', 'brooklyn', 'nyc', 'urban'],
    'posters-and-paper': ['poster', 'print', 'graphic design', 'announcement'],
    'queer': ['lgbt', 'queer', 'gay', 'lesbian', 'trans', 'pride'],
    'recently-added': [],
    'small-books-big-images': ['large format', 'oversized'],
    'woman-viewing-woman': ['female', 'women', 'feminist', 'gender']
  },

  // Helper method to infer collection from text content
  inferCollection(textContent) {
    if (!textContent) return 'general';
    
    const searchText = textContent.toLowerCase();
    
    for (const [collection, keywords] of Object.entries(this.collections)) {
      if (keywords.length === 0) continue; // Skip collections without keywords
      
      for (const keyword of keywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          return collection;
        }
      }
    }
    
    return 'general';
  },

  // Helper method to get all collection names
  getCollectionNames() {
    return Object.keys(this.collections);
  },

  // Helper method to get keywords for a specific collection
  getCollectionKeywords(collection) {
    return this.collections[collection] || [];
  },

  // Helper method to check if a collection exists
  isValidCollection(collection) {
    return Object.keys(this.collections).includes(collection) || collection === 'general';
  }
};