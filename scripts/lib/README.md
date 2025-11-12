# Library Modules for Collection Generators

This directory contains reusable, modular JavaScript libraries for generating collection pages from the Hudson Street Library database.

## Architecture

The library is organized into focused, single-responsibility modules:

```
lib/
├── book-data-extractor.js   # CSV parsing, filtering, validation
├── file-system-utils.js     # File I/O with error handling
├── html-generator.js        # Secure HTML generation
└── README.md                # This file
```

## Modules

### book-data-extractor.js

**Purpose:** Extract and process book data from CSV files

**Key Functions:**
- `parseCSV(csvContent)` - Parse CSV with error handling
- `filterPrinceBooks(records)` - Filter by author
- `transformBookRecord(record)` - Type coercion and normalization
- `sortBooks(books)` - Sort by year and title
- `validateBook(book)` - Check required fields
- `extractPrinceBooks(csvContent)` - Complete extraction pipeline

**Features:**
- Type-safe transformations (strings to numbers)
- Graceful handling of missing data
- Validation with detailed error messages
- Configurable sorting

### file-system-utils.js

**Purpose:** Safe file system operations

**Key Functions:**
- `readCSVFile(filePath)` - Read CSV with validation
- `writeHTMLFile(filePath, content)` - Write HTML with directory creation
- `fileExists(filePath)` - Check file existence
- `directoryExists(dirPath)` - Check directory existence
- `validatePrerequisites(paths)` - Validate all required paths

**Features:**
- Absolute path resolution
- Permission checking
- Automatic directory creation
- Comprehensive error messages

### html-generator.js

**Purpose:** Generate secure, accessible HTML

**Key Functions:**
- `escapeHTML(text)` - XSS protection
- `escapeAttribute(text)` - Attribute-safe escaping
- `truncateText(text, maxLength)` - Smart text truncation
- `formatYear(year)` - Year formatting with fallback
- `generateBookCard(book)` - Single book HTML
- `generateCollectionPage(books, options)` - Complete page
- `validateHTML(html)` - Structure validation

**Features:**
- XSS protection via escaping
- ARIA attributes for accessibility
- Semantic HTML5 markup
- Lazy loading images
- Word-boundary truncation

## Usage Example

```javascript
import { readCSVFile, writeHTMLFile } from './lib/file-system-utils.js';
import { extractPrinceBooks } from './lib/book-data-extractor.js';
import { generateCollectionPage } from './lib/html-generator.js';

// Complete pipeline
const csvContent = await readCSVFile('books.csv');
const { books, errors } = await extractPrinceBooks(csvContent);
const html = generateCollectionPage(books);
await writeHTMLFile('output.html', html);
```

## Design Principles

1. **Single Responsibility** - Each module has one clear purpose
2. **Error Handling** - All functions validate inputs and throw descriptive errors
3. **Type Safety** - Explicit type coercion and validation
4. **Immutability** - Functions don't modify input data
5. **Documentation** - JSDoc comments for all public functions
6. **Security** - HTML escaping prevents XSS attacks

## Dependencies

- `csv-parse` - CSV parsing
- Node.js 18+ - Native ES modules, fs/promises

## Testing

Each module can be tested independently:

```bash
# Test data extraction
node -e "import('./lib/book-data-extractor.js').then(m => console.log(m))"

# Test file operations
node -e "import('./lib/file-system-utils.js').then(m => console.log(m))"

# Test HTML generation
node -e "import('./lib/html-generator.js').then(m => console.log(m))"
```

## Extension

To create a new collection generator:

1. Copy `generate-prince-collection-v2.js` as template
2. Modify the filter function in your script:
   ```javascript
   const books = records.filter(r => r.author_full_name === 'Your Author');
   ```
3. Adjust configuration paths and metadata
4. Run and verify output

The library modules remain unchanged - only the orchestration script needs modification.

## Version History

- **v1.0.0** (2025-11-11) - Initial modular architecture
  - Extracted from monolithic script
  - Added comprehensive error handling
  - Implemented security best practices
