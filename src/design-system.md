---
eleventyExcludeFromCollections: true
---

# Hudson Street Library Design System

The working brief for this site. Every value below is the value actually in the
code — `src/assets/css/design-system.css` and `src/assets/css/input.css` are the
two files that define them, and `npm run test:design` fails the build if source
and brief drift apart.

Last verified against the code: 8 August 2026.

## Core principles

- **Clarity over ornament.** Hierarchy, whitespace, and typography carry the page.
- **Restraint.** One accent colour. Borders before shadows. Rounded corners with a reason.
- **Consistency.** Reuse tokens. A raw hex in a page's `<style>` block is how the palette fractures.

## Colour

### The library green

One green, used for the mark, every link, and the seal on the printed
stationery. Screen and press share the value.

```css
--primary-400: #81b182;  /* oklch .715 .085 145 */
--primary-500: #508950;  /* oklch .575 .105 144 */
--primary-600: #276628;  /* oklch .455 .115 143.5 —  6.96:1 on white */
--primary-700: #034706;  /* oklch .346 .113 143.1 — 11.01:1 on white  ← the mark */
--forest-800: #003100;   /* hover / pressed */
--forest-900: #002000;
```

The hue is locked at ~143° across the whole ramp. This matters: the previous
ramp drifted from 117° at the light end to 143° at the dark end and its chroma
collapsed to 0.029 at the 500 step, which is why it read grey rather than green.
If you add a step, keep the hue and give it a chroma that fits the curve.

`teal-*` class names still exist and map onto this ramp — `.text-teal-700` and
`.text-teal-900` both resolve to `--primary-700`. The names are historical. The
colour is green. Do not "correct" a teal class name to an actual teal.

### Semantic colours

Deliberately not brand. Status and feedback only.

```css
--success: #22c55e;   --warning: #f59e0b;   --error: #ef4444;

/* badges + alerts */
badge-success  #15803d on #dcfce7        alert-success  #bbf7d0 on #f0fdf4
status-available #065f46 on #d1fae5
```

### Neutrals

Warm, not Tailwind's default greys. `--neutral-50` is the page background.

```css
--neutral-50:  #faf9f6;   --neutral-500: #737373;
--neutral-100: #f5f5f5;   --neutral-600: #525252;
--neutral-200: #e5e5e5;   --neutral-700: #404040;
--neutral-300: #d4d4d4;   --neutral-800: #262626;
--neutral-400: #a3a3a3;   --neutral-900: #171717;
```

### Where colour is defined

Two files, and they must stay in step:

- `design-system.css` `:root` — unlayered, so it wins for `.text-primary-*` and `.text-teal-*`
- `input.css` `@theme` — backs every other utility (`hover:`, `border-`, `from-`)

Changing one and not the other splits the palette in half, with the resting
state correct and the hover state stale. `npm run test:design` catches this.

## Typography

Three faces, all free and open source.

- **Literata** (TypeTogether) — all content. One variable font; the optical-size
  axis gives a high-contrast display cut at headline sizes and a sturdier cut for
  running text.
- **Crimson Pro** — the wordmark only (`.site-logo`). It set the whole site for
  years and now keeps the door. This is not a leftover; do not "unify" it away.
- **Archivo Narrow** (Omnibus-Type) — dates, labels, small matter, UI chrome.

### Type scale

```
12  14  16  18  20  24  32  40  48  60  72 px      base 16px
```

Weights: 400 regular, 500 medium, 600 semibold, 700 bold (wordmark and titles).

## Space, shape, motion

```css
/* spacing */   4  8  12  16  24  32  48  64 px
/* radius */    --radius-sm: 8px    --radius-md: 12px
                --radius-lg: 16px   --radius-full: 9999px
/* shadows */   --shadow-sm: 0 1px 2px rgba(0,0,0,.06)
                --shadow-md: 0 4px 12px rgba(0,0,0,.08)
/* borders */   --border: 1px solid rgba(0,0,0,.08)
                --border-dark: 1px solid rgba(0,0,0,.12)
/* motion */    --duration-fast: 80ms   --duration-base: 120ms
                --duration-slow: 200ms  --ease: cubic-bezier(.4,0,.2,1)
```

Align to the 4px grid. Prefer a 1px border to a shadow. Respect
`prefers-reduced-motion` — the reset already does.

## Layout

- Content max-width **1200px**, gutters **24px** (`.container`)
- Prose capped at **65ch**, centred with auto inline margins
- Section padding 48–64px desktop, 32–48px mobile
- Breakpoints: `sm 640` `md 768` `lg 1024` `xl 1280` `2xl 1536`

## The mark

A shelf of four spines, one leaning. The entire drawing is four rectangles, the
fourth rotated 9°. It began as the favicon and now stands at the head of every
page.

- Always `#034706`. The black variant exists only for a one-ink print fallback.
- Never below **7mm** in print — the leaning spine closes up.
- Clear space on all sides equal to one spine width.
- **Inline it as SVG with an explicit fill.** The favicon file self-inverts in OS
  dark mode; used as `<img>` it vanishes against a light background.

## Build architecture

Worth understanding before adding CSS, because two of the traps here have each
cost a day.

- **Tailwind v4**, configured in `input.css` via `@theme`. There is no
  `tailwind.config.js`.
- **Preflight is off** (v3 parity). `input.css` `@layer base` carries the only
  reset. That includes `a { color: inherit; text-decoration: none }` — without
  it, any link lacking a colour class renders browser-blue `#0000EE`.
- **`design-system.css` is unlayered and loads second**, so its rules beat
  anything in a Tailwind layer. This is deliberate and load-bearing: several page
  templates ship their own inline `*{margin:0;padding:0}` reset, and only
  unlayered utilities beat it. Do not fold this sheet into a layer.
- **Seven built pages do not load `tailwind.css`** — four redirect stubs plus
  `discover.html`, `browse-gallery-demo/`, and this page. Anything added to
  `@layer base` is inert on them. They are listed in `NO_TAILWIND_OK` in
  `scripts/validate-design-system.js`.
- **The header is one component**, `_includes/components/site-header.njk`. Pages
  that copied its markup froze at an older nav; 49 of them had to be repaired.

## Accessibility

- WCAG AA contrast: 4.5:1 body, 3:1 large text. The green ramp clears AAA at the
  600 and 700 steps.
- Keyboard navigation for every interactive element.
- Focus visible without relying on colour — 2px outline, 2px offset.
- Target size minimum 44×44px.
- Semantic HTML, linked form labels, alt text on every image.

## Enforcement

`npm run test:design` — runs in pre-commit (source checks) and in CI against the
built site. Three invariants:

| check | fails when |
|---|---|
| `palette` | a green/teal-hue value outside the ramp appears in any CSS declaration |
| `coverage` | a built page doesn't load `tailwind.css` and isn't allowlisted |
| `header` | a page hand-rolls the wordmark instead of including the component |

A deliberately non-brand green goes in the `SEMANTIC` allowlist in that script,
with a reason. That makes "this green is fine" a recorded decision instead of an
assumption.

## Do and don't

**Do** — use a token, not a hex. Separate with borders and space. One primary
action per view. Keep body measure at 60–75 characters. Implement every
interactive state.

**Don't** — write a raw green hex anywhere outside the two token files. Stack
heavy shadows. Centre long body text. Add a stylesheet when the existing build
would do. Copy the header markup into a page.

## Brief for an assistant

When implementing against this system:

1. Semantic HTML with Tailwind utilities.
2. Spacing from the 4px scale; type from the scale above.
3. Neutral-first, with the green as the single accent.
4. Colour by token. Never a raw hex — the palette check will fail the commit.
5. Borders over shadows.
6. Every interactive state: hover, focus, active, disabled.
7. Transitions 80–200ms with the standard ease.
8. WCAG AA minimum; verify contrast rather than assuming.
9. Mobile-first, using the breakpoints above.
10. Include the shared header and footer components. Do not reproduce them.

Verify colour work by reading the CSS **rules**, not by screenshotting a page at
one width. A rendered spot check cannot see `:hover`, `:focus-visible`, or
anything behind a media query, which is exactly where stale colour survives.
