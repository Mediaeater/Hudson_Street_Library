const { expect } = require('chai');
const { buildIndex, tagUrl, recordLinks } = require('../scripts/utils/collections-index');

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
        expect(p.origin).to.be.oneOf(['curated', 'hand', 'hand+derived', 'derived']);
        expect(p).to.have.property('facet');
        expect(p.listed).to.be.a('boolean');
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

    it('throws when a curated page would overwrite a redirect stub', () => {
      const input = fixture({ redirects: [{ from: '/collections/zines.html', to: '/collections/punk.html', out: '/collections/zines.html' }] });
      expect(() => buildIndex(input, noCovers))
        .to.throw('remove the redirect row for /collections/zines.html or the alias that retired it');
    });

    it('skips a generated page whose URL is a redirect stub, with a warning and no throw', () => {
      const input = fixture({ redirects: [{ from: '/collections/punk.html', to: '/collections/zines.html', out: '/collections/punk.html' }] });
      const warn = console.warn;
      const warnings = [];
      console.warn = msg => warnings.push(msg);
      let index;
      try {
        index = buildIndex(input, noCovers);
      } finally {
        console.warn = warn;
      }
      expect(index.pages.map(p => p.url)).to.deep.equal(['/collections/zines.html', '/cryptology/collections/ciphers.html']);
      // The tag falls back to the search, as a tag below the threshold does.
      expect(index.tagTargets.art.has('punk')).to.be.false;
      expect(index.termsByWing.art.find(t => t.slug === 'punk')).to.include({ url: null, count: null });
      expect(warnings).to.have.length(1);
      expect(warnings[0]).to.include('/collections/punk.html').and.to.include('redirects.json');
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

    it('throws on a matchBy that does not hold exactly one rule', () => {
      const two = { slug: 'two', title: 'Two', matchBy: { tag: 'Punk', collection_grouping: 'Shelf' } };
      const none = { slug: 'none', title: 'None', matchBy: {} };
      expect(() => buildIndex(fixture({ curated: [two] }), noCovers))
        .to.throw('curated collection "two": matchBy takes exactly one rule, found tag, collection_grouping');
      expect(() => buildIndex(fixture({ curated: [none] }), noCovers))
        .to.throw('curated collection "none": matchBy takes exactly one rule, found none');
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

    it('puts a config that names the tag ahead of a config that shares its slug', () => {
      const index = buildIndex(fixture({ curated: [
        { slug: 'punk', title: 'Punk Shelf', matchBy: { collection_grouping: 'Shelf' } },
        { slug: 'loud', title: 'Loud', matchBy: { tag: 'Punk' } },
      ] }), noCovers);
      expect(index.tagTargets.art.get('punk').url).to.equal('/collections/loud.html');
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

  describe('record terms and listing', () => {
    const wings = [
      { slug: 'art', isDefault: true, classifications: ['Photobook'] },
      { slug: 'cryptology', live: true, classifications: ['Manual'] },
    ];
    const by = (first, last) => ({ author_first: first, author_last: last });
    const many = (n, from, collection, tags, extra) => Array.from({ length: n }, (_, i) => book(from + i, collection, tags, extra));
    const books = [
      // A shelf whose books all carry one tag and one author: three pages, one set.
      ...many(8, 1, 'art', 'Menswear', { collection_grouping: 'Matsuda', ...by('Mitsuhiro', 'Matsuda'), publication_year: '1985', classification: 'Photobook' }),
      ...many(7, 11, 'art', 'Menswear', { collection_grouping: 'Matsuda', ...by('Mitsuhiro', 'Matsuda'), publication_year: '1985', classification: 'Manual' }),
      ...many(30, 101, 'art', 'Punk', { publication_year: '1987?' }),
      ...many(8, 201, 'art', 'Queer Culture', { ...by('Peter', 'Hujar'), publication_year: '1985', classification: 'Photobook' }),
      ...many(8, 301, 'art', '', by('Richard', 'Prince')),
      ...many(15, 401, 'cryptology', 'Ciphers', { classification: 'Manual' }),
      book(450, 'cryptology', '', { classification: 'Photobook' }),
    ];
    const index = buildIndex({
      books,
      wings,
      curated: [
        { slug: 'matsuda', title: 'Matsuda Catalogues', matchBy: { collection_grouping: 'Matsuda' } },
        { slug: 'queer-culture', title: 'Queer Culture', matchBy: { tag: 'Queer Culture' } },
      ],
      staticSlugs: ['richard-prince'],
      redirects: [],
    }, noCovers);
    const page = url => index.pageByUrl.get(url);

    it('builds decade, person and form pages beside the hand tags', () => {
      expect(page('/collections/published-1980s.html')).to.include({ origin: 'derived', facet: 'published', bookCount: 15 });
      expect(page('/collections/mitsuhiro-matsuda.html')).to.include({ origin: 'derived', facet: 'person', bookCount: 15 });
      expect(page('/collections/menswear.html')).to.include({ origin: 'hand', bookCount: 15 });
    });

    it('reads a classification against the book\'s own wing', () => {
      // Eight Matsuda books are Photobook; the Hujar books are claimed by Queer Culture.
      expect(index.pageByUrl.has('/collections/photobook.html')).to.be.false;
      expect(index.pageByUrl.has('/collections/manual.html')).to.be.false;
      expect(page('/cryptology/collections/manual.html').bookIds).to.not.include('450');
    });

    it('keeps an exclusive book on its person page and off decade and form pages', () => {
      expect(page('/collections/peter-hujar.html').bookIds).to.include('201');
      expect(page('/collections/published-1980s.html').bookIds).to.not.include('201');
      expect(index.tagTier.get('art').find(c => c.slug === 'photobook')).to.be.undefined;
    });

    it('generates no person page for a slug a static page owns', () => {
      expect(index.pageByUrl.has('/collections/richard-prince.html')).to.be.false;
      expect(index.tagTargets.art.has('richard-prince')).to.be.false;
    });

    it('gives a record page a link target holding every member', () => {
      expect([...index.tagTargets.art.get('published-1980s').ids]).to.deep.equal(page('/collections/published-1980s.html').bookIds);
    });

    describe('recordLinks', () => {
      const links = id => recordLinks(books.find(b => b.id === String(id)), index);

      it('gives classification, decade and author, each linked to a page that lists the book', () => {
        expect(links(401)).to.deep.equal([{ rule: 'form', label: 'Manual', url: '/cryptology/collections/manual.html' }]);
        expect(links(1)).to.deep.equal([
          { rule: 'form', label: 'Photobook', url: '' },
          { rule: 'published', label: 'Published in the 1980s', url: '/collections/published-1980s.html' },
          { rule: 'person', label: 'Mitsuhiro Matsuda', url: '/collections/mitsuhiro-matsuda.html' },
        ]);
      });

      it('keeps the author link on an exclusive book and drops its decade', () => {
        expect(links(201)).to.deep.equal([
          { rule: 'form', label: 'Photobook', url: '' },
          { rule: 'person', label: 'Peter Hujar', url: '/collections/peter-hujar.html' },
        ]);
      });

      it('labels a person with the name on the page the link opens, not the author cells', () => {
        const corte = many(8, 1, 'art', '', by('Alex', 'DA Corte'));
        const aliased = buildIndex({ books: corte, wings, curated: [], staticSlugs: [], redirects: [] }, noCovers);
        expect(aliased.pageByUrl.get('/collections/alex-da-corte.html').title).to.equal('Alex Da Corte');
        expect(recordLinks(corte[0], aliased)).to.deep.equal([
          { rule: 'person', label: 'Alex Da Corte', url: '/collections/alex-da-corte.html' },
        ]);
      });

      it('omits a decade or author that has no page, and a year it cannot read', () => {
        expect(links(301)).to.deep.equal([]); // Richard Prince: a static page owns the slug
        expect(links(101)).to.deep.equal([]);
        expect(links(450)).to.deep.equal([{ rule: 'form', label: 'Photobook', url: '' }]);
      });
    });

    it('builds but does not list a page with the same books as a higher-ranked one', () => {
      const curated = { title: 'Matsuda Catalogues', url: '/collections/matsuda.html' };
      ['/collections/menswear.html', '/collections/mitsuhiro-matsuda.html', '/collections/published-1980s.html'].forEach(url => {
        expect(page(url).listed, url).to.be.false;
        expect(page(url).sameAs, url).to.deep.equal(curated);
      });
      expect(page('/collections/matsuda.html').listed).to.be.true;
      expect(page('/collections/matsuda.html')).to.not.have.property('sameAs');
    });

    describe('same set among generated pages', () => {
      const twins = buildIndex({
        books: [
          // One author, one tag, the same fifteen books: a hand page and a record page.
          ...many(15, 1, 'art', 'Glass', by('Ann', 'Author')),
          // Two tags on the same fifteen books. Zeta is read first.
          ...many(15, 101, 'art', 'Zeta, Alpha'),
          ...many(30, 201, 'art', 'Punk'),
        ],
        wings,
        curated: [],
        staticSlugs: [],
        redirects: [],
      }, noCovers);
      const twin = url => twins.pageByUrl.get(url);

      it('lists the hand tag page ahead of the record page', () => {
        expect(twin('/collections/glass.html')).to.include({ origin: 'hand', listed: true });
        expect(twin('/collections/glass.html')).to.not.have.property('sameAs');
        expect(twin('/collections/ann-author.html')).to.include({ origin: 'derived', listed: false });
        expect(twin('/collections/ann-author.html').sameAs).to.deep.equal({ title: 'Glass', url: '/collections/glass.html' });
      });

      it('lists the first by title when the origins are equal', () => {
        expect(twin('/collections/alpha.html')).to.include({ origin: 'hand', listed: true });
        expect(twin('/collections/zeta.html')).to.include({ origin: 'hand', listed: false });
        expect(twin('/collections/zeta.html').sameAs).to.deep.equal({ title: 'Alpha', url: '/collections/alpha.html' });
      });
    });

    it('treats exactly 90% of the wing as whole-wing', () => {
      const edge = buildIndex({
        books: [...many(18, 1, 'art', 'Punk'), ...many(2, 101, 'art', '')],
        wings,
        curated: [],
        staticSlugs: [],
        redirects: [],
      }, noCovers);
      expect(edge.pageByUrl.get('/collections/punk.html')).to.include({ bookCount: 18, listed: false, unlistedReason: 'whole-wing' });
    });

    it('builds but does not list a generated page covering 90% of its wing', () => {
      // 15 of cryptology's 16 books.
      ['/cryptology/collections/ciphers.html', '/cryptology/collections/manual.html'].forEach(url => {
        expect(page(url)).to.include({ listed: false, unlistedReason: 'whole-wing' });
        expect(page(url)).to.not.have.property('sameAs');
      });
    });

    it('lists everything else, curated pages always', () => {
      expect(page('/collections/punk.html').listed).to.be.true;
      expect(page('/collections/peter-hujar.html').listed).to.be.false; // same eight books as Queer Culture
      expect(page('/collections/queer-culture.html').listed).to.be.true;
      index.pages.filter(p => p.origin === 'curated').forEach(p => expect(p.listed, p.url).to.be.true);
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

    it('resolves an alias before looking the tag up', () => {
      const nyc = run(1, 'NYC');
      const aliased = buildIndex(fixture({ books: nyc, curated: [], staticSlugs: [] }), noCovers);
      expect(tagUrl('NYC', nyc[0], aliased)).to.equal('/collections/new-york-city.html');
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

  describe('listings', () => {
    const staticEntries = [{ id: 'magazines', name: 'Magazines', slug: 'magazines', description: 'Hand-built.', category: 'magazines', featured: true, image: null, path: '/collections/magazines.html' }];
    const index = buildIndex(fixture({ staticEntries }), noCovers);
    const group = (wing, facet) => index.listings[wing].find(g => g.facet === facet);

    it('groups each wing\'s listed pages by facet, in FACETS order, curated last', () => {
      expect(index.listings.art.map(g => g.facet)).to.deep.equal(['theme', 'format', 'curated']);
      expect(index.listings.art.map(g => g.label)).to.deep.equal(['Themes', 'Formats', 'Curated collections']);
      expect(group('art', 'theme').items.map(i => [i.name, i.url, i.count])).to.deep.equal([['Punk', '/collections/punk.html', 16]]);
    });

    it('links a term a curated config owns to that config\'s page, with the page\'s count', () => {
      expect(group('art', 'format').items).to.have.length(1);
      expect(group('art', 'format').items[0]).to.include({ name: 'Zines', url: '/collections/zines.html', count: 2, origin: 'curated', facet: 'format' });
    });

    it('puts static entries in the default wing\'s curated group, without a count, featured last', () => {
      const items = group('art', 'curated').items;
      expect(items.map(i => i.slug)).to.deep.equal(['zines', 'magazines']);
      expect(items[1]).to.include({ origin: 'static', url: '/collections/magazines.html', featured: true });
      expect(items[1]).to.not.have.property('count');
    });

    it('leaves out a page that is built but not listed', () => {
      // Ciphers is on 15 of the 16 cryptology books, so its page is whole-wing.
      expect(index.pageByUrl.get('/cryptology/collections/ciphers.html').listed).to.equal(false);
      expect(index.listings.cryptology).to.deep.equal([]);
    });
  });

  describe('termsByWing', () => {
    const index = buildIndex(fixture(), noCovers);
    const term = (wing, slug) => index.termsByWing[wing].find(t => t.slug === slug);

    it('lists every hand tag in a live wing, below the threshold too', () => {
      expect(index.termsByWing.cryptology.map(t => t.slug).sort()).to.deep.equal(['ciphers', 'punk']);
      expect(term('cryptology', 'punk')).to.deep.equal({ name: 'Punk', slug: 'punk', handCount: 1, count: null, facet: 'theme', url: null });
      expect(index.termsByWing).to.not.have.property('drafts');
    });

    it('gives a term the URL of the page that owns it, generated or curated', () => {
      expect(term('art', 'punk')).to.include({ url: '/collections/punk.html' });
      expect(term('art', 'zines')).to.include({ url: '/collections/zines.html' });
    });

    it('counts the books the linked page lists, not the books carrying the tag', () => {
      expect(term('art', 'punk')).to.include({ count: 16, handCount: 16 });
      // Fifteen books are tagged Zines; the curated Zines page lists the two on its shelf.
      expect(term('art', 'zines')).to.include({ count: 2, handCount: 15 });
    });

    it('gives no URL and no count to a term only a static page owns', () => {
      expect(term('art', 'magazines')).to.include({ count: null, handCount: 15, url: null });
    });
  });

  describe('curated card fields', () => {
    const cfg = { slug: 'shelf', title: 'Shelf', matchBy: { collection_grouping: 'Shelf' } };
    const covers = { hasCover: () => true, coverSrc: b => `/covers/${b.id}.jpg` };
    const page = (extra, options) => buildIndex(fixture({ curated: [{ ...cfg, ...extra }] }), options).pageByUrl.get('/collections/shelf.html');

    it('keeps the config\'s own image, featured and category', () => {
      expect(page({ image: '/hero.jpg', featured: true, category: 'art' }, covers))
        .to.include({ image: '/hero.jpg', featured: true, category: 'art' });
    });

    it('computes an image from the members when the config has none', () => {
      expect(page({}, covers)).to.include({ image: '/covers/201.jpg', featured: false, category: null });
      expect(page({}, noCovers).image).to.equal(null);
    });
  });
});
