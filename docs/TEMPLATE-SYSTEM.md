# Template System Documentation

## Overview

The Hudson Street Library project uses **Nunjucks** as its primary templating language through Eleventy (11ty). This system transforms templates, data files, and content into a static website with dynamic, data-driven pages.

**Key Technologies:**
- **Template Engine**: Nunjucks (with support for Liquid, HTML, and Markdown)
- **Build Tool**: Eleventy 11ty
- **Data Source**: CSV files (books.csv) and JSON files (news.json, libraryCollections.json)
- **Image Processing**: @11ty/eleventy-img for responsive images
- **Configuration**: `.eleventy.js`

---

## Template Hierarchy

### 1. Layouts (`src/_includes/layouts/`)

Layouts provide the complete HTML structure for pages. They include the full `<!DOCTYPE html>` through `</html>` wrapper.

**Available Layouts:**

#### `book.njk` (335 lines)
- **Purpose**: Individual book detail pages
- **Data Expected**: `book` object from CSV
- **Features**:
  - Full page HTML structure with Tailwind CSS
  - Sticky header with site navigation
  - Book cover image with fallback placeholder
  - Metadata display (publisher, ISBN, dimensions, etc.)
  - Subject tags and contributor information
  - Mobile-responsive design
  - JavaScript for dynamic cover image loading

**Usage:**
```nunjucks
---
layout: layouts/book.njk
---
```

**Key Book Data Fields Used:**
- `book.Title` - Book title
- `book['Author, First']` / `book['Author, Last']` - Author name
- `book.Publisher`, `book.Location`, `book.Date` - Publication info
- `book.ISBN`, `book.Size`, `book.Classification` - Catalog data
- `book.Summary` - Book description
- `book['Subject classification, tags']` - Comma-separated subjects
- `book['Collection Grouping']` - Collection membership
- `book.Image` - Cover image filename

#### `admin.njk` (261 lines)
- **Purpose**: Admin/CMS interface pages
- **Data Expected**: `title`, `user`, `breadcrumbs`, `content`
- **Features**:
  - Admin header with user menu
  - Sidebar navigation for CMS sections
  - Toast notification system
  - Form styling classes
  - JavaScript for interactive elements

**Usage:**
```nunjucks
---
layout: layouts/admin.njk
title: "Dashboard"
breadcrumbs:
  - name: "Admin"
    url: "/admin"
  - name: "Dashboard"
---
```

### 2. Components (`src/_includes/components/`)

Reusable template fragments that can be included in layouts or pages.

#### `site-header.njk`
**Purpose**: Standard site navigation header

**Parameters:**
- `currentPage` (optional) - Highlights active nav item
- `menuId` (optional) - Custom ID for mobile menu (default: 'mobile-nav-menu')

**Usage:**
```nunjucks
{% include "components/site-header.njk", currentPage: "collections" %}
```

**Features:**
- Sticky positioning
- Desktop and mobile navigation
- Active page highlighting
- Responsive menu toggle

#### `site-footer.njk`
**Purpose**: Standard site footer

**Parameters:**
- `siteName` (optional) - Override default "HUDSON STREET LIBRARY"
- `description` (optional) - Override default description

**Usage:**
```nunjucks
{% include "components/site-footer.njk" %}
```

**Features:**
- Three-column footer navigation
- Social media links
- Copyright information with dynamic year

#### `book-thumbnail.njk`
**Purpose**: Book cover thumbnail with fallback

**Parameters:**
- `book` (required) - Book object from CSV
- `size` (optional) - "small", "medium", "large" (default: "medium")
- `className` (optional) - Additional CSS classes
- `showMeta` (optional) - Show/hide title and author below thumbnail (default: true)

**Usage:**
```nunjucks
{% include "components/book-thumbnail.njk", book: bookData, size: "large" %}
```

**Features:**
- Responsive sizing
- XSS protection with `| escape` filter
- Graceful image loading with placeholder
- Handles multiple field name variations (title/Title, author_full_name, etc.)

#### `optimized-image.njk`
**Purpose**: Wrapper for image shortcode with fallback

**Parameters:**
- `src` (required) - Image path
- `alt` (required) - Alt text
- `sizes` (optional) - Responsive sizes attribute
- `className` (optional) - CSS classes

**Usage:**
```nunjucks
{% include "components/optimized-image.njk", src: "/assets/images/photo.jpg", alt: "Description", className: "w-full" %}
```

#### `collection-hero.njk`
**Purpose**: Large hero image for collection pages

**Parameters:**
- `image` (optional) - Hero image path
- `title` (optional) - Collection title
- `description` (optional) - Collection description
- `className` (optional) - Additional classes

**Usage:**
```nunjucks
{% include "components/collection-hero.njk",
   image: "/assets/hero.jpg",
   title: "Photography Collection",
   description: "Rare and vintage photography books" %}
```

#### `book-form.njk`
**Purpose**: Admin form for adding/editing books (466 lines)

**Parameters:**
- `book` (optional) - Book object for editing (omit for new books)
- `collections` (required) - Array of available collections

**Features:**
- Complete CRUD form with all book fields
- File upload for cover images
- Multi-select for collections
- Client-side validation
- Draft saving functionality
- JavaScript form handling with fetch API

### 3. Pages

Page templates can be `.njk`, `.html`, `.md`, or `.liquid` files in the `src/` directory.

**Example: `news.njk`**
- Uses front matter to set permalink
- Full standalone page (no layout inheritance in this case)
- Accesses global `news` data
- Includes inline header/footer (could be refactored to use components)

---

## Data Flow

### Global Data

Data files in `src/_data/` are automatically available globally:

```javascript
// In .eleventy.js
eleventyConfig.addGlobalData("books", bookData);
```

**Available Data:**
- `{{ books }}` - Array of all books from books.csv
- `{{ news }}` - Array from news.json
- `{{ libraryCollections }}` - Array from libraryCollections.json

### CSV Data Structure

The `books.csv` file contains the following key columns:
- `id` - Unique identifier
- `author_last`, `author_first`, `author_full_name` - Author information
- `title` - Book title
- `publisher`, `publication_year`, `location` - Publication details
- `height_cm`, `width_cm`, `depth_cm`, `binding`, `page_count` - Physical properties
- `isbn_asin`, `edition_printrun` - Identifiers
- `editor`, `contributors`, `designer` - Additional credits
- `description`, `tags`, `classification` - Content metadata
- `collection_grouping`, `accession_no` - Library organization
- `image_url` - Cover image path
- `is_signed_inscribed` - Special attributes

**CSV to Template:**
```nunjucks
{# Accessing books data #}
{% for book in books %}
  <h2>{{ book.title }}</h2>
  <p>by {{ book.author_full_name }}</p>
{% endfor %}
```

### Page Data

Front matter in templates can define page-specific data:

```nunjucks
---
layout: layouts/admin.njk
title: "Add New Book"
breadcrumbs:
  - name: "Admin"
    url: "/admin"
  - name: "Books"
    url: "/admin/books"
  - name: "New"
---
```

---

## Custom Filters

### `slugify`

Converts strings to URL-friendly slugs.

**Configuration (`.eleventy.js`):**
```javascript
eleventyConfig.addFilter("slugify", function(str) {
  if (!str) return "";
  return slugify(str, {
    lower: true,      // Convert to lowercase
    strict: true,     // Remove special characters
    remove: /["]/g,   // Remove quotes
  });
});
```

**Usage:**
```nunjucks
<a href="/books/{{ book.title | slugify }}">{{ book.title }}</a>
```

**Example:**
```nunjucks
{{ "Berenice Abbott: Changing New York" | slugify }}
{# Output: berenice-abbott-changing-new-york #}
```

---

## Custom Shortcodes

Shortcodes are reusable functions that generate HTML.

### `image` (Async)

Generates responsive images with multiple formats and sizes.

**Configuration:**
```javascript
async function imageShortcode(src, alt, sizes = "100vw", className = "") {
  let metadata = await Image(src, {
    widths: [300, 600, 900, 1200],
    formats: ["webp", "jpeg"],
    outputDir: "./_site/assets/images/optimized/",
    urlPath: "/assets/images/optimized/",
  });

  return Image.generateHTML(metadata, {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
    class: className
  });
}

eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
eleventyConfig.addLiquidShortcode("image", imageShortcode);
```

**Usage:**
```nunjucks
{% image "/assets/images/photo.jpg", "Photo description", "100vw", "rounded-lg" %}
```

**Output:**
```html
<picture>
  <source type="image/webp" srcset="/assets/images/optimized/photo-300w.webp 300w, ..." sizes="100vw">
  <source type="image/jpeg" srcset="/assets/images/optimized/photo-300w.jpeg 300w, ..." sizes="100vw">
  <img alt="Photo description" loading="lazy" decoding="async" class="rounded-lg" src="/assets/images/optimized/photo-300w.jpeg">
</picture>
```

**Parameters:**
- `src` (required) - Source image path
- `alt` (required) - Alt text for accessibility
- `sizes` (optional) - Responsive sizes attribute (default: "100vw")
- `className` (optional) - CSS classes (default: "")

**Features:**
- Generates multiple widths: 300, 600, 900, 1200 pixels
- Outputs WebP and JPEG formats
- Lazy loading enabled
- Async decoding for performance

### `thumbnail` (Async)

Generates smaller thumbnail images optimized for previews.

**Configuration:**
```javascript
async function thumbnailShortcode(src, alt, className = "thumbnail") {
  let metadata = await Image(src, {
    widths: [150, 300],
    formats: ["webp", "jpeg"],
    outputDir: "./_site/assets/images/thumbnails/",
    urlPath: "/assets/images/thumbnails/",
  });

  return Image.generateHTML(metadata, {
    alt,
    loading: "lazy",
    decoding: "async",
    class: className
  });
}

eleventyConfig.addNunjucksAsyncShortcode("thumbnail", thumbnailShortcode);
```

**Usage:**
```nunjucks
{% thumbnail book.image_url, book.title, "book-cover" %}
```

**Parameters:**
- `src` (required) - Source image path
- `alt` (required) - Alt text
- `className` (optional) - CSS classes (default: "thumbnail")

**Features:**
- Smaller sizes: 150, 300 pixels
- Optimized for grid/list views
- Separate output directory for organization

---

## Template Best Practices

### 1. XSS Prevention

Always escape user-controlled content:

```nunjucks
{# GOOD - Escaped #}
<h1>{{ book.title | escape }}</h1>
<p>{{ userInput | escape }}</p>

{# BAD - Unsafe #}
<div>{{ book.description | safe }}</div>
```

**Note:** The `| safe` filter should only be used for trusted, controlled content.

### 2. Null/Undefined Checks

Protect against missing data:

```nunjucks
{# Check if field exists before using #}
{% if book.Summary %}
  <div class="summary">{{ book.Summary | escape }}</div>
{% endif %}

{# Provide defaults #}
<p>Author: {{ book.author_full_name or "Unknown" }}</p>
```

### 3. Array/List Handling

Safely iterate and handle empty arrays:

```nunjucks
{# Check array exists and has items #}
{% if book.tags and book.tags.length > 0 %}
  {% for tag in book.tags %}
    <span>{{ tag }}</span>
  {% endfor %}
{% endif %}

{# Split comma-separated strings #}
{% if book['Subject classification, tags'] %}
  {% for subject in book['Subject classification, tags'].split(',') %}
    {% set trimmed_subject = subject | trim %}
    {% if trimmed_subject %}
      <span>{{ trimmed_subject | escape }}</span>
    {% endif %}
  {% endfor %}
{% endif %}
```

### 4. Responsive Images

Always provide alt text and responsive sizes:

```nunjucks
{# Good - Responsive with proper alt text #}
{% image coverPath, book.title + " by " + book.author, "(min-width: 768px) 50vw, 100vw" %}

{# Consider device sizes #}
{% image heroImage, "Collection hero", "(min-width: 1024px) 80vw, 100vw" %}
```

### 5. Component Parameterization

Make components reusable with clear parameters:

```nunjucks
{#
  Component Header Documentation
  Parameters:
  - title (required): Display title
  - subtitle (optional): Subtitle text
  - className (optional): Additional CSS classes
#}

{% set componentTitle = title or "Default Title" %}
{% set extraClasses = className or "" %}

<div class="component {{ extraClasses }}">
  <h2>{{ componentTitle }}</h2>
  {% if subtitle %}
    <p>{{ subtitle }}</p>
  {% endif %}
</div>
```

### 6. Performance

- Use `loading="lazy"` for images below the fold
- Minimize template logic (move complex operations to build-time data processing)
- Use async shortcodes for I/O operations

### 7. Accessibility

```nunjucks
{# Always include alt text #}
<img src="{{ path }}" alt="{{ book.title | escape }}">

{# Use semantic HTML #}
<nav aria-label="Site navigation">
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>

{# ARIA attributes for interactive elements #}
<button aria-label="Toggle menu" aria-expanded="false" aria-controls="mobile-menu">
  <i class="fas fa-bars"></i>
</button>
```

---

## Creating New Templates

### New Page Template

**File:** `src/new-page.njk`

```nunjucks
---
permalink: /new-page/
layout: layouts/base.njk
title: "New Page Title"
---

<div class="container">
  <h1>{{ title }}</h1>

  {# Access global data #}
  {% for book in books | slice(0, 5) %}
    <div>{{ book.title }}</div>
  {% endfor %}
</div>
```

### New Component

**File:** `src/_includes/components/custom-card.njk`

```nunjucks
{#
  Custom Card Component
  Usage: {% include "components/custom-card.njk", item: dataObject %}
  Parameters:
  - item (required): Data object with title, description
  - variant (optional): "default", "highlighted" (default: "default")
#}

{% set cardVariant = variant or "default" %}
{% set cardClasses = "card " + ("card-highlighted" if cardVariant == "highlighted" else "") %}

<div class="{{ cardClasses }}">
  <h3>{{ item.title | escape }}</h3>
  {% if item.description %}
    <p>{{ item.description | escape }}</p>
  {% endif %}
</div>
```

**Usage:**
```nunjucks
{% include "components/custom-card.njk", item: book, variant: "highlighted" %}
```

### New Layout

**File:** `src/_includes/layouts/simple.njk`

```nunjucks
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title or "Hudson Street Library" }}</title>
  <link rel="stylesheet" href="/assets/css/tailwind.css">
</head>
<body>
  {% include "components/site-header.njk" %}

  <main>
    {{ content | safe }}
  </main>

  {% include "components/site-footer.njk" %}
</body>
</html>
```

**Usage:**
```nunjucks
---
layout: layouts/simple.njk
title: "Simple Page"
---
<p>Page content here</p>
```

---

## Nunjucks Syntax Quick Reference

### Variables

```nunjucks
{# Output variable #}
{{ variableName }}

{# With filter #}
{{ variableName | filterName }}

{# Chain filters #}
{{ book.title | trim | escape }}

{# Default value #}
{{ book.author or "Unknown Author" }}
```

### Comments

```nunjucks
{# Single line comment #}

{#
  Multi-line
  comment
#}
```

### Conditionals

```nunjucks
{% if condition %}
  Content
{% endif %}

{% if book.featured %}
  <span>Featured</span>
{% elif book.new %}
  <span>New</span>
{% else %}
  <span>Standard</span>
{% endif %}

{# Checking for existence #}
{% if book.image_url and book.image_url.length > 0 %}
  <img src="{{ book.image_url }}">
{% endif %}

{# Negation #}
{% if not book.is_archived %}
  <div>Active book</div>
{% endif %}
```

### Loops

```nunjucks
{# Basic loop #}
{% for book in books %}
  <div>{{ book.title }}</div>
{% endfor %}

{# With else (if array is empty) #}
{% for book in books %}
  <div>{{ book.title }}</div>
{% else %}
  <p>No books found</p>
{% endfor %}

{# Loop variables #}
{% for book in books %}
  <div>
    {{ loop.index }} {# 1-based index #}
    {{ loop.index0 }} {# 0-based index #}
    {{ book.title }}
    {% if loop.first %}(First){% endif %}
    {% if loop.last %}(Last){% endif %}
  </div>
{% endfor %}

{# Filtering in loop #}
{% for book in books | selectattr("featured") %}
  Featured: {{ book.title }}
{% endfor %}
```

### Setting Variables

```nunjucks
{# Set a variable #}
{% set pageTitle = "Book Collection" %}

{# Set from expression #}
{% set authorName = book.author_first + " " + book.author_last %}

{# Set with default #}
{% set coverClass = className or "default-cover" %}
```

### Filters

```nunjucks
{# Built-in filters #}
{{ book.title | upper }}
{{ book.title | lower }}
{{ book.title | capitalize }}
{{ book.description | truncate(100) }}
{{ book.tags | join(", ") }}
{{ book.title | replace("Photo", "Image") }}
{{ book.title | trim }}
{{ book.summary | escape }}
{{ trustedContent | safe }}

{# Custom filter #}
{{ book.title | slugify }}

{# Filters on arrays #}
{{ books | length }}
{{ books | first }}
{{ books | last }}
{{ books | reverse }}
{{ books | sort }}
{{ books | slice(0, 10) }}
```

### Including Templates

```nunjucks
{# Basic include #}
{% include "components/header.njk" %}

{# With parameters #}
{% include "components/card.njk", item: book, size: "large" %}

{# With context variables #}
{% include "components/footer.njk", siteName: "My Library" %}
```

### Extending Layouts

```nunjucks
{# In page template #}
---
layout: layouts/base.njk
---

{# Or within template #}
{% extends "layouts/base.njk" %}

{% block content %}
  <p>Page content</p>
{% endblock %}
```

### Macros (Reusable Functions)

```nunjucks
{# Define macro #}
{% macro bookCard(book, showAuthor=true) %}
  <div class="book-card">
    <h3>{{ book.title }}</h3>
    {% if showAuthor %}
      <p>{{ book.author_full_name }}</p>
    {% endif %}
  </div>
{% endmacro %}

{# Use macro #}
{{ bookCard(book, showAuthor=false) }}
```

### Working with Objects

```nunjucks
{# Access object properties #}
{{ book.title }}
{{ book['Author, First'] }}  {# For keys with spaces/special chars #}

{# Check if property exists #}
{% if book.summary %}
  {{ book.summary }}
{% endif %}
```

### Working with Arrays

```nunjucks
{# Check if array #}
{% if books is iterable %}

{# Array length #}
{{ books | length }}

{# Access by index #}
{{ books[0].title }}

{# Slice array #}
{{ books | slice(0, 5) }}  {# First 5 items #}

{# Filter array #}
{% set featuredBooks = books | selectattr("is_featured") %}
```

---

## Troubleshooting Template Errors

### Common Errors

#### 1. "Cannot read property of undefined"

**Error Message:**
```
Error: Cannot read property 'title' of undefined
```

**Cause:** Accessing a property on a null/undefined object

**Solution:**
```nunjucks
{# Check existence first #}
{% if book and book.title %}
  {{ book.title }}
{% endif %}

{# Or use default #}
{{ book.title or "Untitled" }}
```

#### 2. "expected variable end"

**Error Message:**
```
Error: expected variable end
```

**Cause:** Syntax error in variable/tag

**Common Issues:**
- Missing closing braces: `{{ variable` should be `{{ variable }}`
- Mixing tags: `{% variable }}` should be `{{ variable }}`

**Solution:**
```nunjucks
{# Correct syntax #}
{{ book.title }}
{% if condition %}{% endif %}

{# Not this #}
{{ book.title }
{% book.title %}
```

#### 3. "filter not found: filterName"

**Error Message:**
```
Error: filter not found: slugify
```

**Cause:** Filter not registered in `.eleventy.js`

**Solution:**
Check that filter is added in configuration:
```javascript
eleventyConfig.addFilter("slugify", function(str) { ... });
```

#### 4. "Unable to call `undefined`, which is undefined"

**Error Message:**
```
Error: Unable to call `image`, which is undefined
```

**Cause:** Shortcode not registered

**Solution:**
Verify shortcode registration in `.eleventy.js`:
```javascript
eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
```

#### 5. "template not found: components/header.njk"

**Error Message:**
```
Error: template not found: components/header.njk
```

**Cause:**
- File doesn't exist at expected path
- Incorrect path in include statement
- Directory configuration issue

**Solution:**
```nunjucks
{# Verify path relative to _includes directory #}
{% include "components/header.njk" %}  {# Looks in src/_includes/components/ #}

{# Check file exists #}
{# File should be at: src/_includes/components/header.njk #}
```

**Verify configuration:**
```javascript
// In .eleventy.js
return {
  dir: {
    includes: "_includes",  // Templates look here
  }
};
```

#### 6. CSV Data Not Loading

**Symptoms:** `{{ books }}` is empty or undefined

**Debugging:**
```nunjucks
{# Check if data exists #}
<p>Books count: {{ books | length }}</p>
<pre>{{ books | dump | safe }}</pre>

{# Check specific book #}
{% if books and books.length > 0 %}
  First book: {{ books[0].title }}
{% else %}
  No books loaded
{% endif %}
```

**Solutions:**
- Check CSV file exists at `src/_data/books.csv`
- Verify CSV parsing in `.eleventy.js` console output
- Check for CSV syntax errors (unclosed quotes, etc.)
- Review build logs for parsing errors

#### 7. Image Shortcodes Not Working

**Symptoms:** Images not generating or broken paths

**Debugging:**
```nunjucks
{# Test if shortcode is available #}
{% image "/assets/images/test.jpg", "Test", "100vw" %}

{# Check if async shortcodes are used in sync context #}
{# Async shortcodes need template to be processed async #}
```

**Solutions:**
- Ensure source images exist
- Check output directory has write permissions
- Verify image paths are absolute or relative to input directory
- Review Eleventy build output for image processing errors

#### 8. Escaping Issues

**Problem:** HTML entities showing as text or XSS vulnerability

**Solution:**
```nunjucks
{# For display (escapes HTML) #}
{{ book.title | escape }}

{# For trusted HTML content #}
{{ trustedContent | safe }}

{# In attributes, escape is automatic #}
<img alt="{{ book.title }}">  {# Auto-escaped #}
```

### Debugging Tips

#### 1. Dump Data to Inspect Structure

```nunjucks
<pre>{{ book | dump | safe }}</pre>
<pre>{{ books | dump(2) | safe }}</pre>  {# Limit depth to 2 #}
```

#### 2. Check Variable Type

```nunjucks
{% if books is iterable %}Array/Iterable{% endif %}
{% if book is string %}String{% endif %}
{% if count is number %}Number{% endif %}
```

#### 3. Console Logging During Build

In `.eleventy.js`:
```javascript
eleventyConfig.addFilter("debug", function(value) {
  console.log("Debug:", value);
  return value;
});
```

Usage:
```nunjucks
{{ book | debug }}
```

#### 4. Conditional Debug Output

```nunjucks
{% if process.env.DEBUG %}
  <div class="debug">
    <h3>Debug Info</h3>
    <pre>{{ book | dump | safe }}</pre>
  </div>
{% endif %}
```

#### 5. Template Include Path Testing

```nunjucks
{# Test if component exists #}
{% try %}
  {% include "components/test.njk" %}
{% catch %}
  <p>Component not found</p>
{% endtry %}
```

---

## Additional Resources

### Nunjucks Documentation
- Official Docs: https://mozilla.github.io/nunjucks/
- Templating: https://mozilla.github.io/nunjucks/templating.html

### Eleventy Documentation
- Eleventy Docs: https://www.11ty.dev/docs/
- Filters: https://www.11ty.dev/docs/filters/
- Shortcodes: https://www.11ty.dev/docs/shortcodes/
- Global Data: https://www.11ty.dev/docs/data-global/

### Project-Specific
- Configuration: `/.eleventy.js`
- Data Directory: `/src/_data/`
- Template Directory: `/src/_includes/`
- Build Output: `/_site/`

### Related Documentation
- `/docs/BUILD-SYSTEM.md` - Build configuration and deployment
- `/docs/DATA-STRUCTURES.md` - Data schemas and structures
- `/docs/IMAGE-SYSTEM-DOCUMENTATION.md` - Image processing details

---

## Summary

The Hudson Street Library template system provides:

1. **Flexible Layout System** - Two main layouts (book.njk, admin.njk) with full control
2. **Reusable Components** - Header, footer, thumbnails, forms, and more
3. **Data Integration** - Seamless CSV and JSON data access
4. **Image Optimization** - Automatic responsive image generation
5. **Custom Filters** - URL slugification and more
6. **Security** - XSS protection with escape filters
7. **Performance** - Lazy loading, async processing, static generation

**Key Principle:** Templates transform data into static HTML at build time, creating a fast, secure, and maintainable website.
