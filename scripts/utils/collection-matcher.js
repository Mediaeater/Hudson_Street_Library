// Tags that own their books outright. A book carrying one of these appears in
// that tag's collection and in no other subject collection (tag or grouping
// driven, curated or auto-generated). Collections that name a specific
// title or author (BUTT, Purple, Richard Prince) are identity pages, not
// subject pages, and are not affected. Rule set 2026-09-13: a book tagged
// Queer Culture shows only in the Queer Culture collection.
const { slugifyTag, resolveAlias } = require('./tag-vocabulary');

const EXCLUSIVE_TAGS = ['Queer Culture'];

const SUBJECT_RULES = ['tag', 'collection_grouping'];

// Every rule matches one column exactly, or the title by regex. There is no
// substring or keyword rule: both swept in books that only mentioned the word.
const RULES = ['collection_grouping', 'tag', 'authorLast', 'person', 'titleRegex'];

// Two spellings are one tag when they resolve to the same slug, the key the
// index uses for ownership. Still an exact match on the whole tag.
const tagKey = tag => slugifyTag(resolveAlias(String(tag).trim()));
const tagKeys = tags => [].concat(tags || []).map(tagKey).filter(Boolean);

function splitTags(book) {
  return tagKeys((book.tags || '').split(','));
}

// True when the book carries an exclusive tag that this config does not name.
function claimedElsewhere(book, rule) {
  if (!SUBJECT_RULES.some(k => rule[k])) return false;
  const bookTags = splitTags(book);
  const owned = tagKeys(EXCLUSIVE_TAGS).filter(t => bookTags.includes(t));
  if (!owned.length) return false;
  const wanted = tagKeys(rule.tag);
  return !owned.some(t => wanted.includes(t));
}

function matchesCollection(book, config) {
  const rule = config.matchBy || {};
  for (const k of Object.keys(rule)) {
    if (!RULES.includes(k)) throw new Error(`collection "${config.slug}": unknown matchBy rule "${k}"`);
  }
  if (claimedElsewhere(book, rule)) return false;
  if (rule.collection_grouping) {
    return (book.collection_grouping || '').trim() === rule.collection_grouping;
  }
  if (rule.tag) {
    // Exact match against the comma-split tag list. Substring matching here
    // sweeps in wrong books ("Art" would match "Appropriation Art").
    // Accepts a string or an array of variants (tag aliases).
    const wanted = tagKeys(rule.tag);
    const bookTags = splitTags(book);
    return wanted.some(w => bookTags.includes(w));
  }
  if (rule.authorLast) {
    return (book.author_last || '').trim() === rule.authorLast;
  }
  if (rule.person) {
    // By or about one person: the author columns spell the name, or a hand tag
    // does. The same two sources as a generated author page (derived-terms).
    const author = `${(book.author_first || '').trim()} ${(book.author_last || '').trim()}`;
    return author === rule.person || splitTags(book).includes(tagKey(rule.person));
  }
  if (rule.titleRegex) {
    return new RegExp(rule.titleRegex, 'i').test(book.title || '');
  }
  return false;
}

function assignSection(book, config) {
  if (!config.sections || !config.sections.length) return null;
  for (const section of config.sections) {
    const f = section.filter || {};
    if (f.titleRegex && new RegExp(f.titleRegex).test(book.title || '')) {
      return section.label;
    }
    if (f.publicationYearRange) {
      const y = parseInt(book.publication_year, 10);
      const [lo, hi] = f.publicationYearRange;
      if (!isNaN(y) && y >= lo && y <= hi) return section.label;
    }
  }
  return 'Other';
}

module.exports = { matchesCollection, assignSection, EXCLUSIVE_TAGS };
