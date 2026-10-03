// Builds auto-generated collections from the books data: one per hand tag, and
// one per record term when the caller passes options.derive.
// A term qualifies for its own collection page when enough books carry it.
// Pure function of (books, options) so it is unit-testable;
// scripts/utils/collections-index.js wires it to the catalogue and dedupes
// against curated configs and legacy static pages.

const { THRESHOLD, FACET_THRESHOLD, TAG_ALIASES, slugifyTag, resolveAlias, facetOf } = require('./tag-vocabulary');
const { describeTerm } = require('./derived-terms');
const { EXCLUSIVE_TAGS } = require('./collection-matcher');
const EXCLUSIVE = new Set(EXCLUSIVE_TAGS.map(slugifyTag));

// Same date priority as the old dynamicCollections enrichment:
// numeric accession year first, publication year as fallback.
function bookDate(book) {
  const a = parseInt(book.accession_no, 10);
  if (!isNaN(a)) return a;
  const y = parseInt(book.publication_year, 10);
  return isNaN(y) ? 0 : y;
}

function hasImageUrl(book) {
  return book.image_url && book.image_url !== 'NULL' && book.image_url.trim() !== '';
}

// options.derive(book) returns the book's record terms (see derived-terms.js).
// They join the same groups as hand tags, so a classification "Photobook" and a
// tag "Photobook" make one page. Without it only hand tags are read.
function buildTagCollections(books, options = {}) {
  const aliases = options.aliases || TAG_ALIASES;
  const hasCover = options.hasCover || hasImageUrl;
  const coverOf = options.coverSrc || (book => book.image_url);
  const derive = options.derive || (() => []);

  // key (slug of the canonical name) ->
  //   { books, hand: ids, derived: ids, casings: Counter, sourceTags: Set, aliasTarget, term }
  // `term` is the first record term that fed the group; it fixes the group's
  // facet, and its slug and title when the rule sets them.
  const groups = new Map();
  const groupFor = key => {
    if (!groups.has(key)) {
      groups.set(key, { books: [], hand: [], derived: [], casings: new Map(), sourceTags: new Set(), aliasTarget: null, term: null });
    }
    return groups.get(key);
  };
  const nameIn = (g, name) => {
    const canonical = resolveAlias(name, aliases);
    if (canonical !== name) {
      g.aliasTarget = canonical;
    } else {
      g.casings.set(name, (g.casings.get(name) || 0) + 1);
    }
  };

  books.forEach(book => {
    // Group keys this book has joined by tag, and from the record.
    const seen = new Set();
    const seenDerived = new Set();

    const tags = (book.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    // An exclusive tag (see collection-matcher) claims the book: it joins only
    // that tag's group, so other tags neither count it toward the threshold
    // nor list it. Keeps bookCount in step with what the page renders.
    const owned = tags.filter(t => EXCLUSIVE.has(slugifyTag(t)));
    (owned.length ? owned : tags).forEach(tag => {
      const key = slugifyTag(resolveAlias(tag, aliases));
      // A tag of nothing but punctuation has no slug, so it could have no URL.
      if (!key) return;
      const g = groupFor(key);
      g.sourceTags.add(tag);
      nameIn(g, tag);
      // A book tagged with two variants of the same canonical tag counts once.
      if (!seen.has(key)) {
        seen.add(key);
        g.books.push(book);
        g.hand.push(book.id);
      }
    });

    // The same claim holds against record terms, except those that name a
    // person: an author page is an identity page.
    derive(book).filter(term => !owned.length || term.exemptFromExclusive).forEach(term => {
      const key = term.slug || slugifyTag(resolveAlias(term.name, aliases));
      if (!key || seenDerived.has(key)) return;
      const g = groupFor(key);
      if (!g.term) g.term = term;
      nameIn(g, term.name);
      // Already listed when one of its tags named the same term.
      if (!seen.has(key)) g.books.push(book);
      seenDerived.add(key);
      g.derived.push(book.id);
    });
  });

  const collections = [];
  groups.forEach((g, key) => {
    // Display name: the alias target when any member name came through an alias,
    // else the most frequent casing (ties go to the first in sort order, so the
    // name does not depend on catalogue row order).
    const display = g.aliasTarget || [...g.casings.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
    // The record's facet wins: a term fed by the author columns is a person
    // whatever TAG_FACETS says about a tag of the same name.
    const facet = g.term ? g.term.facet : facetOf(display);
    if (g.books.length < (options.threshold || FACET_THRESHOLD[facet] || THRESHOLD)) return;

    // Newest first; the id breaks ties so the image is the same on every build.
    const sorted = [...g.books].sort((a, b) => bookDate(b) - bookDate(a) || Number(b.id) - Number(a.id));
    const withCover = sorted.find(hasCover);
    const sourceTags = [...g.sourceTags];
    const rule = g.term && g.term.rule;

    collections.push({
      slug: g.term && g.term.slug ? key : slugifyTag(display),
      title: (g.term && g.term.title) || display,
      description: g.term ? describeTerm(rule, display) : `Every book in the library tagged “${display}.”`,
      // A page fed by the record has no tag rule that reproduces it; its
      // members are bookIds.
      ...(g.term ? {} : { matchBy: { tag: sourceTags } }),
      sourceTags,
      sortBy: rule === 'person' ? 'publicationYearDesc' : 'authorAsc',
      coversFirst: true,
      // Members in catalogue order. The index and the page template read this
      // list, so the count and the page cannot drift apart.
      bookIds: g.books.map(b => b.id),
      bookCount: g.books.length,
      // Which members came by tag and which from the record. A book can be in both.
      members: { hand: g.hand, derived: g.derived },
      image: withCover ? coverOf(withCover) : null,
      featured: false,
      category: 'subject',
      facet,
      origin: !g.term ? 'hand' : g.hand.length ? 'hand+derived' : 'derived',
      ...(rule ? { rule } : {}),
      autoGenerated: true,
    });
  });

  return collections.sort((a, b) => b.bookCount - a.bookCount);
}

// Partitions the catalogue by wing and builds each wing's tag tier on its own
// books, so a tag has to clear the threshold *within* its wing. Without this a
// subject that is common in one wing would auto-publish a collection page
// listing another wing's books. Returns Map<wingSlug, configs[]>, each config
// stamped with its wing.
function buildTagCollectionsByWing(books, options = {}) {
  const defaultWing = options.defaultWing || 'art';
  const byWing = new Map();

  (books || []).forEach(book => {
    const wing = book.collection || defaultWing;
    if (!byWing.has(wing)) byWing.set(wing, []);
    byWing.get(wing).push(book);
  });

  const out = new Map();
  byWing.forEach((wingBooks, wing) => {
    out.set(wing, buildTagCollections(wingBooks, options).map(c => ({ ...c, wing })));
  });
  return out;
}

module.exports = { buildTagCollections, buildTagCollectionsByWing, slugifyTag, TAG_ALIASES, THRESHOLD };
