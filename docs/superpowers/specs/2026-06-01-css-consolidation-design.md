# CSS Consolidation — Tailwind v4 as the single system

**Date:** 2026-06-01
**Decision:** Path A — Tailwind wins. Port `design-system.css` into the Tailwind v4 build, then delete `design-system.css`.
**Constraint:** No visual regression on the ~1,860 Tailwind pages or the ~17 hand-authored pages. Don't redesign — port the same rules.

## Problem

The site runs two CSS systems in parallel:

- `src/assets/css/design-system.css` — hand-written: an **unlayered** universal reset, design tokens, a partial mirror of Tailwind utilities, and bespoke components.
- `src/assets/css/tailwind.css` — compiled Tailwind v4 (`@layer utilities`), generated on-demand by scanning templates. Source is `src/assets/css/input.css`.

Loading is inconsistent: 1,860 generated book/collection pages load **both** sheets; 12 hand-authored pages load **design-system.css only**, so Tailwind classes in the shared `site-header`/`site-footer` partials are inert there (root cause of the invisible mobile menu, patched as a stopgap).

The deeper fragility: `design-system.css` is a **hand-maintained mirror** of Tailwind utilities — it contains only classes someone remembered to add. Any new template using an un-added utility breaks silently. Tailwind v4 regenerates utilities from template scans, so a class can never go inert. Consolidating onto Tailwind removes the failure mode at the root.

## Audit findings (why the systems are entangled, not redundant)

`design-system.css` is load-bearing even on dual-loaded pages because it is **unlayered** (beats Tailwind's layered utilities) and provides things Tailwind does not generate:

- **`primary-*` palette** (used on 21 pages) — Tailwind's `@theme` defines only `forest`/`teal`, so it generates zero `primary-*` utilities.
- **`.nav-link`** (header nav, 1,818 pages) — Tailwind defines `.nav-item` (underline), not `.nav-link`.
- **Value overrides that currently win via unlayering:**
  - `neutral-*` colors (ds `neutral-50` = `#faf9f6` vs Tailwind default `#fafafa`).
  - Radius scale — ds `rounded`=8px, `rounded-md`/`rounded-lg`=12px, `rounded-xl`=16px (Tailwind defaults 4/6/8/12px). `rounded` used 834×, `rounded-lg` 696×.
  - Shadow scale — ds custom `shadow-md`/`lg`/`xl` (used 123/77/20×).
  - `.container` — ds flat `max-width:1200px` + `padding:0 24px` vs Tailwind's breakpoint container.
- **Bespoke components used in templates:** `card` (36), `line-divider` (32), `item-card` (29), `title-font` (19), `collection-card`, `book-cover-tile`, `book-card`/`book-description`, `btn`/`btn-*`, `badge`/`badge-*`, `alert*`, category `-bg` gradients, `skeleton`, `hero-image-container`, `serif`.
- **Reset + element styling:** universal `*{margin:0;padding:0;box-sizing}` reset, h1–h6 px sizes, `p{line-height:1.6;max-width:65ch}`, form-element styling, `:focus-visible`, `prefers-reduced-motion`, print.

Tailwind already provides natively (no port needed): `truncate`, `line-clamp-*`, `aspect-[3/4]` arbitrary values, spacing scale (ds `--space-N` = Tailwind's 4px scale, identical), text sizes (already overridden to px in `@theme`), gradients.

Spacing and text-size scales already match, so they need no action.

## Non-goals

- No visual redesign. Port identical rules (same hex, same component CSS).
- Don't touch `discover.html` (fully self-contained inline styles, no header — inert to this change).
- Don't touch orphaned `admin.css` and `design-system-clrs.css` (loaded by **zero** pages). Optional separate cleanup, not part of this work.
- Keep Tailwind Preflight **OFF** (v3 parity) — port the minimal reset into `@layer base` instead of enabling Preflight, which would restyle headings/lists and risk regressions.

## Approach

Everything `design-system.css` uniquely provides moves into `src/assets/css/input.css` (the Tailwind source), grouped by mechanism:

### 1. `@theme` tokens (value parity)
- Add `--color-primary-400/500/600/700` (so `text-primary-700`, `bg-primary-600`, `border-t-primary-600` generate).
- Override `--color-neutral-50..900` to ds values.
- Override radius tokens to ds values (8/12/16/20).
- Override shadow tokens to ds values.
- `success`/`warning`/`error` if referenced (e.g. `bg-red-600` → error).

### 2. `@layer base` (reset + element defaults)
- Universal reset `*,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }`. Required because `collection.njk` relies on ds's reset (book pages and hand-authored pages carry their own inline reset, but collection pages do not).
- h1–h6 px sizes, `p` line-height/`max-width:65ch`, `.serif`.
- Form-element styling (`input/textarea/select/label`, focus rings), `:focus-visible`, `prefers-reduced-motion`, print.

### 3. `@layer components` / `@utility` (bespoke)
- `@utility container` — must use `@utility` (not a plain `.container` rule) so it **replaces** Tailwind's own generated container; a components-layer rule would lose to Tailwind's utilities-layer container.
- `.nav-link` (+ `[aria-current=page]` / `.nav-link-active`).
- `card`, `btn`/variants/sizes, `badge`/variants, `alert`/variants.
- `item-card`, `collection-item`, `collection-card`, `book-card`, `book-description`, `book-cover-tile`, `line-divider`, `hero-image-container`.
- Category `-bg` gradients (`fashion-bg`…`books-bg`), `title-font`, `skeleton` + `@keyframes`, `sr-only` (if Tailwind's native `sr-only` differs — verify).

### Cascade note
ds is currently **unlayered** (highest priority). Ported rules become **layered**. This is correct for everything except utilities that must beat Tailwind's *own* generated utilities — handle those via `@theme` overrides (radius/shadow/neutral) or `@utility` (container). Inline page `<style>` blocks stay unlayered and continue to win, unchanged.

## Cutover sequence (two atomic commits on `main`)

**Commit 1 — Additive, cannot regress.**
Port all of the above into `input.css`, and add `<link ... tailwind.css>` to the 12 ds-only pages — but **keep `design-system.css` loaded everywhere**. Dual-load continues; ds (unlayered) still wins, so appearance is unchanged, but Tailwind classes in the shared partials now resolve on all pages (fixes the inert-class bug immediately). Build, verify nothing moved.

**Commit 2 — Cutover.**
Remove the `design-system.css` `<link>` sitewide (both layouts + the hand-authored pages) and delete `src/assets/css/design-system.css`. The ported rules take over. Build, verify pixel-identical.

(Optional Commit 3 — delete orphaned `admin.css` / `design-system-clrs.css`. Separate, only if desired.)

## Verification

Per `reference-local-page-verification`: build with `npm run build`, serve `_site/` over HTTP (not `file://`) on a local port, drive with Playwright at `/opt/homebrew/bin/python3`, `wait_until="domcontentloaded"` + short timeout.

Screenshot **before** (current `main`) and **after** each commit at **390px** and **1280px** for every archetype:

- A book page (`/books/<slug>/`)
- A collection page (`/collections/recently_added.html`)
- `index.html`, `news.html`, `collection-explore.html`, `static-demo/`, `aggregate-view/`, `tags/`, `404.html`
- The design-system demo (`/components/design-system/`)

Also run the deterministic check: diff the rendered class→style for key elements, and confirm `npm run build` is clean before each commit.

Acceptance: no visual diff on any archetype at either width; mobile menu works on a hand-authored page; only `tailwind.css` remains as a stylesheet link sitewide.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Dropping ds reverts radius/shadow/neutral to Tailwind defaults | Override those tokens in `@theme` to ds values (heavily used — verified). |
| `.container` width shifts on collection pages/footer | Define via `@utility container` so it replaces Tailwind's container. |
| `primary-*` classes go inert | Add `--color-primary-*` to `@theme`. |
| `.nav-link` (1,818 pages) disappears | Port to `@layer components`. |
| Adding `tailwind.css` to a hand-authored page activates a previously-inert class and shifts its custom-styled body | Commit 1 is isolated and screenshotted before/after at both widths. |
| Bespoke component missed in the port | Audit drove the inventory; deterministic class diff + per-archetype screenshots catch gaps. |
