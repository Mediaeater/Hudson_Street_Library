# Scripts Quick Start

These utilities live in `scripts/utils/` and are used by the build and CLI
scripts in the repo. Hudson Street Library is **not** published as an npm
package; require the modules by their relative paths from inside this
repository.

## Prerequisites
- Node.js 22+ (required by Eleventy v3)
- `npm install` at the repo root (one time)

## Image Processing

```javascript
const { processImage } = require('./scripts/utils/image-core');

async function optimizeBookCover(imagePath) {
  const processedImage = await processImage(imagePath, {
    resize: { width: 300, height: 450 },
    format: 'webp',
    quality: 85
  });

  console.log('Optimized image:', processedImage);
}
```

## Book Details Retrieval

```javascript
const { fetchBookDetails } = require('./scripts/utils/book-api-client');

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

## Logging

Enable verbose logging during a script:

```javascript
const logger = require('./scripts/utils/logger');
logger.setLevel('debug');
```

## Advanced Image Optimization

```javascript
const { processImage } = require('./scripts/utils/image-core');

const customOptimization = {
  resize: { width: 600, height: null },  // Maintain aspect ratio
  format: 'jpeg',
  quality: 90
};

processImage(imagePath, customOptimization);
```

## Troubleshooting

1. **Image Processing Errors**
   - Ensure the image file exists and is readable
   - Validate format (sharp supports jpeg, png, webp, avif, gif, tiff)

2. **API Connection Problems**
   - Verify network connectivity
   - Check rate limits (Open Library: 100 req/5 min, Google Books: ~1000/day)

3. **Module Not Found**
   - Run `npm install` at the repo root
   - Use relative paths starting from the repo root (e.g.,
     `./scripts/utils/image-core`), not bare package names.

See also:
- `scripts/docs/API-REFERENCE.md` — full module API surface
- `scripts/utils/README-logging.md` — logger details
- `scripts/utils/README-image-cache.md` — image cache layout
