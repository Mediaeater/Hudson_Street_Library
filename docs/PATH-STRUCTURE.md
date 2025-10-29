# Path Structure Documentation

## Overview

The Hudson Street Library uses a specific directory structure for its generated book pages. Understanding how paths work in this structure is critical for avoiding broken links and missing assets.

## Directory Structure

```
Hudson_Street_Library/
├── _site/                          # Built site (GitHub Pages root)
│   ├── index.html                  # Root level
│   ├── static-demo/                # Search page directory
│   │   └── index.html
│   ├── collection-explore.html     # Root level
│   ├── assets/
│   │   └── images/
│   │       └── placeholder-book.svg
│   └── books/                      # Generated book pages
│       └── {author}_{title}/       # Nested 2 levels deep
│           └── index.html          # Individual book page
```

## The Path Problem

### Why Absolute Paths Fail

Book pages are generated at: `/books/{slug}/index.html`

When using absolute paths like `/assets/images/placeholder-book.svg`, browsers interpret this as starting from the server root, which works. However, when using paths like `static-demo.html` without the leading slash from nested pages, the browser tries to resolve them relative to the current directory.

### Why Relative Paths Are Required

From a book page at `/books/goya_goya_the_disasters_of_war/index.html`:

**Current directory:** `/books/goya_goya_the_disasters_of_war/`

To reach resources at the root level, you need to:
1. Go up one level: `../` (to `/books/`)
2. Go up another level: `../../` (to root `/`)
3. Then navigate to the resource: `../../assets/images/placeholder-book.svg`

## Path Resolution Examples

### Correct Relative Paths

From book page → Root assets:
```
Current: /books/{slug}/index.html
Target:  /assets/images/placeholder-book.svg
Path:    ../../assets/images/placeholder-book.svg
```

From book page → Search page:
```
Current: /books/{slug}/index.html
Target:  /static-demo/index.html
Path:    ../../static-demo/
```

From book page → Collections:
```
Current: /books/{slug}/index.html
Target:  /collections/recently_added.html
Path:    ../../collections/recently_added.html
```

### Incorrect Paths (Causes 404s)

```
❌ /assets/images/placeholder-book.svg  (works but we want relative)
❌ ../../static-demo.html                (file doesn't exist)
❌ static-demo.html                      (looks in /books/{slug}/)
❌ ../static-demo/                       (looks in /books/)
```

## Key Files

### 1. Book Template
**File:** `src/books/templates/BOOK-TEMPLATE.html`

All navigation links and asset references in this template must use relative paths with the `../../` prefix to reach the root level.

**Critical sections:**
- Header navigation (desktop and mobile)
- Back to Search button
- Footer navigation
- Subject tag links

### 2. Book Generator Script
**File:** `generate-book-pages.js`

This script processes the template and generates individual book pages. It handles:
- Placeholder image paths (line 106)
- Tag link generation (line 77)
- Dynamic content replacement

## Historical Fixes

### Fix #1: Placeholder Images (2025-10-29)

**Problem:** Books without cover art showed broken images.

**Root cause:** Using absolute path `/assets/images/placeholder-book.svg` instead of relative path.

**Solution:**
```javascript
// generate-book-pages.js:106
// BEFORE (broken):
html = html.replace(/\[IMAGE_PATH\]/g, '/assets/images/placeholder-book.svg');

// AFTER (fixed):
html = html.replace(/\[IMAGE_PATH\]/g, '../../assets/images/placeholder-book.svg');
```

**Files changed:**
- `generate-book-pages.js` (line 106)
- Regenerated all 1440 book pages

### Fix #2: Search Link 404s (2025-10-29)

**Problem:** Clicking "Search" in navigation from book pages resulted in 404 errors.

**Root cause:** Links pointed to `../../static-demo.html` but the actual resource is a directory at `../../static-demo/` with an index.html inside.

**Solution:**
```html
<!-- BEFORE (broken): -->
<a href="../../static-demo.html">Search</a>

<!-- AFTER (fixed): -->
<a href="../../static-demo/">Search</a>
```

**Files changed:**
- `src/books/templates/BOOK-TEMPLATE.html` (5 locations)
  - Desktop navigation
  - Mobile navigation
  - Back to Search button
  - Footer navigation
  - Subject tag template
- `generate-book-pages.js` (line 77 - tag generation)
- Regenerated all 1440 book pages

## Best Practices

### 1. Always Use Relative Paths in Templates

For any resource referenced from book pages, use the `../../` prefix:

```html
✅ <a href="../../static-demo/">Search</a>
✅ <a href="../../collection-explore.html">Collections</a>
✅ <img src="../../assets/images/placeholder-book.svg">
✅ <link href="../../assets/css/styles.css">
```

### 2. Directory vs File Paths

Pay attention to whether the target is a directory with an index.html or an actual file:

```html
✅ <a href="../../static-demo/">      <!-- Directory with index.html -->
✅ <a href="../../collection-explore.html"> <!-- Actual file -->
```

### 3. Test After Path Changes

When changing paths, always:
1. Build the site locally: `npm run build`
2. Test navigation from a book page
3. Check browser console for 404 errors
4. Deploy and verify on production

### 4. When Adding New Pages

If adding new pages at the root level:
- If it's a directory with index.html: use `../../dirname/`
- If it's an HTML file: use `../../filename.html`

## Debugging Path Issues

### Symptoms of Path Problems

1. **Broken images:** Check if using absolute vs relative paths
2. **404 on navigation:** Verify directory structure matches link
3. **Styles not loading:** Check CSS link paths from nested pages

### Quick Debug Checklist

```bash
# 1. Check if the target file/directory exists
ls -la _site/static-demo/
ls -la _site/assets/images/

# 2. View a generated book page
cat _site/books/some_book/index.html | grep -E "(href=|src=)"

# 3. Test locally
npm run build
open _site/books/some_book/index.html

# 4. Check for 404s in browser console
```

### Path Calculation Helper

From book page to root resource:
1. Count directory depth: `/books/{slug}/index.html` = 2 levels deep
2. Add `../` for each level: `../../`
3. Add path to resource: `../../resource/path`

## Maintenance Notes

### When Regenerating Book Pages

The `generate-book-pages.js` script runs automatically as a postbuild step. It:
1. Reads the template from `_site/books/templates/BOOK-TEMPLATE/index.html`
2. Processes placeholders with book data
3. Writes output to `_site/books/{slug}/index.html`

All path logic is preserved from the template, so fixing paths in the template fixes all generated pages.

### Build Process

```bash
npm run build
  → npm run build:css     # Tailwind CSS
  → eleventy              # Build static site
  → node generate-book-pages.js   # Generate 1440 book pages (uses paths from template)
```

## Related Documentation

- `BOOK-PAGE-GENERATION-README.md` - Book page generation process
- `BUILD-SYSTEM.md` - Build and deployment process
- `DATA-STRUCTURES.md` - Book data structure
- `DEVELOPMENT-WORKFLOW.md` - Development guidelines

## Summary

The key insight: **Book pages are nested 2 levels deep, so all paths to root resources need `../../` prefix**

This applies to:
- Navigation links
- Asset references (images, CSS, JS)
- Internal links to other pages
- Any resource at or near the root level

When in doubt, use relative paths with `../../` for book page templates.
