---
name: deploy-status
description: Use when checking whether a Hudson Street Library push went live, or when a deploy to GitHub Pages fails or changes don't appear. Covers the Pages source check, the Actions workflow, and timings.
user_invocable: true
---

# Deployment status and troubleshooting

The site auto-deploys via GitHub Actions on every push to `main` and is
published from the `gh-pages` branch.

## Check status

```bash
gh run list --limit 1
```

A push can create **zero** runs (seen Aug 2026). Verify a run exists for the
pushed SHA, not just that the most recent run was green. CI also runs
`npm audit --audit-level=critical` before publishing, so a newly published
advisory can red the build with no code change.

## Before troubleshooting anything else

Verify the GitHub Pages source. Changes won't go live if the workflow and the
Pages configuration don't match:

- Repository Settings → Pages → Source must be the **gh-pages** branch.

## Timings

- Build: ~5 min (full Eleventy rebuild)
- Upload: ~5 sec (incremental, only changed files via the gh-pages branch)

## After a book add

Check the cover image renders on the live site; a missing leading slash in
`image_url` 404s locally-correct pages once deployed.
