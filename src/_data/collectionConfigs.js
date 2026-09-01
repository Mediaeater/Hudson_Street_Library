const fs = require('fs');
const path = require('path');
const { loadCatalogSync } = require('../../scripts/utils/catalog');
const { buildTagCollections } = require('../../scripts/utils/tag-collections');

// Pagination source for collections.njk: curated configs plus auto-generated
// tag collections, one page per entry at /collections/<slug>.html.
module.exports = function() {
  const dir = path.join(__dirname, 'collections');
  const hardcodedDir = path.join(__dirname, '..', 'collections');

  // A slug owned by a legacy static page must not be generated (duplicate permalink).
  const hasStaticPage = slug =>
    fs.existsSync(path.join(hardcodedDir, `${slug}.html`)) ||
    fs.existsSync(path.join(hardcodedDir, `${slug}.njk`));

  const curated = !fs.existsSync(dir) ? [] : fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));

  const books = loadCatalogSync().data;

  // Dedupe the tag tier: a curated config or static page owns its slug, and a
  // curated config can declare coversTags to suppress a redundant auto page.
  const curatedSlugs = new Set(curated.map(c => c.slug));
  const coveredTags = new Set();
  curated.forEach(c => (c.coversTags || []).forEach(t => coveredTags.add(t.toLowerCase())));

  const tagCollections = buildTagCollections(books).filter(tc =>
    !curatedSlugs.has(tc.slug) &&
    !hasStaticPage(tc.slug) &&
    !tc.sourceTags.some(t => coveredTags.has(t.toLowerCase()))
  );

  const liveCurated = curated.filter(cfg => !hasStaticPage(cfg.slug));

  console.log(`--- collectionConfigs: ${liveCurated.length} curated + ${tagCollections.length} tag collections`);
  return [...liveCurated, ...tagCollections];
};
