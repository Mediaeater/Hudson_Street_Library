const { expect } = require('chai');
const { matchesCollection, assignSection } = require('../scripts/utils/collection-matcher');

describe('collection-matcher', () => {
  describe('matchesCollection', () => {
    it('matches by collection_grouping exact', () => {
      const book = { collection_grouping: 'Magazines', title: 'Purple Magazine Issue 42: The Magic Issue' };
      const config = { matchBy: { collection_grouping: 'Magazines' } };
      expect(matchesCollection(book, config)).to.be.true;
    });

    it('rejects non-matching collection_grouping', () => {
      const book = { collection_grouping: 'Art', title: 'Something' };
      const config = { matchBy: { collection_grouping: 'Magazines' } };
      expect(matchesCollection(book, config)).to.be.false;
    });

    it('matches by authorLast', () => {
      const book = { author_last: 'Prince', title: 'Cowboys' };
      const config = { matchBy: { authorLast: 'Prince' } };
      expect(matchesCollection(book, config)).to.be.true;
    });

    it('matches by titleContains (case-insensitive)', () => {
      const book = { title: 'Apartamento Issue 36' };
      const config = { matchBy: { titleContains: 'apartamento' } };
      expect(matchesCollection(book, config)).to.be.true;
    });

    it('matches by titleRegex', () => {
      const book = { title: 'Purple Fashion Magazine Issue 17 (Volume III)' };
      const config = { matchBy: { titleRegex: '^Purple (Fashion Magazine|Magazine Issue)' } };
      expect(matchesCollection(book, config)).to.be.true;
    });

    it('rejects titleRegex non-match', () => {
      const book = { title: 'Apartamento Issue 36' };
      const config = { matchBy: { titleRegex: '^Purple' } };
      expect(matchesCollection(book, config)).to.be.false;
    });
  });

  describe('assignSection', () => {
    const config = {
      sections: [
        { label: 'Volume V', filter: { titleRegex: 'Issue (3[4-9]|4[0-5])' } },
        { label: 'Volume IV', filter: { titleRegex: 'Issue (28|29|3[0-3])' } }
      ]
    };

    it('assigns first matching section', () => {
      expect(assignSection({ title: 'Purple Issue 42' }, config)).to.equal('Volume V');
    });

    it('returns "Other" when no section matches', () => {
      expect(assignSection({ title: 'Purple Issue 99' }, config)).to.equal('Other');
    });

    it('returns null when config has no sections', () => {
      expect(assignSection({ title: 'X' }, {})).to.be.null;
    });
  });
});
