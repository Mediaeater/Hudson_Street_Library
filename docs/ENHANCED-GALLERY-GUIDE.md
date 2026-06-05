# Enhanced Gallery View - Integration Guide

The enhanced gallery CSS transforms the book browsing experience into a museum-quality presentation with:

- **Architectural framing** - Each book cover gets mat-board framing like gallery art
- **Sophisticated shadows** - Multi-layer shadows create depth and hierarchy
- **Refined hover states** - Smooth lifts and scale transitions
- **Asymmetric grid option** - Visual rhythm through varied sizing
- **Featured book hero** - Spotlight special selections

## Quick Start

### 1. Add the Enhanced CSS

In your HTML `<head>`:

```html
<link rel="stylesheet" href="/assets/css/browse-enhanced.css">
```

### 2. Use the Enhanced Grid

Replace your existing `.visual-grid` with `.visual-grid-enhanced`:

```html
<div class="visual-grid-enhanced">
    {% for book in books %}
    <a href="/books/{{ book.id }}/" class="gallery-book-card">
        <div class="gallery-cover-frame">
            <img src="{{ book.coverPath }}" 
                 alt="{{ book.title }}"
                 loading="lazy">
        </div>
        <div class="gallery-book-title">{{ book.title }}</div>
        <div class="gallery-book-author">{{ book.author }}</div>
        <div class="gallery-book-year">{{ book.year }}</div>
    </a>
    {% endfor %}
</div>
```

## Grid Variants

### Standard Gallery Grid
```html
<div class="visual-grid-enhanced">
    <!-- Book cards -->
</div>
```
- Uniform sizing
- 220-260px columns (responsive)
- 3.5rem gap on desktop
- Museum mat-board framing

### Asymmetric Grid
```html
<div class="visual-grid-asymmetric">
    <!-- Book cards -->
</div>
```
- Variable column spans (2-5 columns)
- Creates visual rhythm
- 7-item repeating pattern
- Automatically falls back to uniform on mobile

## Featured Book Hero

Spotlight a special book at the top:

```html
<div class="featured-book-hero">
    <div class="featured-cover-container">
        <div class="featured-cover">
            <img src="/path/to/cover.jpg" alt="Book cover">
        </div>
    </div>
    <div class="featured-book-content">
        <div class="featured-label">Featured Selection</div>
        <h2 class="featured-book-title">Book Title Here</h2>
        <div class="featured-book-author">Author Name</div>
        <div class="featured-book-meta">
            Publisher · Year · Format
        </div>
        <p class="featured-book-description">
            Description text...
        </p>
        <a href="/books/id/" class="featured-book-link">View Book</a>
    </div>
</div>
```

## Section Headers

Gallery-style section headers:

```html
<div class="gallery-section-header">
    <div class="gallery-section-label">Category</div>
    <h1 class="gallery-section-title">Section Title</h1>
</div>
```

## View Toggle

Let users switch between grid styles:

```html
<div class="view-toggle">
    <button class="view-toggle-btn active" onclick="switchView('gallery')">
        Gallery Grid
    </button>
    <button class="view-toggle-btn" onclick="switchView('asymmetric')">
        Asymmetric
    </button>
</div>

<script>
function switchView(view) {
    const grid = document.getElementById('bookGrid');
    if (view === 'asymmetric') {
        grid.className = 'visual-grid-asymmetric';
    } else {
        grid.className = 'visual-grid-enhanced';
    }
    
    // Update active button
    document.querySelectorAll('.view-toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}
</script>
```

## Loading States

Show skeleton loaders while content loads:

```html
<div class="visual-grid-enhanced">
    {% for i in range(12) %}
    <div class="gallery-card-skeleton"></div>
    {% endfor %}
</div>
```

## Integration with Existing Code

### In static-demo.html

Find the existing visual grid section (around line 340):

```html
<!-- OLD -->
<div class="visual-grid">
    <div class="visual-card">
        <div class="visual-cover">
            <img src="...">
        </div>
        <div class="visual-title">...</div>
        <div class="visual-author">...</div>
    </div>
</div>
```

Replace with:

```html
<!-- NEW -->
<div class="visual-grid-enhanced">
    <a href="..." class="gallery-book-card">
        <div class="gallery-cover-frame">
            <img src="...">
        </div>
        <div class="gallery-book-title">...</div>
        <div class="gallery-book-author">...</div>
        <div class="gallery-book-year">...</div>
    </a>
</div>
```

### CSS Load Order

```html
<head>
    <!-- Base design system -->
    <link rel="stylesheet" href="/assets/css/design-system.css">
    
    <!-- Enhanced gallery (load after base) -->
    <link rel="stylesheet" href="/assets/css/browse-enhanced.css">
</head>
```

## Responsive Behavior

The enhanced grid automatically adapts:

- **Mobile (< 768px)**: 
  - 2 columns
  - Reduced gaps (1.5rem)
  - Asymmetric grid becomes uniform
  
- **Tablet (768px - 1024px)**:
  - 3-4 columns
  - 2.5rem gaps
  
- **Desktop (1024px+)**:
  - 4-5 columns
  - 3rem gaps
  - Full asymmetric patterns

## Performance Tips

1. **Use `loading="lazy"` on images**:
   ```html
   <img src="..." alt="..." loading="lazy">
   ```

2. **Implement intersection observer** for progressive loading:
   ```javascript
   const imageObserver = new IntersectionObserver((entries) => {
       entries.forEach(entry => {
           if (entry.isIntersecting) {
               const img = entry.target;
               img.src = img.dataset.src;
               imageObserver.unobserve(img);
           }
       });
   });
   ```

3. **Optimize cover images**:
   - Target size: 800x1067px (3:4 ratio)
   - Format: WebP with JPG fallback
   - Quality: 80-85%

## Accessibility

The enhanced grid maintains accessibility:

- ✓ Keyboard navigation (focus states)
- ✓ Screen reader friendly (semantic HTML)
- ✓ Reduced motion support (no animations when `prefers-reduced-motion`)
- ✓ Color contrast compliant (WCAG AA)
- ✓ Print-friendly styles

## Browser Support

- ✓ Chrome/Edge 90+
- ✓ Firefox 88+
- ✓ Safari 14+
- ✓ Mobile browsers (iOS 14+, Android 90+)

Uses modern CSS:
- CSS Grid (with fallbacks)
- CSS custom properties
- aspect-ratio (with fallback)
- clamp() for fluid typography

## Examples

See `/browse-gallery-demo/` for a live demo with:
- Featured book hero
- Toggle between grid styles
- Loading skeletons
- Responsive behavior

## Design Rationale

### Why Architectural Framing?

The mat-board effect (8% padding + white background + inset shadow) creates:
1. **Visual separation** - Each book is clearly defined
2. **Gallery aesthetic** - Matches museum presentation
3. **Focus** - White frame draws eye to cover art
4. **Depth** - Multi-layer shadows create hierarchy

### Why Asymmetric Grid?

Variable column spans (2-5 columns in 7-item pattern):
1. **Visual rhythm** - Avoids monotonous uniformity
2. **Emphasis** - Larger cards naturally draw attention
3. **Browsability** - Eye travels through varied sizes
4. **Editorial feel** - Magazine-style curation

### Why Large Hover Lifts?

8px translateY on hover:
1. **Tactile feedback** - Clear interaction signal
2. **Depth reinforcement** - Brings card "closer"
3. **Premium feel** - Smooth, substantial movement
4. **Accessibility** - Obvious focus indicator

## Color Palette

The enhanced gallery uses refined neutrals:

```css
--gallery-white: #ffffff     /* Pure white frames */
--gallery-mat: #F8F7F4       /* Warm paper background */
--gallery-shadow: rgba(10,10,10,0.15)  /* Soft shadows */
--accent-brown: #8B7355      /* Warm accent */
--ink: #0A0A0A              /* Deep black text */
```

## Customization

Override CSS variables for your brand:

```css
:root {
    --gallery-white: #fefefe;
    --accent-brown: #8B7355;
    /* ... */
}
```

Or target specific elements:

```css
.gallery-cover-frame {
    padding: 10%;  /* More generous mat */
}

.gallery-book-card:hover {
    transform: translateY(-12px);  /* Bigger lift */
}
```

## Migration Checklist

- [ ] Add `browse-enhanced.css` to your HTML
- [ ] Update grid class to `.visual-grid-enhanced`
- [ ] Update card structure (`.gallery-book-card`)
- [ ] Add loading states (optional)
- [ ] Test responsive behavior
- [ ] Verify accessibility (keyboard nav, screen readers)
- [ ] Check print styles
- [ ] Optimize images for new sizes

## Support

For questions or issues:
1. Check `/browse-gallery-demo/` for working examples
2. Review this guide's code snippets
3. Inspect the CSS in `/assets/css/browse-enhanced.css`
