# Hudson Street Library - Quick Start Guide

## Installation

### Prerequisites
- Node.js (v16+ recommended)
- npm or yarn

### Install Dependencies
```bash
npm install hudson-street-library
# or
yarn add hudson-street-library
```

## Basic Usage

### Image Processing
```javascript
const { processImage } = require('hudson-street-library/image-core');

async function optimizeBookCover(imagePath) {
  const processedImage = await processImage(imagePath, {
    resize: { width: 300, height: 450 },
    format: 'webp',
    quality: 85
  });

  console.log('Optimized image:', processedImage);
}
```

### Book Details Retrieval
```javascript
const { fetchBookDetails } = require('hudson-street-library/book-api-client');

async function displayBookInfo(isbn) {
  try {
    const book = await fetchBookDetails(isbn);
    console.log('Book Title:', book.title);
    console.log('Authors:', book.authors);
  } catch (error) {
    console.error('Could not fetch book details');
  }
}
```

## Troubleshooting

### Common Issues
1. **Image Processing Errors**
   - Ensure image file exists
   - Check file permissions
   - Validate image format support

2. **API Connection Problems**
   - Verify network connectivity
   - Check API endpoint configuration
   - Ensure proper authentication

### Logging
Enable verbose logging for diagnostics:
```javascript
const logger = require('hudson-street-library/logger');
logger.setLevel('debug');
```

## Advanced Configuration

### Custom Image Optimization
```javascript
const { processImage } = require('hudson-street-library/image-core');

const customOptimization = {
  resize: { width: 600, height: null }, // Maintain aspect ratio
  format: 'jpeg',
  quality: 90
};

processImage(imagePath, customOptimization);
```