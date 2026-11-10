/**
 * Web-sized copies of the images the site ships.
 *
 * src/assets/images holds covers and photographs as they were acquired: some
 * are 6000px scans of several megabytes. Passthrough copy used to publish them
 * byte for byte, and by Nov 2026 _site was 1.01 GiB, over the 1 GB GitHub Pages
 * limit, 874 MB of it images. A cover renders at most 400px tall.
 *
 * shrinkImages() runs after the build and replaces each oversized file in the
 * OUTPUT directory with a resized copy at the same path and in the same format,
 * so no template, CSV cell or client-side script has to know. The sources are
 * never touched.
 *
 *   - An image is a candidate when its long edge is over maxEdge, or it weighs
 *     more than minBytes.
 *   - A candidate is resized to fit maxEdge (never enlarged) and re-encoded. If
 *     that doesn't save at least 10%, the original ships instead.
 *   - Anything sharp can't read ships as it is, and is reported.
 *
 * Results are cached by content hash in cacheDir, so a build only encodes
 * images it has not seen. Entries no source image uses any more are pruned.
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

const DEFAULTS = {
    srcDir: path.join(ROOT, 'src', 'assets', 'images'),
    cacheDir: path.join(ROOT, '.image-cache'),
    maxEdge: 1600,
    minBytes: 400 * 1024,
    jpegQuality: 82,
    minSaving: 0.1,
    concurrency: Math.max(2, Math.min(8, os.cpus().length)),
};

const IMAGE_RE = /\.(jpe?g|png)$/i;

function walk(dir, found = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, found);
        else if (entry.isFile() && IMAGE_RE.test(entry.name)) found.push(full);
    }
    return found;
}

/**
 * Resize one image. Returns the encoded buffer, or null when the original
 * should ship (small enough already, or the re-encode saves too little).
 * Throws when sharp can't read the file.
 */
async function encode(sharp, input, opts) {
    const meta = await sharp(input).metadata();
    const longEdge = Math.max(meta.width || 0, meta.height || 0);
    if (longEdge <= opts.maxEdge && input.length <= opts.minBytes) return null;

    // rotate() bakes in the EXIF orientation, which is dropped with the rest of
    // the metadata on output.
    const pipeline = sharp(input)
        .rotate()
        .resize({ width: opts.maxEdge, height: opts.maxEdge, fit: 'inside', withoutEnlargement: true });
    const output = meta.format === 'png'
        ? await pipeline.png({ compressionLevel: 9 }).toBuffer()
        : await pipeline.jpeg({ quality: opts.jpegQuality, mozjpeg: true }).toBuffer();

    return output.length <= input.length * (1 - opts.minSaving) ? output : null;
}

/**
 * @param {Object} options
 * @param {string} options.outDir   the images directory in the build output
 * @param {string} [options.srcDir] the source images directory it was copied from
 * @param {string} [options.cacheDir]
 * @returns {Promise<{files:number, resized:number, encoded:number, unreadable:string[], bytesBefore:number, bytesAfter:number}>}
 */
async function shrinkImages(options) {
    const opts = { ...DEFAULTS, ...options };
    if (!opts.outDir) throw new Error('shrinkImages: outDir is required');
    const sharp = require('sharp');

    fs.mkdirSync(opts.cacheDir, { recursive: true });
    const settings = `e${opts.maxEdge}-b${opts.minBytes}-q${opts.jpegQuality}-s${opts.minSaving}`;
    const files = walk(opts.srcDir);
    const stats = { files: files.length, resized: 0, encoded: 0, unreadable: [], bytesBefore: 0, bytesAfter: 0 };
    const used = new Set();

    let next = 0;
    const worker = async () => {
        while (next < files.length) {
            const file = files[next++];
            const rel = path.relative(opts.srcDir, file);
            const target = path.join(opts.outDir, rel);
            const input = fs.readFileSync(file);
            stats.bytesBefore += input.length;

            const hash = crypto.createHash('sha1').update(input).digest('hex');
            const base = `${hash}-${settings}`;
            const small = path.join(opts.cacheDir, `${base}${path.extname(file).toLowerCase()}`);
            const keep = path.join(opts.cacheDir, `${base}.keep`);

            if (!fs.existsSync(small) && !fs.existsSync(keep)) {
                let output = null;
                try {
                    output = await encode(sharp, input, opts);
                    stats.encoded++;
                } catch (err) {
                    // Not cached: a file that is fixed later gets another try.
                    stats.unreadable.push(rel);
                    stats.bytesAfter += input.length;
                    continue;
                }
                // Write-then-rename so an interrupted build can't leave a
                // truncated entry behind.
                const entry = output ? small : keep;
                const tmp = `${entry}.${process.pid}.tmp`;
                fs.writeFileSync(tmp, output || '');
                fs.renameSync(tmp, entry);
            }

            if (fs.existsSync(small)) {
                used.add(path.basename(small));
                fs.mkdirSync(path.dirname(target), { recursive: true });
                fs.copyFileSync(small, target);
                stats.resized++;
                stats.bytesAfter += fs.statSync(small).size;
            } else {
                used.add(path.basename(keep));
                stats.bytesAfter += input.length;
            }
        }
    };
    await Promise.all(Array.from({ length: opts.concurrency }, worker));

    for (const name of fs.readdirSync(opts.cacheDir)) {
        if (!used.has(name)) fs.rmSync(path.join(opts.cacheDir, name), { force: true });
    }
    return stats;
}

module.exports = { shrinkImages, DEFAULTS };
