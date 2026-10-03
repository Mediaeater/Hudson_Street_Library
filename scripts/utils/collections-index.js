// The one place that decides which collection pages exist, what books each
// lists, and where each lives. The _data modules (collectionConfigs,
// exploreCollections, tagPages, wingPages) are slices of this index, so a count
// on a card and the page behind it cannot disagree.
//
// buildIndex is a pure function of its input and is what the tests call.
// getIndex loads the real catalogue once per build and memoises the result;
// .eleventy.js calls resetIndex before each build so --serve picks up edits.

const fs = require('fs');
const path = require('path');
const { loadCatalogSync, loadWings } = require('./catalog');
const { buildTagCollectionsByWing } = require('./tag-collections');
const { matchesCollection } = require('./collection-matcher');
const { hasCover, coverSrc } = require('./cover-path');

const DATA_DIR = path.join(__dirname, '..', '..', 'src', '_data');
const CONFIG_DIR = path.join(DATA_DIR, 'collections');
const STATIC_DIR = path.join(__dirname, '..', '..', 'src', 'collections');

// input: { books, wings, curated, staticSlugs, redirects }
//   books       every catalogue row, stamped with `collection` (its wing)
//   wings       wings.json as loaded; only the default and live wings get pages
//   curated     the parsed src/_data/collections/*.json configs
//   staticSlugs slugs of the hand-built pages in src/collections/
//   redirects   redirects.json rows ({ from, to, out })
//
// Throws on config mistakes only. Catalogue data never throws here: CI runs
// nothing but the build, so a tag typed into a CSV must not be able to fail it.
function buildIndex(input, options = {}) {
  const { books = [], curated: rawCurated = [], redirects = [] } = input;
  const staticSlugs = new Set(input.staticSlugs || []);

  // Only published wings get collection pages. An unpublished wing has no
  // landing page to reach them from, so generating them would publish orphan
  // pages for a wing still being catalogued.
  const wings = (input.wings || []).filter(w => w.isDefault || w.live);
  const defaultWing = wings.find(w => w.isDefault).slug;

  // A slug owned by a legacy static page must not be generated (duplicate
  // permalink). Those pages live in the art wing's namespace, so the check only
  // applies there.
  const hasStaticPage = (wing, slug) => wing === defaultWing && staticSlugs.has(slug);

  rawCurated.forEach(cfg => {
    ['slug', 'title', 'matchBy'].forEach(key => {
      if (!cfg[key]) throw new Error(`curated collection "${cfg.slug || cfg.title || '?'}": missing ${key}`);
    });
  });

  // A curated config belongs to the art wing unless its JSON says otherwise.
  // Members are counted for every config, including one still shadowed by a
  // static page: the explore card for that page takes its count from here.
  const curated = rawCurated.map(raw => {
    const cfg = { wing: defaultWing, ...raw };
    const bookIds = books
      .filter(b => (cfg.allWings || b.collection === cfg.wing) && matchesCollection(b, cfg))
      .map(b => b.id);
    return { ...cfg, bookIds, bookCount: bookIds.length, facet: cfg.facet || null, origin: 'curated', listed: true };
  });

  // Dedupe the tag tier per wing: a curated config or static page owns its slug
  // within its wing, and a curated config can declare coversTags to suppress a
  // redundant auto page.
  const tagTier = buildTagCollectionsByWing(books, {
    defaultWing,
    hasCover: options.hasCover || hasCover,
    coverSrc: options.coverSrc || coverSrc,
  });
  const tagCollections = [];

  wings.forEach(wing => {
    const wingCurated = curated.filter(c => c.wing === wing.slug);
    const curatedSlugs = new Set(wingCurated.map(c => c.slug));
    const coveredTags = new Set();
    wingCurated.forEach(c => (c.coversTags || []).forEach(t => coveredTags.add(t.toLowerCase())));

    (tagTier.get(wing.slug) || []).forEach(tc => {
      if (curatedSlugs.has(tc.slug)) return;
      if (hasStaticPage(wing.slug, tc.slug)) return;
      if (tc.sourceTags.some(t => coveredTags.has(t.toLowerCase()))) return;
      tagCollections.push({ ...tc, listed: true });
    });
  });

  const liveCurated = curated.filter(cfg => !hasStaticPage(cfg.wing, cfg.slug));

  // The permalink is part of the page so collections.njk stays wing-agnostic.
  // `scope` is what the template filters books by: the config's wing, or every
  // wing when the config declares allWings (the page still publishes under the
  // config's own wing namespace).
  const pages = [...liveCurated, ...tagCollections].map(cfg => {
    const permalink = cfg.wing === defaultWing
      ? `collections/${cfg.slug}.html`
      : `${cfg.wing}/collections/${cfg.slug}.html`;
    return { ...cfg, scope: cfg.allWings ? '*' : cfg.wing, permalink, url: `/${permalink}` };
  });

  const redirectOuts = new Set(redirects.map(r => r.out));
  const pageByUrl = new Map();
  pages.forEach(page => {
    if (pageByUrl.has(page.url)) {
      throw new Error(`two collections publish at ${page.url}: "${pageByUrl.get(page.url).title}" and "${page.title}"`);
    }
    // The redirect stub and the page would be written to the same file.
    if (redirectOuts.has(page.url)) {
      throw new Error(`collection "${page.title}" publishes at ${page.url}, which redirects.json also writes: remove the redirect row for ${page.url} or the alias that retired it`);
    }
    pageByUrl.set(page.url, page);
  });

  return {
    pages,
    pageByUrl,
    curated,
    tagTier,
    wings,
    defaultWing,
    summary: `${liveCurated.length} curated + ${tagCollections.length} tag collections (${tagCollections.filter(c => c.wing !== defaultWing).length} outside ${defaultWing})`,
  };
}

function loadInput() {
  const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const jsonIn = dir => !fs.existsSync(dir) ? [] : fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const staticSlugs = !fs.existsSync(STATIC_DIR) ? [] : fs.readdirSync(STATIC_DIR)
    .filter(f => /\.(html|njk)$/.test(f))
    .map(f => f.replace(/\.(html|njk)$/, ''));

  return {
    books: loadCatalogSync().data,
    wings: loadWings(),
    curated: jsonIn(CONFIG_DIR).map(f => readJson(path.join(CONFIG_DIR, f))),
    staticSlugs,
    redirects: readJson(path.join(DATA_DIR, 'redirects.json')),
  };
}

let memo = null;

function getIndex() {
  if (!memo) {
    memo = buildIndex(loadInput());
    console.log(`--- collectionConfigs: ${memo.summary}`);
  }
  return memo;
}

function resetIndex() {
  memo = null;
}

module.exports = { buildIndex, getIndex, resetIndex };
