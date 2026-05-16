# 2026-05 CMS removal — archived docs

Archived 2026-05-16. These four documents described the Express + PostgreSQL CMS
that was deleted from the project in commit `1ba3a4e4b` ("chore(cms): remove
pre-port CMS scaffolding and broken start.sh"). The underlying source — the
`cms/` directory, `start.sh`, `stop.sh`, and `npm run dev`/`stop` scripts — no
longer exists.

The current architecture has **no backend**: it is a static Eleventy 3 site with
`src/_data/books.csv` as the single source of truth. Books are added via the
`npm run add` CLI, not via a web admin.

| File | What it describes |
|---|---|
| `AI_CODING_GUIDE.md` | Express + PostgreSQL backend, `cms/server.js`, Docker config, `/admin/api/*` REST endpoints |
| `STATIC_CMS_GUIDE.md` | `start-static-cms.sh`, port 3001 admin UI, `cd cms/ && node static-cms.js` workflow |
| `CONTENT_MANAGER_GUIDE.md` | Web admin UI for editors with auth, roles, media library — never built in current arch |
| `API_DOCUMENTATION.md` | Fictional REST API at `/admin/api` with JWT auth, PostgreSQL schemas, JavaScript SDK |

For the current public data endpoints (`/cms/data/books.csv`,
`/cms/data/libraryCollections.json`), see `docs/architecture/SYSTEM-OVERVIEW.md`
and `.eleventy.js` passthrough copy config. Those URLs are emitted by the static
build — the URL path is unrelated to the deleted `cms/` source directory.
