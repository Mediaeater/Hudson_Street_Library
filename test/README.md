# Tests

Mocha, configured in `.mocharc.json`. `test/setup.js` runs first.

```bash
npm test                      # CSV validation, source design check, then mocha
npx mocha test/catalog.test.js   # one file
npm run test:coverage         # nyc
```

## Layout

- `test/*.test.js`: one file per module under `scripts/` (catalogue loader, covers, collections, tags, web images).
- `test/unit/`, `test/integration/`: `image-core` and `CSVHandler`.
- `test/security/`: path traversal, CSV injection, log injection, ReDoS, API client.
- `test/fixtures/`: small catalogues and expected outputs.
- `test/helpers/fixtures.js`: temp dirs, temp files, test CSVs and test images, removed by `fixtures.cleanup()`.

## Rule

A test must load the code it tests from `scripts/`, `src/` or `.eleventy.js`. A test that
defines its own stand-in for the module proves nothing about the repo. Six such files were
removed in Nov 2026.

Tests that run the real build or write under `src/_data` must clean up after themselves.
