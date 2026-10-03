const { expect } = require('chai');
const { buildTagCollections, buildTagCollectionsByWing, slugifyTag } = require('../scripts/utils/tag-collections');

const book = (id, tags, extra = {}) => ({ id, tags, ...extra });

describe('tag-collections', () => {
  describe('buildTagCollections', () => {
    it('emits a collection only for tags at or above the threshold', () => {
      const books = [
        book(1, 'Punk, Art'),
        book(2, 'Punk'),
        book(3, 'Punk'),
      ];
      const out = buildTagCollections(books, { threshold: 3, aliases: {} });
      expect(out.map(c => c.title)).to.deep.equal(['Punk']);
      expect(out[0].bookCount).to.equal(3);
    });

    it('merges alias variants into the canonical tag', () => {
      const books = [
        book(1, 'Appropriation'),
        book(2, 'Appropriation Art'),
        book(3, 'Appropriation Art'),
      ];
      const out = buildTagCollections(books, {
        threshold: 3,
        aliases: { 'appropriation': 'Appropriation Art' },
      });
      expect(out).to.have.length(1);
      expect(out[0].title).to.equal('Appropriation Art');
      expect(out[0].bookCount).to.equal(3);
      expect(out[0].matchBy.tag).to.have.members(['Appropriation', 'Appropriation Art']);
    });

    it('counts a book once when it carries two variants of one tag', () => {
      const books = [
        book(1, 'Appropriation, Appropriation Art'),
        book(2, 'Appropriation Art'),
      ];
      const out = buildTagCollections(books, {
        threshold: 2,
        aliases: { 'appropriation': 'Appropriation Art' },
      });
      expect(out[0].bookCount).to.equal(2);
    });

    it('groups casing variants and displays the most frequent casing', () => {
      const books = [
        book(1, 'Collage'),
        book(2, 'Collage'),
        book(3, 'collage'),
      ];
      const out = buildTagCollections(books, { threshold: 3, aliases: {} });
      expect(out[0].title).to.equal('Collage');
      expect(out[0].bookCount).to.equal(3);
    });

    it('picks the newest matched book with a cover as the image', () => {
      const books = [
        book(1, 'Punk', { image_url: '/a.jpg', publication_year: '1990' }),
        book(2, 'Punk', { image_url: '/b.jpg', accession_no: '2026-08-01' }),
        book(3, 'Punk', { image_url: '', accession_no: '2026-08-05' }),
      ];
      const out = buildTagCollections(books, { threshold: 3, aliases: {} });
      expect(out[0].image).to.equal('/b.jpg');
    });

    it('breaks an image tie on date with the highest id', () => {
      const books = [
        book(1, 'Punk', { image_url: '/a.jpg', accession_no: '2026-08-01' }),
        book(3, 'Punk', { image_url: '/c.jpg', accession_no: '2026-01-05' }),
        book(2, 'Punk', { image_url: '/b.jpg', accession_no: '2026-08-09' }),
      ];
      const out = buildTagCollections(books, { threshold: 3, aliases: {} });
      expect(out[0].image).to.equal('/c.jpg');
    });

    it('takes the cover test from options.hasCover', () => {
      const books = [
        book(1, 'Punk', { image_url: '/a.jpg' }),
        book(2, 'Punk', { image_url: '/missing.jpg' }),
      ];
      const out = buildTagCollections(books, {
        threshold: 2, aliases: {}, hasCover: b => b.image_url !== '/missing.jpg',
      });
      expect(out[0].image).to.equal('/a.jpg');
    });

    it('groups spellings that share a slug', () => {
      const books = [
        book(1, 'Black and White'),
        book(2, 'black-and-white'),
        book(3, 'Black and White'),
      ];
      const out = buildTagCollections(books, { threshold: 3, aliases: {} });
      expect(out).to.have.length(1);
      expect(out[0].title).to.equal('Black and White');
      expect(out[0].slug).to.equal('black-and-white');
      expect(out[0].matchBy.tag).to.have.members(['Black and White', 'black-and-white']);
    });

    it('breaks a casing tie the same way whatever the row order', () => {
      const a = buildTagCollections([book(1, 'collage'), book(2, 'Collage')], { threshold: 2, aliases: {} });
      const b = buildTagCollections([book(1, 'Collage'), book(2, 'collage')], { threshold: 2, aliases: {} });
      expect(a[0].title).to.equal(b[0].title);
    });

    it('files Exhibition Catalogue under Exhibition Catalog with the default aliases', () => {
      const books = [
        book(1, 'Exhibition Catalogue'),
        book(2, 'Exhibition Catalog'),
        book(3, 'exhibition catalogs'),
      ];
      const out = buildTagCollections(books, { threshold: 3 });
      expect(out).to.have.length(1);
      expect(out[0].title).to.equal('Exhibition Catalog');
      expect(out[0].slug).to.equal('exhibition-catalog');
      expect(out[0].facet).to.equal('format');
    });

    it('displays the alias target when only variants are present', () => {
      const books = [book(1, 'Portraits'), book(2, 'portrait'), book(3, 'Portrait Photography')];
      const out = buildTagCollections(books, { threshold: 3 });
      expect(out).to.have.length(1);
      expect(out[0].title).to.equal('Portraiture');
      expect(out[0].slug).to.equal('portraiture');
      expect(out[0].bookCount).to.equal(3);
    });

    it('stamps a facet and a hand origin on every collection', () => {
      const books = [book(1, 'Photography, Skiing'), book(2, 'Photography, Skiing')];
      const out = buildTagCollections(books, { threshold: 2 });
      const byTitle = Object.fromEntries(out.map(c => [c.title, c]));
      expect(byTitle.Photography.facet).to.equal('medium');
      expect(byTitle.Skiing.facet).to.equal('theme');
      expect(out.every(c => c.origin === 'hand' && c.category === 'subject')).to.equal(true);
    });

    it('sorts collections by book count descending', () => {
      const books = [
        book(1, 'Art, Punk'), book(2, 'Art, Punk'), book(3, 'Art'),
      ];
      const out = buildTagCollections(books, { threshold: 2, aliases: {} });
      expect(out.map(c => c.title)).to.deep.equal(['Art', 'Punk']);
    });
  });

  describe('buildTagCollectionsByWing', () => {
    const opts = { threshold: 3, aliases: {} };
    const wingBooks = [
      book(1, 'Punk', { collection: 'art' }),
      book(2, 'Punk', { collection: 'art' }),
      book(3, 'Punk', { collection: 'art' }),
      book(4, 'Ciphers', { collection: 'cryptology' }),
      book(5, 'Ciphers', { collection: 'cryptology' }),
      book(6, 'Ciphers', { collection: 'cryptology' }),
    ];

    it('builds each wing\'s tag tier from that wing\'s books only', () => {
      const out = buildTagCollectionsByWing(wingBooks, opts);
      expect([...out.keys()]).to.deep.equal(['art', 'cryptology']);
      expect(out.get('art').map(c => c.title)).to.deep.equal(['Punk']);
      expect(out.get('cryptology').map(c => c.title)).to.deep.equal(['Ciphers']);
    });

    it('stamps the wing on every config it returns', () => {
      const out = buildTagCollectionsByWing(wingBooks, opts);
      expect(out.get('cryptology').every(c => c.wing === 'cryptology')).to.equal(true);
    });

    it('makes a tag clear the threshold within its own wing, not across the catalogue', () => {
      // Four books share "Shared", but no single wing has three of them.
      const split = [
        book(1, 'Shared', { collection: 'art' }),
        book(2, 'Shared', { collection: 'art' }),
        book(3, 'Shared', { collection: 'cryptology' }),
        book(4, 'Shared', { collection: 'cryptology' }),
      ];
      expect(buildTagCollections(split, opts)).to.have.length(1);
      const out = buildTagCollectionsByWing(split, opts);
      expect(out.get('art')).to.have.length(0);
      expect(out.get('cryptology')).to.have.length(0);
    });

    it('counts only same-wing books in a wing\'s collection', () => {
      const mixed = [
        ...wingBooks,
        book(7, 'Punk', { collection: 'cryptology' }),
      ];
      const out = buildTagCollectionsByWing(mixed, opts);
      expect(out.get('art')[0].bookCount).to.equal(3);
      expect(out.get('cryptology').find(c => c.title === 'Punk')).to.equal(undefined);
    });

    it('files a row with no collection under the default wing', () => {
      const out = buildTagCollectionsByWing(
        [book(1, 'Punk'), book(2, 'Punk'), book(3, 'Punk')],
        { ...opts, defaultWing: 'art' }
      );
      expect([...out.keys()]).to.deep.equal(['art']);
    });
  });

  describe('exclusive tags', () => {
    it('counts a Queer Culture book only toward Queer Culture', () => {
      const books = [
        book(1, 'Photography, Queer Culture'),
        book(2, 'Photography, Queer Culture'),
        book(3, 'Photography'),
      ];
      const out = buildTagCollections(books, { threshold: 1, aliases: {} });
      const byTitle = Object.fromEntries(out.map(c => [c.title, c]));
      expect(byTitle['Queer Culture'].bookCount).to.equal(2);
      expect(byTitle['Photography'].bookCount).to.equal(1);
    });
  });

  describe('exclusive tags', () => {
    it('recognises the exclusive tag by slug, not by casing', () => {
      const books = [book(1, 'Photography, queer culture'), book(2, 'Photography')];
      const out = buildTagCollections(books, { threshold: 1, aliases: {} });
      const photography = out.find(c => c.title === 'Photography');
      expect(photography.bookCount).to.equal(1);
    });
  });

  describe('slugifyTag', () => {
    it('drops accents instead of hyphenating them', () => {
      expect(slugifyTag('Comme des Garçons')).to.equal('comme-des-garcons');
    });
    it('transliterates letters that have no accent to drop', () => {
      expect(slugifyTag('Torbjørn Rødland')).to.equal('torbjorn-rodland');
    });
    it('lowercases and hyphenates', () => {
      expect(slugifyTag('New York City')).to.equal('new-york-city');
    });
    it('strips apostrophes instead of hyphenating them', () => {
      expect(slugifyTag("Artists' Books")).to.equal('artists-books');
    });
    it('keeps decades intact', () => {
      expect(slugifyTag('1980s')).to.equal('1980s');
    });
  });
});
