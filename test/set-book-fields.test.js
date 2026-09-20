const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const { stringify } = require('csv-stringify/sync');
const { setBookFields, SetFieldsError } = require('../scripts/set-book-fields');
const { listCatalogFiles } = require('../scripts/utils/catalog');

const HEADER = fs.readFileSync(path.join(__dirname, 'fixtures', 'catalog', 'ok', 'books.csv'), 'utf8')
  .split('\n')[0].replace(/"/g, '').split(',');

const row = (fields) => HEADER.map(c => (fields[c] === undefined ? '' : fields[c]));

// A catalogue written the way the real one is: every non-empty field quoted,
// empties bare, a multi-line description, embedded quotes, trailing newline.
const ROWS = [
  row({ id: '1', author_last: 'Doe', author_first: 'Jane', author_full_name: 'Jane Doe', title: 'Art One', publisher: 'Test Press', publication_year: '2020' }),
  row({ id: '2', author_last: 'Roe', author_first: 'Rick', author_full_name: 'Rick Roe', title: 'Art "Two"', description: 'Line one.\nLine two, with "quotes" and, commas.', tags: 'A, B' }),
  row({ id: '3', author_last: 'Poe', author_first: 'Pat', author_full_name: 'Pat Poe', title: 'Art Three', page_count: '48' }),
];

describe('set-book-fields', () => {
  let dir;
  let booksFile;
  const before = () => fs.readFileSync(booksFile, 'utf8');
  const lines = s => s.split('\n');

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'set-book-fields-'));
    fs.copyFileSync(path.join(__dirname, 'fixtures', 'catalog', 'ok', 'wings.json'), path.join(dir, 'wings.json'));
    fs.mkdirSync(path.join(dir, 'catalog'));
    booksFile = path.join(dir, 'books.csv');
    fs.writeFileSync(booksFile, stringify([HEADER, ...ROWS], { header: false, quoted: true, quoted_empty: false }));
    fs.writeFileSync(path.join(dir, 'catalog', 'zz.csv'), stringify([HEADER, row({ id: '10001', title: 'ZZ One' })], { header: false, quoted: true, quoted_empty: false }));
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('a no-op run leaves the file byte-identical', () => {
    const original = before();
    const res = setBookFields(3, { page_count: '48', title: 'Art Three' }, { dataDir: dir });
    expect(res.changed).to.deep.equal([]);
    expect(res.unchanged).to.have.members(['page_count', 'title']);
    expect(before()).to.equal(original);
  });

  it('a one-cell run changes exactly one line', () => {
    const original = lines(before());
    const res = setBookFields(1, { page_count: 192 }, { dataDir: dir });
    expect(res.changed).to.deep.equal(['page_count']);
    const after = lines(before());
    expect(after).to.have.length(original.length);
    const differing = after.map((l, i) => i).filter(i => after[i] !== original[i]);
    expect(differing).to.deep.equal([1]);
    expect(after[1]).to.contain('"192"');
  });

  it('keeps the multi-line row and the trailing newline intact when editing another row', () => {
    setBookFields(3, { notes: 'A note' }, { dataDir: dir });
    const out = before();
    expect(out.endsWith('\n')).to.equal(true);
    expect(out).to.contain('Line one.\nLine two, with ""quotes"" and, commas.');
  });

  it('writes a multi-line description with quotes and commas and reads it back', () => {
    const desc = '<p>First "beat", with a comma.</p>\n<p class="mt-6">Second beat.</p>';
    setBookFields(1, { description: desc }, { dataDir: dir });
    const { parse } = require('csv-parse/sync');
    const rows = parse(before(), { relax_column_count: true });
    expect(rows[1][HEADER.indexOf('description')]).to.equal(desc);
    expect(rows.every(r => r.length === HEADER.length)).to.equal(true);
  });

  it('edits a row in another wing file and leaves books.csv alone', () => {
    const original = before();
    const res = setBookFields(10001, { tags: 'Codes' }, { dataDir: dir });
    expect(path.basename(res.file)).to.equal('zz.csv');
    expect(before()).to.equal(original);
  });

  it('refuses price, id, and unknown columns without writing', () => {
    const original = before();
    expect(() => setBookFields(1, { price: '10' }, { dataDir: dir })).to.throw(SetFieldsError, /price/);
    expect(() => setBookFields(1, { id: '5' }, { dataDir: dir })).to.throw(SetFieldsError, /id/);
    expect(() => setBookFields(1, { nonsense: 'x' }, { dataDir: dir })).to.throw(SetFieldsError, /not a column/);
    expect(before()).to.equal(original);
  });

  it('refuses to overwrite a filled cell unless told to', () => {
    const original = before();
    expect(() => setBookFields(3, { page_count: '99' }, { dataDir: dir })).to.throw(SetFieldsError, /already has a value/);
    expect(before()).to.equal(original);
    setBookFields(3, { page_count: '99' }, { dataDir: dir, overwrite: true });
    expect(before()).to.contain('"99"');
  });

  it('refuses an unknown id and non-scalar values', () => {
    expect(() => setBookFields(777, { notes: 'x' }, { dataDir: dir })).to.throw(SetFieldsError, /no row/);
    expect(() => setBookFields(1, { notes: null }, { dataDir: dir })).to.throw(SetFieldsError, /string or number/);
    expect(() => setBookFields(1, { notes: ['a'] }, { dataDir: dir })).to.throw(SetFieldsError, /string or number/);
  });

  it('refuses a file that does not round-trip byte-for-byte', () => {
    const skewed = before().replace('"Jane Doe"', '"Jane Doe"').replace(/,,/, ',"",');
    fs.writeFileSync(booksFile, skewed);
    expect(skewed).to.not.equal(stringify([HEADER, ...ROWS], { header: false, quoted: true, quoted_empty: false }));
    expect(() => setBookFields(1, { notes: 'x' }, { dataDir: dir })).to.throw(SetFieldsError, /round-trip/);
    expect(before()).to.equal(skewed);
  });

  it('dry-run reports the change and writes nothing', () => {
    const original = before();
    const res = setBookFields(1, { notes: 'x' }, { dataDir: dir, dryRun: true });
    expect(res.changed).to.deep.equal(['notes']);
    expect(before()).to.equal(original);
  });

  it('the real art wing round-trips byte-for-byte, so real edits stay one line', () => {
    const { parse } = require('csv-parse/sync');
    const art = listCatalogFiles().find(f => f.slug === 'art').file;
    const original = fs.readFileSync(art, 'utf8');
    const out = stringify(parse(original, { relax_column_count: true }), { header: false, quoted: true, quoted_empty: false });
    expect(out === original).to.equal(true);
  }).timeout(20000);
});
