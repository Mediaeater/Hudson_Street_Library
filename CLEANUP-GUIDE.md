# Hudson Street Library - Cleanup Guide

## Directories to Keep

### ✅ Keep These:
1. **Root directory files** - All HTML files, imgs/, collections/
2. **`/cms`** - Your working Directus CMS setup
3. **`/js`** - JavaScript files for CMS integration
4. **`config.js`** - New centralized configuration

### ❓ Optional (Keep for future use):
1. **`/frontend`** - Next.js app (could be useful for future upgrade)
   - Modern React-based frontend
   - Better performance and SEO
   - Not currently used

### ❌ Can be Removed:
1. **`/hudson-library-cms`** - Duplicate/incomplete CMS setup
   - Only contains empty directories
   - No unique content

## Cleanup Commands

To remove unnecessary directories:

```bash
# Remove the duplicate CMS directory
rm -rf hudson-library-cms/

# If you decide not to use Next.js frontend:
# rm -rf frontend/
```

## After Cleanup

Your project structure should be:
```
Hudson_Street_Library/
├── index.html              # Main site
├── collection-explore.html # Collections page
├── recently-added.html     # Recent additions
├── book_page_template.html # Book detail template
├── config.js              # Centralized config
├── collections/           # Individual collection pages
├── imgs/                  # Images
├── js/                    # JavaScript files
├── cms/                   # Directus CMS
└── frontend/             # (Optional) Next.js app
```

## Next Steps

1. **Deploy Directus to production**
2. **Update config.js** with production URLs
3. **Test everything works** with the new configuration