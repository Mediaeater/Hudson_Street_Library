# Eleventy v3 Migration Notes

## Overview

This project uses Eleventy v3, which has breaking changes from v2. This document explains the issues encountered and solutions implemented.

## Critical Changes Required

### 1. Node.js Version Requirement

**Issue**: Eleventy v3 requires Node.js 22.12+ when using CommonJS `require()` syntax.

**Error Message**:
```
`require("@11ty/eleventy")` is incompatible with Eleventy v3 and this version of Node.
```

**Solution**: Updated GitHub Actions workflow to use Node 22.

**File**: `.github/workflows/build-and-deploy.yml`
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'  # Previously was '18'
    cache: 'npm'
```

**Why**: Eleventy v3 is published as an ESM-first package. Node 18 doesn't support loading ESM packages via `require()`. Node 22.12+ has native support for this.

**Alternative Solutions** (not implemented):
- Rename `.eleventy.js` to `.eleventy.mjs` and convert to ESM syntax
- Add `"type": "module"` to package.json and convert all scripts to ESM
- Use `--experimental-require-module` flag in Node < 22.12

### 2. Tailwind CSS Plugin Incompatibility

**Issue**: The `eleventy-plugin-tailwindcss` package is incompatible with Eleventy v3.

**Error Message**:
```
Cannot read properties of undefined (reading 'watch')
at monkeypatch (/node_modules/eleventy-plugin-tailwindcss/src/utils.js:2:29)
```

**Root Cause**: The plugin tries to access internal Eleventy APIs that changed in v3.

**Solution**: Disabled the plugin entirely.

**File**: `.eleventy.js`
```javascript
// Before (broken):
const eleventyTailwind = require("eleventy-plugin-tailwindcss");
eleventyConfig.addPlugin(eleventyTailwind, {
  src: "src/assets/css/input.css",
  dest: "_site/assets/css",
  keepFolderStructure: false,
  minify: true,
});

// After (working):
// Note: eleventy-plugin-tailwindcss disabled due to Eleventy v3 incompatibility
// CSS is built separately via passthrough copy
// const eleventyTailwind = require("eleventy-plugin-tailwindcss");
```

**Impact**: None. CSS files are still properly deployed via Eleventy's passthrough copy:
```javascript
eleventyConfig.addPassthroughCopy("src/assets");
```

**Alternative Solutions**:
- Wait for plugin update to support Eleventy v3
- Build CSS separately with Tailwind CLI and copy to `_site/`
- Use a different CSS processing approach

## What Still Works

### Passthrough Copy
All asset files (CSS, images, etc.) are still copied correctly:
```javascript
eleventyConfig.addPassthroughCopy("src/assets");
eleventyConfig.addPassthroughCopy({"src/_data/books.csv": "cms/data/books.csv"});
```

### CSV Data Loading
Global data loading works perfectly:
```javascript
eleventyConfig.addGlobalData("books", async () => {
  const csvPath = path.join(__dirname, "src/_data/books.csv");
  const bookData = await CSVHandler.readBooks(csvPath);
  return bookData;
});
```

### Template Processing
All Nunjucks templates, filters, and shortcodes work as expected.

### Book Page Generation
Dynamic page generation from CSV data continues to work:
```javascript
eleventyConfig.addCollection("allBooks", function(collectionApi) {
  // Processes 1500+ books successfully
});
```

## Migration Timeline

**Date**: November 23, 2025

**Events**:
1. Multiple GitHub Actions builds failing with Eleventy v3 errors
2. Identified Node version incompatibility (was using Node 18)
3. Upgraded workflow to Node 22
4. Build still failed due to Tailwind plugin
5. Disabled Tailwind plugin
6. Successful build and deployment

**Commits**:
- `3d4b79d` - Fix: Upgrade GitHub Actions to Node 22 for Eleventy v3
- `ae53304` - Fix: Disable Tailwind plugin incompatible with Eleventy v3

## Future Considerations

### When Tailwind Plugin Updates

If `eleventy-plugin-tailwindcss` releases v3-compatible version:

1. Update the plugin:
   ```bash
   npm update eleventy-plugin-tailwindcss
   ```

2. Re-enable in `.eleventy.js`:
   ```javascript
   const eleventyTailwind = require("eleventy-plugin-tailwindcss");
   eleventyConfig.addPlugin(eleventyTailwind, {
     src: "src/assets/css/input.css",
     dest: "_site/assets/css",
     keepFolderStructure: false,
     minify: true,
   });
   ```

3. Test locally before deploying:
   ```bash
   npm run build
   ```

### Converting to ESM

If you want to fully embrace Eleventy v3's ESM-first approach:

1. Rename `.eleventy.js` → `.eleventy.mjs`
2. Add to package.json: `"type": "module"`
3. Convert all `require()` to `import`
4. Update all `.js` scripts to use ESM syntax
5. Test thoroughly

**Pros**:
- More future-proof
- Better tree-shaking
- Modern JavaScript

**Cons**:
- Breaking change for all scripts
- Requires updating all Node scripts
- More complex migration

## Testing Checklist

After Eleventy version changes, test:

- [ ] Local build succeeds: `npm run build`
- [ ] Development server works: `npm start`
- [ ] All 1500+ book pages generate
- [ ] CSS files copy correctly
- [ ] Images load properly
- [ ] Search data (books.csv) copies to `_site/cms/data/`
- [ ] GitHub Actions workflow succeeds
- [ ] Live site deploys correctly
- [ ] Cloudflare cache purges successfully

## Resources

- [Eleventy v3 Upgrade Guide](https://www.11ty.dev/docs/v3-upgrade-guide/)
- [Node.js ESM Support](https://nodejs.org/api/esm.html)
- [GitHub Actions Node Setup](https://github.com/actions/setup-node)

## Contact

If you encounter issues with Eleventy v3 that aren't covered here, check:
1. Eleventy GitHub issues
2. Eleventy Discord community
3. This project's GitHub issues
