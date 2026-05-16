# Restore Tailwind Build Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Tailwind CSS utility-class compilation across the public site so templates' `class="..."` references actually produce styles, without disturbing the hand-written `design-system.css` or breaking the live design.

**Architecture:** The Eleventy v3 upgrade silently broke `eleventy-plugin-tailwindcss@0.3.0` — `.eleventy.js:7` carries a comment confirming the plugin was disabled for incompatibility, and no replacement was wired up. Templates link only `design-system.css` (a hand-written subset of utilities); `input.css` ships uncompiled with raw `@tailwind` directives that browsers ignore. The fix is to drop the broken plugin and run the official Tailwind CLI as a separate npm step that compiles `src/assets/css/input.css` → `_site/assets/css/tailwind.css`. We disable `@tailwind base` (Preflight) so the existing typography stays put. The compiled file is linked **after** `design-system.css` in the layouts so utility duplicates cascade Tailwind-last (effectively a no-op since values match) and the bespoke `.book-card`, `.book-cover-tile`, `.book-description` rules in `design-system.css` continue to take precedence where they're scoped to those component selectors. `concurrently` runs Tailwind `--watch` alongside `eleventy --serve` in dev. CI doesn't change because the existing workflow runs `npm run build`, which we extend to compile CSS first.

**Tech Stack:** Tailwind CSS v3.4.18 (already in package.json), `tailwindcss` CLI binary (ships with the package), `concurrently` (new dev dependency), Eleventy v3, npm scripts.

**Out of scope:** `src/_includes/layouts/admin.njk` already loads Tailwind via the runtime CDN (`<script src="https://cdn.tailwindcss.com">`). Admin works; leave it alone in this plan. A follow-up could move admin to the same compiled file for consistency and to drop the 100KB+ runtime download.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `src/assets/css/input.css` | Modify | Tailwind entry point — drop `@tailwind base` |
| `package.json` | Modify | Add `build:css`, `watch:css`; chain into `build` and `start` |
| `src/_includes/layouts/book.njk` | Modify | Link `tailwind.css` after `design-system.css` |
| `src/_includes/layouts/collection.njk` | Modify | Link `tailwind.css` after `design-system.css` |
| `_site/assets/css/tailwind.css` | Generated | Compiled Tailwind output — not committed (Eleventy regenerates) |
| `.github/workflows/build-and-deploy.yml` | No change | Already runs `npm run build`, which will pick up the new step transitively |
| `.eleventy.js` | No change | The dead `eleventy-plugin-tailwindcss` block stays commented; we don't reactivate it |

---

## Task 1: Smoke-test Tailwind CLI against the existing config

**Files:**
- Read only: `tailwind.config.js`, `src/assets/css/input.css`

- [ ] **Step 1: Verify the Tailwind binary is installed and reports v3**

Run:
```bash
npx tailwindcss --help 2>&1 | head -3
```
Expected output (first line): something like `tailwindcss v3.4.18`. If it errors with "command not found", run `npm install` first.

- [ ] **Step 2: Compile to a scratch file**

Run:
```bash
npx tailwindcss -i src/assets/css/input.css -o /tmp/tw-smoke.css 2>&1
```
Expected: a single line like `Done in NNms.` and a non-empty `/tmp/tw-smoke.css`.

- [ ] **Step 3: Confirm the previously-missing utilities are now present**

Run:
```bash
grep -cE '^\.h-64\s*\{|^\.object-contain\s*\{|^\.grid-cols-3\s*\{' /tmp/tw-smoke.css
```
Expected: `3`. If lower, Tailwind didn't pick up classes from templates — re-check `tailwind.config.js` `content` globs (currently `./src/**/*.{html,njk,js}`, `./_site/**/*.html`, `./generate-book-pages.js`).

- [ ] **Step 4: Note total file size**

Run:
```bash
wc -c /tmp/tw-smoke.css
```
Record the byte count somewhere. Expected: < 200 KB unminified. We'll compare to the minified production build later.

- [ ] **Step 5: No commit**

This task is purely diagnostic. Move on.

---

## Task 2: Drop `@tailwind base` from `input.css`

**Files:**
- Modify: `src/assets/css/input.css`

**Why:** `@tailwind base` injects Preflight, Tailwind's CSS reset that, among other things, strips margin/padding from `<h1>`–`<h6>` and `<p>`, removes list bullets, and rewrites the link color. The site's existing typography (Crimson Pro headings, link styling) lives in `design-system.css` and would be flattened. We want utilities and components only.

- [ ] **Step 1: Read the current `input.css`**

Run:
```bash
cat src/assets/css/input.css | head -10
```
Expected: the first three lines are `@tailwind base; / @tailwind components; / @tailwind utilities;` followed by a `@import` for Google Fonts.

- [ ] **Step 2: Edit `src/assets/css/input.css` — remove the `@tailwind base;` line**

After the edit, the top of the file should read:
```css
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@400;600;700&family=Crimson+Pro:wght@300;400;500;600;700&display=swap');
```

Use the Edit tool with `old_string` `"@tailwind base;\n@tailwind components;"` and `new_string` `"@tailwind components;"`.

- [ ] **Step 3: Recompile and confirm Preflight is gone**

Run:
```bash
npx tailwindcss -i src/assets/css/input.css -o /tmp/tw-smoke.css 2>&1
grep -c '\*, ::before, ::after' /tmp/tw-smoke.css
```
Expected: `0` (the Preflight wildcard reset is no longer in the output).

- [ ] **Step 4: Confirm utilities still compile**

Run:
```bash
grep -cE '^\.h-64\s*\{|^\.object-contain\s*\{|^\.grid-cols-3\s*\{' /tmp/tw-smoke.css
```
Expected: `3`. Same as Task 1 — utilities aren't affected by removing `base`.

- [ ] **Step 5: Commit**

```bash
git add src/assets/css/input.css
git commit -m "chore(css): drop @tailwind base to preserve existing typography

Preflight resets margins/padding on headings, paragraphs, and lists,
which would flatten the Crimson Pro typography defined in
design-system.css. We only need components + utilities."
```

---

## Task 3: Add `build:css` and `watch:css` npm scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Read current `scripts` block**

Run:
```bash
node -e "console.log(JSON.stringify(require('./package.json').scripts, null, 2))"
```
Confirm `build` is currently `"eleventy"` and `start` is `"eleventy --serve"`.

- [ ] **Step 2: Edit `package.json` — add two new scripts**

Insert these two entries into the `scripts` object (alphabetical order doesn't matter — keep them grouped near `build`):

```json
"build:css": "tailwindcss -i src/assets/css/input.css -o _site/assets/css/tailwind.css --minify",
"watch:css": "tailwindcss -i src/assets/css/input.css -o _site/assets/css/tailwind.css --watch",
```

Use the Edit tool. To find a stable anchor, target the existing `"build": "eleventy"` line and add the two scripts immediately before it.

- [ ] **Step 3: Run the new build script**

Run:
```bash
npm run build:css
```
Expected: `Done in NNms.` and a new file at `_site/assets/css/tailwind.css`.

- [ ] **Step 4: Verify the artifact**

Run:
```bash
ls -lh _site/assets/css/tailwind.css && grep -cE '^\.h-64\{|^\.object-contain\{' _site/assets/css/tailwind.css
```
Expected: file present (likely 30–80 KB minified) and grep prints `2`. (Note: minified output uses `.h-64{...}` with no space, hence the regex without `\s*`.)

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "build(css): add build:css and watch:css scripts

Compile src/assets/css/input.css to _site/assets/css/tailwind.css via
the official Tailwind CLI. Replaces eleventy-plugin-tailwindcss@0.3.0
which has been disabled since the Eleventy v3 upgrade
(see .eleventy.js:7)."
```

---

## Task 4: Chain Tailwind into `build` and `start`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install `concurrently` as a dev dependency**

Run:
```bash
npm install --save-dev concurrently
```
Expected: package.json's `devDependencies` now lists `concurrently`. Lockfile updates.

- [ ] **Step 2: Edit `package.json` — modify the `build` script**

Change:
```json
"build": "eleventy",
```
to:
```json
"build": "npm run build:css && eleventy",
```

Use the Edit tool with `old_string` `"build": "eleventy",` and `new_string` `"build": "npm run build:css && eleventy",`.

- [ ] **Step 3: Edit `package.json` — modify the `start` script**

Change:
```json
"start": "eleventy --serve",
```
to:
```json
"start": "concurrently \"npm:watch:css\" \"eleventy --serve\"",
```

Use the Edit tool. Note the `\"` escaping in JSON — use a single line.

- [ ] **Step 4: Verify `build` end-to-end**

Run:
```bash
rm -rf _site && npm run build 2>&1 | tail -8
```
Expected: Tailwind compiles first (`Done in NNms.`), then Eleventy runs (`Wrote NNNN files...`), and `_site/assets/css/tailwind.css` exists with `.h-64` in it.

- [ ] **Step 5: Verify `start` boots both processes**

Run in background, give it 5 seconds, then kill:
```bash
(timeout 5 npm start 2>&1 | head -30 || true)
```
Expected: output mentions both `[watch:css]` (Tailwind) and `[1]` or `[eleventy]` (Eleventy serve). Both should still be alive when the timeout fires.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: chain tailwind compile into build and start

- build now runs build:css before eleventy
- start uses concurrently to run watch:css alongside eleventy --serve
- adds concurrently as a dev dependency

The CI workflow already runs 'npm run build' — no workflow change
needed."
```

---

## Task 5: Link `tailwind.css` from the public layouts

**Files:**
- Modify: `src/_includes/layouts/book.njk`
- Modify: `src/_includes/layouts/collection.njk`

**Why ordering matters:** `design-system.css` defines bespoke component classes (`.book-card`, `.book-cover-tile`, `.book-description`, color tokens via `:root`). Tailwind's compiled output defines utilities (`.flex`, `.h-64`, etc.). They don't share selector specificity in conflicting ways, **except** that `design-system.css` happens to also hand-define some Tailwind-equivalent utilities (`.flex`, `.gap-8`, `.text-sm`, etc.). Loading Tailwind **second** means the Tailwind versions win for those duplicates. Values match in practice, so this is a no-op visually — it's just correct cascade hygiene.

- [ ] **Step 1: Edit `book.njk` — add the link tag**

Open `src/_includes/layouts/book.njk`. After line 12 (`<link rel="stylesheet" href="/assets/css/design-system.css">`), add:
```html
    <link rel="stylesheet" href="/assets/css/tailwind.css">
```

Use the Edit tool with `old_string` `<link rel="stylesheet" href="/assets/css/design-system.css">` and `new_string`:
```
<link rel="stylesheet" href="/assets/css/design-system.css">
    <link rel="stylesheet" href="/assets/css/tailwind.css">
```

- [ ] **Step 2: Edit `collection.njk` — add the same link tag**

Same edit, same `old_string`/`new_string` pair, applied to `src/_includes/layouts/collection.njk` (line 17).

- [ ] **Step 3: Rebuild**

Run:
```bash
npm run build 2>&1 | tail -3
```
Expected: builds clean.

- [ ] **Step 4: Verify the link is in built pages**

Run:
```bash
grep -c "tailwind.css" _site/collections/recently_added.html _site/books/hujar_lost-downtown_1802/index.html
```
Expected: each path shows `1`.

- [ ] **Step 5: Commit**

```bash
git add src/_includes/layouts/book.njk src/_includes/layouts/collection.njk
git commit -m "feat(layouts): link compiled tailwind utilities

Loaded after design-system.css so any utility-class duplicates
cascade Tailwind-last. The bespoke component rules
(.book-card, .book-cover-tile, etc.) keep their own selector
specificity and are unaffected."
```

---

## Task 6: Visual regression check at three viewport widths

**Files:**
- None modified (verification only)

**What we're checking:** the existing `recently_added` and a representative book page should look **identical** to before this work — the recent fix (`f3d0310e`) added a scoped `.book-cover-tile` class that already produces the editorial uniform-tile layout. Restoring Tailwind utilities on top of that should not change the rendering. If something does change, it's because Tailwind is now applying a utility that wasn't applying before, conflicting with hand-written rules.

- [ ] **Step 1: Write a Playwright screenshot script at `/tmp/tw-regression.py`**

```python
from playwright.sync_api import sync_playwright

URL_RA = "http://localhost:8080/collections/recently_added.html"
URL_BOOK = "http://localhost:8080/books/hujar_lost-downtown_1802/"
SHOTS = [
    ("/tmp/tw-ra-1440.png", URL_RA, 1440, 1400),
    ("/tmp/tw-ra-768.png",  URL_RA, 768, 1500),
    ("/tmp/tw-ra-375.png",  URL_RA, 375, 1600),
    ("/tmp/tw-book-1440.png", URL_BOOK, 1440, 1400),
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    for path, url, w, h in SHOTS:
        ctx = browser.new_context(viewport={"width": w, "height": h})
        page = ctx.new_page()
        page.goto(url)
        page.wait_for_load_state("networkidle")
        page.screenshot(path=path, full_page=False)
        print(f"{path}: {w}x{h}")
        ctx.close()
    browser.close()
```

- [ ] **Step 2: Capture before-state screenshots**

```bash
git stash    # set the working tree back to BEFORE Tasks 1–5
python3 /Users/imac/.claude/skills/webapp-testing/scripts/with_server.py \
  --server "npm start" --port 8080 --timeout 60 -- \
  python3 /tmp/tw-regression.py
mkdir -p /tmp/tw-before
mv /tmp/tw-*.png /tmp/tw-before/
git stash pop
```

- [ ] **Step 3: Capture after-state screenshots**

```bash
python3 /Users/imac/.claude/skills/webapp-testing/scripts/with_server.py \
  --server "npm start" --port 8080 --timeout 60 -- \
  python3 /tmp/tw-regression.py
mkdir -p /tmp/tw-after
mv /tmp/tw-*.png /tmp/tw-after/
```

- [ ] **Step 4: Compare the two sets**

Use the Read tool on each pair (`/tmp/tw-before/tw-ra-1440.png` and `/tmp/tw-after/tw-ra-1440.png`, etc.) and verify they look identical. The `book-cover-tile` grid should be unchanged. If anything differs, write down which page and which element.

- [ ] **Step 5: If a regression is found, diagnose**

Common causes when Tailwind is freshly enabled on a site that previously didn't have it:
1. A utility class on an element was previously inert and is now applying — e.g., `class="hidden"` on an element that should be visible. Inspect with `page.locator(...).is_visible()`.
2. A hand-written rule in `design-system.css` defines a different value than Tailwind's default for the same class name — e.g., a custom `.text-sm` at 14px while Tailwind's is 0.875rem. Resolve case-by-case: either remove the hand-written rule, or scope it under a parent so it doesn't compete with the utility.

Commit any fixes with messages like:
```bash
git commit -m "fix(css): <element> regression after enabling tailwind"
```

- [ ] **Step 6: Clean up screenshot dirs**

```bash
rm -rf /tmp/tw-before /tmp/tw-after /tmp/tw-regression.py
```

---

## Task 7: Verify the deploy workflow still works

**Files:**
- Read only: `.github/workflows/build-and-deploy.yml`

- [ ] **Step 1: Confirm the workflow uses `npm run build`**

Run:
```bash
grep -nE "npm (run|ci)" .github/workflows/build-and-deploy.yml
```
Expected: line 41 `run: npm ci` and line 47 `run: npm run build`. Since `build` now invokes `build:css && eleventy`, no workflow change is needed.

- [ ] **Step 2: Push the branch and watch the deploy**

```bash
git push
gh run watch --exit-status
```
Expected: the `Build and Deploy to GitHub Pages` workflow completes successfully. If it fails, the most likely cause is `concurrently` missing from a fresh `npm ci` — re-check that `package-lock.json` was committed in Task 4.

- [ ] **Step 3: Verify the deployed site has the new file**

```bash
curl -sI https://hudsonstreetlibrary.com/assets/css/tailwind.css | head -3
```
Expected: `HTTP/2 200` with `content-type: text/css`.

- [ ] **Step 4: No commit needed**

This task is verification only.

---

## Task 8 (optional follow-up): Deduplicate hand-written utilities in `design-system.css`

**Files:**
- Modify: `src/assets/css/design-system.css` (lines roughly 100–700)

**Why optional:** Once Tailwind utilities ship, the hand-written duplicates (`.flex`, `.gap-8`, `.text-sm`, `.bg-neutral-100`, etc.) in `design-system.css` are redundant. Removing them shrinks `design-system.css` and reduces the risk of value drift between the two files. **However**, some hand-written rules use slightly different values than Tailwind's defaults and were probably intentional. Removing them could shift typography or spacing.

**Recommend running this only if you have time to visually verify the site afterward.** Otherwise the duplicates are harmless — Tailwind cascades last and wins.

- [ ] **Step 1: Inventory the duplicate utility classes**

Run:
```bash
grep -nE '^\.(flex|gap-|text-(xs|sm|base|xl)|font-(bold|medium|semibold)|grid|grid-cols-|mx-auto|max-w-|w-full|h-full|space-y-|object-cover|italic)\b' src/assets/css/design-system.css > /tmp/ds-utils.txt
wc -l /tmp/ds-utils.txt
```
Expected: a list of ~30–60 lines showing each hand-written utility and its line number.

- [ ] **Step 2: For each utility, diff its hand-written value against Tailwind's default**

For utilities whose values match Tailwind defaults (e.g., `.flex { display: flex; }`), they're safe to delete.

For utilities with different values, decide:
- If the difference was intentional (custom design choice), keep the hand-written rule but rename it (e.g., `.flex-tight`) so it doesn't compete with Tailwind's `.flex`.
- If the difference is incidental drift, delete the hand-written rule and let Tailwind's default apply.

- [ ] **Step 3: Delete the safe duplicates in one commit per logical group**

Group deletions by category to keep commits reviewable:
- Layout utilities (`flex`, `grid`, `gap-*`, etc.) — one commit
- Typography (`text-*`, `font-*`, `italic`) — one commit
- Color (`text-neutral-*`, `bg-neutral-*`) — one commit
- Sizing (`w-full`, `h-full`, `max-w-*`) — one commit

After each group, run a build + visual check:
```bash
npm run build && python3 /tmp/tw-regression.py
```

- [ ] **Step 4: Commit each group separately**

```bash
git add src/assets/css/design-system.css
git commit -m "refactor(css): remove duplicate <category> utilities now provided by tailwind"
```

---

## Self-Review Notes

Coverage check against the goal: ✓
- Tailwind CLI restored as primary compiler (Tasks 1–4)
- Public layouts wired to load it (Task 5)
- Existing visual contract preserved and verified (Tasks 2 dropping Preflight; Task 6 regression check)
- Deploy validated (Task 7)
- Cleanup gated as optional (Task 8)

Placeholder scan: ✓ — every step contains specific commands or code; no "TBD", "implement later", or "etc."

Type/name consistency: ✓ — `tailwind.css` is the consistent compiled-output name across Tasks 3, 4, 5, 7. The css scripts are `build:css` / `watch:css` consistently. The `concurrently` dev dependency is named the same in Task 4 install and verification steps.
