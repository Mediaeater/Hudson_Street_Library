const path = require('path');
const { expect } = require('chai');
const {
  loadCatalog,
  loadCatalogSync,
  loadWings,
  resolveWing,
  defaultWing,
  wingFile,
  wingForId,
  nextIdForWing,
  fileForIdentifier,
  CatalogError,
} = require('../scripts/utils/catalog');

const fixture = name => ({ dataDir: path.join(__dirname, 'fixtures', 'catalog', name) });

describe('catalog loader', () => {
  describe('a valid multi-file catalogue', () => {
    it('merges files in wings.json order and stamps collection from the wing', async () => {
      const { data, files } = await loadCatalog(fixture('ok'));
      expect(files.map(f => f.slug)).to.deep.equal(['art', 'zz']);
      expect(data.map(b => `${b.id}:${b.collection}`)).to.deep.equal(['1:art', '2:art', '10001:zz', '42:zz']);
    });

    it('sync and async loaders agree', async () => {
      const a = await loadCatalog(fixture('ok'));
      const s = loadCatalogSync(fixture('ok'));
      expect(s.data).to.deep.equal(a.data);
      expect(s.columns).to.have.length(37);
    });

    it('accepts an out-of-block id when the wing lists it in allowLegacyIds', () => {
      const { data } = loadCatalogSync(fixture('ok'));
      expect(data.find(b => b.id === '42').collection).to.equal('zz');
    });

    it('loads the real catalogue without throwing', () => {
      const { data, files, columns } = loadCatalogSync();
      expect(columns).to.have.length(37);
      expect(files[0].slug).to.equal('art');
      expect(data.length).to.be.greaterThan(2000);
      expect(data.every(b => b.collection)).to.equal(true);
    });
  });

  describe('fails the build on', () => {
    const throws = (name, pattern) => {
      expect(() => loadCatalogSync(fixture(name))).to.throw(CatalogError, pattern);
      return loadCatalog(fixture(name)).then(
        () => { throw new Error('expected loadCatalog to reject'); },
        err => expect(err.message).to.match(pattern)
      );
    };

    it('a duplicate id across files', () =>
      throws('collision', /duplicate id 5: .*zz\.csv row 3 collides with wing "art"/));

    it('an id outside the wing\'s block', () =>
      throws('out-of-block', /zz\.csv row 2: id 7 is outside the "zz" block 10001–19999/));

    it('a row with fewer than 37 fields', () =>
      throws('short-row', /zz\.csv: Invalid Record Length.*36.*line 3/));

    it('a header that differs from the default wing\'s', () =>
      throws('bad-header', /zz\.csv: column 11 is "medium", expected "binding"/));

    it('a catalog/*.csv with no wing entry', () =>
      throws('unregistered', /zz\.csv has no entry in wings\.json/));

    it('overlapping id blocks in wings.json', () =>
      throws('overlap', /id blocks of "art" and "zz" overlap/));

    it('a wings.json entry that violates the schema', () =>
      throws('bad-wing', /wings\.schema\.json:[\s\S]*\$\[1\]\.itemPath: must be one of "books", "objects"[\s\S]*\$\[1\]: unknown property "colour"/));
  });

  describe('loadWings', () => {
    it('returns the nine wings with the default wing first', () => {
      const wings = loadWings();
      expect(wings.map(w => w.slug)).to.deep.equal(['art', 'cryptology', 'hacking', 'media-theory', 'fiction', 'ephemera', 'comics', 'posters', 'artworks']);
      expect(wings[0].isDefault).to.equal(true);
      expect(wings[0].idBlock).to.deep.equal([1, 9999]);
      expect(wings.filter(w => w.isDefault)).to.have.length(1);
    });

    it('fills optional fields with defaults', () => {
      const wings = loadWings(fixture('ok').dataDir);
      expect(wings[1].live).to.equal(false);
      expect(wings[1].classifications).to.deep.equal([]);
      expect(wings[1].intro).to.equal('');
      // A wing that says nothing about intake dates its adds as acquisitions,
      // which is what add-book did before the field existed.
      expect(wings[1].intake).to.equal('acquired');
    });

    it('carries the declared intake mode: art acquires, cryptology catalogues', () => {
      const wings = loadWings();
      const by = Object.fromEntries(wings.map(w => [w.slug, w.intake]));
      expect(by.art).to.equal('acquired');
      // Every wing built off the existing shelves catalogues rather than acquires.
      expect(by.cryptology).to.equal('catalogued');
      expect(by.hacking).to.equal('catalogued');
      expect(by['media-theory']).to.equal('catalogued');
    });

    it('every declared wing file exists and shares the 37-column header', () => {
      const { files, columns } = loadCatalogSync();
      expect(files).to.have.length(9);
      expect(columns).to.have.length(37);
    });
  });

  // What a write needs to know: which wing, which file, which id. Used by the
  // add-book ingest and by CSVHandler to route an update to the right file.
  describe('wing resolution', () => {
    const dir = fixture('ok').dataDir;

    it('resolveWing throws on an unknown slug rather than falling back', () => {
      expect(() => resolveWing('nope', dir)).to.throw(CatalogError, /unknown wing "nope" \(known: art, zz\)/);
      expect(resolveWing('zz', dir).slug).to.equal('zz');
    });

    it('defaultWing is the wing a write lands in when none is named', () => {
      expect(defaultWing(dir).slug).to.equal('art');
      expect(defaultWing().slug).to.equal('art');
    });

    it('wingFile takes a slug or a wing object', () => {
      expect(wingFile('zz', dir)).to.equal(path.join(dir, 'catalog', 'zz.csv'));
      expect(wingFile(resolveWing('art', dir), dir)).to.equal(path.join(dir, 'books.csv'));
    });

    it('wingForId reads the id blocks, including allowLegacyIds', () => {
      expect(wingForId(1, dir).slug).to.equal('art');
      expect(wingForId('10001', dir).slug).to.equal('zz');
      expect(wingForId(42, dir).slug).to.equal('zz'); // out of block, allowed
      expect(wingForId(500000, dir)).to.equal(null);
      expect(wingForId('9780306406157', dir)).to.equal(null);
    });

    it('nextIdForWing counts within the wing, not across the catalogue', () => {
      expect(nextIdForWing('art', { dataDir: dir })).to.equal(3);
      // zz holds 10001 and the legacy 42; the next id follows the block, not 43.
      expect(nextIdForWing('zz', { dataDir: dir })).to.equal(10002);
    });

    it('nextIdForWing starts at the bottom of an empty wing\'s block', () => {
      // Pick the empty wings out of the live registry rather than naming one —
      // a wing that is empty today gets books tomorrow (cryptology did).
      const { data, wings } = loadCatalogSync();
      const counts = data.reduce((m, b) => ({ ...m, [b.collection]: (m[b.collection] || 0) + 1 }), {});
      const empty = wings.filter(w => !counts[w.slug]);
      expect(empty.length, 'no empty wing left to exercise this path').to.be.greaterThan(0);
      for (const w of empty) expect(nextIdForWing(w.slug), w.slug).to.equal(w.idBlock[0]);
    });

    it('nextIdForWing follows the highest id in a populated wing', () => {
      const { data, wings } = loadCatalogSync();
      for (const w of wings) {
        const ids = data.filter(b => b.collection === w.slug).map(b => Number(b.id));
        if (!ids.length) continue;
        expect(nextIdForWing(w.slug), w.slug).to.equal(Math.max(...ids) + 1);
      }
    });

    it('fileForIdentifier routes an id by block and an ISBN by lookup', () => {
      expect(fileForIdentifier('10001', { dataDir: dir }).slug).to.equal('zz');
      expect(fileForIdentifier(2, { dataDir: dir }).slug).to.equal('art');

      const anIsbn = loadCatalogSync().data.find(b => b.isbn_asin)?.isbn_asin;
      expect(fileForIdentifier(anIsbn).file).to.match(/books\.csv$/);
      expect(fileForIdentifier('nosuchisbn')).to.equal(null);
    });
  });
});
