# Book Page Generation Tool

This document describes the automated book page generation system for the Hudson Street Library website.

## Overview

The `generate-book-pages.js` script automatically creates individual book detail pages from the main CSV database using a standardized HTML template.

## Files

- **Script**: `generate-book-pages.js` (root directory)
- **Template**: `_site/books/templates/BOOK-TEMPLATE/index.html`
- **Data Source**: `src/_data/books.csv`
- **Output Directory**: `_site/books/`

## Features

### Automated Page Generation
- Creates one page per book from CSV data
- Generates URL-friendly directory names (slugs)
- Handles NULL values gracefully
- Processes 1300+ books in seconds

### Data Mapping
The script maps CSV fields to the HTML template:

| CSV Field | Template Element |
|-----------|------------------|
| title | Page title, H1, breadcrumb |
| author_full_name | Author byline |
| author_last | Directory slug, author references |
| publisher | Publisher name with optional link |
| publisher_url | Publisher link (if available) |
| publication_year | Publication date |
| isbn_asin | ISBN, image filename |
| height_cm, width_cm, depth_cm | Dimensions |
| binding | Format (Hardcover, Softcover, etc.) |
| page_count | Page count |
| edition_printrun | Edition information |
| editor | Editor (Contributors section) |
| contributors | Additional contributors |
| designer | Designer (Contributors section) |
| description | Book description |
| tags | Subject tags (max 7) |
| collection_grouping | Collection link |
| classification | Library classification |
| is_signed_inscribed | Special notes |

### Smart Handling
- **NULL values**: Filtered out from dimensions, contributors
- **Missing data**: Displays "Not specified" instead of empty fields
- **Publisher links**: Automatically creates clickable links when URL available
- **Image filenames**: Generated following the pattern: `Author_Title_ISBN.jpg`
- **Subject tags**: Limited to 7 tags with search links
- **Signed copies**: Automatically noted in special notes section

### URL Structure
Books are accessible at: `/books/{author}_{title}/index.html`

Example:
- Book: "Documenting Science" by Berenice Abbott
- URL: `/books/abbott_documenting_science/index.html`

## Usage

### Basic Usage
```bash
node generate-book-pages.js
```

### Requirements
```bash
npm install csv-parser
```

### Output
The script will:
1. Read all books from `src/_data/books.csv`
2. Load the template from `_site/books/templates/BOOK-TEMPLATE/`
3. Generate individual HTML files in `_site/books/{slug}/index.html`
4. Report progress every 50 books
5. Display final success/error count

### Example Output
```
Starting book page generation...
Reading CSV from: /Users/imac/Projects/Hudson_Street_Library/src/_data/books.csv
Reading template from: /Users/imac/Projects/Hudson_Street_Library/_site/books/templates/BOOK-TEMPLATE/index.html
Output directory: /Users/imac/Projects/Hudson_Street_Library/_site/books
Template loaded successfully.

Processed 1306 books from CSV.
Progress: 50/1306 books processed...
Progress: 100/1306 books processed...
...

=== Generation Complete ===
✓ Successfully generated: 1306 pages

Book pages created in: /Users/imac/Projects/Hudson_Street_Library/_site/books
```

## Template Customization

To modify the book page layout:

1. Edit `_site/books/templates/BOOK-TEMPLATE/index.html`
2. Use placeholders like `[BOOK TITLE]`, `[AUTHOR NAME]`, etc.
3. Re-run the generation script to apply changes to all pages

### Template Placeholders
- `[BOOK TITLE]` - Book title
- `[AUTHOR NAME]` - Full author name
- `[AUTHOR]` - Author last name
- `[FILENAME].jpg` - Cover image filename
- `[Publisher Name]` - Publisher name
- `[Date]` - Publication year
- `[ISBN]` - ISBN/ASIN
- `[Format]` - Binding format
- `[Dimensions]` - Formatted dimensions
- `[Number] pages` - Page count
- `[Edition info]` - Edition/print run
- `[COLLECTION-SLUG]` - Collection URL slug
- `[Collection Name]` - Collection name
- `[Classification]` - Library classification

## Maintenance

### Adding New Books
1. Add book data to `src/_data/books.csv`
2. Run `node generate-book-pages.js`
3. New pages will be generated automatically

### Updating Existing Books
1. Edit book data in `src/_data/books.csv`
2. Run `node generate-book-pages.js`
3. Pages will be regenerated with updated data

### Template Updates
1. Modify `_site/books/templates/BOOK-TEMPLATE/index.html`
2. Run `node generate-book-pages.js`
3. All 1300+ pages will use the new template

## Technical Details

### Directory Naming
Directories are created using URL-friendly slugs:
- Lowercase conversion
- Spaces replaced with underscores
- Special characters removed
- Format: `{author_last}_{title}`

### Image Filename Convention
Images are expected at: `/assets/images/books/{Author}_{Title}_{ISBN}.jpg`

Example: `Abbott_Documenting_Science_9783869304311.jpg`

### Performance
- Processes 1300+ books in ~3-5 seconds
- Progress updates every 50 books
- Handles errors gracefully without stopping

## Sections Included in Each Page

1. **Header** - Site navigation
2. **Breadcrumb** - Navigation path
3. **Book Cover** - Large cover image
4. **Collection Links** - Links to related collections
5. **Availability Badge** - Status indicator
6. **Publishing Details** - Publisher, date, ISBN, format, dimensions, pages, language, edition
7. **Contributors** - Editor, contributors, designer (if applicable)
8. **About This Book** - Full description
9. **Library Information** - Location, classification, acquisition, condition, special notes
10. **Subject Tags** - Searchable topic tags (max 7)
11. **Footer** - Site footer

## Future Enhancements

Potential improvements:
- [ ] Related books by author section (requires additional queries)
- [ ] Related books by subject (requires additional queries)
- [ ] Availability status from database
- [ ] User reviews/ratings
- [ ] Social sharing features
- [ ] Print/export options

## Troubleshooting

### Missing csv-parser
```bash
npm install csv-parser
```

### Template Not Found
Ensure `_site/books/templates/BOOK-TEMPLATE/index.html` exists

### CSV Not Found
Ensure `src/_data/books.csv` exists and is readable

### Permission Issues
Ensure write permissions for `_site/books/` directory

## Notes

- The script creates directories if they don't exist
- Existing pages are overwritten on regeneration
- NULL/empty values are handled gracefully
- Progress is logged every 50 books
- Errors are logged but don't stop processing
