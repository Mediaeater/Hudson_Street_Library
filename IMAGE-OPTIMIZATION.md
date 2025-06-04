# Image Optimization System

Hudson Street Library now includes a comprehensive image optimization system using `@11ty/eleventy-img` that automatically generates responsive images in multiple formats and sizes.

## Features

- ✅ **Multiple formats**: WebP (modern) and JPEG (fallback)
- ✅ **Responsive sizes**: 300px, 600px, 900px, 1200px widths
- ✅ **Lazy loading**: Images load only when needed
- ✅ **Modern markup**: Uses `<picture>` elements with proper srcset
- ✅ **Performance optimized**: Automatic file size optimization
- ✅ **Accessibility**: Built-in alt text and semantic markup

## Usage

### Basic Image Shortcode

```njk
{% image "src/assets/images/books/cover.jpg", "Book cover description", "(min-width: 768px) 50vw, 100vw", "css-class-name" %}
```

**Parameters:**
- `src`: Path to the source image
- `alt`: Alt text for accessibility
- `sizes`: Responsive sizes attribute (optional, defaults to "100vw")
- `className`: CSS classes to apply (optional)

### Thumbnail Shortcode

```njk
{% thumbnail "src/assets/images/books/cover.jpg", "Book cover description", "thumbnail-class" %}
```

Generates small thumbnails (150px, 300px) optimized for quick loading.

## Components

### Optimized Image Component

```njk
{% include "components/optimized-image.njk", 
   src: "src/assets/images/photo.jpg", 
   alt: "Description", 
   className: "w-full rounded-lg" %}
```

### Book Thumbnail Component

```njk
{% include "components/book-thumbnail.njk", 
   src: "src/assets/images/books/cover.jpg", 
   title: "Book Title", 
   author: "Author Name" %}
```

### Collection Hero Component

```njk
{% include "components/collection-hero.njk", 
   image: "src/assets/images/collections/hero.jpg", 
   title: "Collection Name", 
   description: "Collection description" %}
```

## Generated Output

The system automatically creates:

### Optimized Images
- Location: `_site/assets/images/optimized/`
- Formats: WebP and JPEG
- Sizes: 300w, 600w, 900w, 1200w
- Naming: `filename-WIDTH.FORMAT`

### Thumbnails
- Location: `_site/assets/images/thumbnails/`
- Formats: WebP and JPEG
- Sizes: 150w, 300w
- Naming: `filename-thumb-WIDTH.FORMAT`

## Performance Benefits

1. **Faster loading**: Smaller file sizes and modern formats
2. **Responsive design**: Right-sized images for each device
3. **Bandwidth savings**: WebP format can be 25-35% smaller
4. **Better user experience**: Lazy loading and no layout shift
5. **SEO improvement**: Faster page loads improve rankings

## Image Organization

### Recommended Structure

```
src/assets/images/
├── books/              # Book covers and related images
├── collections/        # Collection hero images
├── news/              # News and article images
├── site/              # Site branding and UI images
└── [collection-name]/ # Collection-specific images (e.g., comme/, posters/)
```

### Supported Formats

- **Input**: JPEG, PNG, WebP, AVIF, TIFF, GIF
- **Output**: WebP (primary), JPEG (fallback)

## Best Practices

### 1. Source Image Quality
- Use high-resolution source images (at least 1200px wide)
- Ensure good image quality before optimization
- Use descriptive filenames

### 2. Alt Text
- Always provide meaningful alt text
- Describe the content, not the appearance
- Keep it concise but descriptive

### 3. Responsive Sizing
- Use appropriate `sizes` attribute for responsive images
- Consider your layout when setting sizes
- Test on multiple devices

### 4. File Organization
- Keep images organized by type/collection
- Use consistent naming conventions
- Remove unused images regularly

## Examples

### Book Cover in Collection

```njk
<article class="book-card">
  {% include "components/book-thumbnail.njk", 
     src: "src/assets/images/books/ken-schles-invisible-city.png",
     title: "Invisible City",
     author: "Ken Schles" %}
</article>
```

### Collection Hero Section

```njk
{% include "components/collection-hero.njk",
   image: "src/assets/images/collections/nyc-hero.jpg",
   title: "NYC Photobooks",
   description: "Documenting the visual culture of New York City through photography books." %}
```

### Responsive Gallery Image

```njk
<div class="gallery-item">
  {% image "src/assets/images/exhibitions/photo.jpg", 
           "Exhibition photograph", 
           "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
           "w-full rounded-lg shadow-md" %}
</div>
```

## Migration Notes

When updating existing pages to use the new image system:

1. Replace `<img>` tags with `{% image %}` shortcodes
2. Update image paths to point to `src/assets/images/`
3. Add appropriate alt text and sizing
4. Test responsive behavior
5. Remove old unoptimized images after migration

## Performance Testing

After implementing image optimization, you should see:

- Lighthouse Performance scores > 90
- Faster First Contentful Paint
- Reduced Cumulative Layout Shift
- Lower bandwidth usage

Test your pages with:
- Google PageSpeed Insights
- Lighthouse DevTools
- WebPageTest

---

*The image optimization system makes Hudson Street Library faster, more accessible, and provides a better user experience across all devices.*