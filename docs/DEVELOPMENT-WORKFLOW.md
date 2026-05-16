# Development Workflow Guide

> **Practical guide for daily development tasks on the Hudson Street Library project**
> Last Updated: October 19, 2025

---

## Table of Contents

1. [First-Time Setup](#1-first-time-setup)
2. [Daily Development Workflow](#2-daily-development-workflow)
3. [Adding New Features](#3-adding-new-features-step-by-step)
4. [Adding New Books](#4-adding-new-books-to-the-collection)
5. [Adding New Pages](#5-adding-new-pages-to-the-site)
6. [Working with Collections and Templates](#6-working-with-collections-and-templates)
7. [Testing Changes Locally](#7-testing-changes-locally)
8. [Common Development Tasks](#8-common-development-tasks)
9. [Git Workflow](#9-git-workflow-recommendations)
10. [Debugging Workflow](#10-debugging-workflow)
11. [Code Style and Conventions](#11-code-style-and-conventions)
12. [Pre-Deployment Checklist](#12-pre-deployment-checklist)

---

## 1. First-Time Setup

### Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js
- **Git**: For version control
- **Code Editor**: VS Code recommended

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/Mediaeater/Hudson_Street_Library.git
cd Hudson_Street_Library

# 2. Install dependencies
npm install

# 3. Set up environment variables (optional, only needed for API features)
cp .env.example .env
# Edit .env and add your API keys if needed

# 4. Start the development server
npm start

# 5. Open browser to http://localhost:8080
```

### Verify Installation

After running `npm start`, you should see:

```
[11ty] Writing _site/index.html from ./src/index.html
[11ty] Wrote 1306 files in 3.52 seconds
[11ty] Watching...
[11ty] Server at http://localhost:8080/
```

### Directory Overview

```
Hudson_Street_Library/
├── src/                      # All source files (YOU WORK HERE)
│   ├── _data/               # Data files
│   │   ├── books.csv        # Main book catalog (1,306 books)
│   │   └── news.json        # News items
│   ├── _includes/           # Templates and components
│   │   ├── layouts/         # Page layouts (book.njk, admin.njk)
│   │   └── components/      # Reusable components
│   ├── assets/              # Static assets
│   │   ├── css/            # Stylesheets
│   │   ├── js/             # Client-side JavaScript
│   │   └── images/         # Images (organized by category)
│   ├── books/              # Book pages (auto-generated from CSV)
│   ├── collections/        # Collection pages
│   ├── news/              # News templates
│   └── *.html, *.njk      # Page templates
├── _site/                   # Build output (auto-generated, DON'T EDIT)
├── scripts/                 # Utility scripts and automation
│   ├── database/           # Database operations
│   ├── image-pipeline/     # Image processing
│   ├── news-pipeline/      # News generation
│   └── utils/             # Shared utilities
├── data/                    # SQLite database files
├── docs/                    # Documentation (YOU ARE HERE)
├── .eleventy.js            # Eleventy configuration
└── package.json            # Project configuration
```

---

## 2. Daily Development Workflow

### Starting Your Day

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Start development server
npm start

# Browser automatically opens to http://localhost:8080
# Changes to files will trigger automatic rebuilds
```

### During Development

1. **Edit files** in the `src/` directory
2. **Save your changes** - Eleventy watches for changes
3. **Refresh browser** to see updates (most changes auto-reload)
4. **Check terminal** for build errors

### Example Development Session

```bash
# Terminal 1: Development server (keep running)
npm start

# Terminal 2: For running scripts and git commands
# (open a second terminal for these tasks)
```

### Hot Reload Behavior

- **HTML/Nunjucks templates**: Auto-reload ✓
- **CSS files**: Auto-reload ✓
- **JavaScript files**: Auto-reload ✓
- **CSV data changes**: Requires manual refresh
- **Configuration changes**: Restart server with `Ctrl+C` then `npm start`

### Ending Your Day

```bash
# 1. Stop the server (Ctrl+C)

# 2. Commit your changes (see Git Workflow section)
git add .
git commit -m "Brief description of changes"

# 3. Push to GitHub (triggers automatic deployment)
git push origin main

# 4. Verify deployment at https://hudsonstreetlibrary.com (wait 2-5 minutes)
```

---

## 3. Adding New Features Step-by-Step

### Planning Phase

**Before writing code:**

1. **Define the requirement** - What problem does this solve?
2. **Check existing patterns** - Look for similar features in the codebase
3. **Review documentation** - Check `/docs/` for relevant guides
4. **Plan data needs** - Will this require CSV changes or new data structures?

### Implementation Process

#### Step 1: Create a Feature Branch (Optional but Recommended)

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
```

#### Step 2: Implement the Feature

**Example: Adding a "Featured Books" Section to Homepage**

1. **Identify where to edit:**
   ```
   src/index.html (or src/index.njk)
   ```

2. **Add the HTML/Nunjucks code:**
   ```nunjucks
   <!-- Add to src/index.html -->
   <section class="featured-books py-16">
     <div class="container mx-auto px-6">
       <h2 class="text-3xl font-bold mb-8">Featured Books</h2>
       <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
         {% for book in books %}
           {% if book.featured %}
             <div class="book-card">
               <img src="/assets/images/books/{{ book.image_url }}"
                    alt="{{ book.title }}">
               <h3>{{ book.title }}</h3>
               <p>{{ book.author_full_name }}</p>
             </div>
           {% endif %}
         {% endfor %}
       </div>
     </div>
   </section>
   ```

3. **Add styling if needed:**
   ```css
   /* Add to src/assets/css/design-system.css */
   .book-card {
     background: white;
     border-radius: 8px;
     padding: 1rem;
     box-shadow: 0 2px 8px rgba(0,0,0,0.1);
     transition: transform 0.2s;
   }

   .book-card:hover {
     transform: translateY(-4px);
   }
   ```

4. **Add interactivity if needed:**
   ```javascript
   // Add to src/assets/js/shared.js or create new file
   document.addEventListener('DOMContentLoaded', function() {
     const bookCards = document.querySelectorAll('.book-card');
     bookCards.forEach(card => {
       card.addEventListener('click', function() {
         // Handle click event
       });
     });
   });
   ```

#### Step 3: Test Locally

```bash
# Server should still be running (npm start)
# View changes at http://localhost:8080

# Check browser console for JavaScript errors
# Check terminal for Eleventy build errors
```

#### Step 4: Update Documentation

```bash
# If feature is user-facing, update relevant docs
# Common docs to update:
# - docs/ADD-BOOK-GUIDE.md (for book-entry workflow changes)
# - README.md (for major features)
# - This file (for developer features)
```

#### Step 5: Commit and Deploy

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "Add featured books section to homepage"

# Push to trigger deployment
git push origin main

# Or if using feature branch:
git push origin feature/your-feature-name
# Then create a pull request on GitHub
```

### Feature Development Checklist

- [ ] Feature works locally
- [ ] No console errors
- [ ] Responsive on mobile/tablet/desktop
- [ ] Follows existing design system
- [ ] Documentation updated
- [ ] Git commit with clear message
- [ ] Deployed and verified on live site

---

## 4. Adding New Books to the Collection

### Method 1: Edit CSV Directly (For Single Books)

1. **Open the CSV file:**
   ```bash
   # File location
   src/_data/books.csv
   ```

2. **Add new row with book data:**
   ```csv
   id,author_last,author_first,author_full_name,title,publisher,publication_year,...
   1307,Smith,John,John Smith,Photography Today,Aperture,2024,...
   ```

3. **Important CSV formatting rules:**
   - Use double quotes for fields containing commas: `"New York, NY"`
   - Escape quotes by doubling them: `"She said ""Hello"""`
   - Keep consistent column count (all 29 columns)
   - Ensure ID is unique and sequential

4. **Save and test:**
   ```bash
   # Development server will rebuild automatically
   # Check http://localhost:8080 for the new book
   ```

### Method 2: Use Database Script (For Bulk Imports)

```bash
# Add multiple books via script
node scripts/add-books-to-db.js

# This will prompt you for book details
# or allow you to import from a file
```

### Method 3: Acquire Book Covers (Automated)

```bash
# ONLY USE THIS SCRIPT for acquiring covers
node scripts/covers/acquire-covers.js --limit 50

# This script:
# - Reads books.csv
# - Searches Google Books API
# - Downloads covers with exact naming pattern
# - Saves to src/assets/images/books/

# Check progress
ls -1 src/assets/images/books/*.jpg | wc -l
```

### Adding Book Data Fields

**Required fields:**
- `id` - Unique identifier
- `title` - Book title
- `author_full_name` - Full author name

**Recommended fields:**
- `author_last`, `author_first` - For better sorting
- `publisher` - Publisher name
- `publication_year` - Year published
- `isbn_asin` - For cover acquisition
- `tags` - Comma-separated tags for categorization
- `collection_grouping` - Collection name

**Optional fields:**
- `description` - Book description
- `height_cm`, `width_cm`, `depth_cm` - Physical dimensions
- `binding` - Hardcover, Paperback, etc.
- `page_count` - Number of pages
- `edition_printrun` - Edition information
- `designer` - Book designer
- `contributors` - Other contributors
- `classification` - Library classification

### After Adding Books

1. **Commit the changes:**
   ```bash
   git add src/_data/books.csv
   git commit -m "Add [book title] to collection"
   git push origin main
   ```

2. **Verify on live site** (wait 2-5 minutes):
   ```
   https://hudsonstreetlibrary.com
   ```

---

## 5. Adding New Pages to the Site

### Creating a Simple HTML Page

1. **Create the file in `src/`:**
   ```bash
   # Create new page
   touch src/about-us.html
   ```

2. **Add content using existing templates as reference:**
   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
       <meta charset="UTF-8">
       <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <title>About Us | Hudson Street Library</title>
       <link rel="stylesheet" href="/assets/css/tailwind.css">
   </head>
   <body>
       <header>
           <!-- Copy header from src/index.html -->
       </header>

       <main>
           <h1>About Us</h1>
           <p>Your content here...</p>
       </main>

       <footer>
           <!-- Copy footer from src/index.html -->
       </footer>
   </body>
   </html>
   ```

3. **Test the page:**
   ```
   http://localhost:8080/about-us.html
   ```

### Creating a Nunjucks Template Page

1. **Create `.njk` file:**
   ```bash
   touch src/custom-page.njk
   ```

2. **Add Nunjucks template with front matter:**
   ```nunjucks
   ---
   layout: layouts/base.njk
   title: Custom Page
   ---

   <section class="container mx-auto px-6 py-12">
       <h1>{{ title }}</h1>

       <!-- Access global book data -->
       <p>Total books in collection: {{ books | length }}</p>

       <!-- Loop through data -->
       {% for book in books | limit(10) %}
           <div>{{ book.title }} by {{ book.author_full_name }}</div>
       {% endfor %}
   </section>
   ```

3. **Test the page:**
   ```
   http://localhost:8080/custom-page.html
   ```

### Creating a Dynamic Collection Page

1. **Create template in `src/collections/`:**
   ```bash
   touch src/collections/new-collection.njk
   ```

2. **Add collection logic:**
   ```nunjucks
   ---
   layout: layouts/base.njk
   title: Photography Pioneers
   ---

   <section>
       <h1>{{ title }}</h1>

       <!-- Filter books by tag or collection -->
       {% set filteredBooks = books | where("collection_grouping", "Photography Pioneers") %}

       <div class="grid grid-cols-3 gap-6">
           {% for book in filteredBooks %}
               <div class="book-card">
                   <h3>{{ book.title }}</h3>
                   <p>{{ book.author_full_name }}</p>
               </div>
           {% endfor %}
       </div>
   </section>
   ```

### Linking to New Pages

Update navigation in existing pages:

```html
<!-- Add to src/_includes/components/site-header.njk -->
<nav>
    <a href="/index.html">Home</a>
    <a href="/about-us.html">About</a>
    <a href="/collections/new-collection.html">New Collection</a>
</nav>
```

---

## 6. Working with Collections and Templates

### Understanding Eleventy's Data Cascade

Data is available in this order (lower overrides higher):

1. **Global data** (`src/_data/`)
2. **Template data** (front matter)
3. **Layout data**
4. **Computed data**

### Using Global Book Data

```nunjucks
<!-- All books are available via 'books' variable -->
{{ books | length }} total books

<!-- Loop through all books -->
{% for book in books %}
    {{ book.title }}
{% endfor %}

<!-- Filter books -->
{% set photographyBooks = books | where("tags", "Photography") %}
```

### Creating Reusable Components

1. **Create component file:**
   ```bash
   touch src/_includes/components/book-card.njk
   ```

2. **Define the component:**
   ```nunjucks
   {# src/_includes/components/book-card.njk #}
   <div class="book-card">
       <img src="/assets/images/books/{{ book.image_url }}"
            alt="{{ book.title }}">
       <h3>{{ book.title }}</h3>
       <p>{{ book.author_full_name }}</p>
       <p class="text-sm text-gray-600">{{ book.publisher }}, {{ book.publication_year }}</p>
   </div>
   ```

3. **Use the component:**
   ```nunjucks
   <!-- In any template -->
   {% for book in books %}
       {% include "components/book-card.njk" %}
   {% endfor %}
   ```

### Working with Layouts

**Existing layouts:**
- `src/_includes/layouts/book.njk` - Individual book pages
- `src/_includes/layouts/admin.njk` - Admin interface

**Using a layout:**

```nunjucks
---
layout: layouts/book.njk
---

Your content here (will be inserted into layout)
```

### Nunjucks Filters and Functions

**Common filters:**

```nunjucks
<!-- String manipulation -->
{{ book.title | upper }}
{{ book.title | lower }}
{{ book.title | title }}
{{ book.title | slugify }}

<!-- Array operations -->
{{ books | length }}
{{ books | first }}
{{ books | last }}

<!-- Limiting results -->
{{ books | limit(10) }}

<!-- Safe HTML output -->
{{ book.description | safe }}

<!-- Escaping -->
{{ book.title | escape }}
```

---

## 7. Testing Changes Locally

### Development Server Testing

```bash
# Start server
npm start

# Server runs at http://localhost:8080
# Auto-reloads on file changes
```

### Testing Checklist

#### Visual Testing

- [ ] **Desktop view** (1920x1080)
- [ ] **Tablet view** (768x1024)
- [ ] **Mobile view** (375x667)
- [ ] **Navigation works** on all pages
- [ ] **Images load** correctly
- [ ] **Hover states** work properly

#### Functional Testing

- [ ] **Links work** (no 404 errors)
- [ ] **Forms submit** (if applicable)
- [ ] **Search works** (if modified)
- [ ] **Filters work** (if modified)
- [ ] **JavaScript executes** without errors

#### Browser Testing

Test in multiple browsers:
- Chrome/Edge (Chromium)
- Firefox
- Safari (if on Mac)

#### Console Checks

**Browser Console (F12 → Console):**
```javascript
// Should see no errors
// Look for:
// - 404 errors (missing files)
// - JavaScript errors
// - CORS errors
```

**Terminal Output:**
```bash
# Look for:
[11ty] Writing _site/... (successful builds)
# Avoid:
[11ty] Error in ... (build errors)
```

### Manual Build Testing

```bash
# Clean previous build
npm run clean

# Build the site
npm run build

# Check output
ls -la _site/

# Serve the built site (optional)
cd _site && python3 -m http.server 8000
# Visit http://localhost:8000
```

### Testing Book Cover Display

```bash
# 1. Check if cover image exists
ls src/assets/images/books/Berenice_Abbott_*.jpg

# 2. Check file naming matches pattern
# Pattern: Author_Title_ISBN.jpg

# 3. View in browser
# http://localhost:8080/books/[book-id].html
```

---

## 8. Common Development Tasks

### Task 1: Modifying CSS/Design

#### Global Styles

```bash
# Edit main stylesheet
src/assets/css/design-system.css

# Or CLRS color palette version
src/assets/css/design-system-clrs.css
```

**Example: Change primary color**

```css
/* Before */
.nav-item::after {
  background: #0f766e; /* teal-700 */
}

/* After */
.nav-item::after {
  background: #1e40af; /* blue-700 */
}
```

#### Component-Specific Styles

**Option 1: Add to existing stylesheet**
```css
/* src/assets/css/design-system.css */
.book-card {
  /* Your styles */
}
```

**Option 2: Inline styles in template**
```html
<style>
  .special-section {
    background: linear-gradient(to right, #fff, #f0f0f0);
  }
</style>
```

#### Using Tailwind CSS

Tailwind is compiled locally. Layouts include the compiled stylesheet:

```html
<link rel="stylesheet" href="/assets/css/tailwind.css">
```

The build is `npm run build:css` (one-shot, minified) or `npm run watch:css`
(watches `src/**/*.{html,njk,js}`). `npm start` runs the watcher and the
Eleventy dev server concurrently. Use Tailwind utility classes as normal:

```html
<div class="container mx-auto px-6 py-12">
  <h1 class="text-3xl font-bold mb-4">Title</h1>
  <p class="text-gray-700 leading-relaxed">Content</p>
</div>
```

**Common Tailwind patterns in this project:**

```html
<!-- Container -->
<div class="container mx-auto px-6">

<!-- Grid layouts -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-8">

<!-- Responsive text -->
<h1 class="text-2xl md:text-4xl lg:text-5xl">

<!-- Colors (teal theme) -->
<a class="text-teal-700 hover:text-teal-900">
```

### Task 2: Adding JavaScript Functionality

#### Add to Existing Shared JS

```javascript
// src/assets/js/shared.js

// Add new function
function initNewFeature() {
  const elements = document.querySelectorAll('.new-feature');
  elements.forEach(el => {
    el.addEventListener('click', () => {
      // Your logic
    });
  });
}

// Call on page load
document.addEventListener('DOMContentLoaded', function() {
  initNewFeature();
});
```

#### Create New JS File

1. **Create the file:**
   ```bash
   touch src/assets/js/my-feature.js
   ```

2. **Add your code:**
   ```javascript
   // src/assets/js/my-feature.js
   (function() {
     'use strict';

     function init() {
       console.log('My feature initialized');
       // Your code here
     }

     document.addEventListener('DOMContentLoaded', init);
   })();
   ```

3. **Include in HTML:**
   ```html
   <script src="/assets/js/my-feature.js"></script>
   ```

#### Common JavaScript Patterns

**Search functionality:**
```javascript
function searchBooks(query) {
  const books = getAllBooks(); // From data
  return books.filter(book =>
    book.title.toLowerCase().includes(query.toLowerCase()) ||
    book.author_full_name.toLowerCase().includes(query.toLowerCase())
  );
}
```

**Filter functionality:**
```javascript
function filterByTag(tag) {
  const bookCards = document.querySelectorAll('.book-card');
  bookCards.forEach(card => {
    const tags = card.dataset.tags.split(',');
    if (tags.includes(tag)) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}
```

### Task 3: Creating New Page Templates

**Example: Create a "Books by Year" page**

1. **Create template:**
   ```bash
   touch src/books-by-year.njk
   ```

2. **Add content:**
   ```nunjucks
   ---
   layout: layouts/base.njk
   title: Books by Year
   ---

   <section class="container mx-auto px-6 py-12">
     <h1 class="text-4xl font-bold mb-8">{{ title }}</h1>

     {% set years = books | map("publication_year") | unique | sort %}

     {% for year in years %}
       <div class="year-section mb-12">
         <h2 class="text-2xl font-semibold mb-4">{{ year }}</h2>

         <div class="grid grid-cols-3 gap-6">
           {% for book in books %}
             {% if book.publication_year == year %}
               <div class="book-card">
                 <h3>{{ book.title }}</h3>
                 <p>{{ book.author_full_name }}</p>
               </div>
             {% endif %}
           {% endfor %}
         </div>
       </div>
     {% endfor %}
   </section>
   ```

3. **Test:**
   ```
   http://localhost:8080/books-by-year.html
   ```

### Task 4: Updating Book Data

#### Via CSV

```bash
# 1. Open CSV
nano src/_data/books.csv
# or use Excel, Numbers, Google Sheets

# 2. Make changes
# - Update existing rows
# - Add new rows
# - Ensure proper CSV formatting

# 3. Save and reload browser
```

#### Via Database Script

```bash
# Update book via database
node scripts/database/db-utils.js update --id 1 --field title --value "New Title"

# Sync changes back to CSV
node scripts/database/db-migration.js sync-to-csv
```

### Task 5: Adding Images

#### Book Cover Images

```bash
# Standard location
src/assets/images/books/

# Naming pattern (MUST MATCH THIS EXACTLY)
Author_Name_Book_Title_ISBN.jpg

# Example
src/assets/images/books/Berenice_Abbott_Documenting_Science_9783869304311.jpg

# Automated acquisition
node scripts/covers/acquire-covers.js --limit 50
```

#### Other Images

```bash
# Category images
src/assets/images/categories/

# General images
src/assets/images/

# News/blog images
src/assets/images/news/
```

#### Image Optimization

```bash
# Optimize all images in a directory
node scripts/optimize-all-images.js --dir src/assets/images/news

# Or use image pipeline
node scripts/image-pipeline/cli.js optimize --path src/assets/images/
```

#### Using Images in Templates

```nunjucks
<!-- Static image -->
<img src="/assets/images/logo.png" alt="Logo">

<!-- Dynamic book cover -->
<img src="/assets/images/books/{{ book.image_filename }}"
     alt="{{ book.title }}">

<!-- With fallback -->
<img src="/assets/images/books/{{ book.image_filename }}"
     alt="{{ book.title }}"
     onerror="this.src='/assets/images/placeholder.jpg'">
```

---

## 9. Git Workflow Recommendations

### Daily Workflow

```bash
# Morning: Start with latest code
git pull origin main

# Make changes...

# Check what changed
git status
git diff

# Stage changes
git add .
# Or stage specific files
git add src/index.html src/assets/css/design-system.css

# Commit with clear message
git commit -m "Add featured books section to homepage"

# Push to trigger deployment
git push origin main
```

### Commit Message Conventions

**Format:**
```
<type>: <short summary>

[optional body]

[optional footer]
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**

```bash
# Good commit messages
git commit -m "feat: Add featured books section to homepage"
git commit -m "fix: Correct book cover image paths"
git commit -m "docs: Update development workflow guide"
git commit -m "style: Format CSS with consistent indentation"

# Bad commit messages (avoid these)
git commit -m "changes"
git commit -m "fix stuff"
git commit -m "WIP"
```

### Feature Branch Workflow (Recommended for Large Changes)

```bash
# 1. Create feature branch
git checkout -b feature/book-rating-system

# 2. Make changes and commit
git add .
git commit -m "feat: Add book rating system"

# 3. Push feature branch
git push origin feature/book-rating-system

# 4. Create Pull Request on GitHub
# - Go to GitHub repository
# - Click "Pull requests" → "New pull request"
# - Select your branch
# - Add description and create PR

# 5. After PR is approved and merged
git checkout main
git pull origin main
git branch -d feature/book-rating-system
```

### Hotfix Workflow (For Quick Production Fixes)

```bash
# 1. Create hotfix branch
git checkout -b hotfix/broken-search

# 2. Fix the issue
# Edit files...

# 3. Commit and push
git add .
git commit -m "fix: Restore search functionality"
git push origin hotfix/broken-search

# 4. Create PR and merge quickly

# 5. Clean up
git checkout main
git pull origin main
git branch -d hotfix/broken-search
```

### Checking Deployment Status

```bash
# After pushing to main
git push origin main

# Check GitHub Actions
# 1. Go to repository on GitHub
# 2. Click "Actions" tab
# 3. See latest workflow run

# Or use CLI
gh run list
gh run watch
```

### Undoing Changes

```bash
# Undo uncommitted changes to a file
git checkout -- src/index.html

# Undo all uncommitted changes
git reset --hard

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert a specific commit (safe for pushed commits)
git revert <commit-hash>
```

---

## 10. Debugging Workflow

### When Something Breaks

#### Step 1: Identify the Problem

**Check these first:**

1. **Browser Console (F12)**
   ```
   Look for:
   - JavaScript errors (red text)
   - 404 errors (missing files)
   - CORS errors
   ```

2. **Terminal Output**
   ```bash
   # Look for Eleventy build errors
   [11ty] Problem writing Eleventy templates:
   [11ty] 1. Having trouble rendering njk template ./src/index.njk
   ```

3. **Network Tab (F12 → Network)**
   ```
   - Check failed requests (red)
   - Verify file paths are correct
   ```

#### Step 2: Common Issues and Solutions

**Issue: Changes not appearing**

```bash
# Solution 1: Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Solution 2: Clear browser cache
# Browser Settings → Clear browsing data

# Solution 3: Restart dev server
Ctrl+C
npm start

# Solution 4: Clean build
npm run clean
npm run build
npm start
```

**Issue: Book covers not showing**

```bash
# Check file exists
ls src/assets/images/books/[filename].jpg

# Check file naming matches pattern
# Pattern: Author_Title_ISBN.jpg

# Verify image path in template
# Should be: /assets/images/books/[filename].jpg

# Check browser console for 404 errors
```

**Issue: CSV data not loading**

```bash
# Verify CSV is valid
# - Check for unmatched quotes
# - Ensure consistent column count
# - Look for special characters

# Test CSV parsing
node -e "
const CSVHandler = require('./scripts/utils/csv-handler');
const result = CSVHandler.readBooksSync('./src/_data/books.csv');
console.log(result.stats);
console.log(result.errors.slice(0, 5));
"
```

**Issue: Build errors**

```bash
# Read error message carefully
# Common errors:

# 1. Nunjucks syntax error
[11ty] Error in template syntax

# Fix: Check template for typos, unclosed tags

# 2. Missing file
[11ty] ENOENT: no such file or directory

# Fix: Check file paths are correct

# 3. Data issue
[11ty] Cannot read property 'title' of undefined

# Fix: Add null checks in template
{% if book and book.title %}
  {{ book.title }}
{% endif %}
```

#### Step 3: Debugging Techniques

**Console Logging in Templates**

```nunjucks
<!-- Debug book data -->
{{ book | dump }}

<!-- Debug all books -->
{{ books | length }} books found

<!-- Debug specific field -->
Book title: {{ book.title }}
```

**Console Logging in JavaScript**

```javascript
console.log('Debug checkpoint 1');
console.log('Book data:', bookData);
console.table(books); // Nice table format
console.dir(element); // Detailed object inspection
```

**Testing in Isolation**

```bash
# Create minimal test page
touch src/test-page.html

# Add minimal content to isolate issue
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Test</h1>
  <!-- Add only the problematic code here -->
</body>
</html>

# View at http://localhost:8080/test-page.html
# Delete after debugging
```

#### Step 4: Check Recent Changes

```bash
# See what changed recently
git diff

# See last 5 commits
git log --oneline -5

# See changes in specific file
git log -p src/index.html

# Revert to last working state
git checkout HEAD~1 src/index.html
```

### Debugging Checklist

When stuck, go through this checklist:

- [ ] Browser console clear of errors?
- [ ] Terminal showing successful build?
- [ ] File paths correct?
- [ ] File exists in expected location?
- [ ] CSV data formatted correctly?
- [ ] Template syntax valid?
- [ ] Recent changes reviewed?
- [ ] Tried hard refresh?
- [ ] Tried restarting dev server?
- [ ] Tried clean build?

---

## 11. Code Style and Conventions

### File Naming Conventions

**Templates and Pages:**
```
lowercase-with-hyphens.html
lowercase-with-hyphens.njk
```

**JavaScript:**
```
lowercase-with-hyphens.js
camelCaseForVariables.js
```

**CSS:**
```
lowercase-with-hyphens.css
```

**Images:**
```
# Book covers (STRICT FORMAT)
Author_Name_Book_Title_ISBN.jpg

# Other images
descriptive-name-lowercase.jpg
category-image.png
```

### HTML/Nunjucks Style

```nunjucks
<!-- Use 2 or 4 spaces for indentation (be consistent) -->
<div class="container">
  <section class="content">
    <h1>{{ title }}</h1>

    {% for item in items %}
      <div class="item">
        {{ item.name }}
      </div>
    {% endfor %}
  </section>
</div>

<!-- Use semantic HTML -->
<header>...</header>  <!-- Not <div class="header"> -->
<nav>...</nav>
<main>...</main>
<article>...</article>
<footer>...</footer>

<!-- Add helpful comments -->
<!-- Book Grid Section -->
<section>...</section>

<!-- Mobile Navigation (hidden on desktop) -->
<nav class="md:hidden">...</nav>
```

### CSS Style

```css
/* Use consistent formatting */
.selector {
  property: value;
  property: value;
}

/* Group related styles */
/* Typography */
h1, h2, h3 { font-family: 'Playfair Display', serif; }

/* Colors */
.primary { color: #0f766e; }
.secondary { color: #374151; }

/* Use meaningful class names */
.book-card { }           /* Good */
.bc { }                  /* Bad */

/* Follow BEM methodology (optional but recommended) */
.book-card { }
.book-card__title { }
.book-card__author { }
.book-card--featured { }

/* Mobile-first responsive design */
.element {
  /* Mobile styles first */
  width: 100%;
}

@media (min-width: 768px) {
  /* Tablet styles */
  .element { width: 50%; }
}

@media (min-width: 1024px) {
  /* Desktop styles */
  .element { width: 33.333%; }
}
```

### JavaScript Style

```javascript
// Use strict mode
'use strict';

// Use const/let, not var
const API_KEY = 'abc123';
let counter = 0;

// Use descriptive names
function fetchBookData(isbn) { }  // Good
function fbd(i) { }               // Bad

// Use arrow functions for callbacks
books.forEach(book => {
  console.log(book.title);
});

// Use template literals
const message = `Found ${books.length} books`;

// Add comments for complex logic
// Calculate average rating across all books
const avgRating = books.reduce((sum, book) => sum + book.rating, 0) / books.length;

// Handle errors gracefully
try {
  const data = JSON.parse(response);
} catch (error) {
  console.error('Failed to parse JSON:', error);
  // Provide fallback behavior
}

// Use early returns
function processBook(book) {
  if (!book) return;
  if (!book.title) return;

  // Main logic here
}
```

### Tailwind CSS Conventions

```html
<!-- Order classes logically -->
<!-- Layout → Display → Sizing → Spacing → Typography → Colors → Effects -->
<div class="flex flex-col w-full px-6 py-4 text-lg font-bold text-gray-900 hover:shadow-lg">

<!-- Use responsive prefixes consistently -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">

<!-- Extract repeated patterns to CSS classes -->
<!-- Instead of repeating everywhere: -->
<div class="px-6 py-4 bg-white shadow-md rounded-lg">
<div class="px-6 py-4 bg-white shadow-md rounded-lg">

<!-- Define once in CSS: -->
<div class="card">

/* CSS */
.card {
  @apply px-6 py-4 bg-white shadow-md rounded-lg;
}
```

### Documentation Style

```markdown
# Use clear headers

## Second level

### Third level

Use **bold** for emphasis

Use `code` for file names, commands, and code

Use ```language for code blocks

<!-- Good example -->
# Feature Name

## Overview

Brief description of what this is.

## Usage

```bash
# Run the command
npm run command
```

## Parameters

- `parameter1` - Description
- `parameter2` - Description
```

### Comments

**HTML/Nunjucks:**
```html
<!-- Section: Featured Books -->
<section>...</section>

{# Nunjucks comment (won't appear in HTML output) #}
{% set books = books | filter %}
```

**CSS:**
```css
/* Main navigation styles */
.nav { }

/* TODO: Improve mobile responsiveness */
.nav-item { }
```

**JavaScript:**
```javascript
// Initialize search functionality
function initSearch() { }

/**
 * Fetch book data from API
 * @param {string} isbn - Book ISBN
 * @returns {Promise<Object>} Book data
 */
async function fetchBook(isbn) { }
```

---

## 12. Pre-Deployment Checklist

### Before Pushing to Production

**Run through this checklist before `git push origin main`:**

#### Code Quality

- [ ] **No console.logs in production code** (remove or use proper logging)
- [ ] **No commented-out code blocks** (clean them up)
- [ ] **No TODO comments for critical issues** (fix or create GitHub issue)
- [ ] **Code follows project conventions** (see Section 11)

#### Functionality

- [ ] **All features work locally** (`npm start` and test)
- [ ] **No JavaScript errors in console** (F12 → Console)
- [ ] **No 404 errors** (F12 → Network)
- [ ] **Forms submit correctly** (if applicable)
- [ ] **Links point to correct destinations**
- [ ] **Search works** (if modified)

#### Responsive Design

- [ ] **Mobile view tested** (375px width)
- [ ] **Tablet view tested** (768px width)
- [ ] **Desktop view tested** (1920px width)
- [ ] **No horizontal scroll on any screen size**
- [ ] **Text is readable at all sizes**
- [ ] **Images scale appropriately**

#### Performance

- [ ] **Images are optimized** (not massive file sizes)
- [ ] **No unnecessary dependencies loaded**
- [ ] **Page loads in reasonable time** (< 3 seconds)

#### Data Integrity

- [ ] **CSV is valid** (proper formatting, no corrupt rows)
- [ ] **No duplicate book IDs**
- [ ] **Required fields populated** (id, title, author)
- [ ] **Image file names match convention** (if added covers)

#### Documentation

- [ ] **README updated** (if major feature added)
- [ ] **Relevant docs updated** (if workflow changed)
- [ ] **Comments added for complex code**

#### Git

- [ ] **Meaningful commit message**
- [ ] **No sensitive data in commit** (API keys, passwords)
- [ ] **No large binary files** (unless necessary)
- [ ] **`.gitignore` is respected**

#### Testing

```bash
# Final local test
npm run clean
npm run build
npm start

# Check build output
ls -la _site/

# Verify no build errors
# Check terminal for [11ty] errors
```

### Deployment Process

```bash
# 1. Final check
git status
git diff

# 2. Stage changes
git add .

# 3. Commit with clear message
git commit -m "feat: Add book rating system with star display"

# 4. Push to main (triggers GitHub Actions)
git push origin main

# 5. Monitor deployment
# Visit: https://github.com/Mediaeater/Hudson_Street_Library/actions

# 6. Verify live site (wait 2-5 minutes)
# Visit: https://hudsonstreetlibrary.com

# 7. Check for errors
# - View site in browser
# - Check browser console (F12)
# - Test key functionality
```

### Post-Deployment Verification

After deployment completes:

- [ ] **Visit live site** (https://hudsonstreetlibrary.com)
- [ ] **Test new features** (the changes you just deployed)
- [ ] **Check browser console** (should be error-free)
- [ ] **Test on mobile device** (real phone/tablet)
- [ ] **Verify images load** (especially if you added new ones)
- [ ] **Test critical paths** (search, navigation, book pages)

### If Deployment Fails

```bash
# 1. Check GitHub Actions logs
# Visit repository → Actions tab → Failed run → View logs

# 2. Common issues:

# Build error
# - Fix in code
# - Commit fix
# - Push again

# Missing dependency
# - Check package.json
# - Ensure dependencies are listed
# - Push updated package.json

# File not found
# - Verify file paths
# - Check file is committed to git
# - Fix and push

# 3. Rollback if needed
git revert HEAD
git push origin main
```

### Emergency Rollback

If live site is broken:

```bash
# Option 1: Revert last commit
git revert HEAD
git push origin main

# Option 2: Reset to previous working commit
git log --oneline  # Find last good commit
git reset --hard <commit-hash>
git push origin main --force  # Use with caution!

# Option 3: Create hotfix
git checkout -b hotfix/emergency-fix
# Make fix
git add .
git commit -m "hotfix: Emergency fix for broken feature"
git push origin hotfix/emergency-fix
# Create and merge PR immediately
```

---

## Quick Reference

### Most Common Commands

```bash
# Start development
npm start

# Build site
npm run build

# Clean build
npm run clean

# Add book covers
node scripts/covers/acquire-covers.js --limit 50

# Git workflow
git add .
git commit -m "message"
git push origin main

# Check status
git status
git log --oneline -5
```

### Key Files

```
Configuration:
  .eleventy.js              - Eleventy config
  package.json              - Project config

Data:
  src/_data/books.csv       - Book catalog
  src/_data/news.json       - News items

Templates:
  src/_includes/layouts/    - Page layouts
  src/_includes/components/ - Reusable components

Assets:
  src/assets/css/           - Stylesheets
  src/assets/js/            - JavaScript
  src/assets/images/        - Images

Scripts:
  scripts/database/         - Database operations
  scripts/image-pipeline/   - Image processing
  scripts/utils/            - Utilities
```

### Helpful Links

- **Live Site**: https://hudsonstreetlibrary.com
- **GitHub Repo**: https://github.com/Mediaeater/Hudson_Street_Library
- **GitHub Actions**: https://github.com/Mediaeater/Hudson_Street_Library/actions
- **Eleventy Docs**: https://www.11ty.dev/docs/
- **Nunjucks Docs**: https://mozilla.github.io/nunjucks/
- **Tailwind Docs**: https://tailwindcss.com/docs

---

## Getting Help

### Documentation

1. Check `/docs/` directory for specific guides
2. Read `README.md` for overview
3. Check `CLAUDE_README.md` for AI-specific guidance

### Debugging

1. Check browser console (F12)
2. Check terminal output
3. Review recent git changes
4. Test in isolation

### Resources

- **Eleventy Discord**: https://www.11ty.dev/blog/discord/
- **Stack Overflow**: Tag questions with `eleventy` or `nunjucks`
- **GitHub Issues**: For project-specific problems

---

**Last Updated**: October 19, 2025
**Project**: Hudson Street Library
**Version**: 1.0.0
