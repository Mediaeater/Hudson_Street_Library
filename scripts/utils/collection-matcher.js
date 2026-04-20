function matchesCollection(book, config) {
  const rule = config.matchBy || {};
  if (rule.collection_grouping) {
    return (book.collection_grouping || '').trim() === rule.collection_grouping;
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

module.exports = { matchesCollection, assignSection };
