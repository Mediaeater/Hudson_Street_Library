const { getIndex } = require('../../scripts/utils/collections-index');

// Sections for the collections explore page: the art wing's listings from the
// index, grouped as the index groups them (facets in FACETS order, curated
// last). exploreCollections is the same list flattened for the JSON endpoint.
//
// pageCount counts pages, not entries: a term a curated config owns is listed
// in its facet and in the curated group, and both entries link to one page.
module.exports = function() {
  const { listings, defaultWing } = getIndex();
  const groups = listings[defaultWing];

  return {
    groups,
    pageCount: new Set(groups.flatMap(g => g.items.map(i => i.url))).size,
  };
};
