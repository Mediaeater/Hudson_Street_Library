# Hudson Street Library API Reference

## image-core.js API

### `processImage(imagePath, options)`
Processes an image with given options.

**Parameters:**
- `imagePath` (string): Path to the source image
- `options` (object): Processing configuration
  - `resize` (object): Resize parameters
    - `width` (number): Target width
    - `height` (number): Target height
  - `format` (string): Output image format (e.g., 'webp', 'jpeg')
  - `quality` (number): Compression quality (0-100)

**Returns:**
- Promise resolving to processed image path

**Example:**
```javascript
const processedImage = await processImage('/path/to/image.jpg', {
  resize: { width: 300, height: 200 },
  format: 'webp',
  quality: 80
});
```

### `validateImage(imagePath)`
Validates image integrity and metadata.

**Parameters:**
- `imagePath` (string): Path to the image file

**Returns:**
- Object with image validation results
  - `isValid` (boolean): Image validity
  - `metadata` (object): Image metadata

## book-api-client.js API

### `fetchBookDetails(isbn)`
Retrieves comprehensive book details.

**Parameters:**
- `isbn` (string): International Standard Book Number

**Returns:**
- Promise resolving to book details object
  - `title` (string)
  - `authors` (string[])
  - `publishDate` (string)
  - `coverUrl` (string)

**Example:**
```javascript
const bookDetails = await fetchBookDetails('9780123456789');
```

### `searchBooks(query)`
Searches books based on query parameters.

**Parameters:**
- `query` (object): Search configuration
  - `title` (string, optional): Book title
  - `author` (string, optional): Author name
  - `tags` (string[], optional): Book tags

**Returns:**
- Promise resolving to array of matching books

## logger.js API

### `log(level, message, metadata)`
Logs messages with different severity levels.

**Parameters:**
- `level` (string): Log level ('info', 'warn', 'error')
- `message` (string): Log message
- `metadata` (object, optional): Additional context

**Example:**
```javascript
logger.log('info', 'Book processed', { isbn: '9780123456789' });
```

## csv-handler.js API

### `importCSV(filePath, options)`
Imports data from CSV files.

**Parameters:**
- `filePath` (string): Path to CSV file
- `options` (object): Import configuration
  - `headers` (boolean): Use first row as headers
  - `delimiter` (string): CSV delimiter

**Returns:**
- Promise resolving to parsed data array

## image-cache.js API

### `cacheImage(imagePath, cacheOptions)`
Caches image with specified configuration.

**Parameters:**
- `imagePath` (string): Source image path
- `cacheOptions` (object)
  - `ttl` (number): Time-to-live in seconds
  - `maxSize` (number): Maximum cache size

**Returns:**
- Cached image path

## unified-image-optimizer.js API

### `optimizeImageSet(imagePaths, optimizationProfile)`
Batch image optimization.

**Parameters:**
- `imagePaths` (string[]): Array of image paths
- `optimizationProfile` (object)
  - `targetFormats` (string[]): Output formats
  - `quality` (number): Compression level
  - `maxWidth` (number): Maximum image width

**Returns:**
- Promise resolving to optimized image paths