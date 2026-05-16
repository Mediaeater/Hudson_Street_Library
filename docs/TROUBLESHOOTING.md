# Hudson Street Library - Troubleshooting Guide

Complete troubleshooting reference for the Hudson Street Library project covering the full development lifecycle from local development to production deployment.

## Table of Contents

1. [General Troubleshooting Methodology](#general-troubleshooting-methodology)
2. [Build Errors](#build-errors)
3. [Development Server Issues](#development-server-issues)
4. [Data Issues](#data-issues)
5. [Template Errors](#template-errors)
6. [JavaScript Errors](#javascript-errors)
7. [CSS/Styling Issues](#cssstyling-issues)
8. [Image Problems](#image-problems)
9. [Database Issues](#database-issues)
10. [API Errors](#api-errors)
11. [Deployment Issues](#deployment-issues)
12. [Performance Problems](#performance-problems)
13. [Debug Procedures and Tools](#debug-procedures-and-tools)
14. [Getting Help](#getting-help)
15. [FAQ](#faq)
16. [Error Message Reference](#error-message-reference)

---

## General Troubleshooting Methodology

### The 5-Step Debug Process

1. **Identify the Problem**
   - What is the exact error message?
   - When does it occur? (build time, runtime, specific page)
   - Can you reproduce it consistently?
   - What changed recently?

2. **Isolate the Cause**
   - Test in isolation (single file, single component)
   - Check git history: `git log --oneline -10`
   - Disable features one by one
   - Use browser dev tools or build logs

3. **Search for Solutions**
   - Check this troubleshooting guide
   - Search error messages in docs
   - Review similar files that work
   - Check GitHub issues

4. **Apply Fix**
   - Make small, incremental changes
   - Test after each change
   - Document what you tried

5. **Verify Resolution**
   - Test locally: `npm run build && npm start`
   - Check in multiple browsers
   - Verify deployment works
   - Add regression test if possible

### Quick Diagnostic Commands

```bash
# Check project health
npm run build                    # Test build process
npm start                        # Test dev server
node --version                   # Check Node.js version (should be 22+)
npm list --depth=0              # Check installed packages

# Check file integrity
git status                       # See what changed
git diff                         # Review changes
ls -la src/_data/books.csv      # Verify data file exists
head src/_data/books.csv        # Check CSV format

# Clean slate
npm run clean                    # Remove build directory
rm -rf node_modules             # Remove dependencies
npm install                      # Reinstall dependencies
npm run build                    # Fresh build

# Check for common issues
grep -r "undefined" src/_includes/  # Find undefined variables
grep -r "null" src/_includes/       # Find null references
```

---

## Build Errors

### Category Overview

Build errors occur during the Eleventy compilation process. These prevent the site from being generated.

### Common Build Errors

#### 1. Template Syntax Error

**Error Message:**
```
Error: expected variable end
Template render error: (unknown path)
  Error: expected variable end
```

**Cause:**
- Missing closing braces in Nunjucks template
- Incorrect tag syntax
- Mixing `{{` and `{%` tags

**Solution:**
```nunjucks
# WRONG
{{ book.title }
{% book.title }}

# CORRECT
{{ book.title }}
{% if book.title %}{{ book.title }}{% endif %}
```

**Prevention:**
- Use a text editor with Nunjucks syntax highlighting
- Match opening and closing tags
- Validate templates before committing

---

#### 2. CSV Parsing Errors

**Error Message:**
```
CSV Error: Invalid Record Length: expect 28, got 27
CSV had 15 warnings/errors
Error parsing CSV: src/_data/books.csv
```

**Cause:**
- Malformed CSV data (unclosed quotes, extra commas)
- Column count mismatch
- Encoding issues (non-UTF-8)
- Line break inside quoted field not properly escaped

**Solution:**

```bash
# Check CSV integrity
node -e "
const CSVHandler = require('./scripts/utils/csv-handler');
CSVHandler.read('src/_data/books.csv').then(result => {
  console.log('Valid rows:', result.stats.validRows);
  console.log('Invalid rows:', result.stats.invalidRows);
  console.log('Errors:', result.errors.slice(0, 5));
});
"

# Fix CSV formatting
node scripts/fix-csv-formatting.js

# Manual fix checklist:
# 1. Open CSV in text editor (NOT Excel - it corrupts formatting)
# 2. Check for unescaped quotes (should be "")
# 3. Ensure each row has same column count
# 4. Check for newlines inside quoted fields
# 5. Verify UTF-8 encoding (no smart quotes)
```

**Example Fix:**
```csv
# WRONG
id,title,author,description
1,Photo Book,Smith,"This is a description, with comma"

# CORRECT
id,title,author,description
1,"Photo Book","Smith","This is a description, with comma"
```

---

#### 3. Missing File/Asset Error

**Error Message:**
```
Error: ENOENT: no such file or directory, open 'src/assets/images/book.jpg'
Input file is missing
```

**Cause:**
- Referenced file doesn't exist
- Incorrect file path (case sensitivity on Linux/Mac)
- File not committed to git
- File in wrong directory

**Solution:**

```bash
# Find the missing file
find . -name "book.jpg"
find src/assets -name "*.jpg"

# Check if path is correct
ls -la src/assets/images/

# Verify file is tracked by git
git ls-files | grep book.jpg

# If using image shortcode, verify path is relative to project root
{% image "src/assets/images/book.jpg", "Alt text" %}  # Correct
{% image "/assets/images/book.jpg", "Alt text" %}     # Wrong in shortcode
```

**Prevention:**
- Use consistent paths
- Verify files exist before referencing
- Use autocomplete in editor to catch typos

---

#### 4. Memory Issues (Large Build)

**Error Message:**
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Cause:**
- Processing too many images at once
- Large CSV files
- Memory leak in template
- Not enough Node.js heap space

**Solution:**

```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# Or modify package.json
"scripts": {
  "build": "node --max-old-space-size=4096 node_modules/.bin/eleventy"
}

# Process images in smaller batches
node scripts/image-pipeline/cli.js optimize --path ./covers --batch-size 10

# Check for memory leaks
node --trace-warnings node_modules/.bin/eleventy
```

---

#### 5. Plugin/Dependency Errors

**Error Message:**
```
Error: Cannot find module '@11ty/eleventy-img'
Module not found: 'slugify'
```

**Cause:**
- Missing npm package
- Wrong Node.js version
- Corrupted node_modules
- package.json out of sync

**Solution:**

```bash
# Verify package.json and package-lock.json are in sync
npm ci  # Clean install from lock file

# If that fails, nuclear option:
rm -rf node_modules package-lock.json
npm install

# Verify Node.js version (should be 22+, required by Eleventy v3)
node --version
nvm use 18  # If using nvm

# Check package is in package.json
cat package.json | grep eleventy-img

# Install specific package if missing
npm install @11ty/eleventy-img@6.0.4
```

---

## Development Server Issues

### Category Overview

Issues that occur when running `npm start` or using the local development server.

### Common Development Server Issues

#### 1. Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE: address already in use :::8080
Port 8080 is already in use
```

**Cause:**
- Another process using port 8080
- Previous Eleventy instance still running
- Port conflict with other dev server

**Solution:**

```bash
# Find process using port 8080
lsof -i :8080
# or
netstat -an | grep 8080

# Kill the process (use PID from above)
kill -9 <PID>

# Or use different port
npx eleventy --serve --port 8081

# Visit http://localhost:8081
```

**Prevention:**
- Always stop dev server with Ctrl+C
- Add alias to package.json for alternate port

---

#### 2. Live Reload Not Working

**Symptom:**
- Changes to files don't trigger browser refresh
- Have to manually refresh to see changes
- Dev server running but not watching files

**Cause:**
- Browser cache
- File watcher issue
- File outside watched directories
- Too many files to watch (system limit)

**Solution:**

```bash
# Restart dev server
# Stop with Ctrl+C
npm start

# Clear browser cache (hard reload)
# Chrome/Firefox: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# Check file is in watched directory
# Eleventy watches:
# - src/**/*
# - .eleventy.js
# - package.json

# Increase file watch limit (Mac/Linux)
echo "kern.maxfiles=65536" | sudo tee -a /etc/sysctl.conf
echo "kern.maxfilesperproc=65536" | sudo tee -a /etc/sysctl.conf

# Force rebuild on change
touch .eleventy.js
```

---

#### 3. Styles Not Updating

**Symptom:**
- CSS changes don't appear
- Old styles persist
- Have to do hard refresh

**Cause:**
- Browser cache
- CSS file not in passthrough copy
- Tailwind not rebuilt after editing utility classes
- Service worker caching (if enabled)

**Solution:**

```bash
# 1. Hard reload browser
# Chrome: Cmd+Shift+R (Mac) or Ctrl+F5 (Windows)

# 2. Check CSS file is in passthrough copy (.eleventy.js)
eleventyConfig.addPassthroughCopy("src/assets");

# 3. Disable cache in DevTools
# Chrome DevTools -> Network tab -> Check "Disable cache"

# 4. Rebuild Tailwind from scratch
npm run clean
npm run build:css
npm start
```

---

#### 4. JavaScript Not Loading

**Symptom:**
- Interactive features not working
- Console shows 404 for JS files
- Scripts not executing

**Cause:**
- Incorrect script path
- File not in passthrough copy
- MIME type error
- Script loading before DOM ready

**Solution:**

```html
<!-- Check script path -->
<!-- WRONG (absolute path from site root) -->
<script src="/assets/js/shared.js"></script>

<!-- CORRECT (relative to _site output) -->
<script src="/assets/js/shared.js"></script>

<!-- Check file exists -->
ls -la _site/assets/js/shared.js

<!-- Verify passthrough copy in .eleventy.js -->
eleventyConfig.addPassthroughCopy("src/assets");

<!-- Ensure script loads after DOM -->
<script defer src="/assets/js/shared.js"></script>
<!-- or -->
<script src="/assets/js/shared.js"></script>
<!-- Place before </body> tag -->
```

---

## Data Issues

### Category Overview

Problems with CSV data, database synchronization, and data validation.

### Common Data Issues

#### 1. Books Not Appearing on Site

**Symptom:**
- Book exists in CSV but not showing on website
- Book count mismatch
- Missing from search results

**Cause:**
- CSV parsing error
- Invalid data format
- Missing required fields
- CSV not included in build

**Diagnosis:**

```bash
# Check CSV is being read
npm run build | grep "Parsed"
# Should show: "Parsed 1306 records from books.csv"

# Check for errors
npm run build | grep "CSV had"
# Shows: "CSV had 15 warnings/errors"

# Test CSV directly
node -e "
const CSVHandler = require('./scripts/utils/csv-handler');
CSVHandler.readBooksSync('src/_data/books.csv');
"
```

**Solution:**

```javascript
// In template, debug book count
<p>Total books: {{ books | length }}</p>

// Check specific book exists
{% set testBook = books | selectattr("id", "equalto", 123) | first %}
{% if testBook %}
  Book found: {{ testBook.title }}
{% else %}
  Book NOT found
{% endif %}

// Check for required fields
{% for book in books %}
  {% if not book.title %}
    Missing title for book ID: {{ book.id }}
  {% endif %}
{% endfor %}
```

---

#### 2. CSV Corruption After Edit

**Symptom:**
- Build fails after editing CSV
- Data shows garbled characters
- Columns misaligned

**Cause:**
- Edited in Excel (corrupts UTF-8 encoding)
- Smart quotes added by word processor
- Extra commas or missing quotes
- Wrong line endings (Windows CRLF vs Unix LF)

**Solution:**

```bash
# NEVER edit CSV in Excel - use:
# - VS Code with Rainbow CSV extension
# - Sublime Text
# - Vim/Nano
# - Any plain text editor

# Fix encoding
iconv -f UTF-8 -t UTF-8 -c src/_data/books.csv > temp.csv
mv temp.csv src/_data/books.csv

# Fix line endings
dos2unix src/_data/books.csv  # Convert CRLF to LF
# or
sed -i 's/\r$//' src/_data/books.csv

# Run CSV fixer script
node scripts/fix-csv-formatting.js

# Restore from backup if corrupted
cp src/_data/books_backup_migration_*.csv src/_data/books.csv
```

**Prevention:**
- Always edit CSV in plain text editor
- Commit before editing (easy to revert)
- Use CSV validation before committing
- Keep backups

---

#### 3. Site Shows Stale Data After Editing CSV

**Symptom:**
- Website still shows the old book list after editing `books.csv`
- Recent additions not reflected

**Cause:**
- Eleventy dev server not running, or watch missed the change
- Stale `_site/` from a previous build
- Browser cache

**Solution:**

```bash
# Stop and restart the dev server
./stop.sh 2>/dev/null   # legacy; harmless if missing
lsof -ti:8080 | xargs kill -9 2>/dev/null
npm start

# Or do a full clean rebuild
npm run clean
npm run build

# Hard reload the page (Cmd+Shift+R / Ctrl+F5)
```

---

#### 4. Invalid ISBN/ASIN Format

**Symptom:**
- Book covers not downloading
- API lookups failing
- ISBN validation errors

**Cause:**
- ISBN with hyphens (should be numbers only)
- Invalid check digit
- Mixed ISBN-10 and ISBN-13
- ASIN instead of ISBN

**Solution:**

```bash
# Check ISBN format
# Valid: 9783869304311 (13 digits)
# Valid: 0123456789 (10 digits)
# Invalid: 978-3-86930-431-1 (has hyphens)
# Invalid: ABCD123456 (not all numeric for ISBN)

# Find invalid ISBNs in CSV
node -e "
const CSVHandler = require('./scripts/utils/csv-handler');
CSVHandler.read('src/_data/books.csv').then(result => {
  const invalid = result.data.filter(book => {
    const isbn = book.isbn_asin;
    return isbn && !/^[0-9]{10}([0-9]{3})?$/.test(isbn.replace(/[-\s]/g, ''));
  });
  console.log('Invalid ISBNs:', invalid.length);
  invalid.slice(0, 5).forEach(b => console.log(b.id, b.isbn_asin, b.title));
});
"

# Clean ISBN format (remove hyphens)
# In your CSV editor:
# Find: -
# Replace: (empty)
# Only in isbn_asin column!
```

---

## Template Errors

### Category Overview

Errors in Nunjucks templates, filters, and shortcodes.

### Common Template Errors

#### 1. Undefined Variable

**Error Message:**
```
Error: Cannot read property 'title' of undefined
Error: (unknown path) [Line 45, Column 12]
  {{ book.title }}
```

**Cause:**
- Variable doesn't exist in context
- Typo in variable name
- Data not loaded
- Accessing property of null/undefined

**Solution:**

```nunjucks
# BAD - No safety check
{{ book.title }}

# GOOD - Check existence
{% if book and book.title %}
  {{ book.title }}
{% endif %}

# GOOD - Provide default
{{ book.title or "Untitled" }}

# GOOD - Safe navigation
{{ book?.title }}  # Modern Nunjucks only

# Debug - dump data to see structure
<pre>{{ book | dump | safe }}</pre>

# Check if variable exists
{% if book %}
  Book exists
{% else %}
  Book is undefined/null
{% endif %}
```

---

#### 2. Filter Not Found

**Error Message:**
```
Error: filter not found: slugify
Unable to call `slugify`, which is undefined or falsey
```

**Cause:**
- Filter not registered in .eleventy.js
- Typo in filter name
- Filter function has error

**Solution:**

```javascript
// Check .eleventy.js has filter registered
eleventyConfig.addFilter("slugify", function(str) {
  if (!str) return "";
  return slugify(str, { lower: true, strict: true });
});

// Verify filter is exported
module.exports = function(eleventyConfig) {
  // Filter must be added before this return
  eleventyConfig.addFilter("slugify", ...);

  return {
    dir: { ... }
  };
};

// In template, check filter exists
{% if slugify %}
  {{ title | slugify }}
{% else %}
  Filter not available
{% endif %}
```

---

#### 3. Shortcode Errors

**Error Message:**
```
Error: Unable to call `image`, which is undefined
Error: Input file is missing: src/assets/images/cover.jpg
```

**Cause:**
- Shortcode not registered
- Async shortcode used in sync context
- Invalid arguments passed
- Image file doesn't exist

**Solution:**

```javascript
// In .eleventy.js - verify shortcode registered
eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);

// Check it's async shortcode (for image processing)
async function imageShortcode(src, alt, sizes, className) {
  // Must be async for eleventy-img
  let metadata = await Image(src, { ... });
  return Image.generateHTML(metadata, { ... });
}

// In template - correct usage
{% image "src/assets/images/book.jpg", "Cover", "100vw", "rounded" %}

// Not this (missing required params)
{% image "book.jpg" %}

// Debug shortcode
console.log('Shortcode called with:', src, alt, sizes, className);
```

---

#### 4. Include/Template Not Found

**Error Message:**
```
Error: template not found: components/header.njk
Error: template not found: layouts/book.njk
```

**Cause:**
- File doesn't exist at path
- Path relative to wrong directory
- Typo in filename
- File in wrong location

**Solution:**

```bash
# Check file exists
ls -la src/_includes/components/header.njk
ls -la src/_includes/layouts/book.njk

# Verify directory structure
tree src/_includes/

# Check .eleventy.js configuration
# return {
#   dir: {
#     includes: "_includes",  # Includes look here
#     layouts: "_includes/layouts"
#   }
# }

# Include path is relative to _includes directory
{% include "components/header.njk" %}  # Looks in src/_includes/components/
{% include "layouts/book.njk" %}       # Wrong - layouts has its own dir
```

---

#### 5. Loop/Iteration Issues

**Error Message:**
```
Error: Cannot read property 'Symbol(Symbol.iterator)' of undefined
Object is not iterable
```

**Cause:**
- Trying to loop over non-array
- Variable is undefined
- Data not loaded
- Wrong data type

**Solution:**

```nunjucks
# BAD - No check if array exists
{% for book in books %}
  {{ book.title }}
{% endfor %}

# GOOD - Check array exists and has items
{% if books and books.length > 0 %}
  {% for book in books %}
    {{ book.title }}
  {% endfor %}
{% else %}
  <p>No books found</p>
{% endif %}

# Check if iterable
{% if books is iterable %}
  Can loop over this
{% endif %}

# Debug - check type
<p>Type: {{ books | typeof }}</p>
<p>Length: {{ books | length }}</p>
<pre>{{ books | dump(2) | safe }}</pre>
```

---

## JavaScript Errors

### Category Overview

Client-side JavaScript errors, console errors, and script loading issues.

### Common JavaScript Errors

#### 1. Script Not Loading

**Symptom:**
- Features not working
- Console shows 404 for JS file
- "X is not defined" errors

**Diagnosis:**

```javascript
// Open browser DevTools (F12)
// Check Console tab for errors
// Check Network tab for 404s

// Common error:
GET http://localhost:8080/assets/js/shared.js 404 (Not Found)
```

**Solution:**

```bash
# Verify file exists in build
ls -la _site/assets/js/shared.js

# Check passthrough copy in .eleventy.js
eleventyConfig.addPassthroughCopy("src/assets");

# Verify path in HTML
<script src="/assets/js/shared.js"></script>

# Check file is in src directory
ls -la src/assets/js/shared.js

# Rebuild
npm run clean && npm run build
```

---

#### 2. Mobile Menu Not Working

**Symptom:**
- Menu button doesn't toggle
- Menu doesn't open on mobile
- No click response

**Cause:**
- JavaScript not loaded
- Event listener not attached
- Incorrect element IDs
- Script runs before DOM ready

**Solution:**

```javascript
// Check script is loaded
console.log('Script loaded');

// Check element exists
const menuButton = document.getElementById('mobile-menu-button');
console.log('Menu button:', menuButton);  // Should not be null

// Check event listener attached
menuButton.addEventListener('click', function() {
  console.log('Button clicked');
});

// Ensure DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // All your code here
});

// Or use defer attribute
<script defer src="/assets/js/shared.js"></script>

// Verify IDs match
<!-- In HTML -->
<button id="mobile-menu-button">Menu</button>
<div id="mobile-menu">...</div>

<!-- In JS -->
const button = document.getElementById('mobile-menu-button');
const menu = document.getElementById('mobile-menu');
```

---

#### 3. Undefined Variable Errors

**Error Message:**
```
Uncaught ReferenceError: bookData is not defined
Cannot read property 'length' of undefined
```

**Cause:**
- Variable not declared
- Scope issue
- Script load order
- Typo in variable name

**Solution:**

```javascript
// Check variable is defined
console.log(typeof bookData);  // Should be 'object' not 'undefined'

// Declare before use
let bookData = [];

// Check scope
function loadBooks() {
  let books = [];  // Local scope
}
console.log(books);  // Error - books not in scope

// Fix: Use proper scope
let books = [];  // Global or module scope
function loadBooks() {
  books = loadData();  // Now accessible
}

// Check script order
<script src="/assets/js/data.js"></script>  <!-- Defines bookData -->
<script src="/assets/js/main.js"></script>  <!-- Uses bookData -->
```

---

#### 4. Async/Promise Errors

**Error Message:**
```
Uncaught (in promise) TypeError: Cannot read property 'json' of undefined
Promise rejection not handled
```

**Cause:**
- Fetch failed
- API error
- No error handling
- Wrong response parsing

**Solution:**

```javascript
// BAD - No error handling
fetch('/api/books')
  .then(res => res.json())
  .then(data => console.log(data));

// GOOD - Proper error handling
fetch('/api/books')
  .then(res => {
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  })
  .then(data => {
    console.log('Data loaded:', data);
  })
  .catch(error => {
    console.error('Fetch error:', error);
    // Show user-friendly error
  });

// Better - Use async/await
async function loadBooks() {
  try {
    const res = await fetch('/api/books');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error loading books:', error);
    return [];  // Return empty array as fallback
  }
}
```

---

## CSS/Styling Issues

### Category Overview

Problems with Tailwind CSS, custom styles, and responsive design.

### Common CSS/Styling Issues

#### 1. Tailwind Classes Not Applying

**Symptom:**
- Tailwind classes in HTML but styles not showing
- Generic styles only
- Colors/spacing not working

**Cause:**
- Compiled `_site/assets/css/tailwind.css` not built or not linked
- Class name typo
- CSS specificity issue
- Browser cache holding an old stylesheet

**Solution:**

```html
<!-- Verify the compiled stylesheet in <head> -->
<link rel="stylesheet" href="/assets/css/tailwind.css">
```

```bash
# Rebuild Tailwind (input.css -> tailwind.css, minified)
npm run build:css

# Or in dev, run the watcher + Eleventy together
npm start
```

```html
<!-- Check browser DevTools -->
<!-- 1. Network tab - verify /assets/css/tailwind.css loads (200) -->
<!-- 2. Console - check for errors -->
<!-- 3. Elements tab - verify classes are applied -->

<!-- Clear cache -->
<!-- Hard reload: Cmd+Shift+R (Mac) or Ctrl+F5 (Win) -->

<!-- Test specific class -->
<div class="bg-red-500 p-4">Should be red with padding</div>

<!-- Common typos -->
<!-- WRONG -->
<div class="text-centre">...</div>
<!-- RIGHT -->
<div class="text-center">...</div>

<!-- Check for custom config overriding -->
<script>
  tailwind.config = {
    theme: {
      extend: {
        // Your customizations
      }
    }
  }
</script>
```

---

#### 2. Responsive Design Not Working

**Symptom:**
- Mobile layout broken
- Breakpoints not triggering
- Desktop styles on mobile

**Cause:**
- Missing viewport meta tag
- Wrong breakpoint syntax
- CSS overrides
- Browser cache

**Solution:**

```html
<!-- CRITICAL: Add viewport meta tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Tailwind breakpoint syntax -->
<!-- Mobile first - no prefix for base, then sm:, md:, lg:, xl: -->
<div class="w-full md:w-1/2 lg:w-1/3">
  <!-- 100% width mobile, 50% on medium, 33% on large -->
</div>

<!-- Common mistakes -->
<!-- WRONG -->
<div class="mobile:w-full desktop:w-1/2">
<!-- RIGHT -->
<div class="w-full lg:w-1/2">

<!-- Test breakpoints -->
<!-- Tailwind breakpoints: -->
<!-- sm: 640px -->
<!-- md: 768px -->
<!-- lg: 1024px -->
<!-- xl: 1280px -->

<!-- Debug in DevTools -->
<!-- Toggle device toolbar (Cmd+Shift+M) -->
<!-- Test different screen sizes -->
```

---

#### 3. Custom CSS Not Loading

**Symptom:**
- Custom styles in CSS file not applying
- Only Tailwind styles work
- Changes to CSS file don't appear

**Cause:**
- CSS file not in passthrough copy
- Wrong file path
- CSS specificity too low
- Browser cache

**Solution:**

```bash
# Verify CSS file in build
ls -la _site/assets/css/design-system.css

# Check .eleventy.js passthrough
eleventyConfig.addPassthroughCopy("src/assets");

# Verify link in HTML
<link rel="stylesheet" href="/assets/css/design-system.css">

# Check specificity (custom CSS should come after Tailwind)
<link rel="stylesheet" href="/assets/css/tailwind.css">
<link rel="stylesheet" href="/assets/css/design-system.css">

# Force reload without cache
# Chrome: Cmd+Shift+R
# Or disable cache in DevTools Network tab

# Check CSS actually exists
curl http://localhost:8080/assets/css/design-system.css
```

---

#### 4. Z-Index/Layering Issues

**Symptom:**
- Elements overlapping incorrectly
- Modal behind content
- Dropdown menu hidden

**Cause:**
- Z-index too low
- Parent has lower z-index
- Transform creates new stacking context
- Position not set

**Solution:**

```css
/* Z-index only works with positioned elements */
/* WRONG */
.modal {
  z-index: 1000;
}

/* RIGHT */
.modal {
  position: fixed;  /* or absolute, relative, sticky */
  z-index: 1000;
}

/* Common z-index scale */
.dropdown { z-index: 10; }
.sticky-header { z-index: 100; }
.modal-backdrop { z-index: 1000; }
.modal { z-index: 1001; }
.toast { z-index: 9999; }

/* Tailwind z-index classes */
<div class="z-10">Dropdown</div>
<div class="z-50">Modal</div>

/* Debug in DevTools */
/* Elements tab -> Computed -> filter for "z-index" */
```

---

## Image Problems

### Category Overview

Issues with book covers, image optimization, and the image pipeline.

### Common Image Problems

#### 1. Book Covers Not Displaying

**Symptom:**
- Broken image icon
- Alt text showing instead of image
- 404 in network tab

**Diagnosis:**

```bash
# Check if image file exists
ls -la src/assets/images/books/

# Check image path in CSV
head -1 src/_data/books.csv  # Headers
grep "9783869304311" src/_data/books.csv  # Specific book

# Check built site
ls -la _site/assets/images/books/

# Test image URL
curl -I http://localhost:8080/assets/images/books/cover.jpg
# Should return 200, not 404
```

**Solution:**

```html
<!-- Check image path is correct -->
<!-- In CSV: image_url column -->
/assets/images/books/abbott_documenting_science.jpg

<!-- In template -->
<img src="{{ book.image_url }}" alt="{{ book.title }}">

<!-- Fallback for missing images -->
<img
  src="{{ book.image_url or '/assets/images/placeholder-book.jpg' }}"
  alt="{{ book.title }}"
  onerror="this.src='/assets/images/placeholder-book.jpg'">

<!-- Check passthrough copy -->
# In .eleventy.js
eleventyConfig.addPassthroughCopy("src/assets");
```

---

#### 2. Image Optimization Failing

**Error Message:**
```
Error: Input file is missing: src/assets/images/cover.jpg
Error: Error processing image: ENOENT
```

**Cause:**
- Image file doesn't exist
- Wrong path to source image
- Permission issues
- Corrupted image file

**Solution:**

```bash
# Verify image exists and is readable
ls -la src/assets/images/cover.jpg
file src/assets/images/cover.jpg  # Check file type

# Check permissions
chmod 644 src/assets/images/cover.jpg

# Test image is valid
# On Mac:
sips -g all src/assets/images/cover.jpg
# Should show image properties, not error

# Verify image shortcode path
{% image "src/assets/images/cover.jpg", "Alt text" %}
# Path must be relative to project root, not _site

# Check eleventy-img output directory exists
mkdir -p _site/assets/images/optimized
mkdir -p _site/assets/images/thumbnails

# Clear image cache
rm -rf _site/assets/images/optimized/*
rm -rf _site/assets/images/thumbnails/*
npm run build
```

---

#### 3. Image Pipeline Not Finding Covers

**Symptom:**
- `node scripts/image-pipeline/cli.js find --missing` returns 0 results
- API lookups failing
- Covers exist but marked as missing

**Cause:**
- ISBN not in CSV
- API rate limiting
- Network issues
- Wrong API credentials

**Solution:**

```bash
# Check API status
node scripts/image-pipeline/cli.js status

# Test specific ISBN
node scripts/image-pipeline/cli.js find --isbn 9783869304311

# Check CSV has ISBNs
awk -F',' '{print $14}' src/_data/books.csv | head -20
# Column 14 is isbn_asin

# Test APIs directly
node -e "
const BookAPIClient = require('./scripts/utils/book-api-client');
const client = new BookAPIClient();
client.findBookCover('9783869304311').then(console.log);
"

# Check rate limiting
# Open Library: 100 requests/5 minutes
# Google Books: 1000 requests/day

# Wait and retry
sleep 60
node scripts/image-pipeline/cli.js find --missing --limit 10
```

---

#### 4. Images Too Large (Performance)

**Symptom:**
- Page loads slowly
- Large file sizes
- High bandwidth usage

**Cause:**
- Original images not optimized
- Not using responsive images
- Not using WebP format
- Too many images loading at once

**Solution:**

```bash
# Check image sizes
ls -lh src/assets/images/books/ | sort -k5 -h
# Look for files > 500KB

# Optimize images
node scripts/optimize-all-images.js

# Use image shortcode for automatic optimization
{% image "src/assets/images/cover.jpg", "Alt text" %}
# Generates: 300w, 600w, 900w, 1200w in WebP and JPEG

# Implement lazy loading
<img loading="lazy" src="...">
# Or use image shortcode (includes lazy loading)

# Use thumbnails for lists
{% thumbnail book.image_url, book.title %}
# Generates: 150w, 300w (smaller sizes)

# Check optimized sizes
ls -lh _site/assets/images/optimized/
# Should see multiple sizes and formats
```

---

## CSV Data Issues

### Category Overview

Problems with `src/_data/books.csv` — parsing, validation, or stale entries.
The CSV is the single source of truth; there is no runtime database.

### Common CSV Issues

#### 1. Validation Failures

**Error Message:**
```
✗ Row 145: missing required field 'title'
✗ Row 287: invalid isbn_asin "97-83869304311"
```

**Cause:**
- Required fields blank (`title` or `author_full_name`)
- ISBN/ASIN doesn't match expected format
- Numeric field has non-numeric content

**Solution:**

```bash
# Run the full validator
npm run test:csv

# Inspect a specific row
awk -F',' 'NR==145' src/_data/books.csv

# Confirm column count is 36
head -1 src/_data/books.csv | awk -F',' '{print NF}'

# Restore from a recent backup if needed (most recent first)
ls -t src/_data/books_backup_*.csv | head
cp src/_data/books_backup_<timestamp>.csv src/_data/books.csv
```

---

#### 2. Duplicate IDs or ISBNs

**Symptom:**
- Two books share an `id`, or two rows have the same `isbn_asin`

**Solution:**

```bash
# Find duplicates with the CSV handler
node -e "
const { CSVHandler } = require('./scripts/utils/csv-handler');
CSVHandler.read('src/_data/books.csv').then(result => {
  const ids = result.data.map(b => b.id);
  const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
  console.log('Duplicate IDs:', [...new Set(dups)]);

  const isbns = result.data.map(b => b.isbn_asin).filter(Boolean);
  const isbnDups = isbns.filter((isbn, i) => isbns.indexOf(isbn) !== i);
  console.log('Duplicate ISBNs:', [...new Set(isbnDups)]);
});
"
```

Resolve in the CSV directly: delete the duplicate row, or null out the
duplicate ISBN if the rows describe different printings.

---

#### 3. Build is Slow / Large CSV

**Symptom:**
- `npm run build` takes noticeably longer
- Eleventy reports a high "Wrote N files" count

**Cause:**
- New book pages were added (expected — build scales with row count)
- Large `description` fields blow up template parse time

**Solution:**

```bash
# Time the build
time npm run build

# Sort rows by description length to find outliers
node -e "
const { CSVHandler } = require('./scripts/utils/csv-handler');
CSVHandler.read('src/_data/books.csv').then(r => {
  r.data
    .map(b => ({ id: b.id, title: b.title, len: (b.description||'').length }))
    .sort((a,b)=>b.len-a.len)
    .slice(0,10)
    .forEach(b => console.log(b.len, b.id, b.title));
});
"
```

---

## API Errors

### Category Overview

Issues with external book cover APIs and rate limiting.

### Common API Errors

#### 1. Rate Limit Exceeded

**Error Message:**
```
HTTP 429: Too Many Requests
Rate limit exceeded
```

**Cause:**
- Too many requests to API
- No delay between requests
- Shared IP rate limiting

**Solution:**

```javascript
// Add delay between requests
async function fetchWithDelay(url, delay = 1000) {
  await new Promise(resolve => setTimeout(resolve, delay));
  return fetch(url);
}

// Use batch processing with limits
node scripts/image-pipeline/cli.js find --missing --limit 10
# Process 10 at a time, then wait

// Check API limits:
// Open Library: 100 req/5 min
// Google Books: 1000 req/day

// Use caching
// Image-API responses are cached on disk at data/image-cache.json
jq '. | length' data/image-cache.json

// Clear old cache by editing the file or removing entries with jq
```

---

#### 2. API Timeout

**Error Message:**
```
Error: ETIMEDOUT
Request timeout
```

**Cause:**
- Network issues
- API server slow/down
- No timeout set
- Firewall blocking

**Solution:**

```javascript
// Set reasonable timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5000);  // 5 second timeout

fetch(url, { signal: controller.signal })
  .then(res => res.json())
  .catch(error => {
    if (error.name === 'AbortError') {
      console.log('Request timed out');
    }
  })
  .finally(() => clearTimeout(timeout));

// Test API directly
curl -I https://openlibrary.org/api/books\?bibkeys=ISBN:9783869304311\&format=json

// Check network
ping openlibrary.org
```

---

#### 3. Invalid API Response

**Error Message:**
```
Unexpected token < in JSON at position 0
Cannot read property 'items' of undefined
```

**Cause:**
- API returned HTML instead of JSON
- API structure changed
- Invalid ISBN
- API error response

**Solution:**

```javascript
// Validate response before parsing
fetch(url)
  .then(res => {
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Not JSON response');
    }
    return res.json();
  })
  .then(data => {
    // Validate structure
    if (!data || !data.items) {
      console.log('Unexpected structure:', data);
      return [];
    }
    return data.items;
  })
  .catch(error => {
    console.error('API error:', error);
    return [];  // Fallback
  });

// Test API manually
curl "https://openlibrary.org/api/books?bibkeys=ISBN:9783869304311&format=json"

// Check response format
node -e "
const client = require('./scripts/utils/book-api-client');
client.findBookCover('9783869304311')
  .then(data => console.log(JSON.stringify(data, null, 2)));
"
```

---

## Deployment Issues

### Category Overview

Problems with GitHub Actions builds and GitHub Pages deployment.

### Common Deployment Issues

#### 1. Build Failing on GitHub Actions

**Error Message:**
```
Error: Process completed with exit code 1
npm ERR! code ELIFECYCLE
```

**Diagnosis:**

```bash
# Check Actions tab on GitHub
# Click on failed workflow run
# Review build logs

# Test build locally (exactly as GitHub does)
npm ci  # Clean install
npx eleventy  # Build command

# Check Node.js version matches
# GitHub: Node 18
# Local: node --version
```

**Solution:**

```bash
# Common fixes:

# 1. package-lock.json out of sync
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push

# 2. Dependency issues
# Check package.json has all dependencies
npm install --save missing-package

# 3. Build command issues
# Verify scripts in package.json
cat package.json | grep build

# 4. Template errors
# Test all templates locally
npm run build

# 5. CSV issues
# Validate CSV before pushing
node -e "require('./scripts/utils/csv-handler').read('src/_data/books.csv').then(r => console.log(r.stats));"
```

---

#### 2. Site Not Updating After Deploy

**Symptom:**
- Push to main succeeds
- Build passes
- But site shows old content

**Cause:**
- Browser cache
- GitHub Pages cache
- Wrong GitHub Pages source
- CNAME redirect issue

**Solution:**

```bash
# 1. Check GitHub Pages settings
# Settings -> Pages
# Source: GitHub Actions (not "Deploy from a branch")

# 2. Verify deployment succeeded
# Actions tab -> Latest workflow -> Deploy job
# Should show green checkmark

# 3. Check deployment URL
# Should be: https://hudsonstreetlibrary.com
# Or: https://yourusername.github.io/repository-name

# 4. Clear browser cache
# Hard reload: Cmd+Shift+R (Mac) or Ctrl+F5 (Win)
# Or: Open in incognito window

# 5. Check CNAME file
cat CNAME
# Should contain: hudsonstreetlibrary.com

# 6. Wait for CDN cache (can take 5-10 minutes)
# Check status:
npm run deploy:check
```

---

#### 3. GitHub Pages 404 Error

**Symptom:**
- Homepage loads
- Other pages show 404
- Refreshing page breaks it

**Cause:**
- Missing .nojekyll file
- Jekyll processing enabled
- Incorrect permalinks

**Solution:**

```bash
# Add .nojekyll file to disable Jekyll
touch .nojekyll
git add .nojekyll
git commit -m "Add .nojekyll to disable Jekyll processing"
git push

# Verify in .eleventy.js
eleventyConfig.addPassthroughCopy(".nojekyll");

# Check permalinks in templates
# Should be: /page-name/
# Not: page-name.html

# Rebuild and deploy
npm run build
git add _site/.nojekyll
git commit -m "Ensure .nojekyll in build"
git push
```

---

#### 4. Custom Domain Not Working

**Symptom:**
- Site works on github.io URL
- Custom domain shows error
- SSL certificate issues

**Cause:**
- DNS not configured
- CNAME file missing/wrong
- Propagation delay

**Solution:**

```bash
# 1. Check CNAME file exists
cat CNAME
# Should contain your domain: hudsonstreetlibrary.com

# 2. Verify DNS settings
# In your domain registrar:
# A records: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
# Or CNAME: yourusername.github.io

# 3. Test DNS
dig hudsonstreetlibrary.com
nslookup hudsonstreetlibrary.com

# 4. Wait for propagation (can take 24-48 hours)

# 5. Enable HTTPS in GitHub
# Settings -> Pages -> Enforce HTTPS (check)

# 6. Clear DNS cache
# Mac: sudo dscacheutil -flushcache
# Windows: ipconfig /flushdns
```

---

## Performance Problems

### Category Overview

Slow builds, large file sizes, and optimization issues.

### Common Performance Problems

#### 1. Slow Build Times

**Symptom:**
- `npm run build` takes > 30 seconds
- Incremental builds slow
- Out of memory errors

**Diagnosis:**

```bash
# Time the build
time npm run build

# Check what's slow
npm run build | grep "Writing"
# Look for bottlenecks

# Check file count
find _site -type f | wc -l

# Check image processing
ls -1 _site/assets/images/optimized/ | wc -l
```

**Solution:**

```javascript
// In .eleventy.js - disable slow features during dev
module.exports = function(eleventyConfig) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    // Full image optimization in production
    eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);
  } else {
    // Simple passthrough in dev
    eleventyConfig.addShortcode("image", function(src, alt) {
      return `<img src="${src}" alt="${alt}">`;
    });
  }
};

// Use smaller image batches
node scripts/image-pipeline/cli.js optimize --batch-size 10

// Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"

// Clear caches
rm -rf _site
rm -rf .cache
npm run build
```

---

#### 2. Large Page Size

**Symptom:**
- Pages > 1MB
- Slow page load
- High bandwidth usage

**Diagnosis:**

```bash
# Check page sizes
ls -lh _site/*.html | sort -k5 -h

# Check total size
du -sh _site/

# Analyze what's large
du -sh _site/assets/*
du -sh _site/assets/images/*
```

**Solution:**

```bash
# Optimize images
# Use WebP format (25-35% smaller)
# Use responsive images
# Implement lazy loading

# Check for large JSON/CSV
ls -lh _site/cms/data/

# Minify HTML (future enhancement)
# Defer non-critical CSS
# Remove unused Tailwind classes

# Lazy load images
<img loading="lazy" src="...">

# Or use image shortcode (auto lazy-loading)
{% image src, alt %}
```

---

#### 3. Too Many API Requests

**Symptom:**
- Rate limiting errors
- Slow cover acquisition
- API bans

**Cause:**
- No caching
- Requesting same data multiple times
- No batch processing

**Solution:**

```bash
# Inspect the on-disk API cache (JSON, not SQLite)
ls -lh data/image-cache.json
jq '. | length' data/image-cache.json

# Process in smaller batches
node scripts/image-pipeline/cli.js find --missing --limit 10

# Delays are built into book-api-client.js; tune via its CLI flags.
```

---

## Debug Procedures and Tools

### Browser DevTools

```javascript
// Console debugging
console.log('Variable:', variable);
console.table(arrayData);  // Pretty print arrays
console.dir(object);       // Show object structure
console.trace();           // Show call stack

// Network debugging
// DevTools -> Network tab
// Filter: JS, CSS, Img, XHR
// Look for: 404s, slow requests, large files

// Element inspection
// Right-click -> Inspect
// Check computed styles
// Verify classes applied
// Check for CSS conflicts
```

### Eleventy Debugging

```javascript
// In .eleventy.js
eleventyConfig.setQuietMode(false);  // Verbose logging

// Add filter for debugging
eleventyConfig.addFilter("debug", function(value) {
  console.log("DEBUG:", value);
  return value;
});

// Use in templates
{{ book | debug }}

// Log during build
console.log("--- Building with", books.length, "books");
```

### CSV Debugging

```bash
# Validate CSV
node -e "
const CSVHandler = require('./scripts/utils/csv-handler');
CSVHandler.read('src/_data/books.csv').then(result => {
  console.log('Stats:', result.stats);
  console.log('First 3 errors:', result.errors.slice(0, 3));
  console.log('Sample book:', result.data[0]);
});
"

# Check specific row
awk -F',' 'NR==145' src/_data/books.csv

# Count columns
head -1 src/_data/books.csv | awk -F',' '{print NF}'
```

### Datasette Catalog Debugging (optional local tool)

```bash
# Rebuild the local SQLite catalog from books.csv
./scripts/update-datasette-catalog.sh

# Open Datasette in the browser
datasette hudson_street_library.db --metadata metadata.json
# Visit http://localhost:8001

# Run quick ad-hoc queries
sqlite3 hudson_street_library.db "SELECT COUNT(*) FROM books;"
sqlite3 hudson_street_library.db "SELECT * FROM books WHERE title IS NULL OR title = '';"
sqlite3 hudson_street_library.db "SELECT isbn_asin, COUNT(*) FROM books GROUP BY isbn_asin HAVING COUNT(*) > 1;"
```

The Datasette catalog is **derivative**, regenerated from `books.csv`. It is
not deployed and not authoritative.

### Git Debugging

```bash
# What changed?
git status
git diff
git diff --cached

# When did it break?
git log --oneline -10
git log --oneline --since="2 days ago"

# Find when issue introduced
git bisect start
git bisect bad          # Current version is bad
git bisect good abc123  # This commit was good
# Git will checkout commits to test
npm run build           # Test each one
git bisect good/bad     # Mark result

# Restore previous version
git checkout HEAD~1 -- src/_data/books.csv
```

### Network Debugging

```bash
# Test API
curl -I https://openlibrary.org/
curl "https://openlibrary.org/api/books?bibkeys=ISBN:9783869304311&format=json"

# Test local server
curl -I http://localhost:8080
curl http://localhost:8080/assets/js/shared.js

# Check DNS
dig hudsonstreetlibrary.com
nslookup hudsonstreetlibrary.com

# Test connectivity
ping openlibrary.org
```

---

## Getting Help

### Internal Resources

1. **Documentation**
   - `/docs/` - All project documentation
   - `/docs/DEPLOYMENT.md` - Deployment guide
   - `/docs/BUILD-SYSTEM.md` - Build configuration
   - `/docs/TEMPLATE-SYSTEM.md` - Template reference
   - `/docs/IMAGE-SYSTEM-DOCUMENTATION.md` - Image pipeline
   - `/docs/DATA-STRUCTURES.md` - Database schema

2. **Code Examples**
   - `/scripts/utils/*-example.js` - Usage examples
   - `/src/_includes/components/` - Component templates
   - `/src/_includes/layouts/` - Layout templates

3. **Logs**
   - `logs/` - Local dev-server logs (when started via `npm start`)
   - GitHub Actions logs - Build/deploy history

### External Resources

1. **Eleventy**
   - Docs: https://www.11ty.dev/docs/
   - Troubleshooting: https://www.11ty.dev/docs/debug/
   - Discord: https://www.11ty.dev/discord/

2. **Nunjucks**
   - Templating: https://mozilla.github.io/nunjucks/templating.html
   - API: https://mozilla.github.io/nunjucks/api.html

3. **Tailwind CSS**
   - Docs: https://tailwindcss.com/docs
   - Playground: https://play.tailwindcss.com/

4. **GitHub Pages**
   - Docs: https://docs.github.com/en/pages
   - Troubleshooting: https://docs.github.com/en/pages/getting-started-with-github-pages/troubleshooting-404-errors-for-github-pages-sites

### Support Channels

1. **Search Issues**
   - Check GitHub Issues for similar problems
   - Search closed issues (may have solution)

2. **Create Issue**
   - Provide error message
   - Include steps to reproduce
   - Share environment (Node version, OS)
   - Include relevant code snippets

3. **Ask Community**
   - Eleventy Discord
   - Stack Overflow (tag: eleventy, nunjucks)

---

## FAQ

### General Questions

**Q: How do I test changes locally before deploying?**

```bash
# Test full build
npm run clean && npm run build

# Test dev server
npm start
# Visit http://localhost:8080

# Test exactly as GitHub does
npm ci && npx eleventy
```

**Q: Why is my change not showing on the live site?**

Possible causes:
1. Browser cache - Hard reload (Cmd+Shift+R)
2. GitHub Pages cache - Wait 5-10 minutes
3. Build failed - Check Actions tab
4. CNAME issue - Verify domain settings

**Q: How do I rollback a bad deployment?**

```bash
# Find last good commit
git log --oneline

# Revert to it
git revert abc123
git push

# Or reset (use with caution)
git reset --hard abc123
git push --force  # Only if you're sure!
```

### Build Questions

**Q: Build works locally but fails on GitHub Actions**

Common causes:
- package-lock.json out of sync
- Different Node.js version
- Missing environment variables
- Local files not committed

Solution:
```bash
# Test with clean install
npm ci
npx eleventy

# Check Node version
node --version  # Should be 18+

# Verify all files committed
git status
git add .
git commit -m "Add missing files"
```

**Q: How do I speed up build times?**

```bash
# Use production build only when needed
npm run build  # Full build with optimization

# For dev, use:
npm start  # Faster incremental builds

# Optimize images separately
node scripts/image-pipeline/cli.js optimize
```

### Data Questions

**Q: How do I add a new book?**

1. Edit `src/_data/books.csv` in text editor (NOT Excel)
2. Add row with all required fields: id, title, author_full_name
3. Save with UTF-8 encoding
4. Test: `npm run build`
5. Commit and push

**Q: CSV is corrupted, how do I fix it?**

```bash
# Restore from backup
ls -la src/_data/books_backup_*.csv
cp src/_data/books_backup_migration_*.csv src/_data/books.csv

# Or restore from git
git checkout HEAD -- src/_data/books.csv

# Or run fixer
node scripts/fix-csv-formatting.js
```

### Template Questions

**Q: How do I debug template errors?**

```nunjucks
<!-- Dump data to see structure -->
<pre>{{ book | dump | safe }}</pre>

<!-- Check if variable exists -->
{% if book %}
  <p>Book exists</p>
  {% if book.title %}
    <p>Title: {{ book.title }}</p>
  {% else %}
    <p>No title</p>
  {% endif %}
{% else %}
  <p>Book is undefined</p>
{% endif %}

<!-- Safe access with default -->
{{ book.title or "Untitled" }}
```

### Image Questions

**Q: Book cover not showing**

Check:
1. Image file exists: `ls -la src/assets/images/books/`
2. Path in CSV is correct
3. File copied to build: `ls -la _site/assets/images/books/`
4. Passthrough copy configured: check `.eleventy.js`
5. Browser cache: Hard reload

**Q: How do I acquire missing covers?**

```bash
# Find books missing covers
node scripts/image-pipeline/cli.js find --missing

# Download covers (limited to avoid rate limits)
node scripts/image-pipeline/cli.js find --missing --download --limit 10

# Check specific ISBN
node scripts/image-pipeline/cli.js find --isbn 9783869304311
```

---

## Error Message Reference

### Build Errors

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| `expected variable end` | Template syntax error | Check `{{` and `}}` pairs |
| `CSV Error: Invalid Record Length` | Column count mismatch | Check CSV for extra commas |
| `ENOENT: no such file` | File not found | Verify file path and existence |
| `Reached heap limit` | Out of memory | Increase Node memory or reduce batch size |
| `Cannot find module` | Missing dependency | Run `npm install` |

### Template Errors

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| `filter not found: slugify` | Filter not registered | Check `.eleventy.js` |
| `Unable to call 'image'` | Shortcode not found | Verify shortcode registration |
| `template not found` | Include file missing | Check file path and location |
| `Cannot read property 'title' of undefined` | Variable is null/undefined | Add null check: `{% if book and book.title %}` |
| `Object is not iterable` | Trying to loop non-array | Check variable is array: `{% if books is iterable %}` |

### JavaScript Errors

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| `404 (Not Found)` for JS file | Script path incorrect | Verify path and passthrough copy |
| `X is not defined` | Variable not in scope | Check variable declaration |
| `Uncaught (in promise)` | Unhandled async error | Add `.catch()` or try/catch |
| `CORS error` | Cross-origin request blocked | Check API allows requests |

### CSV Errors

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| `missing required field 'title'` | Row has no title | Edit the row in `books.csv` or remove it |
| `invalid isbn_asin` | ISBN/ASIN format check failed | Fix the value or null it out |
| `unbalanced quote` | Embedded `"` not escaped as `""` | Re-quote the field |
| `column count mismatch` | Row has ≠ 36 columns | Audit commas inside un-quoted fields |

### API Errors

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| `HTTP 429: Too Many Requests` | Rate limit exceeded | Add delay between requests, reduce batch size |
| `ETIMEDOUT` | Request timed out | Check network, increase timeout |
| `Unexpected token < in JSON` | Got HTML instead of JSON | Check API response format |

### Deployment Errors

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| `exit code 1` | Build failed on GitHub | Test locally: `npm ci && npx eleventy` |
| `404` on GitHub Pages | Jekyll processing or missing file | Add `.nojekyll` file |
| `Site not updating` | Cache or wrong source | Hard reload browser, check Pages source setting |

---

## Appendix: Useful Commands Cheat Sheet

### Build & Dev

```bash
npm start              # Dev server with live reload
npm run build          # Production build
npm run clean          # Remove _site directory
npm run deploy:check   # Check deployment status
```

### Testing

```bash
# Test full build process
npm run clean && npm run build

# Test CSV
node -e "require('./scripts/utils/csv-handler').read('src/_data/books.csv').then(r => console.log(r.stats));"
npm run test:csv

# Test API
node scripts/image-pipeline/cli.js status
```

### Debugging

```bash
# View logs
git log --oneline -10

# Check versions
node --version
npm list --depth=0

# Find files
find . -name "*.njk"
find src/assets/images -name "*.jpg"

# Search code
grep -r "error" src/
grep -r "TODO" docs/
```

### Git

```bash
git status              # What changed
git diff                # See changes
git log --oneline -10   # Recent commits
git checkout HEAD -- file.csv  # Restore file
git revert abc123       # Undo commit
```

### Datasette catalog (optional)

```bash
# Rebuild from CSV
./scripts/update-datasette-catalog.sh

# Open Datasette
datasette hudson_street_library.db --metadata metadata.json
```

---

**Last Updated:** 2025-01-19
**Applies to Version:** 1.0.0
**Project:** Hudson Street Library

For additional help, see `/docs/` or create an issue on GitHub.
