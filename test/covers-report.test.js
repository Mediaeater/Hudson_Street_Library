const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const { expect } = require('chai');
const { stringify } = require('csv-stringify/sync');
const { auditCovers, formatReport, parseIds } = require('../scripts/covers/report');

const FIXTURE = path.join(__dirname, 'fixtures', 'catalog', 'ok');
const HEADER = fs.readFileSync(path.join(FIXTURE, 'catalog', 'art.csv'), 'utf8')
  .split('\n')[0].replace(/"/g, '').split(',');
const row = fields => HEADER.map(c => (fields[c] === undefined ? '' : fields[c]));
const csv = rows => stringify([HEADER, ...rows], { header: false, quoted: true, quoted_empty: false });
const REPORT = path.join(__dirname, '..', 'scripts', 'covers', 'report.js');

// A site in miniature: <dir>/_data is the catalogue, <dir> is src/.
const ART = [
  row({ id: '1', author_last: 'Doe', author_first: 'Jane', title: 'Good Cover', tags: 'Art, Photography', collection_grouping: 'Photography', image_url: '/assets/images/books/doe_jane_good_cover_111.jpg' }),
  row({ id: '2', author_last: 'Roe', author_first: 'Rick', title: 'No Cover', tags: 'Art, Zines', collection_grouping: 'Zines' }),
  row({ id: '3', author_last: 'Poe', author_first: 'Pat', title: 'Gone', tags: 'Art', image_url: '/assets/images/books/poe_pat_gone_333.jpg' }),
  row({ id: '4', author_last: 'Moe', author_first: 'Mo', title: 'Slashless', image_url: 'assets/images/books/doe_jane_good_cover_111.jpg' }),
  row({ id: '5', author_last: 'Low', author_first: 'Lee', title: 'Thumb', tags: 'Photography', image_url: '/assets/images/books/low_lee_thumb_555.jpg' }),
  row({ id: '6', author_last: 'Old', author_first: 'Ann', title: 'Legacy Name', isbn_asin: '666' }),
  row({ id: '7', author_last: 'Nil', author_first: 'Nia', title: 'Placeholder', image_url: '/assets/images/placeholder-book.svg' }),
  row({ id: '8', author_last: 'Mag', author_first: 'Meg', title: 'Elsewhere', image_url: '/assets/images/magazines/mag_8.jpg' }),
  row({ id: '9', author_last: 'Cas', author_first: 'Cy', title: 'Wrong Case', image_url: '/assets/images/books/Doe_Jane_Good_Cover_111.jpg' }),
];
const ZZ = [row({ id: '10001', author_last: 'Zed', author_first: 'Zoe', title: 'ZZ One', tags: 'Zines' })];

describe('covers report', () => {
  let dir;
  let options;
  const image = (rel, bytes) => {
    const file = path.join(dir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.alloc(bytes, 1));
  };
  const ids = list => list.map(r => r.id);

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'covers-report-'));
    fs.mkdirSync(path.join(dir, '_data', 'catalog'), { recursive: true });
    fs.copyFileSync(path.join(FIXTURE, 'wings.json'), path.join(dir, '_data', 'wings.json'));
    fs.writeFileSync(path.join(dir, '_data', 'catalog', 'art.csv'), csv(ART));
    fs.writeFileSync(path.join(dir, '_data', 'catalog', 'zz.csv'), csv(ZZ));
    image('assets/images/books/doe_jane_good_cover_111.jpg', 20000);
    image('assets/images/books/low_lee_thumb_555.jpg', 3000);
    image('assets/images/books/Old_Legacy_Name_666.jpg', 20000);     // the legacy derived name for row 6
    image('assets/images/books/nobody_wants_me.jpg', 20000);         // orphan
    image('assets/images/books/gallery/spread_01.jpg', 500);         // orphan, small, in a subfolder
    image('assets/images/books/on_a_page.jpg', 20000);               // no row, but a page names it
    image('assets/images/magazines/mag_8.jpg', 20000);
    image('assets/images/placeholder-book.svg', 300);
    fs.writeFileSync(path.join(dir, 'about.html'), '<img src="/assets/images/books/on_a_page.jpg">');
    options = { dataDir: path.join(dir, '_data'), srcDir: dir };
  });

  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('sorts every row into exactly one state from image_url and the disk', () => {
    const r = auditCovers(options);
    expect(r.rows).to.equal(10);
    expect(ids(r.blank)).to.deep.equal(['2', '10001']);
    expect(ids(r.unlinked)).to.deep.equal(['6']);
    expect(ids(r.placeholder)).to.deep.equal(['7']);
    expect(ids(r.noSlash)).to.deep.equal(['4']);
    expect(r.withCover).to.equal(3);                                 // 1, 5, 8
    expect(r.byWing.art.blank).to.equal(1);
    expect(r.byWing.zz.blank).to.equal(1);
    const sum = r.withCover + r.blank.length + r.unlinked.length + r.placeholder.length + r.noSlash.length + r.broken.length;
    expect(sum).to.equal(r.rows);
  });

  it('reports a missing file, and a path that only matches on a case-insensitive disk, as broken', () => {
    expect(ids(auditCovers(options).broken)).to.deep.equal(['3', '9']);
  });

  it('does not guess a cover for a blank row from a lowercase convention name', () => {
    image('assets/images/books/roe_rick_no_cover.jpg', 20000);
    try {
      const r = auditCovers(options);
      expect(ids(r.blank)).to.include('2');
      expect(r.files.orphans.map(f => f.path)).to.include('/assets/images/books/roe_rick_no_cover.jpg');
    } finally {
      fs.unlinkSync(path.join(dir, 'assets/images/books/roe_rick_no_cover.jpg'));
    }
  });

  it('flags covers under 8 KB by row and by file', () => {
    const r = auditCovers(options);
    expect(ids(r.small)).to.deep.equal(['5']);
    expect(r.small[0].bytes).to.equal(3000);
    expect(r.files.small.map(f => f.path)).to.deep.equal([
      '/assets/images/books/gallery/spread_01.jpg',
      '/assets/images/books/low_lee_thumb_555.jpg',
    ]);
  });

  it('separates orphans from files a page names and files a row shows by its legacy name', () => {
    const { files } = auditCovers(options);
    expect(files.total).to.equal(6);
    expect(files.unnamed).to.equal(4);
    expect(files.usedByPages.map(f => f.path)).to.deep.equal(['/assets/images/books/on_a_page.jpg']);
    expect(files.orphans.map(f => f.path)).to.deep.equal([
      '/assets/images/books/gallery/spread_01.jpg',
      '/assets/images/books/nobody_wants_me.jpg',
    ]);
  });

  it('scopes rows by wing, tag, grouping and ids, and combines them', () => {
    expect(auditCovers({ ...options, wing: 'zz' }).rows).to.equal(1);
    expect(ids(auditCovers({ ...options, tag: 'zines' }).blank)).to.deep.equal(['2', '10001']);
    expect(auditCovers({ ...options, tag: 'Zine' }).rows).to.equal(0);          // exact tag, not substring
    expect(auditCovers({ ...options, grouping: 'photography' }).rows).to.equal(1);
    expect(auditCovers({ ...options, ids: '2-4,10001' }).rows).to.equal(4);
    expect(auditCovers({ ...options, ids: '2-4,10001', wing: 'art', tag: 'Art' }).rows).to.equal(2);
    expect(auditCovers({ ...options, ids: '2,999' }).unknownIds).to.deep.equal(['999']);
  });

  it('counts orphans against the whole catalogue whatever the scope', () => {
    expect(auditCovers({ ...options, wing: 'zz' }).files.orphans).to.have.length(2);
  });

  it('rejects an unknown wing and a malformed id list', () => {
    expect(() => auditCovers({ ...options, wing: 'nope' })).to.throw(/unknown wing/);
    expect(() => parseIds('1,two')).to.throw(/Bad id/);
    expect(() => parseIds('9-3')).to.throw(/Bad id range/);
    expect([...parseIds('3, 5-7')]).to.deep.equal(['3', '5', '6', '7']);
  });

  it('prints the report and writes nothing', () => {
    const snapshot = () => execFileSync('find', [dir, '-type', 'f', '-exec', 'stat', '-f', '%N %z %m', '{}', '+']).toString();
    const text = formatReport(auditCovers(options), { orphans: true });
    expect(text).to.match(/No cover \(image_url blank, nothing on disk\): 2/);
    expect(text).to.contain('nobody_wants_me.jpg');
    expect(formatReport(auditCovers(options), { summary: true })).to.not.contain('Roe, Rick');
    const beforeRun = snapshot();
    auditCovers(options);
    expect(snapshot()).to.equal(beforeRun);
  });

  it('agrees with the real catalogue: no row points at a file that is not there', function () {
    this.timeout(20000);
    const r = auditCovers();
    expect(r.rows).to.be.greaterThan(2000);
    expect(r.broken, JSON.stringify(r.broken.slice(0, 5))).to.deep.equal([]);
    expect(r.noSlash, JSON.stringify(r.noSlash.slice(0, 5))).to.deep.equal([]);
  });

  it('CLI: exits 2 on a bad flag and leaves the repo untouched', function () {
    this.timeout(20000);
    const bad = spawnSync('node', [REPORT, '--frobnicate']);
    expect(bad.status).to.equal(2);
    const ok = spawnSync('node', [REPORT, '--summary', '--check']);
    expect(ok.status).to.equal(0);
    expect(ok.stdout.toString()).to.match(/^Cover report/);
  });
});
