# Magazine Cover Images

This directory stores cover images for magazine issues.

## Structure

```
magazines/
  afm/                    # AFM Magazine covers
  apartamento/            # Apartamento Magazine covers
  le-petit-voyeur/        # Le Petit Voyeur covers
  purple-magazine/        # Purple Magazine/Fashion covers
  purple-mag-book-inserts/ # Purple book supplement covers
  record-culture/         # Record Culture covers
  slanted/                # Slanted Magazine covers
  toilet-paper/           # Toilet Paper Magazine covers
  useful-photography/     # Useful Photography covers
```

## Naming Convention

Cover images follow this pattern:
- `[magazine-name]-[issue-number].jpg` (e.g., `apartamento-36.jpg`)
- `[magazine-name]-[issue-number]-[season-year].jpg` (e.g., `purple-fashion-23-ss-2015.jpg`)

## Related Directory

**This directory works with `src/books/magazines/`**

| This directory | Partner directory |
|----------------|-------------------|
| `src/assets/images/magazines/` | `src/books/magazines/` |
| Stores cover images (.jpg, .gif) | Stores issue detail pages (.html) |

When adding a new magazine:
1. Create a subdirectory here for cover images
2. Create a matching subdirectory in `src/books/magazines/` for HTML pages

The HTML pages reference images using the path `/assets/images/magazines/[magazine]/[filename]`.

Keep subdirectory names identical in both locations.
