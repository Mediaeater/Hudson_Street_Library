const fs = require('fs');
const path = require('path');
const { loadCatalogSync, loadWings } = require('../../scripts/utils/catalog');
const { buildTagCollectionsByWing } = require('../../scripts/utils/tag-collections');

// Pagination source for collections.njk: curated configs plus auto-generated
// tag collections. The art wing publishes at /collections/<slug>.html (where it
// always has); every other wing publishes under its own prefix,
// /<wing>/collections/<slug>.html, and its tag tier is built from its own books
// only — see buildTagCollectionsByWing.
module.exports = function() {
  const dir = path.join(__dirname, 'collections');
  const hardcodedDir = path.join(__dirname, '..', 'collections');

  // A slug owned by a legacy static page must not be generated (duplicate
  // permalink). Those pages live in the art wing's namespace, so the check only
  // applies there.
  const hasStaticPage = slug =>
    fs.existsSync(path.join(hardcodedDir, `${slug}.html`)) ||
    fs.existsSync(path.join(hardcodedDir, `${slug}.njk`));

  // Only published wings get collection pages. An unpublished wing has no
  // landing page to reach them from (wingPages.js applies the same filter), so
  // generating them would publish orphan pages for a wing still being catalogued.
  const wings = loadWings().filter(w => w.isDefault || w.live);
  const defaultWing = wings.find(w => w.isDefault).slug;

  // A curated config belongs to the art wing unless its JSON says otherwise.
  const curated = !fs.existsSync(dir) ? [] : fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ wing: defaultWing, ...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));

  const books = loadCatalogSync().data;

  // Dedupe the tag tier per wing: a curated config or static page owns its slug
  // within its wing, and a curated config can declare coversTags to suppress a
  // redundant auto page.
  const tagByWing = buildTagCollectionsByWing(books, { defaultWing });
  const tagCollections = [];

  wings.forEach(wing => {
    const wingCurated = curated.filter(c => c.wing === wing.slug);
    const curatedSlugs = new Set(wingCurated.map(c => c.slug));
    const coveredTags = new Set();
    wingCurated.forEach(c => (c.coversTags || []).forEach(t => coveredTags.add(t.toLowerCase())));

    (tagByWing.get(wing.slug) || []).forEach(tc => {
      if (curatedSlugs.has(tc.slug)) return;
      if (wing.slug === defaultWing && hasStaticPage(tc.slug)) return;
      if (tc.sourceTags.some(t => coveredTags.has(t.toLowerCase()))) return;
      tagCollections.push(tc);
    });
  });

  const liveCurated = curated.filter(cfg => cfg.wing !== defaultWing || !hasStaticPage(cfg.slug));

  // The permalink is part of the config so collections.njk stays wing-agnostic.
  const withPermalink = cfg => ({
    ...cfg,
    permalink: cfg.wing === defaultWing
      ? `collections/${cfg.slug}.html`
      : `${cfg.wing}/collections/${cfg.slug}.html`,
  });

  const scoped = tagCollections.filter(c => c.wing !== defaultWing).length;
  console.log(`--- collectionConfigs: ${liveCurated.length} curated + ${tagCollections.length} tag collections (${scoped} outside ${defaultWing})`);
  return [...liveCurated, ...tagCollections].map(withPermalink);
};
