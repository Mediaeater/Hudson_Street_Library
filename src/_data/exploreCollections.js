const { getIndex } = require('../../scripts/utils/collections-index');

// Card list for the collections explore page and the public JSON endpoint: the
// art wing's listings from the index, flattened. Facet sections first (in
// FACETS order), then curated non-featured, then curated featured (user's call
// on the order).
//
// Other wings list their own collections on their landing page.
//
// A term a curated config owns is left out of its facet section here: the
// config already has its card in the curated group. The two hand-built pages
// with no config (richard-prince, magazines) carry no bookCount.
module.exports = function() {
  const { listings, defaultWing } = getIndex();

  return listings[defaultWing]
    .flatMap(group => group.facet === 'curated'
      ? group.items
      : group.items.filter(item => item.origin !== 'curated'))
    .map(item => ({
      id: item.slug,
      name: item.name,
      slug: item.slug,
      description: item.description,
      category: item.category,
      featured: item.featured,
      image: item.image,
      path: item.url,
      bookCount: item.count,
      facet: item.facet,
      origin: item.origin,
    }));
};
