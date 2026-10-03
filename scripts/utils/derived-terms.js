// Record terms: collection terms computed from three catalogue columns
// (publication year, author, classification) rather than typed as tags. Nothing
// here is written to a CSV. Every term carries origin: 'derived' so the page can
// say where its list comes from.
//
// Each rule reads one column and matches it exactly. A row the rule would have
// to guess at produces no term.

// A cell holding more than one name, or a note, is not a person.
const NOT_ONE_NAME = /[,&;\/()]|\band\b/i;
// Placeholders the catalogue uses where there is no single author.
const PLACEHOLDER = /^(anonymous|various|artists|unknown|na|va)$/i;

function published(book) {
  const year = (book.publication_year || '').trim();
  if (!/^\d{4}$/.test(year)) return null;
  const decade = `${year.slice(0, 3)}0s`;
  return {
    origin: 'derived',
    rule: 'published',
    facet: 'published',
    name: decade,
    // A hand tag "1980s" says what a book is about. The prefix keeps the two
    // from sharing a page.
    slug: `published-${decade}`,
    title: `Published in the ${decade}`,
  };
}

function person(book) {
  const first = (book.author_first || '').trim();
  const last = (book.author_last || '').trim();
  if (!first || !last) return null;
  if (first.toLowerCase() === last.toLowerCase()) return null;
  if ([first, last].some(cell => NOT_ONE_NAME.test(cell) || PLACEHOLDER.test(cell))) return null;
  // An author page is an identity page, so an exclusive tag does not claim the
  // book away from it (see EXCLUSIVE_TAGS in collection-matcher).
  return { origin: 'derived', rule: 'person', facet: 'person', name: `${first} ${last}`, exemptFromExclusive: true };
}

function form(book, wing) {
  const classification = (book.classification || '').trim();
  if (!classification || !wing || !(wing.classifications || []).includes(classification)) return null;
  return { origin: 'derived', rule: 'form', facet: 'format', name: classification };
}

// wing: the book's entry in wings.json (its `classifications` is the list of
// forms the wing recognises).
function derivedTerms(book, wing) {
  return [published(book), person(book), form(book, wing)].filter(Boolean);
}

// The sentence under a record term's page title. `name` is the term's display
// name ("1980s", "Wolfgang Tillmans", "Photobook"). byTagAlone is true when a
// member of a person's page came by tag and not from its author columns: that
// book is about the person, not by them.
function describeTerm(rule, name, byTagAlone = false) {
  if (rule === 'published') {
    const from = parseInt(name, 10);
    return `Books in the library published between ${from} and ${from + 9}, taken from the publication year on each record.`;
  }
  if (rule === 'person' && byTagAlone) {
    return `Books in the library by or about ${name}, taken from the author on each record or from a tag.`;
  }
  if (rule === 'person') return `Books in the library by ${name}, taken from the author on each record.`;
  return `Books in the library catalogued as ${name}, by classification or by tag.`;
}

module.exports = { derivedTerms, describeTerm };
