# News System - Quick Reference Guide

## Adding a News Item (5 minutes)

### 1. Open the news file
```
_data/news.json
```

### 2. Copy this template and add at the TOP of the array (after the opening `[`):
```json
{
  "id": 7,
  "date": "2024-12-20",
  "title": "Your Title Here",
  "excerpt": "Brief 1-2 sentence summary that appears in lists",
  "content": "Full article text. Can be multiple sentences. This appears in the popup modal when users click Read More.",
  "image": null,
  "category": "acquisitions",
  "featured": false
},
```

### 3. Update the fields:
- **id**: Increment from the highest existing ID
- **date**: Today's date in YYYY-MM-DD format
- **title**: Keep it concise
- **excerpt**: 150 characters or less
- **content**: Full details
- **image**: 
  - `null` for no image
  - `"/imgs/folder/filename.jpg"` for image
- **category**: Choose one:
  - `"acquisitions"` - New items (blue)
  - `"collections"` - Collection updates (green)
  - `"announcements"` - General news (yellow)
- **featured**: `true` or `false`

### 4. Save and rebuild:
```bash
cd /Users/m/Desktop/Hudson_Street_Library
npx @11ty/eleventy
```

### 5. Deploy:
```bash
git add -A
git commit -m "Add news: [title]"
git push origin main
```

## Common Examples

### New Book Acquisition
```json
{
  "id": 8,
  "date": "2024-12-21",
  "title": "Rare Daido Moriyama First Edition Acquired",
  "excerpt": "Original 1972 'Farewell Photography' added to our Japanese photography collection.",
  "content": "Hudson Street Library has acquired a first edition of Daido Moriyama's groundbreaking 'Farewell Photography' (1972). This rare volume features Moriyama's radical are-bure-boke (grainy, blurry, out-of-focus) aesthetic that redefined photography in post-war Japan. Available for viewing by appointment.",
  "image": "/imgs/books/moriyama-farewell.jpg",
  "category": "acquisitions",
  "featured": true
},
```

### Event Announcement
```json
{
  "id": 9,
  "date": "2024-12-22",
  "title": "Holiday Hours December 24-January 2",
  "excerpt": "Special holiday schedule and appointment availability.",
  "content": "Please note our holiday hours: Dec 24-25: Closed. Dec 31: By appointment only. Jan 1: Closed. Regular hours resume January 2, 2025. Research appointments can still be scheduled by emailing info@hudsonstreetlibrary.org.",
  "image": null,
  "category": "announcements",
  "featured": false
},
```

### Collection Feature
```json
{
  "id": 10,
  "date": "2024-12-23",
  "title": "Spotlight: Zine Collection Now Digitized",
  "excerpt": "Browse 200+ rare photography zines from the 1970s-1990s online.",
  "content": "Our complete zine collection is now digitized and searchable online. This collection includes rare self-published photography zines from the NYC underground scene, feminist photo collectives, and early LGBTQ+ publications. High-resolution scans are available for research purposes.",
  "image": "/imgs/zines/collection-hero.jpg",
  "category": "collections",
  "featured": true
},
```

## Tips

✅ **DO:**
- Keep excerpts short and engaging
- Include specific details in content
- Use high-quality, optimized images
- Feature time-sensitive news
- Check JSON syntax before saving

❌ **DON'T:**
- Leave trailing commas
- Forget to increment ID
- Use straight quotes in content (use curly quotes)
- Feature more than 3 items
- Include file:// paths for images

## Need Help?

- Full documentation: `NEWS-SYSTEM-DOCUMENTATION.md`
- JSON validator: https://jsonlint.com
- Site rebuild: `npx @11ty/eleventy`