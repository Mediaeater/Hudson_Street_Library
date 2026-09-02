const { loadCatalogSync, loadWings } = require('../../scripts/utils/catalog');
const { matchesCollection } = require('../../scripts/utils/collection-matcher');
const collectionConfigs = require('./collectionConfigs');

// Pagination source for src/wings.njk — one landing page per wing that is not
// the default and has gone live. A wing stays unpublished until its `live` flag
// flips, so the wings declared in wings.json with no rows yet produce no page
// and no dead links; the art wing is excluded because its landing page is the
// site homepage.
//
// This is also the source for the homepage "Other wings" strip, so name, url
// and itemCount are resolved once here rather than in two templates.
module.exports = function() {
  const books = loadCatalogSync().data;
  const configs = collectionConfigs();

  const wings = loadWings().filter(w => !w.isDefault && w.live);

  const pages = wings.map(wing => {
    const wingBooks = books.filter(b => b.collection === wing.slug);

    // Auto tag collections already carry a count; curated configs don't, so
    // count them the same way the explore page does.
    const wingCollections = configs
      .filter(c => c.wing === wing.slug)
      .map(c => ({
        slug: c.slug,
        title: c.title,
        description: c.description || '',
        url: `/${c.permalink}`,
        image: c.image || null,
        count: c.bookCount != null
          ? c.bookCount
          : wingBooks.filter(b => matchesCollection(b, c)).length,
      }))
      .sort((a, b) => b.count - a.count);

    // featuredTags names collections by title; anything that doesn't resolve is
    // dropped rather than rendered as a dead link.
    const byTitle = new Map(wingCollections.map(c => [c.title.toLowerCase(), c]));
    const featured = (wing.featuredTags || [])
      .map(t => byTitle.get(String(t).toLowerCase()))
      .filter(Boolean);
    const featuredSlugs = new Set(featured.map(c => c.slug));

    return {
      ...wing,
      url: `/${wing.slug}/`,
      permalink: `${wing.slug}/index.html`,
      itemCount: wingBooks.length,
      featured,
      collections: wingCollections.filter(c => !featuredSlugs.has(c.slug)),
    };
  });

  console.log(`--- wingPages: ${pages.length} live wing landing page(s)${pages.length ? ': ' + pages.map(p => p.slug).join(', ') : ''}`);
  return pages;
};
