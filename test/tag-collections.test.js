const { expect } = require('chai');
const { buildTagCollections, slugifyTag } = require('../scripts/utils/tag-collections');

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

    it('sorts collections by book count descending', () => {
      const books = [
        book(1, 'Art, Punk'), book(2, 'Art, Punk'), book(3, 'Art'),
      ];
      const out = buildTagCollections(books, { threshold: 2, aliases: {} });
      expect(out.map(c => c.title)).to.deep.equal(['Art', 'Punk']);
    });
  });

  describe('slugifyTag', () => {
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
