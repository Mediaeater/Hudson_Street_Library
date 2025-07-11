# Books Directory Structure

This directory organizes books by curated collections and provides scalable structure for growth.

## Directory Structure

```
src/books/
├── collections/           # Books organized by curated collections
│   ├── art/              # Art Books Collection
│   ├── black-photographers/  # Black Photographers
│   ├── books-on-books/   # Books on Books
│   ├── collage/          # Collage Collections
│   ├── ephemera/         # Ephemera
│   ├── fashion/          # Fashion (general and subdirectories)
│   │   ├── comme-des-garcons/ # Comme des Garçons Related
│   │   └── matsuda-fashion/  # Matsuda Fashion Catalogs
│   ├── music-photobooks/ # Music Photobooks
│   ├── music/            # Music (general)
│   ├── nyc/              # NYC Photobooks
│   ├── posters-and-paper/ # Posters and Paper
│   ├── queer/            # Queering the Collection
│   ├── recently-added/   # Recently Added
│   ├── small-books-big-images/ # Small Books Big Images
│   └── woman-viewing-woman/    # Woman Viewing Woman
├── alpha/                # Alphabetical organization for general books
│   ├── a-d/
│   ├── e-h/
│   ├── i-l/
│   ├── m-p/
│   ├── q-t/
│   └── u-z/
├── general/              # Uncategorized books
└── templates/            # Templates and disabled files
    ├── BOOK-TEMPLATE.html
    └── books.njk.disabled
```

## Adding New Books

### For Curated Collections
Place new books in the appropriate collection directory:
- Art book by new artist → `collections/art/Artist_Name-Book_Title.html`
- NYC photobook → `collections/nyc/Artist_Name-Book_Title.html`
- Queer-themed book → `collections/queer/Artist_Name-Book_Title.html`

### For General Collection
Use alphabetical organization:
- Author starts with A-D → `alpha/a-d/Author_Name-Book_Title.html`
- Author starts with E-H → `alpha/e-h/Author_Name-Book_Title.html`
- etc.

### For Uncategorized
Place in `general/` until proper categorization is determined.

## File Naming Convention
- Format: `Artist_FirstName_LastName-Book_Title.html`
- Spaces become underscores
- Hyphens separate artist from title
- Examples:
  - `Vince_Aletti-Physique.html`
  - `Ken_Schles-Invisible_City.html`

## Collection Links
When books are in the collections subdirectories, they need to reference collections with:
`../../../collections/collection-name.html`

## Template Usage
Use `templates/BOOK-TEMPLATE.html` as the starting point for new book pages.

## Search and Discovery Features

### Clickable Metadata
All book metadata is now interactive. Users can click on:
- **Publisher** - See all books by that publisher
- **Year** - See all books from that year
- **Author** - See all books by that author
- **Tags** - See all books with that tag
- **Collection** - See all books in that collection

### Aggregate Views
The new aggregate view system (`/aggregate-view.html`) provides:
- URL parameter-based filtering (e.g., `?filter=publisher&value=Steidl`)
- Active filter display with clear button
- Full search within filtered results
- Additional filtering on top of aggregate views
- Visual browse mode for image-focused exploration

### Tag Analysis
Current tag coverage statistics:
- Only 241 books (18.5%) have tags
- 154 unique tags identified
- Top tags: Photography (11), NYC (11), Fashion (6)
- Tag analysis reports available in `/tag-analysis/`

### Book Cover Status
- 757 books have covers (56.8% coverage)
- Covers acquired from free APIs (Open Library, Google Books, DPLA, Archive.org)
- Cover acquisition scripts available in project root
- Missing covers use placeholder SVG