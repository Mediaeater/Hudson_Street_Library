# Aggregate Views Documentation

## Overview

The Hudson Street Library now features clickable metadata that allows users to explore books by common attributes. When you click on any publisher, year, tag, or collection, you'll see all books that share that attribute.

## How It Works

### 1. Clickable Metadata

All book metadata is now interactive:
- **Publisher**: Click to see all books by that publisher
- **Year**: Click to see all books from that year  
- **Author**: Click to see all books by that author
- **Tags**: Click any tag to see all books with that tag
- **Collection**: Click to see all books in that collection

### 2. URL Parameters

The aggregate view uses URL parameters to filter content:
```
/aggregate-view.html?filter=publisher&value=Steidl
/aggregate-view.html?filter=year&value=2020
/aggregate-view.html?filter=tag&value=Photography
/aggregate-view.html?filter=collection&value=NYC%20Photobooks
```

### 3. Active Filter Display

When viewing an aggregate collection, a banner shows:
- What filter is active (e.g., "All books by Steidl")
- A button to clear the filter and return to all books

### 4. Features

- **Full Search**: Search within the filtered results
- **Additional Filters**: Apply more filters on top of the aggregate view
- **Sort Options**: Sort by title, author, year, or publisher
- **Visual Browse**: Toggle between detailed and grid views
- **Pagination**: Navigate through large result sets

## Implementation Details

### Files Modified/Created

1. **`/src/aggregate-view.html`**
   - New standalone page with enhanced filtering
   - Handles URL parameters for aggregate views
   - Includes clickable metadata in book cards

2. **`/src/_includes/components/book-thumbnail-enhanced.njk`**
   - Enhanced version of book thumbnail with clickable metadata
   - Displays tags with links
   - Shows publisher, year, and collection as clickable elements

3. **`/src/_includes/components/site-header.njk`**
   - Updated navigation to point to aggregate-view.html

### JavaScript Functions

Key functions in aggregate-view.html:

- `checkUrlParams()`: Reads URL parameters and sets initial filter
- `navigateToAggregate()`: Handles navigation to filtered views
- `showActiveFilter()`: Displays the active filter banner
- `renderBookCard()`: Enhanced to make all metadata clickable

### CSS Classes

- `.clickable-meta`: Styles for clickable metadata elements
- `.tag-pill`: Styles for tag buttons
- Hover effects on all interactive elements

## Usage Examples

### From Book Cards
1. View any book in the search results
2. Click on the publisher name → See all books by that publisher
3. Click on a tag → See all books with that tag
4. Click on the year → See all books from that year

### Direct URLs
You can also create direct links to aggregate views:
```html
<a href="/aggregate-view.html?filter=tag&value=NYC">NYC Books</a>
<a href="/aggregate-view.html?filter=year&value=2021">2021 Releases</a>
<a href="/aggregate-view.html?filter=publisher&value=MACK">MACK Books</a>
```

## Future Enhancements

1. **Multiple Filters**: Allow combining filters (e.g., NYC + 2020)
2. **Tag Cloud**: Visual representation of popular tags
3. **Statistics**: Show counts for each aggregate view
4. **Saved Searches**: Allow users to bookmark aggregate views
5. **Export**: Export filtered results as CSV or PDF