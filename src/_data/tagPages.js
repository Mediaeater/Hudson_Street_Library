const { getIndex } = require('../../scripts/utils/collections-index');

// wing slug -> { lowercase tag -> URL of the collection page that owns it }.
// Every tag spelling that clears the threshold in its wing and has a link
// target in the index. scripts/verify-views.js reads this to check each URL was
// built. Book pages do not: they ask the tagUrl filter, which also checks that
// the page lists the book.
module.exports = function() {
  const { tagTier, tagTargets, wings } = getIndex();

  const pages = {};
  wings.forEach(wing => {
    const map = pages[wing.slug] = {};
    (tagTier.get(wing.slug) || []).forEach(tc => {
      const target = tagTargets[wing.slug].get(tc.slug);
      if (target) tc.sourceTags.forEach(t => { map[t.toLowerCase()] = target.url; });
    });
  });
  return pages;
};
