# Hudson Street Library - Book Page Template & Guidelines

## Current Book Page Structure

### Layout
- **Left Column**: Book cover image with collection links
- **Right Column**: Book details in organized sections

### Section Order (Final Format)
1. **Title & Author** (Header)
2. **Publishing Details**
   - Publisher (with link if available)
   - Publication Date
   - ISBN
   - Format
   - Dimensions
   - Pages
   - ~~Price~~ (removed - library doesn't display pricing)

3. **About This Book** (Description/Summary)
   - 1-3 paragraphs describing the book's content
   - Historical/cultural context
   - Significance to the collection

4. **Other Books by [Author] in Our Collection**
   - Related titles by the same author
   - Brief descriptions
   - Links to book pages (when available)

5. **Library Information**
   - Location: Hudson Street Library, NYC
   - Classification
   - Acquisition status/date

6. **Subject Tags** (Last section)
   - 3-7 relevant tags (keep minimal)
   - Each tag links to search with filter: `../static-demo.html?tag=TagName`
   - Focus on searchable, meaningful categories

## Potential Additional Fields to Consider

### Essential Additions
1. **Contributors/Credits**
   - Editor(s)
   - Translator(s)
   - Introduction/Foreword by
   - Designer
   - Photographer(s) featured

2. **Edition Information**
   - Edition number (1st, 2nd, etc.)
   - Print run size (if limited)
   - Special edition details
   - Previous editions

3. **Language**
   - Primary language
   - Additional languages included
   - Bilingual/multilingual notation

### Nice-to-Have Additions
4. **Table of Contents/Chapters**
   - Major sections or essays
   - Contributing authors per chapter
   - Page ranges

5. **Related Books by Subject**
   - Similar books in collection (not by same author)
   - "If you like this, you might also like..."
   - Limited to 3-4 suggestions

6. **Exhibition/Award History**
   - Related exhibitions
   - Awards received
   - Critical recognition

7. **Availability Status**
   - Available for viewing
   - On loan
   - Reference only
   - Digital version available

8. **Condition Notes**
   - First edition
   - Signed/inscribed
   - Library stamps
   - Condition rating

9. **Research/Academic Use**
   - Cited in publications
   - Academic subject areas
   - Research collection designation

10. **Media/Press**
    - Reviews or press mentions
    - Featured in publications
    - Exhibition catalogs

## Tag Guidelines

### Keep Tags Minimal (3-7 per book)
- Focus on searchable categories
- Avoid overly specific tags
- Consider tag hierarchies:
  - Broad: Photography
  - Medium: Documentary Photography  
  - Specific: Street Photography

### Standard Tag Categories
- **Medium**: Photography, Artist Books, Zines
- **Subject**: Fashion, Architecture, Portrait, Landscape
- **Era**: 1960s, Contemporary, Victorian
- **Geographic**: New York, Japan, Paris
- **Cultural**: LGBTQ+, Black Artists, Women Artists
- **Movement**: Conceptual Art, Surrealism, Documentary

## CSS Classes for Styling

```css
.detail-section-title    /* Section headers */
.details-label          /* Field labels */
.subject-tag           /* Clickable tags */
.collection-link       /* Links to collections */
.prose                /* Text content blocks */
```

## Implementation Notes

1. **Mobile Responsive**: All sections stack vertically on mobile
2. **Accessibility**: Proper heading hierarchy, alt text for images
3. **Links**: 
   - Publisher links open in new tab
   - Collection links are relative
   - Tag links include query parameters
4. **Images**: Book covers should be in `imgs/books/` directory
5. **File Naming**: Use format `Author_Last-Book_Title.html`

## Example Usage

For a new book page:
1. Copy an existing book page as template
2. Update all fields with new book information
3. Keep "About This Book" concise but informative
4. Select 3-7 most relevant tags
5. Link to related books by same author
6. Include publisher link if available
7. Place in both `/books/` and `/_site/books/` directories