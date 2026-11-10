const fs = require('fs');
const os = require('os');
const path = require('path');
const { expect } = require('chai');
const sharp = require('sharp');
const { shrinkImages } = require('../scripts/utils/web-images');

describe('web-images shrinkImages', function () {
  this.timeout(30000);
  let dir, srcDir, outDir, cacheDir;

  // Noise, so the JPEG is as heavy as a real scan and a re-encode has something to save.
  const noisy = (width, height) => sharp({
    create: { width, height, channels: 3, background: '#888888', noise: { type: 'gaussian', mean: 128, sigma: 40 } },
  });
  const run = () => shrinkImages({ srcDir, outDir, cacheDir });
  // Passthrough copy has already put every source file in the output.
  const passthrough = () => fs.cpSync(srcDir, outDir, { recursive: true });

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-images-'));
    srcDir = path.join(dir, 'src');
    outDir = path.join(dir, 'out');
    cacheDir = path.join(dir, 'cache');
    fs.mkdirSync(path.join(srcDir, 'books'), { recursive: true });
    await noisy(3000, 2000).jpeg({ quality: 95 }).toFile(path.join(srcDir, 'books', 'big.jpg'));
    await sharp({ create: { width: 300, height: 400, channels: 3, background: '#224466' } })
      .jpeg().toFile(path.join(srcDir, 'books', 'small.jpg'));
    fs.writeFileSync(path.join(srcDir, 'books', 'broken.jpg'), 'not an image');
    passthrough();
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('resizes an oversized image in the output, at the same path', async () => {
    const stats = await run();
    const meta = await sharp(path.join(outDir, 'books', 'big.jpg')).metadata();
    expect([meta.width, meta.height]).to.deep.equal([1600, 1067]);
    expect(meta.format).to.equal('jpeg');
    expect(stats.resized).to.equal(1);
    expect(stats.bytesAfter).to.be.below(stats.bytesBefore);
  });

  it('never touches the source', async () => {
    const before = fs.readFileSync(path.join(srcDir, 'books', 'big.jpg'));
    await run();
    expect(fs.readFileSync(path.join(srcDir, 'books', 'big.jpg')).equals(before)).to.equal(true);
  });

  it('ships a small image byte for byte', async () => {
    await run();
    const src = fs.readFileSync(path.join(srcDir, 'books', 'small.jpg'));
    expect(fs.readFileSync(path.join(outDir, 'books', 'small.jpg')).equals(src)).to.equal(true);
  });

  it('reports a file it cannot read and ships it as is', async () => {
    const stats = await run();
    expect(stats.unreadable).to.deep.equal([path.join('books', 'broken.jpg')]);
    expect(fs.readFileSync(path.join(outDir, 'books', 'broken.jpg'), 'utf8')).to.equal('not an image');
  });

  it('encodes nothing on a second run, and still writes the output', async () => {
    await run();
    fs.rmSync(outDir, { recursive: true });
    passthrough();
    const stats = await run();
    // broken.jpg is never cached, so it is tried (and fails) again; nothing is encoded.
    expect(stats.encoded).to.equal(0);
    expect(stats.resized).to.equal(1);
    const meta = await sharp(path.join(outDir, 'books', 'big.jpg')).metadata();
    expect(meta.width).to.equal(1600);
  });

  it('prunes cache entries no source image uses', async () => {
    await run();
    const entries = fs.readdirSync(cacheDir).length;
    fs.rmSync(path.join(srcDir, 'books', 'big.jpg'));
    await run();
    expect(fs.readdirSync(cacheDir).length).to.equal(entries - 1);
  });
});
