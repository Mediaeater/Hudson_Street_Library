# Hudson Street Library Design System

## Core Design Principles

### Visual DNA
- **Clarity over ornament**: Prioritize hierarchy, whitespace, and typography
- **Restraint**: 1-2 accent colors max, limited shadows, purposeful rounded corners
- **Consistency**: Reuse tokens, spacing, and patterns throughout

## Design Tokens

### Spacing Scale
```
4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px
```

### Typography Scale
```
12px, 14px, 16px, 18px, 20px, 24px, 32px, 40px
Base: 16px
```

### Font Weights
```
400 (regular), 500 (medium), 600 (semibold)
```

### Border Radius
```
radius-sm: 8px
radius-md: 12px
radius-lg: 16px
radius-full: 9999px
```

### Color Palette
```css
/* Neutrals */
--neutral-50: #fafafa;
--neutral-100: #f5f5f5;
--neutral-200: #e5e5e5;
--neutral-300: #d4d4d4;
--neutral-400: #a3a3a3;
--neutral-500: #737373;
--neutral-600: #525252;
--neutral-700: #404040;
--neutral-800: #262626;
--neutral-900: #171717;

/* Primary (Teal) */
--primary-400: #2dd4bf;
--primary-500: #14b8a6;
--primary-600: #0d9488;
--primary-700: #0f766e;

/* Semantic */
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
```

### Shadows
```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0,0,0,0.06);
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);
```

### Borders
```css
--border: 1px solid rgba(0,0,0,0.08);
--border-dark: 1px solid rgba(0,0,0,0.12);
```

## Layout System

### Grid
- 12 columns
- Content max-width: 1200px
- Gutters: 24px
- Section padding: 48-64px desktop, 32-48px mobile

### Breakpoints
```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

## Component Specifications

### Buttons
```css
/* Base */
.btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 120ms ease-in-out;
  min-height: 44px;
}

/* Primary */
.btn-primary {
  background: var(--primary-600);
  color: white;
}
.btn-primary:hover {
  background: var(--primary-700);
}

/* Secondary */
.btn-secondary {
  border: 1px solid rgba(0,0,0,0.08);
  background: transparent;
}
.btn-secondary:hover {
  background: rgba(0,0,0,0.02);
}

/* Sizes */
.btn-sm { padding: 6px 12px; min-height: 36px; }
.btn-lg { padding: 12px 24px; min-height: 52px; }
```

### Inputs
```css
.input {
  padding: 8px 12px;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 8px;
  transition: all 120ms ease-in-out;
}
.input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 2px rgba(20, 184, 166, 0.1);
}
```

### Cards
```css
.card {
  background: white;
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 16px;
  padding: 24px;
}
```

### Navigation
```css
.nav-link {
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 120ms ease-in-out;
}
.nav-link:hover {
  background: rgba(0,0,0,0.02);
}
.nav-link.active {
  background: rgba(0,0,0,0.06);
  font-weight: 500;
}
```

## State Design

### Interactive States
- **Default**: Base state
- **Hover**: Subtle background or opacity change (120ms transition)
- **Focus**: 2px ring with offset, visible without color
- **Active**: Slightly darker/pressed appearance
- **Disabled**: Opacity 0.5, cursor not-allowed

### Loading States
- Use skeletons for content loading
- Spinners only for actions < 400ms
- Preserve layout to prevent jank

### Empty States
```html
<div class="empty-state">
  <h3>No results found</h3>
  <p>Try adjusting your filters or search terms</p>
  <button class="btn-primary">Clear filters</button>
</div>
```

## Motion Guidelines

### Timing
- Micro-interactions: 80-120ms
- Standard transitions: 120-200ms
- Page transitions: 200-300ms

### Easing
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Accessibility Requirements

### Core Requirements
- WCAG AA contrast (4.5:1 body, 3:1 large text)
- Keyboard navigation for all interactive elements
- Focus indicators visible without color
- Target sizes minimum 44×44px
- Form labels properly linked
- ARIA labels where needed

### Screen Reader Support
- Semantic HTML structure
- Live regions for async updates
- Skip links for navigation
- Alt text for all images

## Implementation Examples

### Clean Page Structure
```html
<div class="min-h-screen bg-neutral-50 text-neutral-900">
  <header class="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
    <div class="mx-auto max-w-6xl px-6 py-4">
      <!-- Header content -->
    </div>
  </header>

  <main class="mx-auto max-w-6xl px-6 py-10">
    <section class="grid gap-8">
      <!-- Main content -->
    </section>
  </main>
</div>
```

### Component Example
```html
<!-- Clean Card Component -->
<div class="rounded-2xl border bg-white p-6">
  <h2 class="text-lg font-medium">Title</h2>
  <p class="mt-2 text-neutral-600">Description text</p>
  <button class="mt-4 px-3 py-2 rounded-lg bg-neutral-900 text-white hover:bg-neutral-800">
    Action
  </button>
</div>
```

## Do's and Don'ts

### ✅ DO
- Use borders + spacing for separation
- Use one primary action per view
- Align to 4px grid
- Keep line lengths 60-75 chars for body text
- Use system fonts when possible

### ❌ DON'T
- Stack multiple heavy shadows
- Center-align long body text
- Use gradient backgrounds excessively
- Add decorative elements without purpose
- Use more than 2 font families

## Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      spacing: {
        '4': '4px',
        '8': '8px',
        '12': '12px',
        '16': '16px',
        '24': '24px',
        '32': '32px',
        '48': '48px',
        '64': '64px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      },
      transitionDuration: {
        '80': '80ms',
        '120': '120ms',
        '200': '200ms',
      }
    }
  }
}
```

## LLM Implementation Prompt

When implementing this design system:

1. **Use semantic HTML** with Tailwind classes
2. **Follow the spacing scale** (4, 8, 12, 16, 24, 32, 48, 64)
3. **Apply the type scale** (12, 14, 16, 18, 20, 24, 32, 40)
4. **Use neutral-first palette** with one primary accent
5. **Apply minimal shadows** - prefer 1px borders
6. **Implement all interactive states** (hover, focus, active, disabled)
7. **Use 120-200ms transitions** with ease-in-out
8. **Ensure WCAG AA compliance** for contrast
9. **Mobile-first responsive** with sm/md/lg/xl breakpoints
10. **No heavy drop shadows**, no gratuitous boxes, no centered paragraphs

Components should feel clean, modern, and purposeful with generous whitespace and clear hierarchy.