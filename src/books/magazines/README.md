# Magazine Issue Pages

This directory stores individual HTML detail pages for magazine issues.

## Structure

```
magazines/
  afm/                    # AFM Magazine issue pages
  apartamento/            # Apartamento Magazine issue pages
  le-petit-voyeur/        # Le Petit Voyeur issue pages
  purple-magazine/        # Purple Magazine/Fashion issue pages
  purple-mag-book-inserts/ # Purple book supplement pages
  record-culture/         # Record Culture issue pages
  slanted/                # Slanted Magazine issue pages
  toilet-paper/           # Toilet Paper Magazine issue pages
  useful-photography/     # Useful Photography issue pages
```

## Naming Convention

Issue pages follow this pattern:
- `[magazine-name]-[issue-number].html` (e.g., `apartamento-36.html`)
- `issue-[number].html` (e.g., `issue-7.html`)

## Related Directory

**This directory works with `src/assets/images/magazines/`**

| This directory | Partner directory |
|----------------|-------------------|
| `src/books/magazines/` | `src/assets/images/magazines/` |
| Stores issue detail pages (.html) | Stores cover images (.jpg, .gif) |

When adding a new magazine:
1. Create a subdirectory here for HTML pages
2. Create a matching subdirectory in `src/assets/images/magazines/` for covers

Reference cover images in HTML using: `/assets/images/magazines/[magazine]/[filename]`

Keep subdirectory names identical in both locations.

## Collection Pages

Magazine collection landing pages live in `src/collections/`:
- `magazines.html` - Main magazines index
- `apartamento.html` - Apartamento collection page
- `purple-magazine.html` - Purple Magazine collection page
- etc.

These collection pages link to the individual issue pages in this directory.
