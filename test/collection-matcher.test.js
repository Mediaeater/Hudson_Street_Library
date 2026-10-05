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

    it('matches by tag (exact, comma-split, case-insensitive)', () => {
      const book = { tags: 'Art, Photography, Zines' };
      const config = { matchBy: { tag: 'photography' } };
      expect(matchesCollection(book, config)).to.be.true;
    });

    it('matches two spellings of one tag by slug and alias, as the index does', () => {
      expect(matchesCollection({ tags: 'Art, Self Portraits' }, { matchBy: { tag: 'Self-Portraits' } })).to.be.true;
      expect(matchesCollection({ tags: 'Catalogue Raisonné' }, { matchBy: { tag: ['catalogue raisonne'] } })).to.be.true;
      expect(matchesCollection({ tags: 'NYC' }, { matchBy: { tag: 'New York City' } })).to.be.true;
      // Still the whole tag.
      expect(matchesCollection({ tags: 'Self Portraits in Oil' }, { matchBy: { tag: 'Self-Portraits' } })).to.be.false;
    });

    it('claims a book for an exclusive tag in any spelling', () => {
      const queer = { tags: 'queer-culture, Photography' };
      expect(matchesCollection(queer, { matchBy: { tag: 'Photography' } })).to.be.false;
      expect(matchesCollection(queer, { matchBy: { tag: 'Queer Culture' } })).to.be.true;
    });

    it('rejects tag substring matches', () => {
      const book = { tags: 'Appropriation Art, Contemporary Art' };
      const config = { matchBy: { tag: 'Art' } };
      expect(matchesCollection(book, config)).to.be.false;
    });

    it('rejects tag match against empty tags', () => {
      const book = { title: 'Untagged' };
      const config = { matchBy: { tag: 'Art' } };
      expect(matchesCollection(book, config)).to.be.false;
    });

    it('matches by authorLast', () => {
      const book = { author_last: 'Prince', title: 'Cowboys' };
      const config = { matchBy: { authorLast: 'Prince' } };
      expect(matchesCollection(book, config)).to.be.true;
    });

    it('matches an anchored titleRegex only at the start of the title', () => {
      const config = { matchBy: { titleRegex: '^AFM\\b' } };
      expect(matchesCollection({ title: 'AFM Issue 2' }, config)).to.be.true;
      expect(matchesCollection({ title: 'afm no. 3' }, config)).to.be.true;
      expect(matchesCollection({ title: 'Jon Rafman' }, config)).to.be.false;
      expect(matchesCollection({ title: 'AFMagazine' }, config)).to.be.false;
    });

    it('throws on an unknown matchBy rule', () => {
      const book = { title: 'Apartamento Issue 36', tags: 'Magazines' };
      expect(() => matchesCollection(book, { slug: 'apartamento', matchBy: { titleContains: 'apartamento' } }))
        .to.throw('collection "apartamento": unknown matchBy rule "titleContains"');
      expect(() => matchesCollection(book, { slug: 'gay', matchBy: { keywords: ['gay'] } }))
        .to.throw('unknown matchBy rule "keywords"');
    });

    it('matches a person by the author columns or a same-name hand tag', () => {
      const config = { matchBy: { person: 'Richard Prince' } };
      expect(matchesCollection({ author_first: 'Richard', author_last: 'Prince' }, config)).to.be.true;
      expect(matchesCollection({ author_first: 'Roy', author_last: 'Lichtenstein', tags: 'Pop Art, Richard Prince' }, config)).to.be.true;
    });

    it('does not match a person on the surname or a mention alone', () => {
      const config = { matchBy: { person: 'Richard Prince' } };
      expect(matchesCollection({ author_first: 'Seth', author_last: 'Price', title: 'After Richard Prince' }, config)).to.be.false;
      expect(matchesCollection({ author_first: 'Harry', author_last: 'Prince' }, config)).to.be.false;
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
    describe('exclusive tags (a Queer Culture book shows only in Queer Culture)', () => {
      const queer = { tags: 'Photography, Queer Culture, Magazines', collection_grouping: 'Magazines', title: 'BUTT Magazine #3', author_last: 'Jonkers', description: 'gay magazine' };

      it('matches the exclusive tag\'s own collection', () => {
        expect(matchesCollection(queer, { matchBy: { tag: 'Queer Culture' } })).to.be.true;
        expect(matchesCollection(queer, { matchBy: { tag: ['queer culture', 'LGBTQ'] } })).to.be.true;
      });

      it('is excluded from every other tag collection', () => {
        expect(matchesCollection(queer, { matchBy: { tag: 'Photography' } })).to.be.false;
        expect(matchesCollection(queer, { matchBy: { tag: ['Magazines'] } })).to.be.false;
      });

      it('is excluded from grouping collections', () => {
        expect(matchesCollection(queer, { matchBy: { collection_grouping: 'Magazines' } })).to.be.false;
        const plain = { ...queer, tags: 'Photography, Magazines' };
        expect(matchesCollection(plain, { matchBy: { collection_grouping: 'Magazines' } })).to.be.true;
      });

      it('still matches identity collections (title, author)', () => {
        expect(matchesCollection(queer, { matchBy: { titleRegex: '^BUTT Magazine' } })).to.be.true;
        expect(matchesCollection(queer, { matchBy: { authorLast: 'Jonkers' } })).to.be.true;
      });

      it('leaves books without the exclusive tag alone', () => {
        const plain = { tags: 'Photography, Magazines' };
        expect(matchesCollection(plain, { matchBy: { tag: 'Photography' } })).to.be.true;
      });
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
