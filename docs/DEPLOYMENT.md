# Deployment Guide

## Overview

The Hudson Street Library site is built and deployed automatically by
GitHub Actions on every push to `main`. GitHub Pages serves the resulting
static site at `hudsonstreetlibrary.com` (via the `CNAME` file at the repo
root). There is no CDN in front and no manual cache step.

### Architecture

```
Local change → git push → GitHub Actions → gh-pages branch → GitHub Pages → hudsonstreetlibrary.com
```

The workflow is defined in `.github/workflows/build-and-deploy.yml`:

1. Checkout the repo
2. Set up Node.js 22 (required by Eleventy v3)
3. `npm ci`
4. Clear `_site/` and Eleventy cache
5. `npm run build` (compiles Tailwind, then runs Eleventy)
6. Copy any custom overrides under `src/books/manual/` into `_site/books/`
7. Run `npm audit --audit-level=critical` (fail on critical advisories)
8. Push `_site/` to the `gh-pages` branch via `peaceiris/actions-gh-pages@v4`

GitHub Pages serves whatever is on `gh-pages`. The browser will pick up the
new build on the next request — typical end-to-end latency from push to
live is 1–3 minutes.

### Requirements

- **Node.js 22+** (Eleventy v3 needs the new `require()` ESM behavior)
- **GitHub Pages**: source set to the `gh-pages` branch in the repository's
  Pages settings
- **CNAME file** at the repo root pointing at `hudsonstreetlibrary.com`

## Standard Deploy

```bash
# 1. Make your changes
npm run add                # or edit src/_data/books.csv directly

# 2. Build locally and test
npm run build
npm start                  # http://localhost:8080

# 3. Commit and push
git add src/...
git commit -m "Add: ..."
git push                   # GitHub Actions takes it from here
```

The Actions run shows up at
<https://github.com/Mediaeater/Hudson_Street_Library/actions>. When it goes
green, the change is live.

## Checking Deployment

```bash
npm run deploy:check       # runs scripts/check-deployment.sh
```

Or watch the GitHub Actions UI / use `gh`:

```bash
gh run list --branch main --limit 5
gh run watch                # follow the latest run
```

## Manual Deploy (fallback)

If GitHub Actions is unavailable and you need to publish, `npm run deploy`
runs `scripts/deploy-manual.sh`, which builds locally and force-pushes the
output directly to the `gh-pages` branch:

```bash
npm run deploy
```

Use sparingly. The script requires a clean working tree and assumes you
are on `main`.

## What's Tracked vs Built

- **Tracked**: `src/`, `scripts/`, `docs/`, configs, the `CNAME` file
- **Built (not tracked)**: nearly all of `_site/` (in `.gitignore`)

The repository previously force-added some specific `_site/` files for
quirky deployment edge cases; that workaround is no longer needed now that
GitHub Actions builds the site fresh on every push. Don't force-add `_site`
files unless you've identified a specific reason.

## Troubleshooting

### Build failed in GitHub Actions

1. Open the failing run at `https://github.com/Mediaeater/Hudson_Street_Library/actions`.
2. Reproduce locally:
   ```bash
   rm -rf _site .cache
   npm ci
   npm run build
   ```
3. Common causes:
   - **Node version mismatch** — the workflow uses Node 22; older Node
     fails on Eleventy v3's `require()` of ESM modules.
   - **CSV validation failure** — `npm run test:csv` catches malformed
     rows; the build does not.
   - **Missing image referenced by `image_url`** — Eleventy will still
     build, but page templates will show a broken cover.

### Changes not showing on the live site

The first place to look is the Actions tab. If the latest run is **green**
and you still see stale content:

```bash
# Hard reload the page
# Chrome / Safari (Mac): Cmd+Shift+R
# Chrome / Firefox (Win/Linux): Ctrl+F5
```

GitHub Pages uses Fastly internally and can occasionally hold a previous
page for a minute or two even after `gh-pages` is updated. If something
still looks wrong after 5 minutes with a hard reload, re-run the workflow:

```bash
gh workflow run "Build and Deploy to GitHub Pages"
```

### Local and remote out of sync

```bash
git fetch origin
git status -sb              # check ahead/behind
git pull --rebase origin main
```

## npm Scripts Reference

```bash
npm run build              # Build site (compiles Tailwind, then Eleventy)
npm run start              # Dev server with Tailwind watch on :8080
npm test                   # CSV validation + Mocha
npm run test:csv           # CSV validation only
npm run add                # Add a new book interactively
npm run deploy:check       # Run scripts/check-deployment.sh
npm run deploy             # Manual fallback: build locally and push gh-pages
```

## Notes

- `.env` is gitignored — never commit credentials.
- The build is deterministic from `src/` + `package-lock.json`; every push
  triggers a fresh `npm ci` + `npm run build` in CI.
- No external CDN, no manual cache purge. If you ever add one, document
  the purge step here.
