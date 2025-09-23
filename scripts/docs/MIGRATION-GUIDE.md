# Migration Guide for Hudson Street Library

## Overview
This guide helps you transition from older image and book processing functions to the new consolidated APIs.

## Image Processing Migration

### Old Approach
```javascript
// Previous image processing
const sharp = require('sharp');
function resizeImage(path, width, height) {
  return sharp(path)
    .resize(width, height)
    .toFile(`resized-${path}`);
}
```

### New Approach
```javascript
// New image-core.js approach
const { processImage } = require('./image-core');
const processedImage = await processImage(path, {
  resize: { width, height },
  format: 'webp',
  quality: 80
});
```

## Book API Migration

### Old Approach
```javascript
// Previous book fetching
async function getBookInfo(isbn) {
  const response = await fetch(`/books/${isbn}`);
  return response.json();
}
```

### New Approach
```javascript
// New book-api-client.js
const { fetchBookDetails } = require('./book-api-client');
const bookDetails = await fetchBookDetails(isbn);
```

## Breaking Changes
- Removed direct `sharp` image manipulation
- Standardized error handling
- Introduced comprehensive logging
- Replaced callback-based functions with Promises

## Deprecation Notices
- Old `resizeImage()` functions are deprecated
- Direct database queries are no longer supported
- Manual image caching is discouraged