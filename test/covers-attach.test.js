const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const { stringify } = require('csv-stringify/sync');
const sharp = require('sharp');
const { attachCover, sniff, jpegSize, AttachError } = require('../scripts/covers/attach');
const { conventionalCoverFilename } = require('../scripts/utils/cover-path');
const { loadCatalogSync } = require('../scripts/utils/catalog');

const FIXTURE = path.join(__dirname, 'fixtures', 'catalog', 'ok');
const HEADER = fs.readFileSync(path.join(FIXTURE, 'catalog', 'art.csv'), 'utf8')
  .split('\n')[0].replace(/"/g, '').split(',');
const row = fields => HEADER.map(c => (fields[c] === undefined ? '' : fields[c]));
const csv = rows => stringify([HEADER, ...rows], { header: false, quoted: true, quoted_empty: false });

const rejects = async (promise, pattern) => {
  let error;
  try { await promise; } catch (e) { error = e; }
  expect(error, 'expected a refusal').to.be.instanceOf(AttachError);
  expect(error.message).to.match(pattern);
};

describe('covers attach', () => {
  let dir;
  let options;
  let art;
  let jpg;
  let png;
  const books = () => path.join(dir, 'assets', 'images', 'books');
  const artCsv = () => fs.readFileSync(art, 'utf8');
  const noise = (width, height) => sharp({ create: { width, height, channels: 3, noise: { type: 'gaussian', mean: 128, sigma: 40 } } });

  before(async () => {
    jpg = await noise(400, 600).jpeg().toBuffer();
    png = await noise(400, 600).png().toBuffer();
  });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'covers-attach-'));
    fs.mkdirSync(path.join(dir, '_data', 'catalog'), { recursive: true });
    fs.mkdirSync(books(), { recursive: true });
    fs.copyFileSync(path.join(FIXTURE, 'wings.json'), path.join(dir, '_data', 'wings.json'));
    art = path.join(dir, '_data', 'catalog', 'art.csv');
    fs.writeFileSync(art, csv([
      row({ id: '1', author_last: 'Doe', author_first: 'Jane', author_full_name: 'Jane Doe', title: "Won't Stop: A Book", isbn_asin: '9781527233454', description: 'Line one.\nLine "two", with commas.' }),
      row({ id: '2', author_last: 'Roe', author_first: 'Rick', author_full_name: 'Rick Roe', title: 'Has One', image_url: '/assets/images/books/roe_rick_has_one.jpg' }),
      row({ id: '3', author_last: 'Old', author_first: 'Ann', author_full_name: 'Ann Old', title: 'Legacy Name', isbn_asin: '666' }),
    ]));
    fs.writeFileSync(path.join(dir, '_data', 'catalog', 'zz.csv'), csv([row({ id: '10001', author_last: 'Zed', author_first: 'Zoe', author_full_name: 'Zoe Zed', title: 'ZZ One', publication_year: '1999' })]));
    fs.writeFileSync(path.join(books(), 'roe_rick_has_one.jpg'), jpg);
    fs.writeFileSync(path.join(books(), 'Old_Legacy_Name_666.jpg'), jpg);
    fs.writeFileSync(path.join(dir, 'in.jpg'), jpg);
    fs.writeFileSync(path.join(dir, 'in.png'), png);
    options = { dataDir: path.join(dir, '_data'), srcDir: dir };
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('names new covers by the shelf convention', () => {
    expect(conventionalCoverFilename({ author_last: 'Wood', author_first: 'Chloe', title: 'AI: More than Human', isbn_asin: '9781527233454' }))
      .to.equal('wood_chloe_ai_more_than_human_9781527233454.jpg');
    expect(conventionalCoverFilename({ author_last: "D'Agata", author_first: 'Antoine', title: 'VIRUS', isbn_asin: 'NULL', publication_year: '2020' }))
      .to.equal('dagata_antoine_virus_2020.jpg');
    expect(conventionalCoverFilename({ author_last: 'NA', author_first: 'VA', title: ' Édition  Spéciale ' })).to.equal('na_va_edition_speciale.jpg');
    expect(conventionalCoverFilename({ title: 'x'.repeat(300) })).to.match(/^unknown_x{120}\.jpg$/);
  });

  it('saves the file under the convention name and changes one cell on one line', async () => {
    const original = artCsv().split('\n');
    const r = await attachCover(1, path.join(dir, 'in.jpg'), options);
    expect(r.image_url).to.equal('/assets/images/books/doe_jane_wont_stop_a_book_9781527233454.jpg');
    expect(fs.readFileSync(path.join(dir, r.image_url)).equals(jpg)).to.equal(true);
    expect(r.linesChanged).to.equal(1);
    const after = artCsv().split('\n');
    expect(after).to.have.length(original.length);
    const { data } = loadCatalogSync({ dataDir: options.dataDir });
    expect(data.find(b => b.id === '1').image_url).to.equal(r.image_url);
    expect(data.find(b => b.id === '1').description).to.equal('Line one.\nLine "two", with commas.');
    expect(data.find(b => b.id === '2').image_url).to.equal('/assets/images/books/roe_rick_has_one.jpg');
  });

  it('backs out when the CSV write would change any other cell', async () => {
    // CSVHandler fills an empty author_full_name with "Unknown" on write.
    fs.writeFileSync(art, csv([
      row({ id: '1', author_last: 'Doe', author_first: 'Jane', author_full_name: 'Jane Doe', title: 'Clean Row' }),
      row({ id: '2', author_last: 'Roe', author_first: 'Rick', title: 'No Full Name' }),
    ]));
    const csvBefore = artCsv();
    await rejects(attachCover(1, path.join(dir, 'in.jpg'), options), /would also change row 2, column author_full_name/);
    expect(artCsv()).to.equal(csvBefore);
    expect(fs.existsSync(path.join(books(), 'doe_jane_clean_row.jpg'))).to.equal(false);
  });

  it('writes to the wing file that holds the row', async () => {
    const artBefore = artCsv();
    const r = await attachCover('10001', path.join(dir, 'in.jpg'), options);
    expect(r.wing).to.equal('zz');
    expect(r.image_url).to.equal('/assets/images/books/zed_zoe_zz_one_1999.jpg');
    expect(artCsv()).to.equal(artBefore);
    expect(fs.readFileSync(path.join(dir, '_data', 'catalog', 'zz.csv'), 'utf8')).to.contain(r.image_url);
  });

  it('converts a PNG to a JPEG', async () => {
    const r = await attachCover(1, path.join(dir, 'in.png'), options);
    expect(sniff(fs.readFileSync(r.file))).to.equal('jpeg');
    expect([r.width, r.height]).to.deep.equal([400, 600]);
    expect(r.warnings.join(' ')).to.match(/converted from PNG/);
  });

  it('refuses a row that has a cover, by image_url or by legacy filename, unless told to overwrite', async () => {
    const csvBefore = artCsv();
    await rejects(attachCover(2, path.join(dir, 'in.jpg'), options), /already has a cover/);
    await rejects(attachCover(3, path.join(dir, 'in.jpg'), options), /legacy filename/);
    expect(artCsv()).to.equal(csvBefore);
    expect(fs.readdirSync(books()).sort()).to.deep.equal(['Old_Legacy_Name_666.jpg', 'roe_rick_has_one.jpg']);

    const r = await attachCover(3, path.join(dir, 'in.jpg'), { ...options, overwrite: true });
    expect(r.replaced).to.equal('/assets/images/books/Old_Legacy_Name_666.jpg');
    expect(fs.existsSync(path.join(books(), 'Old_Legacy_Name_666.jpg')), 'old file is never deleted').to.equal(true);
  });

  it('refuses to write over a file already on disk unless told to overwrite', async () => {
    const squatter = path.join(books(), 'doe_jane_wont_stop_a_book_9781527233454.jpg');
    fs.writeFileSync(squatter, 'someone else');
    await rejects(attachCover(1, path.join(dir, 'in.jpg'), options), /already on disk/);
    expect(fs.readFileSync(squatter, 'utf8')).to.equal('someone else');
    await attachCover(1, path.join(dir, 'in.jpg'), { ...options, overwrite: true });
    expect(fs.readFileSync(squatter).equals(jpg)).to.equal(true);
  });

  it('refuses anything that is not image data, and leaves no trace', async () => {
    const csvBefore = artCsv();
    const bad = {
      'page.jpg': ['<!DOCTYPE html><html><body>404 Not Found</body></html>'.padEnd(5000, ' '), /HTML/],
      'stub.gif': [Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(40)]), /GIF/],
      'junk.jpg': [Buffer.alloc(5000, 7), /not a JPEG, PNG or WebP/],
      'cut.jpg': [jpg.subarray(0, 100), /placeholder stub/],
    };
    for (const [name, [content, pattern]] of Object.entries(bad)) {
      fs.writeFileSync(path.join(dir, name), content);
      await rejects(attachCover(1, path.join(dir, name), options), pattern);
    }
    const thumb = await noise(90, 120).jpeg({ quality: 100 }).toBuffer();
    fs.writeFileSync(path.join(dir, 'thumb.jpg'), thumb);
    await rejects(attachCover(1, path.join(dir, 'thumb.jpg'), options), /thumbnail/);
    await rejects(attachCover(1, path.join(dir, 'nope.jpg'), options), /No such file/);
    await rejects(attachCover(999, path.join(dir, 'in.jpg'), options), /No row with id 999/);
    expect(artCsv()).to.equal(csvBefore);
    expect(fs.readdirSync(books())).to.have.length(2);
  });

  it('a dry run checks everything and writes nothing', async () => {
    const csvBefore = artCsv();
    const r = await attachCover(1, path.join(dir, 'in.jpg'), { ...options, dryRun: true });
    expect(r.dryRun).to.equal(true);
    expect(r.image_url).to.match(/^\/assets\/images\/books\/doe_jane_/);
    expect(artCsv()).to.equal(csvBefore);
    expect(fs.existsSync(r.file)).to.equal(false);
  });

  it('reads JPEG dimensions and tells image types apart by their bytes', () => {
    expect(jpegSize(jpg)).to.deep.equal({ width: 400, height: 600 });
    expect(sniff(jpg)).to.equal('jpeg');
    expect(sniff(png)).to.equal('png');
    expect(sniff(Buffer.from('<html>'))).to.equal('html');
    expect(sniff(Buffer.from('hello'))).to.equal('unknown');
  });
});
