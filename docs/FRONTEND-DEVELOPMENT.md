# Frontend Development Guide

> Comprehensive documentation for Hudson Street Library's frontend architecture, component system, and development workflows.

**Last Updated:** October 19, 2025
**Version:** 1.0
**Related Docs:** [Build System](BUILD-SYSTEM.md), [Testing Patterns](TESTING-PATTERNS.md), [Deployment](DEPLOYMENT.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [JavaScript Component System](#javascript-component-system)
4. [CSS Structure and Design System](#css-structure-and-design-system)
5. [Template System](#template-system)
6. [Asset Pipeline](#asset-pipeline)
7. [Development Workflow](#development-workflow)
8. [Common Frontend Tasks](#common-frontend-tasks)
9. [Best Practices](#best-practices)
10. [Debugging Tips](#debugging-tips)

---

## Overview

Hudson Street Library uses a static site generator approach with Eleventy, combining modern frontend tooling with a classic static site workflow. The frontend is built with:

- **Eleventy (11ty)** - Static site generator
- **Nunjucks** - Template engine
- **Vanilla JavaScript** - Component-based architecture using ES6 classes
- **CSS Custom Properties** - Design token system
- **Tailwind CSS** - Utility-first CSS framework, compiled locally via `npm run build:css` to `_site/assets/css/tailwind.css`
- **Font Awesome** - Icon library

### Key Design Principles

1. **Progressive Enhancement** - Core functionality works without JavaScript
2. **Component-Based** - Reusable UI components in both templates and JavaScript
3. **Design Tokens** - Consistent styling through CSS custom properties
4. **Accessibility First** - WCAG 2.1 AA compliance
5. **Performance** - Optimized assets, lazy loading, minimal JavaScript

---

## Architecture

### Directory Structure

```
src/
├── assets/
│   ├── css/
│   │   ├── design-system.css         # Main design system (neutral palette)
│   │   ├── design-system-clrs.css    # CLRS color palette variant
│   │   └── admin.css                 # Admin-specific styles
│   ├── js/
│   │   ├── shared.js                 # Core HudsonStreetLibrary class
│   │   ├── book-workflow.js          # Book addition workflow
│   │   └── batch-operations.js       # Batch import handlers
│   └── images/
│       └── books/                    # Book cover images
├── _includes/
│   ├── layouts/
│   │   ├── book.njk                  # Book detail page layout
│   │   └── admin.njk                 # Admin interface layout
│   └── components/
│       ├── book-thumbnail.njk        # Book thumbnail component
│       ├── site-header.njk           # Global header
│       ├── site-footer.njk           # Global footer
│       ├── collection-hero.njk       # Collection hero section
│       └── batch-upload.njk          # Batch upload UI
└── _data/
    └── books.csv                     # Book data source
```

### Frontend Stack

```
┌─────────────────────────────────────┐
│         Static HTML Output          │
├─────────────────────────────────────┤
│  Nunjucks Templates + CSV Data      │
├─────────────────────────────────────┤
│  JavaScript Components (ES6 Classes)│
├─────────────────────────────────────┤
│ CSS (Custom Props + compiled Tailwind)│
├─────────────────────────────────────┤
│  Eleventy Static Site Generator     │
└─────────────────────────────────────┘
```

---

## JavaScript Component System

### The HudsonStreetLibrary Class Pattern

All shared JavaScript functionality is consolidated in the `HudsonStreetLibrary` class, following a singleton pattern that initializes on page load.

#### Core Architecture

**File:** `/src/assets/js/shared.js`

```javascript
class HudsonStreetLibrary {
    constructor() {
        this.init();
    }

    init() {
        // Initialize all components when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        this.initMobileMenu();
        this.initSmoothScrolling();
        this.initImageErrorHandling();
        this.initBookThumbnails();
        this.updateCopyrightYear();
    }

    // Component methods...
}

// Auto-initialize when script loads
new HudsonStreetLibrary();
```

#### Key Components

##### 1. Mobile Menu Management

```javascript
initMobileMenu() {
    const mobileMenuButtons = document.querySelectorAll('button[aria-controls*="mobile-nav-menu"]');

    mobileMenuButtons.forEach(button => {
        const menuId = button.getAttribute('aria-controls');
        const mobileNavMenu = document.getElementById(menuId);

        if (mobileNavMenu) {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleMobileMenu(button, mobileNavMenu);
            });
        }
    });
}

toggleMobileMenu(button, menu) {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    button.setAttribute('aria-expanded', !isExpanded);
    menu.classList.toggle('hidden');
    menu.classList.toggle('flex');

    // Toggle icon
    const icon = button.querySelector('i');
    if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    }
}
```

**Usage:** Automatically works with any button that has `aria-controls="mobile-nav-menu-*"` attribute.

##### 2. Book Thumbnail Loading

The system handles dynamic book cover loading with intelligent fallback:

```javascript
initBookThumbnails() {
    const thumbnailImages = document.querySelectorAll('.thumbnail-image');

    thumbnailImages.forEach((img) => {
        if (img.dataset.processed === 'true') return;
        img.dataset.processed = 'true';

        const coverPath = this.generateThumbnailCoverPath(img);

        if (coverPath) {
            img.src = coverPath;
        } else {
            this.showThumbnailPlaceholder(img);
        }
    });
}

generateThumbnailCoverPath(img) {
    const imageField = img.dataset.imageField;
    const title = img.dataset.title;
    const author = img.dataset.author;
    const isbn = img.dataset.isbn;

    // Try existing image field first
    if (imageField && imageField.trim() && imageField !== 'null') {
        return `/assets/images/books/${imageField}`;
    }

    // Generate from acquisition naming convention
    if (isbn && isbn !== 'NULL' && isbn !== '') {
        const cleanAuthor = author.replace(/[^a-zA-Z0-9.-]/g, '_');
        const cleanTitle = title.replace(/[^a-zA-Z0-9.-]/g, '_');
        const cleanISBN = isbn.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${cleanAuthor}_${cleanTitle}_${cleanISBN}`
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '')
            .substring(0, 100) + '.jpg';
        return `/assets/images/books/${fileName}`;
    }

    return null;
}
```

**Convention:** Book covers follow the pattern `Author_Title_ISBN.jpg` with sanitized characters.

##### 3. Image Error Handling

Global image fallback system:

```javascript
initImageErrorHandling() {
    document.querySelectorAll('img[data-fallback]').forEach(img => {
        img.addEventListener('error', () => this.handleImageError(img));
    });
}

handleImageError(img) {
    const fallback = img.dataset.fallback;
    if (fallback && !img.dataset.attempted) {
        img.dataset.attempted = 'true';
        img.src = fallback;
    } else {
        // Show placeholder with book icon
        const placeholder = this.createImagePlaceholder(
            img.alt || 'Image not available',
            img.dataset.title || '',
            img.dataset.author || ''
        );
        img.parentNode.replaceChild(placeholder, img);
    }
}
```

##### 4. Smooth Scrolling

Anchor link smooth scrolling:

```javascript
initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}
```

##### 5. Utility Methods

```javascript
// XSS Protection
escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// URL Helper
static resolvePath(path, base = '') {
    if (path.startsWith('http') || path.startsWith('//')) {
        return path;
    }
    if (path.startsWith('/')) {
        return path;
    }
    return base + path;
}

// Collection Data Loader (async)
static async loadCollectionData() {
    try {
        const response = await fetch('/data/collections.json');
        return await response.json();
    } catch (error) {
        console.warn('Could not load collection data:', error);
        return [];
    }
}
```

##### 6. Global API

```javascript
// Expose utilities globally
window.HSL = {
    resolvePath: HudsonStreetLibrary.resolvePath,
    loadCollectionData: HudsonStreetLibrary.loadCollectionData
};
```

### Specialized Components

#### BookWorkflow Class

**File:** `/src/assets/js/book-workflow.js`

Handles the multi-step book addition workflow with image processing, collection assignment, and validation.

**Key Features:**
- 4-step wizard interface
- Form validation with ISBN verification
- Image upload with drag-and-drop
- Auto-save functionality
- Collection suggestions based on content
- Subject tag management
- Real-time preview

**Usage:**
```javascript
let bookWorkflow;
document.addEventListener('DOMContentLoaded', function() {
    bookWorkflow = new BookWorkflow();
});
```

**Class Structure:**
```javascript
class BookWorkflow {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.bookData = {};
        this.selectedCollections = [];
        this.selectedSubjects = [];
        this.uploadedImages = {};
        this.isDirty = false;
        this.init();
    }

    // Step navigation
    nextStep()
    prevStep()
    validateCurrentStep()

    // Form handling
    validateField(fieldId)
    validateISBN(isbn)

    // Image processing
    handleImageUpload(file)
    loadImageFromURL(url)

    // API integration
    lookupBookByISBN()
    detectCategory()
    suggestCollections()

    // Publishing
    publishBook()
    saveDraft()
}
```

#### BatchOperations Class

**File:** `/src/assets/js/batch-operations.js`

Manages bulk book imports via CSV, ISBN list, or manual entry.

**Key Features:**
- CSV parsing with validation
- ISBN batch lookup
- Manual book entry with bulk settings
- Progress tracking
- Error reporting

**Import Methods:**
1. **CSV Upload** - Upload spreadsheet with book data
2. **ISBN Batch** - Paste list of ISBNs for automatic lookup
3. **Manual Entry** - Quick-add multiple books with forms

---

## CSS Structure and Design System

### Design System Overview

Hudson Street Library uses a custom design system built on CSS custom properties (CSS variables) with two color palette options.

### File Structure

```
src/assets/css/
├── design-system.css         # Main design system (neutral palette)
├── design-system-clrs.css    # CLRS color palette variant
└── admin.css                 # Admin-specific components
```

### Design Tokens (CSS Custom Properties)

All design values are defined as CSS variables in `:root` for consistency and easy theming.

#### Color Tokens

**Standard Palette** (`design-system.css`):

```css
:root {
    /* Neutrals */
    --neutral-50: #fafafa;
    --neutral-100: #f5f5f5;
    --neutral-200: #e5e5e5;
    --neutral-300: #d4d4d4;
    --neutral-400: #a3a3a3;
    --neutral-500: #737373;
    --neutral-600: #525252;
    --neutral-700: #404040;
    --neutral-800: #262626;
    --neutral-900: #171717;

    /* Primary (Teal) */
    --primary-400: #2dd4bf;
    --primary-500: #14b8a6;
    --primary-600: #0d9488;
    --primary-700: #0f766e;

    /* Semantic Colors */
    --success: #22c55e;
    --warning: #f59e0b;
    --error: #ef4444;
}
```

**CLRS Palette** (`design-system-clrs.css`):

Based on [clrs.cc](https://clrs.cc/) for a more vibrant aesthetic.

```css
:root {
    /* CLRS Base Colors */
    --clrs-navy: #001f3f;
    --clrs-blue: #0074D9;
    --clrs-aqua: #7FDBFF;
    --clrs-teal: #39CCCC;
    --clrs-olive: #3D9970;
    --clrs-green: #2ECC40;
    --clrs-lime: #01FF70;
    --clrs-yellow: #FFDC00;
    --clrs-orange: #FF851B;
    --clrs-red: #FF4136;
    --clrs-maroon: #85144b;
    --clrs-fuchsia: #F012BE;
    --clrs-purple: #B10DC9;
    --clrs-black: #111111;
    --clrs-gray: #AAAAAA;
    --clrs-silver: #DDDDDD;
    --clrs-white: #FFFFFF;

    /* Semantic Assignments */
    --color-primary: var(--clrs-blue);
    --color-success: var(--clrs-green);
    --color-warning: var(--clrs-yellow);
    --color-error: var(--clrs-red);
}
```

#### Spacing System

```css
:root {
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-6: 24px;
    --space-8: 32px;
    --space-12: 48px;
    --space-16: 64px;
}
```

**Usage:**
```css
.component {
    padding: var(--space-4);
    margin-bottom: var(--space-6);
}
```

#### Typography

```css
:root {
    /* Font Families */
    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
    --font-serif: Georgia, Cambria, 'Times New Roman', serif;
}

h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-serif);
    font-weight: 600;
    line-height: 1.3;
}
```

**Scale:**
- `h1`: 40px
- `h2`: 32px
- `h3`: 24px
- `h4`: 20px
- `h5`: 18px
- `h6`: 16px

#### Shadows

```css
:root {
    --shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
    --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
    --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
}
```

#### Border Radius

```css
:root {
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-full: 9999px;
}
```

#### Transitions

```css
:root {
    --ease: cubic-bezier(0.4, 0, 0.2, 1);
    --duration-fast: 80ms;
    --duration-base: 120ms;
    --duration-slow: 200ms;
}
```

### Component Styles

#### Buttons

```css
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    font-weight: 500;
    font-size: 16px;
    border-radius: var(--radius-sm);
    border: none;
    cursor: pointer;
    transition: all var(--duration-base) var(--ease);
    min-height: 44px;
}

.btn-primary {
    background-color: var(--neutral-900);
    color: white;
}

.btn-secondary {
    background-color: transparent;
    color: var(--neutral-900);
    border: var(--border);
}

.btn-accent {
    background-color: var(--primary-600);
    color: white;
}
```

**Sizes:**
- `.btn-sm` - 36px min-height
- `.btn` - 44px min-height (default)
- `.btn-lg` - 52px min-height

#### Forms

```css
input[type="text"],
input[type="email"],
textarea,
select {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    font-size: 16px;
    border: var(--border);
    border-radius: var(--radius-sm);
    background-color: white;
    transition: all var(--duration-base) var(--ease);
}

input:focus,
textarea:focus,
select:focus {
    outline: none;
    border-color: var(--primary-500);
    box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.1);
}
```

#### Cards

```css
.card {
    background-color: white;
    border: var(--border);
    border-radius: var(--radius-lg);
    padding: var(--space-6);
}
```

#### Badges

```css
.badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2);
    font-size: 12px;
    font-weight: 500;
    border-radius: var(--radius-full);
}

.badge-success {
    background-color: #dcfce7;
    color: #15803d;
}

.badge-warning {
    background-color: #fef3c7;
    color: #92400e;
}

.badge-error {
    background-color: #fee2e2;
    color: #991b1b;
}
```

### Admin-Specific Styles

**File:** `/src/assets/css/admin.css`

Contains Tailwind `@apply` directives and component-specific styles for the admin interface.

#### Workflow Components

```css
.workflow-step {
    display: none;
}

.workflow-step.active {
    display: block;
}

.step-indicator {
    transition: all 0.3s ease;
}

.step-indicator.active {
    transform: scale(1.1);
}
```

#### Form Inputs

```css
.form-input {
    @apply border border-gray-300 rounded-md px-3 py-2 text-sm;
    @apply focus:ring-2 focus:ring-teal-500 focus:border-teal-500;
    transition: all 0.2s ease;
}

.form-input.error {
    @apply border-red-500;
}
```

#### Image Upload

```css
.upload-area {
    transition: all 0.3s ease;
}

.upload-area.dragover {
    @apply border-teal-400 bg-teal-50;
    transform: scale(1.02);
}

.image-preview:hover img {
    transform: scale(1.05);
}
```

#### Status Badges

```css
.status-available { @apply bg-green-100 text-green-800; }
.status-checked-out { @apply bg-yellow-100 text-yellow-800; }
.status-reserved { @apply bg-blue-100 text-blue-800; }
.status-missing { @apply bg-red-100 text-red-800; }
```

### Responsive Design

Mobile-first approach with breakpoints:

```css
/* Small: 640px+ */
@media (min-width: 640px) {
    .sm\:grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
}

/* Medium: 768px+ */
@media (min-width: 768px) {
    .md\:flex { display: flex; }
    .md\:hidden { display: none; }
    .md\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
}

/* Large: 1024px+ */
@media (min-width: 1024px) {
    .lg\:grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
}
```

### Accessibility Features

```css
/* Focus visible for keyboard navigation */
:focus-visible {
    outline: 2px solid var(--primary-500);
    outline-offset: 2px;
}

/* Screen reader only */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

---

## Template System

### Nunjucks Basics

Hudson Street Library uses Nunjucks as its templating language, compiled by Eleventy.

#### Variables

```njk
{{ book.Title }}
{{ book['Author, First'] }}
```

#### Filters

```njk
{{ book.Title | escape }}
{{ book.Title | slugify }}
{{ book.Summary | truncate(100) }}
```

#### Conditionals

```njk
{% if book.ISBN %}
    <p>ISBN: {{ book.ISBN }}</p>
{% endif %}

{% if book.Status == 'available' %}
    <span class="badge-success">Available</span>
{% else %}
    <span class="badge-error">Unavailable</span>
{% endif %}
```

#### Loops

```njk
{% for book in books %}
    <div class="book-card">
        <h3>{{ book.Title }}</h3>
    </div>
{% endfor %}
```

#### Include Components

```njk
{% include "components/site-header.njk" %}
{% include "components/book-thumbnail.njk", book: bookData, size: "medium" %}
```

### Layout Structure

#### Base Layout Pattern

Layouts extend a base template:

```njk
{# layouts/base.njk #}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }} | Hudson Street Library</title>
    {% block head %}{% endblock %}
</head>
<body>
    {% include "components/site-header.njk" %}

    <main>
        {% block content %}{% endblock %}
    </main>

    {% include "components/site-footer.njk" %}

    {% block scripts %}{% endblock %}
</body>
</html>
```

#### Book Detail Layout

**File:** `/src/_includes/layouts/book.njk`

Specialized layout for individual book pages with:
- Sticky cover image column
- Detailed metadata display
- Collection badges
- Subject tags
- Dynamic image loading

**Key Features:**
```njk
<!-- Sticky cover with fallback -->
<div class="sticky top-28">
    <img id="book-cover-img"
         alt="Cover of {{ book.Title | escape }}"
         onerror="showPlaceholder()">
    <div id="book-placeholder" style="display:none;">
        <i class="fas fa-book"></i>
        <p>{{ book.Title | escape }}</p>
    </div>
</div>

<!-- Dynamic image path generation -->
<script>
function generateCoverImagePath() {
    const author = '{{ book["Author, First"] }} {{ book["Author, Last"] }}'
        .replace(/[^a-zA-Z0-9.-]/g, '_');
    const title = '{{ book.Title }}'.replace(/[^a-zA-Z0-9.-]/g, '_');
    const isbn = '{{ book.ISBN }}'.replace(/[^a-zA-Z0-9.-]/g, '_');

    return `/assets/images/books/${author}_${title}_${isbn}.jpg`;
}
</script>
```

### Component Patterns

#### Book Thumbnail Component

**File:** `/src/_includes/components/book-thumbnail.njk`

Reusable thumbnail with XSS protection and size variants.

**Parameters:**
- `book` - Book object from CSV
- `size` - "small", "medium", "large" (optional)
- `className` - Additional CSS classes (optional)
- `showMeta` - Show title/author below thumbnail (default: true)

**Usage:**
```njk
{% include "components/book-thumbnail.njk",
    book: bookData,
    size: "medium",
    className: "hover:shadow-lg"
%}
```

**Implementation:**
```njk
{% set thumbnailSize = size or 'medium' %}
{% set bookTitle = book.title or book.Title or 'Untitled' %}
{% set bookAuthor = book.author_full_name or ((book.author_first or '') + ' ' + (book.author_last or '')).trim() %}

<div class="book-thumbnail group {{ className or '' }}">
  <div class="relative {{ containerClass }} bg-gray-200 rounded-lg">
    <img class="thumbnail-image"
         alt="Cover of {{ bookTitle | escape }}"
         data-title="{{ bookTitle | escape }}"
         data-author="{{ bookAuthor | escape }}"
         data-isbn="{{ bookISBN | escape }}">

    <div class="thumbnail-placeholder">
      <i class="fas fa-book"></i>
      <p>{{ bookTitle | escape | truncate(25) }}</p>
    </div>
  </div>
</div>
```

#### Site Header Component

**File:** `/src/_includes/components/site-header.njk`

Global navigation with mobile menu support.

**Parameters:**
- `currentPage` - For active nav highlighting (optional)
- `menuId` - Unique mobile menu ID (default: 'mobile-nav-menu')

**Features:**
- Responsive desktop/mobile navigation
- Active page highlighting
- Accessible with ARIA attributes
- Works with shared.js mobile menu handler

**Usage:**
```njk
{% include "components/site-header.njk", currentPage: "collections" %}
```

### Data Access

#### Books CSV Data

Books are loaded from CSV and available globally:

```njk
{# All books #}
{% for book in books %}
    {{ book.Title }}
{% endfor %}

{# Filtered books #}
{% for book in books %}
    {% if book.Status == 'available' %}
        {{ book.Title }}
    {% endif %}
{% endfor %}
```

#### Custom Filters

**File:** `/.eleventy.js`

```javascript
eleventyConfig.addFilter("slugify", function(str) {
    if (!str) return "";
    return slugify(str, {
        lower: true,
        strict: true,
        remove: /["]/g,
    });
});
```

**Usage:**
```njk
<a href="/books/{{ book.Title | slugify }}">{{ book.Title }}</a>
```

### XSS Protection

Always escape user data:

```njk
{# Safe - escaped by default #}
{{ book.Title }}

{# Dangerous - use only for trusted HTML #}
{{ book.Summary | safe }}

{# Best practice - explicit escape #}
{{ book.Title | escape }}
```

---

## Asset Pipeline

### Eleventy Configuration

**File:** `/.eleventy.js`

```javascript
module.exports = function(eleventyConfig) {
    // Copy entire assets directory
    eleventyConfig.addPassthroughCopy("src/assets");

    // Copy data files
    eleventyConfig.addPassthroughCopy({
        "src/_data/books.csv": "cms/data/books.csv"
    });

    // Image processing
    eleventyConfig.addNunjucksAsyncShortcode("image", imageShortcode);

    return {
        dir: {
            input: "src",
            output: "_site",
            includes: "_includes",
            layouts: "_includes/layouts",
            data: "_data"
        }
    };
};
```

### Image Processing

#### Responsive Images

Eleventy Image plugin generates responsive image sets:

```javascript
async function imageShortcode(src, alt, sizes = "100vw") {
    let metadata = await Image(src, {
        widths: [300, 600, 900, 1200],
        formats: ["webp", "jpeg"],
        outputDir: "./_site/assets/images/optimized/",
        urlPath: "/assets/images/optimized/"
    });

    return Image.generateHTML(metadata, {
        alt,
        sizes,
        loading: "lazy",
        decoding: "async"
    });
}
```

**Usage in templates:**
```njk
{% image "src/assets/images/hero.jpg", "Hero image", "(min-width: 768px) 50vw, 100vw" %}
```

**Output:**
```html
<picture>
    <source type="image/webp"
            srcset="/assets/images/optimized/hero-300w.webp 300w, ..."
            sizes="(min-width: 768px) 50vw, 100vw">
    <img src="/assets/images/optimized/hero-600w.jpeg"
         alt="Hero image"
         loading="lazy"
         decoding="async">
</picture>
```

#### Book Cover Acquisition

Cover images follow naming convention:

```
Author_Title_ISBN.jpg
```

**Example:**
```
Ansel_Adams_The_Negative_9780821221860.jpg
```

**See:** [COVER-ACQUISITION.md](COVER-ACQUISITION.md) for full details.

### Asset Optimization

#### CSS

- Main design system: Single file, ~40KB uncompressed
- Tailwind: compiled locally via `npm run build:css` (input `src/assets/css/input.css`, output `_site/assets/css/tailwind.css`, minified). `npm run watch:css` watches in development.

#### JavaScript

- `shared.js`: Core functionality, ~10KB
- `book-workflow.js`: Admin only, ~35KB
- `batch-operations.js`: Admin only, ~18KB
- All ES6+ code, modern browsers only

#### Images

- Book covers: 800x600px JPEG, ~200KB each
- Optimized with Eleventy Image plugin
- WebP format with JPEG fallback
- Lazy loading on all images

---

## Development Workflow

### Local Development

#### 1. Start Development Server

```bash
npm run serve
```

This starts:
- Eleventy in watch mode
- Local server at `http://localhost:8080`
- Auto-reload on file changes

#### 2. File Watching

Eleventy watches these paths:
- `src/**/*.njk`
- `src/**/*.html`
- `src/**/*.md`
- `src/_data/**/*`

**Note:** CSS/JS changes require manual reload (not watched by Eleventy).

#### 3. Hot Module Replacement

Not available. Use browser auto-reload extensions or manual refresh.

### Build Process

#### Development Build

```bash
npm run build
```

Outputs to `_site/` directory.

#### Production Build

```bash
npm run build:production
```

Additional optimizations:
- Minified HTML
- Optimized images
- Cache-busted assets

### Testing Frontend Changes

#### 1. Visual Testing

```bash
npm run serve
```

Check:
- Layout rendering
- Responsive behavior
- Interactive elements
- Image loading
- Form validation

#### 2. JavaScript Testing

Open browser console and test:

```javascript
// Test shared library
HSL.resolvePath('/test');

// Test mobile menu
document.querySelector('button[aria-controls*="mobile-nav"]').click();

// Test image loading
document.querySelector('.thumbnail-image').src = '/invalid.jpg';
```

#### 3. Cross-Browser Testing

Test matrix:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- iOS Safari
- Android Chrome

#### 4. Accessibility Testing

Tools:
- Chrome DevTools Lighthouse
- axe DevTools extension
- Keyboard navigation test
- Screen reader (NVDA/VoiceOver)

---

## Common Frontend Tasks

### Adding New Styles

#### 1. Using Design Tokens

```css
.new-component {
    padding: var(--space-4);
    background-color: var(--neutral-50);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-sm);
    transition: all var(--duration-base) var(--ease);
}
```

#### 2. Adding Utility Classes

Add to `design-system.css`:

```css
/* Text utilities */
.text-balance { text-wrap: balance; }
.text-pretty { text-wrap: pretty; }

/* Layout utilities */
.stack > * + * { margin-top: var(--space-4); }
```

#### 3. Component-Specific Styles

For admin components, add to `admin.css`:

```css
.new-admin-component {
    @apply bg-white rounded-lg shadow-md p-6;
}
```

### Adding New JavaScript Features

#### 1. Extend HudsonStreetLibrary Class

```javascript
// In shared.js
initializeComponents() {
    this.initMobileMenu();
    this.initSmoothScrolling();
    this.initNewFeature();  // Add here
}

initNewFeature() {
    // Implementation
    const elements = document.querySelectorAll('.new-feature');
    elements.forEach(el => {
        el.addEventListener('click', () => this.handleNewFeature(el));
    });
}

handleNewFeature(element) {
    // Handler logic
}
```

#### 2. Create New Component Class

```javascript
// In new-component.js
class NewComponent {
    constructor(options = {}) {
        this.options = options;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event handlers
    }
}

// Auto-initialize
let newComponent;
document.addEventListener('DOMContentLoaded', function() {
    newComponent = new NewComponent();
});
```

#### 3. Add Global Utilities

```javascript
// In shared.js
window.HSL = {
    resolvePath: HudsonStreetLibrary.resolvePath,
    loadCollectionData: HudsonStreetLibrary.loadCollectionData,
    newUtility: function(param) {
        // Utility logic
    }
};
```

### Creating New Components

#### 1. Nunjucks Component

Create `/src/_includes/components/new-component.njk`:

```njk
{#
  New Component
  Parameters:
  - data: Component data object
  - variant: "primary" | "secondary" (optional)
  - className: Additional CSS classes (optional)
#}

{% set componentVariant = variant or 'primary' %}
{% set componentClass = 'new-component new-component--' + componentVariant %}

<div class="{{ componentClass }} {{ className or '' }}">
    <h3>{{ data.title | escape }}</h3>
    <p>{{ data.description | escape }}</p>
</div>
```

**Usage:**
```njk
{% include "components/new-component.njk",
    data: { title: "Title", description: "Description" },
    variant: "primary"
%}
```

#### 2. JavaScript-Enhanced Component

Combine template with JavaScript:

**Template:**
```njk
<div class="interactive-component"
     data-component="interactive"
     data-options='{{ options | dump | safe }}'>
    <!-- Component markup -->
</div>
```

**JavaScript:**
```javascript
initInteractiveComponents() {
    const components = document.querySelectorAll('[data-component="interactive"]');
    components.forEach(el => {
        const options = JSON.parse(el.dataset.options);
        new InteractiveComponent(el, options);
    });
}
```

### Modifying Templates

#### 1. Update Layout

Edit `/src/_includes/layouts/[layout-name].njk`

#### 2. Update Component

Edit `/src/_includes/components/[component-name].njk`

#### 3. Test Changes

```bash
# Rebuild and view
npm run serve
```

Navigate to pages using the template and verify changes.

### Adding Third-Party Libraries

#### Via CDN

Add to layout head:

```njk
<link rel="stylesheet" href="https://cdn.example.com/library.css">
<script src="https://cdn.example.com/library.js"></script>
```

#### Via npm

```bash
npm install library-name
```

Copy to assets:

```javascript
// In .eleventy.js
eleventyConfig.addPassthroughCopy({
    "node_modules/library-name/dist": "assets/vendor/library-name"
});
```

Include in template:

```njk
<script src="/assets/vendor/library-name/library.min.js"></script>
```

---

## Best Practices

### Performance

1. **Lazy Load Images**
   ```html
   <img loading="lazy" decoding="async">
   ```

2. **Minimize JavaScript**
   - Use vanilla JS over heavy frameworks
   - Load admin scripts only on admin pages
   - Defer non-critical scripts

3. **Optimize CSS**
   - Use CSS custom properties for theming
   - Avoid deep nesting
   - Minimize specificity

4. **Asset Strategy**
   - Serve optimized images (WebP with fallback)
   - Use system fonts where possible
   - CDN for third-party libraries

### Accessibility

1. **Semantic HTML**
   ```html
   <nav>...</nav>
   <main>...</main>
   <article>...</article>
   ```

2. **ARIA Attributes**
   ```html
   <button aria-label="Close menu" aria-expanded="false">
   ```

3. **Keyboard Navigation**
   - All interactive elements focusable
   - Visible focus indicators
   - Logical tab order

4. **Color Contrast**
   - WCAG AA minimum (4.5:1 for text)
   - Test with contrast checker tools

5. **Reduced Motion**
   ```css
   @media (prefers-reduced-motion: reduce) {
       * { animation: none !important; }
   }
   ```

### Security

1. **XSS Prevention**
   ```njk
   {# Always escape user data #}
   {{ userInput | escape }}

   {# Never use | safe with user data #}
   {{ trustedHTML | safe }}  {# Only for trusted sources #}
   ```

2. **Content Security Policy**
   Add to layout:
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="default-src 'self'; script-src 'self' 'unsafe-inline';">
   ```

3. **HTTPS Only**
   - All external resources via HTTPS
   - No mixed content

4. **Input Validation**
   ```javascript
   validateISBN(isbn) {
       const cleanISBN = isbn.replace(/[-\s]/g, '');
       return cleanISBN.length === 10 || cleanISBN.length === 13;
   }
   ```

### Code Organization

1. **File Structure**
   - One component per file
   - Related files in same directory
   - Clear naming conventions

2. **Naming Conventions**
   - Components: `component-name.njk`
   - Layouts: `layout-name.njk`
   - Classes: `component-name`, `component-name__element`, `component-name--modifier`

3. **Comments**
   ```njk
   {#
     Component Name
     Description of what this component does
     Parameters:
     - param1: Description
     - param2: Description
   #}
   ```

4. **Code Reuse**
   - Extract repeated patterns into components
   - Use mixins for common template logic
   - Create utility functions in shared.js

### Responsive Design

1. **Mobile First**
   ```css
   /* Base styles for mobile */
   .component { ... }

   /* Tablet and up */
   @media (min-width: 768px) {
       .component { ... }
   }

   /* Desktop and up */
   @media (min-width: 1024px) {
       .component { ... }
   }
   ```

2. **Breakpoints**
   - Small: 640px
   - Medium: 768px
   - Large: 1024px
   - XL: 1280px

3. **Touch Targets**
   - Minimum 44x44px for touch targets
   - Adequate spacing between interactive elements

4. **Viewport Meta Tag**
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   ```

---

## Debugging Tips

### JavaScript Debugging

#### 1. Console Logging

```javascript
// Debug initialization
console.log('--- HudsonStreetLibrary initialized ---');

// Debug data
console.log('Book data:', this.bookData);

// Debug events
element.addEventListener('click', (e) => {
    console.log('Clicked:', e.target);
});
```

#### 2. Browser DevTools

**Sources Panel:**
- Set breakpoints in JavaScript files
- Step through code execution
- Inspect variable values

**Console:**
```javascript
// Access global instances
HSL.resolvePath('/test');

// Access component instances
bookWorkflow.currentStep;
batchOps.csvData;
```

**Network Panel:**
- Monitor API requests
- Check image loading
- View request/response headers

#### 3. Error Handling

```javascript
try {
    await this.fetchData();
} catch (error) {
    console.error('Fetch error:', error);
    showToast('Failed to load data', 'error');
}
```

### CSS Debugging

#### 1. DevTools Inspection

- Right-click element → Inspect
- View computed styles
- Toggle CSS rules
- Edit styles live

#### 2. Layout Debugging

```css
/* Temporary debug borders */
* {
    outline: 1px solid red;
}

/* Grid/Flex debugging */
.grid {
    background: rgba(255, 0, 0, 0.1);
}
```

#### 3. Responsive Testing

DevTools:
- Toggle device toolbar (Cmd/Ctrl + Shift + M)
- Test different viewport sizes
- Simulate touch events

### Template Debugging

#### 1. Nunjucks Variables

```njk
{# Dump variable contents #}
<pre>{{ book | dump }}</pre>

{# Check if variable exists #}
{% if book.ISBN %}
    ISBN exists: {{ book.ISBN }}
{% else %}
    ISBN missing
{% endif %}
```

#### 2. Eleventy Debug Output

```bash
# Run with debug output
DEBUG=Eleventy* npm run serve
```

#### 3. CSV Data Issues

Check `.eleventy.js` console output:
```
--- Parsed 401 records from books.csv
--- CSV stats: 398 valid, 3 corrected, 0 invalid
```

### Common Issues and Solutions

#### 1. Images Not Loading

**Problem:** Book cover images show placeholder

**Check:**
```javascript
// In browser console
const img = document.querySelector('.thumbnail-image');
console.log('Image src:', img.src);
console.log('Data attributes:', img.dataset);

// Test path generation
generateCoverImagePath();
```

**Solutions:**
- Verify image file exists in `/assets/images/books/`
- Check filename matches convention: `Author_Title_ISBN.jpg`
- Ensure no special characters in filename
- Check `data-isbn`, `data-title`, `data-author` attributes

#### 2. Mobile Menu Not Working

**Problem:** Menu button doesn't toggle menu

**Check:**
```javascript
// Verify button exists
const button = document.querySelector('button[aria-controls*="mobile-nav"]');
console.log('Button:', button);

// Verify menu exists
const menuId = button.getAttribute('aria-controls');
const menu = document.getElementById(menuId);
console.log('Menu:', menu);
```

**Solutions:**
- Ensure `shared.js` is loaded
- Check `aria-controls` matches menu ID
- Verify no JavaScript errors in console

#### 3. Styles Not Applying

**Problem:** CSS classes don't work

**Solutions:**
- Check `/assets/css/tailwind.css` is linked in the layout
- Verify class name spelling
- Check CSS specificity (use DevTools)
- Clear browser cache
- Rebuild Tailwind: `npm run build:css` (or run `npm start` for watch mode)

#### 4. Form Validation Failing

**Problem:** Form won't submit, no errors shown

**Check:**
```javascript
// In browser console
bookWorkflow.validateCurrentStep();
bookWorkflow.validateField('title');
```

**Solutions:**
- Check required fields are filled
- Verify validation logic in `book-workflow.js`
- Check console for JavaScript errors
- Test validation methods directly

#### 5. CSV Data Not Showing

**Problem:** Book data doesn't display

**Check Eleventy build:**
```bash
npm run build
# Look for: "Added 'books' global data with X items"
```

**Check template:**
```njk
<pre>{{ books | dump }}</pre>
```

**Solutions:**
- Verify CSV file exists at `src/_data/books.csv`
- Check CSV format (headers, encoding)
- Review CSVHandler errors in build output
- Ensure books are accessible in template scope

---

## Additional Resources

### Internal Documentation

- [Build System](BUILD-SYSTEM.md) - Build configuration and processes
- [Testing Patterns](TESTING-PATTERNS.md) - Testing strategies and tools
- [Data Structures](DATA-STRUCTURES.md) - CSV format and schema
- [Cover Acquisition](COVER-ACQUISITION.md) - Book cover image guidelines

### External Resources

- [Eleventy Documentation](https://www.11ty.dev/docs/)
- [Nunjucks Documentation](https://mozilla.github.io/nunjucks/)
- [MDN Web Docs](https://developer.mozilla.org/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [clrs.cc Color Palette](https://clrs.cc/)

---

## Conclusion

This guide covers the essential aspects of frontend development for Hudson Street Library. The system prioritizes:

- **Simplicity** - Vanilla JavaScript and CSS
- **Performance** - Static generation, lazy loading
- **Accessibility** - WCAG compliance, semantic HTML
- **Maintainability** - Clear patterns, good documentation

For questions or contributions, refer to the main project documentation.

---

**Document Version:** 1.0
**Last Updated:** October 19, 2025
**Maintained By:** Development Team
