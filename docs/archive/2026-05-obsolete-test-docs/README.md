# 2026-05 Obsolete test docs — archive

Archived 2026-05-16. These three documents describe a custom test runner and
cover-acquisition test harness that **don't exist in the repo today**. The
actual test setup is Mocha (`npm test`) in the `test/` directory plus CSV
validation (`npm run test:csv`).

| File | What it describes | Why obsolete |
|---|---|---|
| `TESTING-GUIDE.md` | A "zero-dependency" custom runner at `scripts/tests/test-runner.js` with suites for image-core, book-api-client, logger, csv-handler. | The `scripts/tests/` directory only contains a stub README. The repo runs Mocha via `npm test`. |
| `TEST-COVER-ACQUISITION-README.md` | A `test-cover-acquisition.js` script at repo root. | File does not exist. |
| `QUICK-START-COVER-TEST.md` | Same `test-cover-acquisition.js` plus root-level `acquire-covers.js`. | Both root-level files are missing. The real cover-acquisition scripts live under `scripts/covers/`. |

For current testing guidance, see `docs/TESTING-PATTERNS.md` and the `test/`
directory.
