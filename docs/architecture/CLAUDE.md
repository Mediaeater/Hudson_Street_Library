# Claude Assistant Guide for Hudson Street Library

This document provides specific guidance for Claude or other AI assistants working with this repository.

## Critical Information

⚠️ **THIS IS NOT A JEKYLL SITE** ⚠️
- Uses Eleventy (11ty) static site generator
- Templates use Nunjucks syntax (`.njk` files)
- GitHub Pages serves pre-built files from `_site/` directory
- The `.nojekyll` file is CRITICAL - do not remove it

## Common Mistakes to Avoid

### 1. Don't Assume Jekyll
- ❌ WRONG: "Let me check the Jekyll configuration"
- ✅ RIGHT: "Let me check the Eleventy configuration in `.eleventy.js`"

### 2. Don't Try Jekyll Commands
- ❌ WRONG: `bundle exec jekyll build`
- ✅ RIGHT: `npx eleventy`

### 3. Don't Use Liquid Syntax
- ❌ WRONG: `{{ site.data.books }}`
- ✅ RIGHT: `{{ books }}` (Eleventy loads from `_data/` automatically)

## When Working with This Repository

### Building the Site
```bash
# Install dependencies first
npm install

# Build the site
npx eleventy

# The output will be in _site/
```

### Making Changes

1. **Templates**: Edit `.njk` files using Nunjucks syntax
2. **Data**: Update files in `_data/` directory
3. **Static Files**: Edit `.html` files directly
4. **Images**: Add to appropriate subdirectory in `imgs/`

### After Making Changes

1. Build locally: `npx eleventy`
2. Commit ALL changes including `_site/` directory:
   ```bash
   git add -A
   git commit -m "Your descriptive message"
   git push origin main
   ```

## File Types and Their Purpose

| Extension | Purpose | Syntax |
|-----------|---------|--------|
| `.njk` | Eleventy templates | Nunjucks |
| `.html` | Static pages or templates | HTML (may include Nunjucks) |
| `.csv` | Data files | Standard CSV |
| `.json` | Data files | Standard JSON |
| `.js` | JavaScript or config | JavaScript |

## Debugging Build Issues

### If you see "Unknown tag" errors:
- This means Jekyll is trying to build the site
- Check that `.nojekyll` exists
- Ensure you're not using Jekyll-specific syntax

### If CSV errors occur:
- Check for proper quote escaping (use `""` for quotes inside fields)
- Ensure consistent column count
- Remove empty rows
- Use a CSV validator tool

### If site doesn't update:
1. Check GitHub Actions status
2. Ensure `_site/` was committed
3. Wait 5-10 minutes for GitHub Pages cache
4. Try a hard refresh in browser

## Data File Locations

- **Books**: `_data/books.csv`
- **News**: `_data/news.json`
- **Built Output**: `_site/` (this is what gets deployed)

## Important Commands

```bash
# Install dependencies
npm install

# Build site once
npx eleventy

# Build and watch for changes
npx eleventy --serve

# Clean build
rm -rf _site && npx eleventy
```

## Template Syntax Examples

### Nunjucks (Correct for this project):
```nunjucks
{% set books = collections.books %}
{% for book in books %}
  <h2>{{ book.data.title }}</h2>
{% endfor %}
```

### Jekyll/Liquid (WRONG for this project):
```liquid
{% assign books = site.data.books %}
{% for book in books %}
  <h2>{{ book.title }}</h2>
{% endfor %}
```

## Working with Collections

The `collections/` directory contains static HTML files for different book collections. These are served as-is and can reference data from the CSV files via JavaScript.

## Deployment Checklist

- [ ] Made changes to source files
- [ ] Ran `npx eleventy` to build
- [ ] Verified changes in `_site/` directory
- [ ] Committed ALL files including `_site/`
- [ ] Pushed to `main` branch
- [ ] Checked that `.nojekyll` file exists

## Getting Help

If you encounter issues:
1. Check if it's an Eleventy syntax issue (not Jekyll)
2. Verify CSV data is properly formatted
3. Ensure all dependencies are installed
4. Check the Eleventy documentation at https://www.11ty.dev/