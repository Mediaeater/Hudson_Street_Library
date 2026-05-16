# 2026-05 Completed plans — archive

Archived 2026-05-16. These planning and report documents describe work that has
been completed (or is otherwise no longer actionable). They are preserved for
historical context. Do not treat any of them as current spec.

## Project plans (`plans/` directory, originally at repo root)

Status: created 2026-01, almost entirely shipped or made obsolete by the
2026-04 CSV-as-source-of-truth port and the 2026-05 CMS removal.

| File | Status note |
|---|---|
| `PLANS_README.md` | Originally `plans/README.md`. Index of the plans below. |
| `BUGS_CRITICAL.md` | All three bugs were inside the now-deleted `cms/` directory. Moot. |
| `BUGS_HIGH_MEDIUM.md` | Mostly CMS bugs. The image-core / batch-operations items may still be live; surface them in a fresh tracker if so. |
| `BUILD_SYSTEM_IMPROVEMENTS.md` | Most items shipped in 2026-Q1 (`/lib` consolidation, `_site` git removal, etc.). Tailwind/eleventy-plugin items superseded by 2026-05 local-build migration. |
| `DATA_INTEGRITY_PLAN.md` | Duplicate ID 1440 fixed per `WEEK_1_COMPLETION_REPORT.md`. Cover-acquisition campaign continues outside this doc. |
| `EXECUTION_SUMMARY.md` | One-time work log, 2026-01. |
| `MAGAZINE_SYSTEM_GAPS.md` | Header explicitly states "ALL GAPS RESOLVED". |
| `PURPLE_MAGAZINE_COMPLETION.md` | Completion report, 2026-01. |
| `WEEK_1_COMPLETION_REPORT.md` | Week-1 work log. References CMS fixes that are now moot. |

## Workflow ports (originally at repo root)

| File | Status note |
|---|---|
| `CSV_WORKFLOW_FIX_PLAN.md` | Fully executed. |
| `CSV_WORKFLOW_SOLUTION.md` | Completion report, 2026-04-29. The CSVHandler architecture it documents IS the current implementation. |

## Research snapshot (originally at repo root)

| File | Status note |
|---|---|
| `PRINCE_RESEARCH_SUMMARY.md` | One-time research snapshot, 2026-03-28. |

## Superpowers plans (originally `docs/superpowers/plans/`)

Both shipped. Their target architecture matches the current `.eleventy.js`,
`package.json`, and `src/_data/collections/` contents.

| File | Status note |
|---|---|
| `2026-04-20-csv-single-source-of-truth.md` | Shipped. Implementation visible across `src/_data/`, `src/collections.njk`, and `src/_data/collections/`. |
| `2026-05-10-restore-tailwind-build.md` | Shipped. `npm run build:css` + `npm run watch:css` + concurrent `npm start` are live. Tailwind CDN runtime fully removed. |
