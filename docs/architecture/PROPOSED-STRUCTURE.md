# Proposed Repository Structure for Hudson Street Library

## Overview

This document outlines a recommended restructuring of the Hudson Street Library repository to improve maintainability, clarity, and developer experience.

## Proposed Structure

```
hudson-street-library/
├── .github/                    # GitHub-specific files
│   └── workflows/             # GitHub Actions for automated builds
├── src/                       # All source files
│   ├── _data/                # Data files (Eleventy auto-loads from here)
│   │   ├── books.json        # Single source of truth for books
│   │   ├── collections.json  # Collection definitions
│   │   └── news.json         # News items
│   ├── _includes/            # Reusable components and layouts
│   │   ├── components/       # Reusable UI components
│   │   │   ├── header.njk
│   │   │   ├── footer.njk
│   │   │   ├── book-card.njk
│   │   │   └── navigation.njk
│   │   └── layouts/          # Page layouts
│   │       ├── base.njk      # Base HTML structure
│   │       ├── book.njk      # Individual book page
│   │       ├── collection.njk # Collection page layout
│   │       └── page.njk      # Generic page layout
│   ├── assets/               # Static assets
│   │   ├── css/             # Stylesheets (if not using Tailwind CDN)
│   │   ├── js/              # Client-side JavaScript
│   │   │   ├── search.js
│   │   │   ├── navigation.js
│   │   │   └── utils.js
│   │   └── images/          # Optimized images
│   │       ├── books/       # Book covers
│   │       ├── collections/ # Collection images
│   │       ├── news/        # News images
│   │       └── site/        # Site assets (logo, etc.)
│   ├── pages/               # Static pages (using .njk or .md)
│   │   ├── index.njk        # Homepage
│   │   ├── about.njk
│   │   ├── contact.njk
│   │   └── search.njk
│   ├── books/               # Book pages (generated from data)
│   │   └── books.njk        # Template that generates all book pages
│   ├── collections/         # Collection pages (generated from data)
│   │   └── collections.njk  # Template that generates all collections
│   └── news/               # News pages
│       ├── index.njk       # News listing
│       └── item.njk        # Individual news item template
├── scripts/                # Build and utility scripts
│   ├── import-books.js     # Import books from CSV
│   ├── optimize-images.js  # Image optimization
│   └── validate-data.js    # Data validation
├── docs/                   # Documentation
│   ├── README.md          # Main documentation
│   ├── CONTRIBUTING.md    # Contribution guidelines
│   ├── architecture/      # Architecture documentation
│   │   ├── overview.md
│   │   ├── eleventy.md
│   │   └── deployment.md
│   └── guides/           # How-to guides
│       ├── adding-books.md
│       ├── creating-collections.md
│       └── cms-integration.md
├── tests/                 # Test files
│   ├── unit/
│   └── integration/
├── .eleventy.js          # Eleventy configuration
├── .gitignore           # Git ignore file
├── .nvmrc               # Node version
├── package.json         # Dependencies and scripts
├── README.md            # Project overview
└── netlify.toml         # Netlify configuration (if using Netlify)
```

## Key Changes and Benefits

### 1. Source Code Organization (`src/` directory)
- **Benefit**: Clear separation between source files and generated output
- All source files live in `src/`, making it obvious what to edit
- Follows Eleventy best practices

### 2. Remove `_site/` from Git
- **Benefit**: Cleaner repository, no merge conflicts from built files
- Add `_site/` to `.gitignore`
- Build files on deployment (GitHub Actions, Netlify, or Vercel)

### 3. Unified Data Source
- **Benefit**: Single source of truth for each data type
- Convert CSV to JSON for better JavaScript compatibility
- Use `src/_data/` as the only data directory

### 4. Template-Based Generation
- **Benefit**: DRY principle, easier maintenance
- Generate all book pages from a single template
- Generate all collection pages from a single template
- Use Eleventy's pagination feature

### 5. Organized Documentation
- **Benefit**: Easy to find and maintain documentation
- All docs in `docs/` directory with logical subdirectories
- Separate architecture docs from how-to guides

### 6. Clear Static Assets Structure
- **Benefit**: Logical organization, easier to find assets
- Images organized by their use case
- JavaScript files properly modularized

### 7. Build Scripts
- **Benefit**: Automated common tasks
- Data import/export scripts
- Image optimization
- Data validation

## Migration Path

### Phase 1: Preparation
1. Create new directory structure in a branch
2. Move source files to new locations
3. Update all internal links and paths
4. Test locally with Eleventy

### Phase 2: Data Migration
1. Consolidate all CSV files into single JSON files
2. Update templates to use new data structure
3. Create migration scripts for existing data

### Phase 3: Template Conversion
1. Convert static HTML files to Eleventy templates
2. Create reusable components
3. Implement pagination for books and collections

### Phase 4: Build Process
1. Update `.gitignore` to exclude `_site/`
2. Set up GitHub Actions for automated builds
3. Configure deployment to GitHub Pages

### Phase 5: Cleanup
1. Remove duplicate files
2. Remove unused frontend/ directory
3. Archive old CMS integration if not needed

## Example: Updated package.json scripts

```json
{
  "scripts": {
    "dev": "eleventy --serve --watch",
    "build": "eleventy",
    "clean": "rm -rf _site",
    "import:books": "node scripts/import-books.js",
    "optimize:images": "node scripts/optimize-images.js",
    "validate": "node scripts/validate-data.js",
    "deploy": "npm run clean && npm run build"
  }
}
```

## Benefits Summary

1. **Clearer Structure**: Obvious where to find and edit files
2. **Better Performance**: No built files in git = faster clones
3. **Easier Maintenance**: Templates reduce repetition
4. **Modern Workflow**: Automated builds and deployments
5. **Scalability**: Easy to add new books/collections
6. **Developer Experience**: Clear conventions and documentation

## Next Steps

1. Review and approve this structure
2. Create migration plan with timeline
3. Set up new build pipeline
4. Migrate in phases to minimize disruption
5. Update documentation for new structure