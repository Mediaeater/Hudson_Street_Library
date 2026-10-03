const { getIndex } = require('../../scripts/utils/collections-index');

// The A-Z list on /tags/: every hand tag in the art wing that two or more
// books carry, by name. A tag on a single book is left off; it is still on
// that book's page. The two-book cutoff reads handCount, the books carrying
// the tag in this wing after aliases and exclusivity.
//
// A term with a collection page links to it, and its count is the number of
// books that page lists. A term without one links to the search and has no
// count: the search runs over every wing and ignores exclusive tags and
// aliases, so no number computed here would match what it returns.
//
// letters groups the same terms under 0-9 and A-Z. The letter comes from the
// slug, which is already transliterated, so an accented initial files under
// its plain letter.
module.exports = function() {
  const { termsByWing, defaultWing } = getIndex();
  const terms = termsByWing[defaultWing]
    .filter(t => t.handCount >= 2)
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.name.localeCompare(b.name));

  const letters = [];
  terms.forEach(term => {
    const letter = /^[a-z]/.test(term.slug) ? term.slug[0].toUpperCase() : '0-9';
    const last = letters[letters.length - 1];
    if (last && last.letter === letter) last.terms.push(term);
    else letters.push({ letter, terms: [term] });
  });

  return { terms, letters, count: terms.length };
};
