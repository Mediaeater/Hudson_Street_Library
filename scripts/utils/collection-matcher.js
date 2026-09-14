// Tags that own their books outright. A book carrying one of these appears in
// that tag's collection and in no other subject collection (tag, grouping or
// keyword driven, curated or auto-generated). Collections that name a specific
// title or author (BUTT, Purple, Richard Prince) are identity pages, not
// subject pages, and are not affected. Rule set 2026-09-13: a book tagged
// Queer Culture shows only in the Queer Culture collection.
const EXCLUSIVE_TAGS = ['Queer Culture'];

const SUBJECT_RULES = ['tag', 'collection_grouping', 'keywords'];

function splitTags(book) {
  return (book.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}

// True when the book carries an exclusive tag that this config does not name.
function claimedElsewhere(book, rule) {
  if (!SUBJECT_RULES.some(k => rule[k])) return false;
  const bookTags = splitTags(book);
  const owned = EXCLUSIVE_TAGS.map(t => t.toLowerCase()).filter(t => bookTags.includes(t));
  if (!owned.length) return false;
  const wanted = (Array.isArray(rule.tag) ? rule.tag : rule.tag ? [rule.tag] : []).map(t => t.toLowerCase());
  return !owned.some(t => wanted.includes(t));
}

function matchesCollection(book, config) {
  const rule = config.matchBy || {};
  if (claimedElsewhere(book, rule)) return false;
  if (rule.collection_grouping) {
    return (book.collection_grouping || '').trim() === rule.collection_grouping;
  }
  if (rule.tag) {
    // Exact match against the comma-split tag list. Substring matching here
    // sweeps in wrong books ("Art" would match "Appropriation Art").
    // Accepts a string or an array of variants (tag aliases).
    const wanted = (Array.isArray(rule.tag) ? rule.tag : [rule.tag]).map(t => t.toLowerCase());
    const bookTags = splitTags(book);
    return wanted.some(w => bookTags.includes(w));
  }
  if (rule.authorLast) {
    return (book.author_last || '').trim() === rule.authorLast;
  }
  if (rule.titleContains) {
    return (book.title || '').toLowerCase().includes(rule.titleContains.toLowerCase());
  }
  if (rule.titleRegex) {
    return new RegExp(rule.titleRegex, 'i').test(book.title || '');
  }
  if (rule.keywords) {
    const hay = [book.title, book.tags, book.classification, book.description, book.collection_grouping]
      .map(s => (s || '').toLowerCase()).join(' ');
    return rule.keywords.some(k => hay.includes(k.toLowerCase()));
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
