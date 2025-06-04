# News System Documentation
Hudson Street Library - JSON-based News Implementation

## Overview

The news system is a lightweight, static solution that uses JSON data files and Eleventy templates to manage and display news/updates without requiring a database or CMS.

## Architecture

### Data Storage
- **Location**: `_data/news.json`
- **Format**: JSON array of news objects
- **Auto-loaded**: Eleventy automatically makes this available as `news` variable in templates

### Templates
- **News Page**: `news.njk` → generates `news.html`
- **Homepage Section**: Inline in `index.html`

## Data Structure

Each news item in `_data/news.json` has the following fields:

```json
{
  "id": 1,                    // Unique identifier (required)
  "date": "2024-12-15",      // ISO date format YYYY-MM-DD (required)
  "title": "Article Title",   // Display title (required)
  "excerpt": "Brief summary", // Short description for lists (required)
  "content": "Full article",  // Complete article text (required)
  "image": "/imgs/path.jpg",  // Optional image path (null if none)
  "category": "acquisitions", // Category type (required)
  "featured": true           // Boolean for featured status (required)
}
```

### Categories
Three predefined categories with color coding:
- `acquisitions` - Blue badges (new items added to collection)
- `collections` - Green badges (collection updates/features)  
- `announcements` - Yellow badges (general news/hours/events)

## How to Add News Items

### 1. Edit the Data File
Open `_data/news.json` and add a new object to the array:

```json
{
  "id": 7,
  "date": "2024-12-20",
  "title": "New Photography Books Acquired",
  "excerpt": "Five rare Japanese photography books from the 1960s have been added to our collection.",
  "content": "We're excited to announce the acquisition of five rare Japanese photography books from the 1960s. These include works by Daido Moriyama, Shomei Tomatsu, and Eikoh Hosoe. The books are now available for viewing by appointment.",
  "image": "/imgs/books/japanese-books.jpg",
  "category": "acquisitions",
  "featured": false
}
```

### 2. Add Images (Optional)
If including an image:
- Place image in appropriate `imgs/` subdirectory
- Use web-optimized formats (JPEG for photos, PNG for graphics)
- Recommended max width: 1200px
- Use relative paths starting with `/imgs/`

### 3. Rebuild the Site
```bash
cd /Users/m/Desktop/Hudson_Street_Library
npx @11ty/eleventy
```

### 4. Deploy
```bash
git add -A
git commit -m "Add news: [title]"
git push origin main
```

## Display Locations

### Homepage (`index.html`)
- Shows 3 most recent news items
- Located between Publications and Contact sections
- Displays: image, category, title, date, excerpt
- Links to full news page

### News Page (`news.html`)
- **Featured Section**: Items with `featured: true`
- **All Updates**: Complete list sorted by date (newest first)
- **Modal Popup**: Click "Read more" to view full content

## Customization Guide

### Adding New Categories
1. Add category badge style in `news.njk`:
```css
.category-yourcategory { 
  background-color: #color; 
  color: #textcolor; 
}
```

2. Use the new category in news items:
```json
"category": "yourcategory"
```

### Changing Display Count on Homepage
Edit line in `index.html` (currently shows 3):
```html
<!-- News Grid -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
```

### Modifying Date Format
The template currently shows raw dates. To format dates, you'll need to:
1. Add a date filter to Eleventy config
2. Or format dates in the JSON file as display strings

### Styling Changes
- **Colors**: Modify Tailwind classes in templates
- **Layout**: Adjust grid classes (`grid-cols-*`)
- **Badges**: Edit `.category-badge` styles
- **Modal**: Modify `#article-modal` styles

## File Structure

```
Hudson_Street_Library/
├── _data/
│   └── news.json          # News data
├── news.njk               # News page template
├── index.html             # Homepage with news section
└── _site/
    └── news.html          # Generated news page
```

## Best Practices

1. **IDs**: Always increment from the highest existing ID
2. **Dates**: Use ISO format (YYYY-MM-DD) for proper sorting
3. **Images**: 
   - Optimize for web before uploading
   - Use consistent naming convention
   - Store in relevant `imgs/` subdirectory
4. **Content**: 
   - Keep excerpts under 150 characters
   - Use full sentences in content field
   - Include all relevant details in full content
5. **Featured Items**: Limit to 2-3 at a time

## Troubleshooting

### News not appearing
1. Check JSON syntax (validate at jsonlint.com)
2. Ensure all required fields are present
3. Rebuild site with `npx @11ty/eleventy`
4. Check browser cache (hard refresh)

### Build errors
- Most common: Missing commas between JSON objects
- Check for proper quotes around strings
- Ensure no trailing commas after last item

### Images not loading
- Verify path starts with `/imgs/`
- Check file exists in specified location
- Ensure proper file extension (.jpg, .png, etc.)

## Maintenance Schedule

Recommended maintenance:
- **Weekly**: Add new acquisitions/updates
- **Monthly**: Review and unfeature old items
- **Quarterly**: Archive old news (move to separate archive.json if needed)

## Future Enhancements

Possible improvements:
1. Add RSS feed generation
2. Implement pagination for news page
3. Add search/filter functionality
4. Create news archive page
5. Add social media sharing buttons
6. Implement email newsletter integration

## Technical Notes

- The system uses Nunjucks templating
- No database required (fully static)
- Builds with Eleventy 3.0+
- Mobile-responsive design
- Accessible markup (semantic HTML)
- Performance: Lazy load images if list grows large

---

Last updated: December 2024
Created by: Claude (Anthropic)