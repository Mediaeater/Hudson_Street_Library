# Build System Documentation

## Overview

Hudson Street Library uses [Eleventy (11ty)](https://www.11ty.dev/) v3.0.0 as its static site generator. The build system transforms source files from the `src/` directory into a fully optimized static website in the `_site/` directory.

## Architecture

### Directory Structure

```
Hudson_Street_Library/
├── .eleventy.js           # Main Eleventy configuration
├── src/                   # Source files (input)
│   ├── _data/            # Global data files
│   │   └── books.csv     # Main book catalog (1,300+ books)
│   ├── _includes/        # Reusable templates
│   │   ├── layouts/      # Page layouts (book.njk, admin.njk)
│   │   └── components/   # Reusable components (book-thumbnail.njk, etc.)
│   ├── assets/           # Static assets
│   │   ├── css/          # Stylesheets
│   │   ├── js/           # Client-side JavaScript
│   │   └── images/       # Image files
│   ├── *.html            # Page templates (index.html, aggregate-view.html, etc.)
│   └── *.njk             # Nunjucks templates
├── _site/                # Build output (generated, git-ignored)
├── scripts/              # Build and utility scripts
└── package.json          # Project configuration and build scripts
```

## Configuration (.eleventy.js)

### Core Settings

```javascript
module.exports = function(eleventyConfig) {
  return {
    dir: {
      input: "src",           // Source directory
      output: "_site",        // Build output directory
      includes: "_includes",  // Templates/components
      layouts: "_includes/layouts",
      data: "_data"           // Global data files
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    templateFormats: ["njk", "html", "liquid", "md"]
  };
};
```

### Reserved Data Property Handling

```javascript
eleventyConfig.setFreezeReservedData(false);
```

This allows custom collections without conflicts with Eleventy's built-in data properties.

## Data Pipeline

### CSV Data Loading

The build system loads book data from CSV at build time:

```javascript
const CSVHandler = require("./scripts/utils/csv-handler");
const csvPath = path.join(__dirname, "src/_data/books.csv");
const csvResult = CSVHandler.readBooksSync(csvPath);
const bookData = csvResult.data;

// Make data available globally
eleventyConfig.addGlobalData("books", bookData);
```

**CSV Handler Features:**
- Automatic validation and data cleaning
- Error recovery from corrupted CSV files
- Field normalization (whitespace, encoding issues)
- ISBN/ASIN validation
- Publication year validation
- Author name formatting

**CSV Statistics During Build:**
```
--- Parsed 1306 records from books.csv
--- CSV stats: 1280 valid, 20 corrected, 6 invalid
```

### Global Data Access

Once loaded, book data is available in all templates:

```nunjucks
{% for book in books %}
  <h2>{{ book.title }}</h2>
  <p>by {{ book.author_full_name }}</p>
{% endfor %}
```

## Filters and Shortcodes

### Slugify Filter

Converts strings to URL-friendly slugs:

```javascript
eleventyConfig.addFilter("slugify", function(str) {
  return slugify(str, {
    lower: true,
    strict: true,
    remove: /["]/g,
  });
});
```

**Usage in templates:**
```nunjucks
<a href="/books/{{ book.title | slugify }}">{{ book.title }}</a>
```

### Image Processing Shortcode

Generates responsive images with multiple formats and sizes:

```javascript
eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
eleventyConfig.addLiquidShortcode("image", imageShortcode);
```

**Configuration:**
- Output widths: 300px, 600px, 900px, 1200px
- Formats: WebP (primary), JPEG (fallback)
- Output directory: `_site/assets/images/optimized/`
- URL path: `/assets/images/optimized/`
- Features: lazy loading, async decoding

**Usage:**
```nunjucks
{% image "src/assets/images/book-cover.jpg", "Book cover alt text", "100vw", "custom-class" %}
```

**Generated HTML:**
```html
<picture>
  <source type="image/webp" srcset="/assets/images/optimized/book-cover-300w.webp 300w, ...">
  <source type="image/jpeg" srcset="/assets/images/optimized/book-cover-300w.jpeg 300w, ...">
  <img src="/assets/images/optimized/book-cover-600w.jpeg"
       alt="Book cover alt text"
       loading="lazy"
       decoding="async"
       class="custom-class">
</picture>
```

### Thumbnail Shortcode

Specialized shortcode for generating small thumbnails:

```javascript
eleventyConfig.addNunjucksAsyncShortcode("thumbnail", thumbnailShortcode);
```

**Configuration:**
- Output widths: 150px, 300px (for retina displays)
- Formats: WebP, JPEG
- Output directory: `_site/assets/images/thumbnails/`
- Filename pattern: `{name}-thumb-{width}w.{format}`

**Usage:**
```nunjucks
{% thumbnail "src/assets/images/author.jpg", "Author photo", "profile-thumb" %}
```

## Asset Pipeline

### Passthrough Copy

Assets that are copied directly without processing:

```javascript
// Copy entire assets directory
eleventyConfig.addPassthroughCopy("src/assets");

// Publish CSV / JSON as static data endpoints
eleventyConfig.addPassthroughCopy({
  "src/_data/books.csv": "cms/data/books.csv"
});

// GitHub Pages configuration
eleventyConfig.addPassthroughCopy("CNAME");
eleventyConfig.addPassthroughCopy(".nojekyll");
```

**Result:**
- `src/assets/css/design-system.css` → `_site/assets/css/design-system.css`
- `src/assets/js/shared.js` → `_site/assets/js/shared.js`
- `src/_data/books.csv` → `_site/cms/data/books.csv`

### CSS Pipeline

CSS files are copied as-is (no preprocessing):

```
src/assets/css/
├── design-system.css       # CLRS design system
├── design-system-clrs.css  # Color palette definitions
└── admin.css               # Admin interface styles
```

### JavaScript Pipeline

JavaScript files are copied without bundling or minification:

```
src/assets/js/
├── shared.js              # Shared utilities
├── book-workflow.js       # Book management workflows
└── batch-operations.js    # Batch processing for books
```

### Image Processing

Images are handled in two ways:

1. **Direct Copy** (via passthrough): Original images copied to `_site/assets/images/`
2. **Processed Images** (via shortcodes): Optimized responsive images generated on-demand

## Template Engines

### Supported Formats

1. **Nunjucks (.njk)** - Primary template engine
2. **HTML (.html)** - Processed with Nunjucks
3. **Liquid (.liquid)** - Alternative template syntax
4. **Markdown (.md)** - Converted to HTML, processed with Nunjucks

### Nunjucks Templates

**Example layout** (`src/_includes/layouts/book.njk`):
```nunjucks
<!DOCTYPE html>
<html lang="en">
<head>
  <title>{{ title }}</title>
</head>
<body>
  {{ content | safe }}
</body>
</html>
```

**Using layouts:**
```yaml
---
layout: layouts/book.njk
title: My Book Title
---
<h1>{{ title }}</h1>
```

## Collections System

Eleventy automatically creates collections for directories and tags. The Hudson Street Library uses:

### Implicit Collections

- **All items**: `collections.all` - Every page and template
- **Books**: Accessed via global `books` data array

### Custom Collections (Future)

You can add custom collections in `.eleventy.js`:

```javascript
eleventyConfig.addCollection("featured", function(collectionApi) {
  return collectionApi.getAll().filter(item => item.data.featured);
});
```

## Plugins

### Current Plugins

1. **@11ty/eleventy-img** (v6.0.4)
   - Image optimization and responsive image generation
   - Automatic format conversion (WebP, JPEG)
   - Srcset generation for responsive images

### Potential Future Plugins

- `@11ty/eleventy-plugin-syntaxhighlight` - Code highlighting
- `@11ty/eleventy-plugin-rss` - RSS feed generation
- `@11ty/eleventy-navigation` - Navigation breadcrumbs

## Build Commands

### Development Server

```bash
npm start
# Equivalent to: eleventy --serve
```

**Features:**
- Live reload on file changes
- Local server at http://localhost:8080
- Watches: templates, data files, assets
- Hot module reloading for CSS

**What it watches:**
- `src/**/*.{njk,html,md,liquid}`
- `src/_data/**/*`
- `src/assets/**/*`
- `.eleventy.js`

### Production Build

```bash
npm run build
# Equivalent to: eleventy
```

**Process:**
1. Cleans previous build (via prebuild hook)
2. Reads and validates CSV data
3. Processes all templates
4. Generates optimized images (on-demand)
5. Copies static assets
6. Outputs to `_site/`

**Build output:**
```
[11ty] Writing _site/index.html from ./src/index.html
[11ty] Writing _site/aggregate-view.html from ./src/aggregate-view.html
[11ty] Copied 245 files / Wrote 15 files in 2.34 seconds (6.4ms each)
```

### Clean Build

```bash
npm run clean
# Equivalent to: rm -rf _site
```

Removes entire `_site/` directory.

### Cleanup Scripts

```bash
# Clean logs, temp files, and build directory
npm run cleanup

# Individual cleanup commands
npm run cleanup:logs    # Remove *.log files
npm run cleanup:temp    # Remove temp-processing, incoming-images
npm run cleanup:build   # Remove _site directory
```

### Pre-build Hook

Automatically runs before `npm run build`:

```json
"prebuild": "npm run cleanup"
```

## Build Process Workflow

### Full Build Sequence

1. **Pre-build Phase**
   - Run `npm run cleanup`
   - Remove old build artifacts
   - Clear temporary files

2. **Data Collection Phase**
   - Load and validate CSV data
   - Parse books.csv (1,300+ records)
   - Validate ISBNs, years, required fields
   - Apply data corrections
   - Make data globally available

3. **Template Processing Phase**
   - Process Nunjucks templates
   - Apply filters and shortcodes
   - Inject global data
   - Generate HTML files

4. **Asset Processing Phase**
   - Copy static assets (CSS, JS, images)
   - Process image shortcodes (generate responsive images)
   - Copy database files
   - Copy GitHub Pages configuration

5. **Output Phase**
   - Write all files to `_site/`
   - Generate directory listings
   - Create pretty URLs

### Build Performance

**Current metrics:**
- Total files: ~260 files
- Build time: ~2.5 seconds
- Average per file: ~6-10ms
- Incremental builds (dev): ~50-200ms

**Optimization tips:**
- Image processing is the slowest operation
- CSV parsing is cached per build
- Template compilation is fast (~2-5ms per file)

## Development vs Production

### Development Mode (`npm start`)

- **Live reload**: Browser auto-refreshes on changes
- **Incremental builds**: Only rebuilds changed files
- **Source maps**: Full debugging information
- **Verbose logging**: Detailed build information
- **No optimization**: Fast rebuilds over file size

### Production Mode (`npm run build`)

- **Full rebuild**: All files regenerated
- **Image optimization**: Responsive images, WebP conversion
- **Asset copying**: All static files copied
- **No server**: Just generates files
- **Clean slate**: Starts from empty `_site/` directory

## Troubleshooting

### Common Issues

**CSV Parsing Errors**
```
Error: Missing required field: id
```
**Solution**: Check CSV data integrity, run data validation scripts

**Image Processing Failures**
```
Error: Input file is missing
```
**Solution**: Verify image paths are relative to project root

**Template Syntax Errors**
```
Error: expected variable end
```
**Solution**: Check Nunjucks syntax, ensure proper tag closure

### Build Debugging

Enable verbose logging:

```javascript
// In .eleventy.js
eleventyConfig.setQuietMode(false);
```

Check data loading:
```javascript
console.log('Books loaded:', bookData.length);
```

### Performance Profiling

Add timing logs:

```javascript
const startTime = Date.now();
// ... build operation
console.log(`Operation took: ${Date.now() - startTime}ms`);
```

## Advanced Configuration

### Custom Data Cascade

Create `src/_data/site.js` for site-wide metadata:

```javascript
module.exports = {
  name: "Hudson Street Library",
  url: "https://hudsonstreetlibrary.com",
  description: "Photography book collection"
};
```

### Custom Filters

Add new filters in `.eleventy.js`:

```javascript
eleventyConfig.addFilter("formatDate", function(date) {
  return new Date(date).toLocaleDateString();
});
```

### Custom Shortcodes

Create custom shortcodes for reusable components:

```javascript
eleventyConfig.addShortcode("button", function(text, url) {
  return `<a href="${url}" class="btn">${text}</a>`;
});
```

## Integration Points

### GitHub Actions

Build is triggered on:
- Push to `main` branch
- Pull request creation
- Manual workflow dispatch

### GitHub Pages

Deployment configuration:
- Source: `_site/` directory
- Custom domain: CNAME file
- Jekyll disabled: `.nojekyll` file

## Future Enhancements

### Potential Improvements

1. **Build optimization**
   - Add CSS minification
   - Add JS bundling and minification
   - Implement image caching to avoid re-processing

2. **Enhanced data pipeline**
   - Add JSON data support
   - Implement data validation schemas
   - Add data transformation pipelines

3. **Template improvements**
   - Add markdown-it plugins for enhanced markdown
   - Implement syntax highlighting
   - Add RSS feed generation

4. **Developer experience**
   - Add TypeScript support for config
   - Implement better error messages
   - Add build performance dashboard

## Related Documentation

- [DEVELOPMENT-WORKFLOW.md](./DEVELOPMENT-WORKFLOW.md) - Developer workflow guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [IMAGE-SYSTEM-DOCUMENTATION.md](./IMAGE-SYSTEM-DOCUMENTATION.md) - Image processing details
