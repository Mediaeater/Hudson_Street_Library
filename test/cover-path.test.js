const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const {
  PLACEHOLDER,
  derivedCoverPath,
  resolveCoverPath,
  coverFileExists,
  existingCoverPath,
  coverSrc,
  hasCover,
} = require('../scripts/utils/cover-path');

// The naming convention these tests pin is shared by three things that must
// agree: the acquire-covers scripts write files by it, the generateCoverPath
// filter renders <img src> from it, and /data/books.json resolves cover_url
// with it.
describe('cover-path', () => {
  describe('derivedCoverPath', () => {
    it('builds {author_last}_{title}_{isbn}.jpg', () => {
      expect(derivedCoverPath({ author_last: 'Simon', title: 'Birds of the West Indies', isbn_asin: '9783775736633' }))
        .to.equal('/assets/images/books/Simon_Birds_of_the_West_Indies_9783775736633.jpg');
    });

    it('marks a missing ISBN NULL and folds the placeholders the CSV uses', () => {
      expect(derivedCoverPath({ author_last: 'Bischof', title: 'Psychobuch', isbn_asin: '' }))
        .to.equal('/assets/images/books/Bischof_Psychobuch_NULL.jpg');
      expect(derivedCoverPath({ author_last: 'Bischof', title: 'Psychobuch', isbn_asin: 'NULL' }))
        .to.equal('/assets/images/books/Bischof_Psychobuch_NULL.jpg');
    });

    it('collapses punctuation and runs of underscores, and truncates at 100', () => {
      expect(derivedCoverPath({ author_last: "O'Keeffe", title: 'Some/Thing: A Book!', isbn_asin: '978-3-7757-3663-3' }))
        .to.equal('/assets/images/books/O_Keeffe_Some_Thing_A_Book_9783775736633.jpg');

      const long = derivedCoverPath({ author_last: 'X', title: 'y'.repeat(300), isbn_asin: '' });
      expect(long.replace('/assets/images/books/', '').replace('.jpg', '')).to.have.length(100);
    });

    it('falls back to Unknown/Untitled rather than emitting a bare separator', () => {
      expect(derivedCoverPath({})).to.equal('/assets/images/books/Unknown_Untitled_NULL.jpg');
    });
  });

  describe('resolveCoverPath (what a page renders)', () => {
    it('prefers image_url verbatim', () => {
      expect(resolveCoverPath({ image_url: '/assets/images/magazines/2600/2600-43-2.jpg', author_last: 'X', title: 'Y' }))
        .to.equal('/assets/images/magazines/2600/2600-43-2.jpg');
    });

    it('treats the CSV\'s NULL spellings as no image_url', () => {
      for (const empty of ['', 'NULL', 'null', undefined]) {
        expect(resolveCoverPath({ image_url: empty, author_last: 'A', title: 'B' }), JSON.stringify(empty))
          .to.equal('/assets/images/books/A_B_NULL.jpg');
      }
    });

    it('returns the placeholder for no book at all', () => {
      expect(resolveCoverPath(null)).to.equal(PLACEHOLDER);
    });
  });

  describe('existingCoverPath (what /data/books.json publishes)', () => {
    let srcDir;
    const book = { author_last: 'Frere', title: 'Jones', isbn_asin: '123' };
    const derived = '/assets/images/books/Frere_Jones_123.jpg';

    before(() => {
      srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-cover-'));
      fs.mkdirSync(path.join(srcDir, 'assets/images/books'), { recursive: true });
    });
    after(() => fs.rmSync(srcDir, { recursive: true, force: true }));

    it('is empty when the library holds no file', () => {
      expect(existingCoverPath(book, { srcDir })).to.equal('');
    });

    it('recovers the conventional path when image_url was never filled in', () => {
      fs.writeFileSync(path.join(srcDir, `.${derived}`), 'x');
      expect(existingCoverPath(book, { srcDir })).to.equal(derived);
    });

    it('prefers image_url, but only when a file is behind it', () => {
      const recorded = '/assets/images/books/recorded.jpg';
      expect(existingCoverPath({ ...book, image_url: recorded }, { srcDir })).to.equal(derived);
      fs.writeFileSync(path.join(srcDir, `.${recorded}`), 'x');
      expect(existingCoverPath({ ...book, image_url: recorded }, { srcDir })).to.equal(recorded);
    });

    it('refuses a path that would climb out of src/', () => {
      expect(coverFileExists('/../../etc/passwd', srcDir)).to.equal(false);
      expect(coverFileExists('/assets/images/books/../books/recorded.jpg', srcDir)).to.equal(true);
    });
  });

  // What the generateCoverPath filter is. Before Sept 2026 the filter was
  // resolveCoverPath, so a book with no cover emitted a src that 404ed and the
  // templates' onerror swapped the placeholder in after the failed request.
  describe('coverSrc / hasCover (what the filter is)', () => {
    let srcDir;
    const held = { author_last: 'Frere', title: 'Jones', isbn_asin: '123' };
    const absent = { author_last: 'Nobody', title: 'Nothing', isbn_asin: '999' };

    before(() => {
      srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hsl-cover-src-'));
      fs.mkdirSync(path.join(srcDir, 'assets/images/books'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'assets/images/books/Frere_Jones_123.jpg'), 'x');
    });
    after(() => fs.rmSync(srcDir, { recursive: true, force: true }));

    it('serves the cover the library holds', () => {
      expect(coverSrc(held, { srcDir })).to.equal('/assets/images/books/Frere_Jones_123.jpg');
      expect(hasCover(held, { srcDir })).to.equal(true);
    });

    it('serves the placeholder instead of a path that would 404', () => {
      expect(coverSrc(absent, { srcDir })).to.equal(PLACEHOLDER);
      expect(hasCover(absent, { srcDir })).to.equal(false);
      // The old behaviour, kept as a pure function: what the convention says.
      expect(resolveCoverPath(absent)).to.equal('/assets/images/books/Nobody_Nothing_999.jpg');
    });

    it('ignores an image_url with nothing behind it', () => {
      const stale = { ...absent, image_url: '/assets/images/books/deleted.jpg' };
      expect(coverSrc(stale, { srcDir })).to.equal(PLACEHOLDER);
    });

    it('handles no book at all', () => {
      expect(coverSrc(null)).to.equal(PLACEHOLDER);
      expect(hasCover(null)).to.equal(false);
    });
  });

  // The site's own catalogue: after the Sept 2026 backfill, every recorded
  // image_url has a file behind it, so the filter serves image_url verbatim.
  describe('the real catalogue', () => {
    const { loadCatalogSync } = require('../scripts/utils/catalog');

    it('has no image_url pointing at a file that is not there', () => {
      const broken = loadCatalogSync().data
        .filter(b => b.image_url && !coverFileExists(b.image_url))
        .map(b => `${b.id} ${b.image_url}`);
      expect(broken).to.deep.equal([]);
    });
  });
});
