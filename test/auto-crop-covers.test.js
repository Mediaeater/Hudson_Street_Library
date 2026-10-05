const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { expect } = require('chai');
const sharp = require('sharp');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'auto-crop-covers.py');
const hasPillow = spawnSync('python3', ['-c', 'import PIL']).status === 0;

// The script's exit status is its contract: 0 only when the crop is clean.
(hasPillow ? describe : describe.skip)('auto-crop-covers.py exit status', function () {
  this.timeout(20000);
  let dir;
  const W = 1000;
  const H = 1000;
  const rect = (width, height, color) => sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
  const scene = async (name, background, layers) => {
    const file = path.join(dir, name);
    await sharp({ create: { width: W, height: H, channels: 3, background } })
      .composite(layers).jpeg({ quality: 95 }).toFile(file);
    return file;
  };
  const crop = (file, ...flags) => {
    const before = fs.readFileSync(file);
    const run = spawnSync('python3', [SCRIPT, '--input', file, '--overwrite', ...flags]);
    return { status: run.status, out: run.stdout.toString() + run.stderr.toString(), changed: !before.equals(fs.readFileSync(file)) };
  };

  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auto-crop-')); });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('0: a book on white is cropped to the book', async () => {
    const file = await scene('white.jpg', '#ffffff', [{ input: await rect(400, 600, '#1d3b6e'), left: 300, top: 200 }]);
    const r = crop(file);
    expect(r.status, r.out).to.equal(0);
    expect(r.changed).to.equal(true);
    const meta = await sharp(file).metadata();
    expect(meta.width).to.be.within(440, 500);
    expect(meta.height).to.be.within(640, 700);
  });

  it('5: a shadow left in the frame is written but reported', async () => {
    const file = await scene('shadow.jpg', '#ffffff', [
      { input: await rect(460, 640, '#d2d2d2'), left: 300, top: 200 },   // soft grey shadow, down and right
      { input: await rect(400, 600, '#1d3b6e'), left: 300, top: 200 },
    ]);
    const r = crop(file);
    expect(r.status, r.out).to.equal(5);
    expect(r.out).to.match(/NOT CLEAN: a shadow or soft edge remains on the right, bottom/);
    expect(r.changed).to.equal(true);
  });

  it('4: a grey backdrop is refused and the file left alone; --force crops and still reports it', async () => {
    const file = await scene('grey.jpg', '#b4b4b4', [{ input: await rect(400, 600, '#1d3b6e'), left: 300, top: 200 }]);
    const r = crop(file);
    expect(r.status, r.out).to.equal(4);
    expect(r.out).to.match(/backdrop is not white/);
    expect(r.changed).to.equal(false);
    const forced = crop(file, '--force');
    expect(forced.status, forced.out).to.equal(5);
    expect(forced.changed).to.equal(true);
  });

  it('4: a dark full-bleed cover is refused, not cut into', async () => {
    const file = await scene('cloth.jpg', '#20242c', [{ input: await rect(500, 200, '#c8b47a'), left: 250, top: 400 }]);
    const r = crop(file);
    expect(r.status, r.out).to.equal(4);
    expect(r.changed).to.equal(false);
  });

  it('4: corners that disagree are refused', async () => {
    const file = await scene('corners.jpg', '#ffffff', [
      { input: await rect(500, 500, '#303030'), left: 0, top: 0 },
      { input: await rect(300, 300, '#1d3b6e'), left: 600, top: 600 },
    ]);
    const r = crop(file);
    expect(r.status, r.out).to.equal(4);
    expect(r.out).to.match(/corners disagree/);
    expect(r.changed).to.equal(false);
  });

  it('3: a cover that already fills the frame is left alone', async () => {
    const file = await scene('tight.jpg', '#ffffff', [{ input: await rect(990, 990, '#1d3b6e'), left: 5, top: 5 }]);
    const r = crop(file);
    expect(r.status, r.out).to.equal(3);
    expect(r.changed).to.equal(false);
  });

  it('3: a blank image is left alone', async () => {
    const r = crop(await scene('blank.jpg', '#ffffff', []));
    expect(r.status, r.out).to.equal(3);
    expect(r.changed).to.equal(false);
  });

  it('1: a missing file is an error', () => {
    const run = spawnSync('python3', [SCRIPT, '--input', path.join(dir, 'nope.jpg'), '--overwrite']);
    expect(run.status).to.equal(1);
  });
});
