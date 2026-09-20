const { loadCatalogSync, loadWings } = require('../../scripts/utils/catalog');
const { buildTagCollectionsByWing } = require('../../scripts/utils/tag-collections');
const collectionConfigs = require('./collectionConfigs');

// wing slug -> { lowercase tag -> URL of the static collection page for it }.
// book.njk links a tag here when it can, and to the JS search only when it
// can't: a search URL with a query string gives Google nothing to index, and
// 8,000 of them on the book pages were eating the crawl (Search Console,
// "Crawled - currently not indexed", Sep 2026).
//
// A tag that clears the threshold in its wing always has a page at
// <wing>/collections/<slug>.html — auto-generated, or the curated config or
// legacy static page that owns the slug (collectionConfigs dedupes on exactly
// that). The one exception is a tag a curated config absorbs through
// coversTags, which lives at that config's URL instead.
module.exports = function() {
  const wings = loadWings().filter(w => w.isDefault || w.live);
  const defaultWing = wings.find(w => w.isDefault).slug;

  const covering = {};
  collectionConfigs().forEach(cfg => {
    (cfg.coversTags || []).forEach(t => {
      (covering[cfg.wing] = covering[cfg.wing] || {})[t.toLowerCase()] = `/${cfg.permalink}`;
    });
  });

  const tagByWing = buildTagCollectionsByWing(loadCatalogSync().data, { defaultWing });
  const pages = {};
  wings.forEach(wing => {
    const covered = covering[wing.slug] || {};
    const prefix = wing.slug === defaultWing ? '' : `/${wing.slug}`;
    const map = pages[wing.slug] = {};
    (tagByWing.get(wing.slug) || []).forEach(tc => {
      const owner = tc.sourceTags.map(t => covered[t.toLowerCase()]).find(Boolean);
      const url = owner || `${prefix}/collections/${tc.slug}.html`;
      tc.sourceTags.forEach(t => { map[t.toLowerCase()] = url; });
    });
  });
  return pages;
};
