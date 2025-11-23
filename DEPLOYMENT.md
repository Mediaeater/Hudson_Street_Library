# Deployment Guide

## Overview

The Hudson Street Library site is deployed via **GitHub Pages** with **Cloudflare** providing CDN and caching.

### Deployment Architecture

```
Local Changes → Git Push → GitHub Actions → GitHub Pages → Cloudflare CDN → Live Site
```

**How it works**:
1. Push changes to `main` branch
2. GitHub Actions workflow automatically triggers (`.github/workflows/build-and-deploy.yml`)
3. Workflow builds site with Eleventy (Node 22, Eleventy v3)
4. Built `_site/` folder deployed to GitHub Pages
5. Cloudflare serves the site at hudsonstreetlibrary.com
6. **You must manually purge Cloudflare cache** to see updates

### Key Requirements

- **Node.js 22+**: Required for Eleventy v3 compatibility
- **GitHub Actions**: Builds and deploys automatically on push
- **Cloudflare Cache Purge**: Manual step to update live site after deployment

## Quick Deploy

```bash
# Build site and purge cache in one command
npm run deploy
```

This will:
1. Clean build artifacts
2. Build the site with Eleventy
3. Purge Cloudflare cache for updated pages

## Manual Cache Purge

If you've already pushed changes and just need to clear the cache:

```bash
# Purge commonly updated pages (recently_added, search, etc.)
npm run cache:purge

# Purge ALL cache (use sparingly)
npm run cache:purge:all
```

## Step-by-Step Deployment

### 1. Make Your Changes

```bash
# Add a new book
npm run add

# Make edits to pages
# Edit src/collections/recently_added.html, etc.
```

### 2. Build Locally

```bash
npm run build
```

Test at http://127.0.0.1:8080 using:
```bash
npx http-server _site -p 8080
```

### 3. Commit and Push

```bash
# Stage and commit source files only (_site is in .gitignore)
git add src/_data/books.csv src/collections/recently_added.html
git commit -m "Your commit message"

# If you need to deploy built files (occasionally needed):
git add -f _site/collections/recently_added.html
git add -f _site/cms/data/books.csv

git push
```

### 4. Purge Cloudflare Cache

```bash
npm run cache:purge
```

Your changes will be live within seconds!

## Environment Setup

### Required Environment Variables

Add to `.env` (already configured):

```bash
# Cloudflare (for cache purging)
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ZONE_ID=your_zone_id_here
```

### Getting Cloudflare Credentials

1. **API Token** (with Cache Purge permission):
   - Go to https://dash.cloudflare.com/profile/api-tokens
   - Create Token → Custom Token
   - Permissions: Zone → Cache Purge → Purge
   - Zone: hudsonstreetlibrary.com

2. **Zone ID**:
   - Go to Cloudflare dashboard
   - Select hudsonstreetlibrary.com
   - Zone ID is in the right sidebar under "API"

## Git Deployment Strategy

### What's Tracked in Git

The repository tracks:
- **Source files** (always): `src/`, `scripts/`, configs
- **Some built files** (selectively): Key `_site/` files needed for deployment
- **Not tracked**: Most `_site/` files (in `.gitignore`)

### When to Force-Add Built Files

Occasionally you need to add built files to git:

```bash
# Add specific built files
git add -f _site/collections/recently_added.html
git add -f _site/cms/data/books.csv

# Add new book pages
git add -f _site/books/author_title_id/index.html
```

Only do this when the live site needs specific updated files.

## Common Deployment Scenarios

### Adding New Books

```bash
# 1. Add book(s)
npm run add

# 2. Manually add cover images to src/assets/images/books/

# 3. Build site
npm run build

# 4. Commit source files
git add src/_data/books.csv src/assets/images/books/
git commit -m "Add: New books"

# 5. Add built files
git add -f _site/cms/data/books.csv
git add -f _site/books/*/index.html  # New book pages
git commit -m "Deploy: New book pages"

# 6. Push and purge cache
git push
npm run cache:purge
```

### Updating Collection Pages

```bash
# 1. Edit source file
# Edit src/collections/recently_added.html

# 2. Build
npm run build

# 3. Test locally
npx http-server _site -p 8080

# 4. Commit source
git add src/collections/recently_added.html
git commit -m "Update: Recently added page"

# 5. Add built file (if needed)
git add -f _site/collections/recently_added.html
git commit -m "Deploy: Recently added page"

# 6. Push and purge
git push
npm run cache:purge
```

### CSS or Asset Changes

```bash
# 1. Edit CSS
# Edit src/assets/css/design-system.css

# 2. Build
npm run build

# 3. Commit
git add src/assets/css/design-system.css _site/assets/css/design-system.css
git commit -m "Update: CSS fixes"
git push

# 4. Purge ALL cache (CSS is widely cached)
npm run cache:purge:all
```

## Troubleshooting

### Changes Not Showing on Live Site

**Problem**: Pushed changes but site still shows old content

**Solution**: Purge Cloudflare cache
```bash
npm run cache:purge
```

Or purge everything:
```bash
npm run cache:purge:all
```

### Cache Purge Fails

**Problem**: Cache purge command errors

**Solutions**:
1. Check `.env` has `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ZONE_ID`
2. Verify token has Cache Purge permission in Cloudflare dashboard
3. Check token hasn't expired

### Local and Remote Out of Sync

**Problem**: Remote has changes not in local repo (e.g., from other tools like Google Jules)

**Solution**:
```bash
# Fetch and pull latest
git fetch origin
git pull origin main

# If there are conflicts, resolve them
# Then rebuild
npm run build
```

### Built Files Not Deploying

**Problem**: Made changes but forgot to add built files to git

**Solution**:
```bash
# Find what needs to be added
git status _site/

# Force-add needed files
git add -f _site/path/to/file.html
git commit -m "Deploy: Missing built files"
git push
npm run cache:purge
```

### GitHub Actions Build Failing

**Problem**: GitHub Actions workflow fails with "require('@11ty/eleventy') is incompatible with Eleventy v3"

**Root Cause**: Eleventy v3 requires Node.js 22.12+ to use `require()` with ESM modules. The workflow was using Node 18.

**Solution**:
```yaml
# In .github/workflows/build-and-deploy.yml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'  # Changed from '18'
    cache: 'npm'
```

**Problem**: GitHub Actions fails with "Cannot read properties of undefined (reading 'watch')"

**Root Cause**: The `eleventy-plugin-tailwindcss` plugin is incompatible with Eleventy v3.

**Solution**: Disabled the plugin in `.eleventy.js`:
```javascript
// CSS files are copied via passthrough copy instead
// eleventyConfig.addPlugin(eleventyTailwind, { ... });
```

The CSS files are still properly deployed through Eleventy's passthrough copy feature.

## Cache Purge Script Details

### Default URLs Purged

When you run `npm run cache:purge`, these URLs are purged:
- `/collections/recently_added.html`
- `/static-demo/` and `/static-demo/index.html`
- `/cms/data/books.csv`
- `/index.html`
- `/collection-explore.html`

### Custom URL Purge

```bash
node scripts/purge-cloudflare-cache.js --urls \
  https://hudsonstreetlibrary.com/collections/custom-page.html \
  https://hudsonstreetlibrary.com/books/author_title_123/
```

## Full Deployment Workflow

```bash
# 1. Sync with remote (if working with other tools)
git pull

# 2. Make changes
# ... edit files ...

# 3. Build and test
npm run build
npx http-server _site -p 8080  # Test at http://127.0.0.1:8080

# 4. Commit source files
git add src/
git commit -m "Your changes"

# 5. Add critical built files (if needed)
git add -f _site/collections/recently_added.html
git add -f _site/cms/data/books.csv
git commit -m "Deploy: Built files"

# 6. Push
git push

# 7. Purge cache
npm run cache:purge

# Done! Check live site in a few seconds
```

## NPM Scripts Reference

```bash
npm run build              # Build site with Eleventy
npm run cache:purge        # Purge default URLs from Cloudflare cache
npm run cache:purge:all    # Purge ALL Cloudflare cache
npm run deploy             # Build + purge cache (full deploy)
npm run add                # Add new book interactively
npm test                   # Run validation tests
```

## Notes

- `.env` is in `.gitignore` - never commit credentials
- Most of `_site/` is in `.gitignore` to avoid bloating repo
- Cloudflare caches aggressively - always purge after pushing changes
- Local builds show immediate changes; live site needs cache purge
- The site is served directly from git via Cloudflare, not GitHub Actions
