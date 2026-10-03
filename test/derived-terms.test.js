const { expect } = require('chai');
const { derivedTerms, describeTerm } = require('../scripts/utils/derived-terms');
const { buildTagCollections } = require('../scripts/utils/tag-collections');

const wing = { slug: 'art', classifications: ['Photobook', 'Zine'] };
const rules = (book, w = wing) => derivedTerms(book, w).map(t => t.rule);
const only = (book, rule) => derivedTerms(book, wing).find(t => t.rule === rule);

describe('derived-terms', () => {
  it('stamps every term with origin derived and its rule', () => {
    const terms = derivedTerms({ publication_year: '1987', author_first: 'Wolfgang', author_last: 'Tillmans', classification: 'Photobook' }, wing);
    expect(terms.map(t => t.rule)).to.deep.equal(['published', 'person', 'form']);
    terms.forEach(t => expect(t.origin).to.equal('derived'));
  });

  describe('published', () => {
    it('turns a four-digit year into its decade, with a slug apart from the hand tag', () => {
      expect(only({ publication_year: '1987' }, 'published')).to.deep.equal({
        origin: 'derived', rule: 'published', facet: 'published',
        name: '1980s', slug: 'published-1980s', title: 'Published in the 1980s',
      });
      expect(only({ publication_year: ' 2020 ' }, 'published').name).to.equal('2020s');
    });

    it('gives nothing for a year it would have to guess at', () => {
      ['', '1987?', 'c. 1987', '1987-1989', '87', '19870', 'n.d.'].forEach(y => {
        expect(rules({ publication_year: y }), y).to.deep.equal([]);
      });
      expect(rules({})).to.deep.equal([]);
    });
  });

  describe('person', () => {
    const person = (first, last) => only({ author_first: first, author_last: last }, 'person');

    it('names the author from both cells and is exempt from exclusive tags', () => {
      expect(person('Wolfgang', 'Tillmans')).to.deep.equal({
        origin: 'derived', rule: 'person', facet: 'person', name: 'Wolfgang Tillmans', exemptFromExclusive: true,
      });
      expect(person(' Torbjørn ', 'Rødland').name).to.equal('Torbjørn Rødland');
      // "and" inside a name is not the word "and".
      expect(person('Andy', 'Warhol').name).to.equal('Andy Warhol');
      expect(person('Nan', 'Goldin').name).to.equal('Nan Goldin');
    });

    it('skips a row with an empty cell', () => {
      expect(person('', 'BUTT')).to.be.undefined;
      expect(person('Madonna', '')).to.be.undefined;
    });

    it('skips placeholders', () => {
      expect(person('NA', 'VA')).to.be.undefined;
      expect(person('Anonymous', 'Anonymous')).to.be.undefined;
      expect(person('Various', 'Artists')).to.be.undefined;
      expect(person('John', 'Unknown')).to.be.undefined;
      // Each placeholder on its own, beside a cell that would pass.
      expect(person('Anonymous', 'Smith')).to.be.undefined;
      expect(person('NA', 'Smith')).to.be.undefined;
      expect(person('Various', 'Smith')).to.be.undefined;
    });

    it('skips cells that hold more than one name', () => {
      expect(person('Peter', 'Fischli & David Weiss')).to.be.undefined;
      expect(person('Robert', 'Mapplethorpe, Nigel Shafran, Pierre')).to.be.undefined;
      expect(person('Gilbert and George', 'Passmore')).to.be.undefined;
      expect(person('Bernd; Hilla', 'Becher')).to.be.undefined;
      expect(person('Bernd/Hilla', 'Becher')).to.be.undefined;
      expect(person('Richard', 'Prince (ed.)')).to.be.undefined;
      expect(person('Richard', 'Prince ed.)')).to.be.undefined;
    });

    it('skips a row whose two cells are the same', () => {
      expect(person('Apartamento', 'apartamento')).to.be.undefined;
    });
  });

  describe('form', () => {
    it('takes a classification the wing declares', () => {
      expect(only({ classification: 'Photobook' }, 'form')).to.deep.equal({
        origin: 'derived', rule: 'form', facet: 'format', name: 'Photobook',
      });
    });

    it('gives nothing for a classification outside the wing list, or with no wing', () => {
      expect(rules({ classification: 'Manual' })).to.deep.equal([]);
      expect(rules({ classification: 'photobook' })).to.deep.equal([]);
      expect(rules({ classification: '' })).to.deep.equal([]);
      expect(derivedTerms({ classification: 'Photobook' })).to.deep.equal([]);
      expect(rules({ classification: 'Photobook' }, { slug: 'bare' })).to.deep.equal([]);
    });
  });

  describe('describeTerm', () => {
    it('writes one sentence per rule', () => {
      expect(describeTerm('published', '1980s')).to.equal('Books in the library published between 1980 and 1989, taken from the publication year on each record.');
      expect(describeTerm('person', 'Wolfgang Tillmans')).to.equal('Books in the library by Wolfgang Tillmans, taken from the author on each record.');
      expect(describeTerm('form', 'Photobook')).to.equal('Books in the library catalogued as Photobook, by classification or by tag.');
    });

    it('says "by or about" for a person only when a member came by tag alone', () => {
      expect(describeTerm('person', 'Edward Ruscha', true))
        .to.equal('Books in the library by or about Edward Ruscha, taken from the author on each record or from a tag.');
      expect(describeTerm('person', 'Edward Ruscha', false)).to.equal(describeTerm('person', 'Edward Ruscha'));
      expect(describeTerm('published', '1980s', true)).to.equal(describeTerm('published', '1980s'));
    });
  });

  describe('buildTagCollections with options.derive', () => {
    const derive = book => derivedTerms(book, wing);
    const tillmans = (id, extra = {}) => ({ id: String(id), tags: '', author_first: 'Wolfgang', author_last: 'Tillmans', ...extra });
    const bySlug = (books, options = {}) => new Map(buildTagCollections(books, { derive, aliases: {}, ...options }).map(c => [c.slug, c]));

    it('publishes a person page at the person threshold, newest first, with no tag rule', () => {
      const out = bySlug(Array.from({ length: 8 }, (_, i) => tillmans(i + 1)));
      const page = out.get('wolfgang-tillmans');
      expect(page).to.include({ title: 'Wolfgang Tillmans', facet: 'person', origin: 'derived', rule: 'person', sortBy: 'publicationYearDesc', bookCount: 8 });
      expect(page.description).to.equal('Books in the library by Wolfgang Tillmans, taken from the author on each record.');
      expect(page).to.not.have.property('matchBy');
      expect(page.sourceTags).to.deep.equal([]);
      expect(page.members).to.deep.equal({ hand: [], derived: page.bookIds });
      expect(bySlug(Array.from({ length: 7 }, (_, i) => tillmans(i + 1))).has('wolfgang-tillmans')).to.be.false;
    });

    it('describes a person page as "by or about" when another author\'s book is tagged with the name', () => {
      const own = Array.from({ length: 8 }, (_, i) => tillmans(i + 1));
      // Tagged with his own name: still by him.
      own[0].tags = 'Wolfgang Tillmans';
      const byHim = bySlug(own).get('wolfgang-tillmans');
      expect(byHim.origin).to.equal('hand+derived');
      expect(byHim.description).to.equal('Books in the library by Wolfgang Tillmans, taken from the author on each record.');

      const about = { id: '9', tags: 'Wolfgang Tillmans', author_first: 'Eric', author_last: 'Doeringer' };
      const page = bySlug([...own, about]).get('wolfgang-tillmans');
      expect(page.bookIds).to.include('9');
      expect(page.description).to.equal('Books in the library by or about Wolfgang Tillmans, taken from the author on each record or from a tag.');
    });

    it('keeps the published decade apart from the hand tag of the same decade', () => {
      const books = [
        ...Array.from({ length: 15 }, (_, i) => ({ id: String(i + 1), tags: '1980s', publication_year: '2015' })),
        ...Array.from({ length: 15 }, (_, i) => ({ id: String(i + 101), tags: '', publication_year: '1984' })),
      ];
      const out = bySlug(books);
      expect(out.get('1980s')).to.include({ origin: 'hand', bookCount: 15, title: '1980s' });
      expect(out.get('1980s').matchBy).to.deep.equal({ tag: ['1980s'] });
      expect(out.get('published-1980s')).to.include({ origin: 'derived', facet: 'published', title: 'Published in the 1980s', bookCount: 15, sortBy: 'authorAsc' });
      expect(out.get('published-1980s').bookIds[0]).to.equal('101');
      expect(out.get('published-2010s').bookCount).to.equal(15);
    });

    it('joins a classification and a tag of the same name, counting a book once', () => {
      const books = [
        ...Array.from({ length: 8 }, (_, i) => ({ id: String(i + 1), tags: 'Photobook' })),
        ...Array.from({ length: 6 }, (_, i) => ({ id: String(i + 11), tags: '', classification: 'Photobook' })),
        { id: '20', tags: 'photobook, Photobook', classification: 'Photobook' },
      ];
      const page = bySlug(books).get('photobook');
      expect(page).to.include({ origin: 'hand+derived', facet: 'format', bookCount: 15, title: 'Photobook' });
      expect(page.bookIds).to.deep.equal(books.map(b => b.id));
      expect(page.members.hand).to.have.length(9);
      expect(page.members.derived).to.have.length(7);
      expect(page.sourceTags).to.have.members(['Photobook', 'photobook']);
      expect(page).to.not.have.property('matchBy');
    });

    it('sends a derived name through the aliases, so Zine joins Zines', () => {
      const books = [
        ...Array.from({ length: 10 }, (_, i) => ({ id: String(i + 1), tags: 'Zines' })),
        ...Array.from({ length: 5 }, (_, i) => ({ id: String(i + 11), tags: '', classification: 'Zine' })),
      ];
      const page = bySlug(books, { aliases: { zine: 'Zines' } }).get('zines');
      expect(page).to.include({ title: 'Zines', origin: 'hand+derived', bookCount: 15 });
      expect(page.description).to.equal('Books in the library catalogued as Zines, by classification or by tag.');
    });

    it('lets a hand tag spelling a person join that person, and makes the group a person', () => {
      const books = [
        ...Array.from({ length: 7 }, (_, i) => tillmans(i + 1)),
        { id: '50', tags: 'Wolfgang Tillmans', author_first: 'NA', author_last: 'VA' },
      ];
      const page = bySlug(books).get('wolfgang-tillmans');
      expect(page).to.include({ origin: 'hand+derived', facet: 'person', bookCount: 8 });
      expect(page.members).to.deep.equal({ hand: ['50'], derived: ['1', '2', '3', '4', '5', '6', '7'] });
    });

    it('puts an exclusive book on its person page and on no decade or form page', () => {
      const plain = Array.from({ length: 15 }, (_, i) => tillmans(i + 1, { publication_year: '1995', classification: 'Photobook' }));
      const queer = tillmans(99, { tags: 'Queer Culture, Photobook', publication_year: '1995', classification: 'Photobook' });
      const out = bySlug([...plain, queer]);
      expect(out.get('wolfgang-tillmans').bookIds).to.include('99');
      expect(out.get('wolfgang-tillmans').bookCount).to.equal(16);
      expect(out.get('published-1990s').bookIds).to.not.include('99');
      expect(out.get('photobook').bookIds).to.not.include('99');
      expect(out.get('photobook').bookCount).to.equal(15);
    });

    it('reads hand tags only when no derive is given', () => {
      const books = Array.from({ length: 15 }, (_, i) => tillmans(i + 1, { tags: 'Punk', publication_year: '1995' }));
      const out = buildTagCollections(books);
      expect(out.map(c => c.slug)).to.deep.equal(['punk']);
      expect(out[0]).to.include({ origin: 'hand' });
      expect(out[0].members).to.deep.equal({ hand: out[0].bookIds, derived: [] });
    });
  });
});
