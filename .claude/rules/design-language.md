---
paths:
  - "src/**/*.html"
  - "src/**/*.njk"
  - "src/**/*.css"
---

# Design Language (read BEFORE writing any page)

The site is a letterpress-editorial surface, not a web app. `src/index.html` is the
canonical statement of the language; read it before designing anything. Do not derive the
design from whatever utility classes happen to be lying around in a neighbouring template
— several templates carry Tailwind-admin markup that predates the system and is not a
precedent.

**The rules:**

1. **Square corners. No `border-radius`, anywhere.** The homepage has zero radius
   declarations in 511 lines; so do `.tag-pill` (tags.html) and `.book-cover-tile`
   (design-system.css). The `--radius-*` tokens exist for genuine circles (spinners, icon
   wells) and nothing else. Radius in the templates is Tailwind creep, not a decision.
2. **No fills, no boxes, no buttons.** Things are separated by a 1px hairline
   `rgba(19, 22, 27, 0.12)` or by whitespace. Never a filled chip, pill, badge or card.
   Navigation is text. The one sanctioned button form is the hero CTA: `2px solid` ink,
   square, uppercase Archivo Narrow, inverting on hover — used twice on the whole site.
3. **Two typefaces, fixed jobs.** Literata (serif) for titles and prose. Archivo Narrow
   uppercase, 0.12–0.2em tracking, for eyebrows, counts, labels and small metadata.
   Crimson Pro is the wordmark only.
4. **Slate `#5B6B84` is the accent** for that small tracked type. Not `gray-400`/`gray-500`,
   and never a saturated blue: it has to stay dull or the site reads as SaaS. (Was brown
   `#8B7355` until Nov 2026; warm paper + brown read as the Anthropic palette.)
   Green `#034706` is the mark, not a UI colour.
5. **Paper `#F4F5F7` is the ground** (cool, blue-leaning; book pages sit on `neutral-50`
   `#F6F7F9`, one step lighter). White is for sheets that hold an object (cover tiles,
   the about band), not for cards.
6. **Section structure:** small slate uppercase heading, a hairline rule under it, then
   content. Not a heading inside a panel.

Palette tokens: `--color-ink #13161B`, `--color-paper #F4F5F7`, `--color-vellum #E8EAEE`,
`--color-slate #5B6B84`, `--color-border rgba(19,22,27,0.12)`. Ink tints are
`rgba(19, 22, 27, α)`. The stationery plates and the newspaper page stay warm on purpose:
they depict physical paper stock, not the UI ground.

**Verify before saying it's done** — class names lie on this site (two CSS systems, and
design-system.css loads last). Render over HTTP and sample computed styles:

```js
// inside the page's own container
document.querySelectorAll('.wing-page *').forEach(el => { const s = getComputedStyle(el);
  /* flag any borderRadius > 0 or a backgroundColor that isn't transparent */ });
```

`src/wings.njk` is the worked example of a page written correctly in this language.
