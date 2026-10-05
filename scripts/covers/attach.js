#!/usr/bin/env node
/**
 * Attach a cover to one catalogue row.
 *
 *   node scripts/covers/attach.js <id> <file-or-url> [--overwrite] [--dry-run]
 *
 * One row, one image. It:
 *   1. reads the image (a local file, or one http(s) GET) and checks the bytes
 *      really are a JPEG, PNG or WebP. An HTML error page saved as .jpg, a GIF,
 *      and the 1x1 "no cover" stubs OpenLibrary and Amazon serve are refused;
 *   2. names it by the convention in .claude/CLAUDE.md,
 *      {author_last}_{author_first}_{title}_{isbn}.jpg, lowercase;
 *   3. saves it to src/assets/images/books/ (PNG and WebP are converted to JPEG);
 *   4. sets the row's image_url, with its leading slash, through CSVHandler on
 *      the wing file that holds the row, and checks that nothing else changed.
 *
 * It refuses a row that already has a cover, and a filename that is already on
 * disk, unless --overwrite is given. With --overwrite the old file is left
 * where it is (it shows up as an orphan in the report). Nothing is deleted.
 *
 * It does not crop. Run scripts/auto-crop-covers.py on the saved file if the
 * source was a photograph on a background, and look at the result.
 *
 * To see which rows need a cover: scripts/covers/report.js.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { parse } = require('csv-parse/sync');
const CSVHandler = require('../utils/csv-handler');
const { loadCatalogSync, fileForIdentifier } = require('../utils/catalog');
const { conventionalCoverFilename, derivedCoverPath, coverFileExists, isSet, isPlaceholder } = require('../utils/cover-path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const BOOKS_DIR_URL = '/assets/images/books';
const MIN_BYTES = 2 * 1024;        // below this it is a stub, not a cover
const SMALL_BYTES = 8 * 1024;      // the report flags covers under this
const MAX_BYTES = 40 * 1024 * 1024;
const MIN_EDGE = 200;              // px, long edge
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

class AttachError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AttachError';
    }
}

/**
 * What the bytes are, whatever the extension or Content-Type claims.
 * @param {Buffer} buf
 * @returns {'jpeg'|'png'|'webp'|'gif'|'html'|'unknown'}
 */
function sniff(buf) {
    if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
    if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
    if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.toString('latin1', 0, 6))) return 'gif';
    if (/^\s*<(!doctype|html|\?xml|svg)/i.test(buf.toString('latin1', 0, 200))) return 'html';
    return 'unknown';
}

/**
 * Pixel size of a JPEG from its frame header.
 * @param {Buffer} buf
 * @returns {{width: number, height: number}|null}
 */
function jpegSize(buf) {
    let i = 2;
    while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i++; continue; }
        const marker = buf[i + 1];
        if (marker === 0xff) { i++; continue; }
        if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
        const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isFrame) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
        if (marker === 0xda || marker === 0xd9) return null;
        i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
}

/** PNG or WebP bytes -> JPEG bytes. sharp when it is installed, else macOS sips. */
async function toJpeg(buf, kind) {
    try {
        const sharp = require('sharp');
        return await sharp(buf).flatten({ background: '#ffffff' }).jpeg({ quality: 92 }).toBuffer();
    } catch (sharpError) {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'attach-cover-'));
        try {
            const input = path.join(tmp, `in.${kind}`);
            const output = path.join(tmp, 'out.jpg');
            fs.writeFileSync(input, buf);
            execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', input, '--out', output], { stdio: 'ignore' });
            return fs.readFileSync(output);
        } catch (_) {
            throw new AttachError(`Could not convert this ${kind.toUpperCase()} to JPEG (${sharpError.message.split('\n')[0]}). Convert it yourself and pass the .jpg.`);
        } finally {
            fs.rmSync(tmp, { recursive: true, force: true });
        }
    }
}

async function readSource(source) {
    if (/^https?:\/\//i.test(source)) {
        let response;
        try {
            response = await fetch(source, {
                headers: { 'User-Agent': USER_AGENT, Accept: 'image/jpeg,image/png,image/webp,image/*;q=0.8' },
                redirect: 'follow',
                signal: AbortSignal.timeout(30000),
            });
        } catch (error) {
            throw new AttachError(`Could not fetch ${source}: ${error.cause ? error.cause.message : error.message}`);
        }
        if (!response.ok) throw new AttachError(`Could not fetch ${source}: HTTP ${response.status}`);
        const length = Number(response.headers.get('content-length') || 0);
        if (length > MAX_BYTES) throw new AttachError(`Refusing ${source}: ${length} bytes is too large for a cover`);
        return Buffer.from(await response.arrayBuffer());
    }
    const file = path.resolve(source);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new AttachError(`No such file: ${source}`);
    return fs.readFileSync(file);
}

/**
 * Check the bytes and return them as a JPEG.
 * @param {Buffer} buf
 * @returns {Promise<{jpeg: Buffer, kind: string, width: number, height: number, warnings: string[]}>}
 */
async function prepareImage(buf) {
    const warnings = [];
    if (buf.length > MAX_BYTES) throw new AttachError(`${buf.length} bytes is too large for a cover`);
    const kind = sniff(buf);
    if (kind === 'html') throw new AttachError('That is an HTML or SVG document, not an image. The server sent a page instead of the file.');
    if (kind === 'gif') throw new AttachError('That is a GIF. Covers are photographs; a GIF from a book API is almost always its "no cover" stub.');
    if (kind === 'unknown') throw new AttachError('Those bytes are not a JPEG, PNG or WebP image.');
    if (buf.length < MIN_BYTES) throw new AttachError(`Only ${buf.length} bytes: a placeholder stub, not a cover.`);

    const jpeg = kind === 'jpeg' ? buf : await toJpeg(buf, kind);
    const size = jpegSize(jpeg);
    if (!size || !size.width || !size.height) throw new AttachError('Could not read the image dimensions; the file looks truncated.');
    if (Math.max(size.width, size.height) < MIN_EDGE) throw new AttachError(`${size.width}x${size.height}px is a thumbnail, not a cover.`);
    if (Math.max(size.width, size.height) < 600) warnings.push(`small image: ${size.width}x${size.height}px`);
    if (jpeg.length < SMALL_BYTES) warnings.push(`under 8 KB (${jpeg.length} bytes): the report will flag it`);
    if (size.width > size.height * 1.6) warnings.push(`${size.width}x${size.height}px is very wide: check it is the front cover and not a wraparound jacket or a spread`);
    if (kind !== 'jpeg') warnings.push(`converted from ${kind.toUpperCase()} to JPEG`);
    return { jpeg, kind, ...size, warnings };
}

/**
 * @param {string|number} id
 * @param {string} source  local path or http(s) URL
 * @param {Object} [options]
 * @param {boolean} [options.overwrite]  replace an existing cover / filename
 * @param {boolean} [options.dryRun]     do every check, write nothing
 * @param {string} [options.dataDir]     directory holding wings.json and catalog/
 * @param {string} [options.srcDir]      site source root
 * @returns {Promise<Object>}
 */
async function attachCover(id, source, options = {}) {
    const srcDir = options.srcDir || SRC;
    const catalogOptions = options.dataDir ? { dataDir: options.dataDir } : {};
    const rowId = String(id).trim();
    if (!/^\d+$/.test(rowId)) throw new AttachError(`"${id}" is not a row id`);
    if (!source) throw new AttachError('No image given: pass a local file or a URL');

    const before = loadCatalogSync(catalogOptions).data;
    const row = before.find(r => r.id === rowId);
    if (!row) throw new AttachError(`No row with id ${rowId}`);
    const located = fileForIdentifier(rowId, catalogOptions);
    if (!located) throw new AttachError(`No wing file holds id ${rowId}`);

    const filename = conventionalCoverFilename(row);
    const imageUrl = `${BOOKS_DIR_URL}/${filename}`;
    const target = path.join(srcDir, imageUrl);

    const current = isSet(row.image_url) && !isPlaceholder(row.image_url) ? row.image_url : '';
    const legacy = !current && coverFileExists(derivedCoverPath(row), srcDir) ? derivedCoverPath(row) : '';
    const targetExists = fs.existsSync(target);
    if (!options.overwrite) {
        if (current) throw new AttachError(`Row ${rowId} already has a cover: ${current}\nPass --overwrite to replace it.`);
        if (legacy) throw new AttachError(`Row ${rowId} already shows a cover by its legacy filename: ${legacy}\nPass --overwrite to attach a new one.`);
        if (targetExists) {
            const owner = before.find(r => r.image_url === imageUrl);
            throw new AttachError(`${imageUrl} is already on disk${owner ? ` and is the cover of row ${owner.id}` : ' (no row names it)'}.\nPass --overwrite to replace the file.`);
        }
    }

    const image = await prepareImage(await readSource(source));
    const result = {
        id: rowId,
        wing: located.slug,
        csv: located.file,
        title: row.title,
        image_url: imageUrl,
        file: target,
        bytes: image.jpeg.length,
        width: image.width,
        height: image.height,
        replaced: current || legacy || '',
        warnings: image.warnings,
        dryRun: Boolean(options.dryRun),
        linesChanged: 0,
    };
    if (options.dryRun) return result;

    const originalCsv = fs.readFileSync(located.file);
    const originalImage = targetExists ? fs.readFileSync(target) : null;
    const undo = () => {
        fs.writeFileSync(located.file, originalCsv);
        if (originalImage) fs.writeFileSync(target, originalImage);
        else fs.rmSync(target, { force: true });
    };

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, image.jpeg);
    try {
        const writeOptions = options.dataDir ? { allowedDir: options.dataDir } : {};
        const update = await CSVHandler.updateBook(rowId, { image_url: imageUrl }, located.file, writeOptions);
        if (!update.success) throw new AttachError(`CSV update failed: ${update.error || (update.errors || []).join('; ')}`);
        result.backup = update.backup;

        // The write goes through CSVHandler, which rewrites the whole file and
        // cleans as it goes (trims cells, fills an empty author_full_name with
        // "Unknown"). Hold it to the promise: one cell changed, nothing else.
        // The catalogue loader reads through the same cleaning, so compare the
        // raw cells instead. This parse is read-only.
        const cells = text => parse(text, { columns: false, bom: true, relax_column_count: true });
        const was_ = cells(originalCsv);
        const now_ = cells(fs.readFileSync(located.file));
        if (now_.length !== was_.length) throw new AttachError(`Row count changed (${was_.length - 1} -> ${now_.length - 1}); file restored`);
        const header = was_[0];
        const imageColumn = header.indexOf('image_url');
        for (let r = 0; r < was_.length; r++) {
            if (now_[r].length !== was_[r].length) throw new AttachError(`Column count changed in row ${was_[r][0]}; file restored`);
            for (let c = 0; c < was_[r].length; c++) {
                const expected = r > 0 && was_[r][0] === rowId && c === imageColumn ? imageUrl : was_[r][c];
                if (now_[r][c] !== expected) {
                    throw new AttachError(`CSVHandler would also change row ${was_[r][0]}, column ${header[c]}: ${JSON.stringify(was_[r][c])} -> ${JSON.stringify(now_[r][c])}.\nNothing was written. Fix that cell first, or set image_url with scripts/set-book-fields.js.`);
                }
            }
        }
        const was = originalCsv.toString('utf8').split('\n');
        const now = fs.readFileSync(located.file, 'utf8').split('\n');
        result.linesChanged = was.length === now.length ? now.filter((line, i) => line !== was[i]).length : -1;
        if (result.linesChanged !== 1) {
            result.warnings.push(`${path.basename(located.file)}: ${result.linesChanged < 0 ? 'the line count' : `${result.linesChanged} lines`} changed on disk, not 1. Every cell is intact (checked); CSVHandler re-quoted fields another writer had quoted differently.`);
        }
    } catch (error) {
        undo();
        throw error;
    }
    return result;
}

function main(argv) {
    const args = argv.slice(2);
    const flags = new Set(args.filter(a => a.startsWith('--')));
    const positional = args.filter(a => !a.startsWith('--'));
    const known = ['--overwrite', '--dry-run', '--help'];
    const unknown = [...flags].filter(f => !known.includes(f));
    if (flags.has('--help') || unknown.length || positional.length !== 2) {
        if (unknown.length) console.error(`Unknown option: ${unknown.join(', ')}`);
        console.error('Usage: node scripts/covers/attach.js <id> <file-or-url> [--overwrite] [--dry-run]');
        console.error('One row and one image per run. See which rows need one: node scripts/covers/report.js');
        return Promise.resolve(flags.has('--help') ? 0 : 2);
    }
    return attachCover(positional[0], positional[1], { overwrite: flags.has('--overwrite'), dryRun: flags.has('--dry-run') })
        .then(r => {
            console.log(`${r.dryRun ? 'Would attach' : 'Attached'}: row ${r.id} (${r.wing}) ${r.title}`);
            console.log(`  image_url  ${r.image_url}`);
            console.log(`  file       ${path.relative(ROOT, r.file)}  ${r.width}x${r.height}px  ${(r.bytes / 1024).toFixed(1)} KB`);
            if (r.replaced) console.log(`  replaced   ${r.replaced} (file left on disk)`);
            r.warnings.forEach(w => console.log(`  warning    ${w}`));
            if (!r.dryRun) console.log('Look at the file before committing. Crop if needed: python3 scripts/auto-crop-covers.py <file>');
            return 0;
        })
        .catch(error => {
            if (!(error instanceof AttachError) && error.name !== 'CatalogError') throw error;
            console.error(`Not attached. ${error.message}`);
            return 1;
        });
}

if (require.main === module) main(process.argv).then(code => process.exit(code));

module.exports = { attachCover, prepareImage, sniff, jpegSize, AttachError };
