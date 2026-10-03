const { expect } = require('chai');
const { buildIndex, tagUrl } = require('../scripts/utils/collections-index');

const book = (id, collection, tags, extra = {}) => ({ id: String(id), collection, tags, title: `Book ${id}`, ...extra });

// Two wings, one curated config, one static page. Threshold is the real one
// (15), so each tag that should publish gets 15 books.
function fixture(overrides = {}) {
  const run = (from, collection, tags) => Array.from({ length: 15 }, (_, i) => book(from + i, collection, tags));
  return {
    books: [
      ...run(1, 'art', 'Punk, Zines'),
      ...run(101, 'art', 'Magazines'),
      book(200, 'art', 'Punk', { collection_grouping: 'Shelf' }),
      book(201, 'art', '', { collection_grouping: 'Shelf' }),
      ...run(301, 'cryptology', 'Ciphers'),
      book(400, 'cryptology', 'Punk'),
      ...run(501, 'drafts', 'Unseen'),
    ],
    wings: [
      { slug: 'art', isDefault: true },
      { slug: 'cryptology', live: true },
      { slug: 'drafts', live: false },
    ],
    curated: [
      { slug: 'zines', title: 'Zines', matchBy: { collection_grouping: 'Shelf' } },
    ],
    staticSlugs: ['magazines'],
    redirects: [{ from: '/collections/old.html', to: '/collections/punk.html', out: '/collections/old.html' }],
    ...overrides,
  };
}

const noCovers = { hasCover: () => false, coverSrc: () => null };

describe('collections-index', () => {
  describe('buildIndex', () => {
    const index = buildIndex(fixture(), noCovers);
    const urls = index.pages.map(p => p.url);

    it('lists curated pages first, then each live wing\'s tag pages', () => {
      expect(urls).to.deep.equal([
        '/collections/zines.html',
        '/collections/punk.html',
        '/cryptology/collections/ciphers.html',
      ]);
    });

    it('gives a slug to the curated config that has it, not the tag', () => {
      const zines = index.pageByUrl.get('/collections/zines.html');
      expect(zines.origin).to.equal('curated');
      expect(zines.bookIds).to.deep.equal(['200', '201']);
    });

    it('generates no page for a slug a static page owns in the art wing', () => {
      expect(urls).to.not.include('/collections/magazines.html');
      expect(index.tagTier.get('art').map(c => c.slug)).to.include('magazines');
    });

    it('builds nothing for a wing that is not live', () => {
      expect(urls.some(u => u.startsWith('/drafts/'))).to.be.false;
    });

    it('counts a tag inside its own wing only', () => {
      const punk = index.pageByUrl.get('/collections/punk.html');
      expect(punk.bookCount).to.equal(16);
      expect(punk.bookIds).to.not.include('400');
      expect(punk.wing).to.equal('art');
    });

    it('sets bookCount to the number of bookIds on every page, in catalogue order', () => {
      index.pages.forEach(p => expect(p.bookCount, p.url).to.equal(p.bookIds.length));
      const punk = index.pageByUrl.get('/collections/punk.html');
      expect(punk.bookIds).to.deep.equal([...Array.from({ length: 15 }, (_, i) => String(i + 1)), '200']);
    });

    it('stamps url, origin, facet and listed on every page', () => {
      index.pages.forEach(p => {
        expect(p.url).to.equal('/' + p.permalink);
        expect(p.origin).to.be.oneOf(['curated', 'hand']);
        expect(p).to.have.property('facet');
        expect(p.listed).to.be.true;
      });
    });

    it('lets an allWings config reach across wings', () => {
      const input = fixture({ curated: [{ slug: 'punk-all', title: 'Punk All', matchBy: { tag: 'Punk' }, allWings: true }] });
      const page = buildIndex(input, noCovers).pageByUrl.get('/collections/punk-all.html');
      expect(page.scope).to.equal('*');
      expect(page.bookIds).to.include('400');
      expect(page.bookCount).to.equal(17);
    });

    it('uses the cover helpers it is given for a tag page image', () => {
      const withCovers = buildIndex(fixture(), { hasCover: b => b.id === '3', coverSrc: b => `/covers/${b.id}.jpg` });
      expect(withCovers.pageByUrl.get('/collections/punk.html').image).to.equal('/covers/3.jpg');
      expect(index.pageByUrl.get('/collections/punk.html').image).to.be.null;
    });

    it('throws when two configs publish at the same permalink', () => {
      const input = fixture({ curated: [
        { slug: 'zines', title: 'Zines', matchBy: { collection_grouping: 'Shelf' } },
        { slug: 'zines', title: 'Zines Again', matchBy: { tag: 'Zines' } },
      ] });
      expect(() => buildIndex(input, noCovers)).to.throw(/two collections publish at \/collections\/zines\.html/);
    });

    it('throws when a page would overwrite a redirect stub', () => {
      const input = fixture({ redirects: [{ from: '/collections/punk.html', to: '/collections/zines.html', out: '/collections/punk.html' }] });
      expect(() => buildIndex(input, noCovers))
        .to.throw('remove the redirect row for /collections/punk.html or the alias that retired it');
    });

    it('throws on a curated config without slug, title or matchBy', () => {
      const broken = [
        { title: 'No Slug', matchBy: { tag: 'Punk' } },
        { slug: 'no-title', matchBy: { tag: 'Punk' } },
        { slug: 'no-rule', title: 'No Rule' },
      ];
      ['slug', 'title', 'matchBy'].forEach((key, i) => {
        expect(() => buildIndex(fixture({ curated: [broken[i]] }), noCovers)).to.throw(`missing ${key}`);
      });
    });

    it('does not throw on catalogue data', () => {
      const input = fixture();
      input.books.push(book(900, 'art', ',,, !!!, Punk'), { id: '901', collection: 'art' }, book(902, 'nowhere', 'Punk'));
      expect(() => buildIndex(input, noCovers)).to.not.throw();
    });
  });

  describe('tag ownership', () => {
    const run = (from, tags, extra) => Array.from({ length: 15 }, (_, i) => book(from + i, 'art', tags, extra));

    it('gives a tag to the curated config that names it in matchBy.tag, at any count', () => {
      const input = fixture({ curated: [{ slug: 'loud', title: 'Loud', matchBy: { tag: ['Punk', 'Noise'] } }] });
      input.books.push(book(210, 'art', 'noise'));
      const index = buildIndex(input, noCovers);
      expect(index.pageByUrl.has('/collections/punk.html')).to.be.false;
      expect(index.tagTargets.art.get('punk').url).to.equal('/collections/loud.html');
      expect(index.tagTargets.art.get('noise').url).to.equal('/collections/loud.html');
      // Ownership is per wing: cryptology's lone Punk book has nowhere to link.
      expect(index.tagTargets.cryptology.has('punk')).to.be.false;
    });

    it('compares tags by alias and slug, not by spelling', () => {
      const input = fixture({
        books: run(1, 'NYC'),
        curated: [{ slug: 'the-city', title: 'The City', matchBy: { tag: 'new york city' } }],
      });
      const index = buildIndex(input, noCovers);
      expect(index.pages.map(p => p.url)).to.deep.equal(['/collections/the-city.html']);
      expect(index.tagTargets.art.get('new-york-city').url).to.equal('/collections/the-city.html');
    });

    it('makes a curated config the link target of the tag that shares its slug', () => {
      const index = buildIndex(fixture(), noCovers);
      const zines = index.tagTargets.art.get('zines');
      expect(zines.url).to.equal('/collections/zines.html');
      expect([...zines.ids]).to.deep.equal(['200', '201']);
    });

    it('gives no link target to a tag whose slug a static page owns', () => {
      const index = buildIndex(fixture(), noCovers);
      expect(index.tagTargets.art.has('magazines')).to.be.false;
    });

    it('throws when a config still carries coversTags', () => {
      const input = fixture({ curated: [{ slug: 'zines', title: 'Zines', matchBy: { collection_grouping: 'Shelf' }, coversTags: ['Zines'] }] });
      expect(() => buildIndex(input, noCovers)).to.throw('curated collection "zines": coversTags is retired');
    });

    it('throws when two configs in a wing name the same tag', () => {
      const input = fixture({ curated: [
        { slug: 'one', title: 'One', matchBy: { tag: 'Punk' } },
        { slug: 'two', title: 'Two', matchBy: { tag: ['Zines', 'punk'] } },
      ] });
      expect(() => buildIndex(input, noCovers)).to.throw('"one" and "two" both name the tag "punk"');
    });
  });

  describe('tagUrl', () => {
    const run = (from, tags, extra) => Array.from({ length: 15 }, (_, i) => book(from + i, 'art', tags, extra));
    const books = [
      ...run(1, 'Photography, Collage', { collection_grouping: 'Collage' }),
      ...run(101, 'Photography'),
      book(200, 'art', 'Collage, Photography'),
      book(201, 'art', 'Queer Culture, Photography, Collage', { collection_grouping: 'Collage' }),
      book(300, 'cryptology', 'Photography'),
    ];
    const index = buildIndex(fixture({
      books,
      curated: [
        { slug: 'collage-collections', title: 'Collage', matchBy: { collection_grouping: 'Collage' } },
        { slug: 'queer-culture', title: 'Queer Culture', matchBy: { tag: 'Queer Culture' } },
      ],
      staticSlugs: [],
    }), noCovers);
    const byId = id => books.find(b => b.id === id);

    it('links a tag to the page that lists the book', () => {
      expect(tagUrl('Photography', byId('1'), index)).to.equal('/collections/photography.html');
      expect(tagUrl('photography', byId('1'), index)).to.equal('/collections/photography.html');
    });

    it('links a Collage-tagged book outside the Collage shelf to the generated Collage page', () => {
      expect(index.pageByUrl.get('/collections/collage-collections.html').bookIds).to.not.include('200');
      expect(tagUrl('Collage', byId('200'), index)).to.equal('/collections/collage.html');
    });

    it('returns no link for the other tags of a Queer Culture book', () => {
      const queer = byId('201');
      expect(tagUrl('Queer Culture', queer, index)).to.equal('/collections/queer-culture.html');
      expect(tagUrl('Photography', queer, index)).to.equal('');
      expect(tagUrl('Collage', queer, index)).to.equal('');
    });

    it('returns no link for a tag with no page in the book\'s wing', () => {
      expect(tagUrl('Photography', byId('300'), index)).to.equal('');
      expect(tagUrl('Nothing', byId('1'), index)).to.equal('');
      expect(tagUrl('!!!', byId('1'), index)).to.equal('');
    });
  });
});
