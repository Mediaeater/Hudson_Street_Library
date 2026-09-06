'use strict';
/**
 * Catalog loader — the one place that knows the catalogue is several CSV files.
 *
 * The library is split into "wings" (art, cryptology, ephemera, …), declared in
 * src/_data/wings.json. Each wing is one CSV under src/_data/ sharing the same
 * 37-column schema:
 *
 *   src/_data/books.csv            → wing "art" (the original catalogue; the
 *                                    rename to catalog/art.csv is deferred)
 *   src/_data/catalog/<slug>.csv   → wing "<slug>"
 *
 * Every row gets `collection` stamped from the wing it came from. There is no
 * collection column in the files; the registry + filename are the source of
 * truth, so it cannot drift.
 *
 * The loader THROWS (fails the build) on:
 *   - a file whose header is not the 37 canonical columns
 *   - a row with a field count other than 37
 *   - a catalog/*.csv with no entry in wings.json, or a wing whose file is missing
 *   - a non-integer id, an id duplicated across any files, or an id outside its
 *     wing's block (unless listed in the wing's allowLegacyIds)
 *
 * Eleventy (.eleventy.js), the _data modules, and scripts all go through
 * loadCatalog() / loadCatalogSync() rather than reading books.csv directly.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const CSVHandler = require('./csv-handler');
const { validateSchema } = require('./validate-schema');
const { existingCoverPath } = require('./cover-path');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'src', '_data');
const WINGS_FILE = 'wings.json';
const WINGS_SCHEMA = path.join(ROOT, 'src', 'schemas', 'wings.schema.json');
const WING_DEFAULTS = {
    isDefault: false,
    live: false,
    allowLegacyIds: [],
    classifications: [],
    defaultGrouping: '',
    // How adds to a wing are dated. 'acquired' is the historical behaviour and
    // stays the default, so the art wing is unaffected.
    intake: 'acquired',
    intro: '',
    featuredTags: [],
};
const CATALOG_SUBDIR = 'catalog';
const EXPECTED_COLUMNS = 37;

class CatalogError extends Error {
    constructor(message) {
        super(`catalog: ${message}`);
        this.name = 'CatalogError';
    }
}

/**
 * Read wings.json. Order in the file is load order; entry 0 must be the
 * default wing (books.csv today).
 * @param {string} [dataDir]
 * @returns {Object[]}
 */
function loadWings(dataDir = DATA_DIR) {
    const file = path.join(dataDir, WINGS_FILE);
    if (!fs.existsSync(file)) throw new CatalogError(`${rel(file)} not found`);
    let wings;
    try {
        wings = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (err) {
        throw new CatalogError(`${rel(file)} is not valid JSON: ${err.message}`);
    }
    const problems = validateSchema(wings, JSON.parse(fs.readFileSync(WINGS_SCHEMA, 'utf8')));
    if (problems.length) {
        throw new CatalogError(`${rel(file)} does not match ${rel(WINGS_SCHEMA)}:\n  ${problems.join('\n  ')}`);
    }
    wings = wings.map(w => ({ ...WING_DEFAULTS, ...w }));

    const slugs = new Set();
    for (const w of wings) {
        if (slugs.has(w.slug)) throw new CatalogError(`${rel(file)}: duplicate wing slug "${w.slug}"`);
        slugs.add(w.slug);
        if (w.idBlock[0] > w.idBlock[1]) throw new CatalogError(`${rel(file)}: wing "${w.slug}" idBlock lo > hi`);
        if (w.slug !== 'art' && w.file !== `catalog/${w.slug}.csv`) {
            throw new CatalogError(`${rel(file)}: wing "${w.slug}" must use file catalog/${w.slug}.csv (slug = filename)`);
        }
    }
    const defaults = wings.filter(w => w.isDefault);
    if (defaults.length !== 1 || !wings[0].isDefault) {
        throw new CatalogError(`${rel(file)}: exactly one wing must be isDefault and it must be entry 0`);
    }
    for (let i = 0; i < wings.length; i++) {
        for (let j = i + 1; j < wings.length; j++) {
            const [aLo, aHi] = wings[i].idBlock;
            const [bLo, bHi] = wings[j].idBlock;
            if (aLo <= bHi && bLo <= aHi) {
                throw new CatalogError(`${rel(file)}: id blocks of "${wings[i].slug}" and "${wings[j].slug}" overlap`);
            }
        }
    }
    return wings;
}

/**
 * List the catalogue files in load order (wings.json order). Every wing must
 * have its file; every catalog/*.csv must have a wing.
 * @param {string} [dataDir]
 * @returns {{slug: string, file: string, wing: Object}[]}
 */
function listCatalogFiles(dataDir = DATA_DIR) {
    const wings = loadWings(dataDir);
    const files = wings.map(wing => {
        const file = path.join(dataDir, wing.file);
        if (!fs.existsSync(file)) throw new CatalogError(`wing "${wing.slug}" declares ${wing.file} but it does not exist`);
        return { slug: wing.slug, file, wing };
    });

    const known = new Set(files.map(f => f.file));
    const dir = path.join(dataDir, CATALOG_SUBDIR);
    if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.csv')).sort()) {
            const full = path.join(dir, f);
            if (!known.has(full)) {
                throw new CatalogError(`${rel(full)} has no entry in ${WINGS_FILE}; add the wing before adding rows`);
            }
        }
    }
    return files;
}

function rel(file) {
    return path.relative(ROOT, file) || file;
}

/**
 * Strict structural pass: header + every row must have exactly 37 fields, and
 * every file's header must match the default wing's header field for field.
 * csv-parse reports the offending line number when a row is short or long.
 * @returns {string[]} the header
 */
function checkStructure(file, canonicalHeader) {
    let rows;
    try {
        rows = parse(fs.readFileSync(file, 'utf8'), {
            columns: false,
            relax_column_count: false,
            skip_empty_lines: true,
            quote: '"',
            escape: '"',
        });
    } catch (err) {
        throw new CatalogError(`${rel(file)}: ${err.message}`);
    }
    if (rows.length === 0) throw new CatalogError(`${rel(file)} is empty (needs at least the header row)`);
    const header = rows[0];
    if (header.length !== EXPECTED_COLUMNS) {
        throw new CatalogError(`${rel(file)}: header has ${header.length} columns, expected ${EXPECTED_COLUMNS}`);
    }
    if (canonicalHeader) {
        const i = header.findIndex((h, k) => h !== canonicalHeader[k]);
        if (i !== -1) {
            throw new CatalogError(`${rel(file)}: column ${i + 1} is "${header[i]}", expected "${canonicalHeader[i]}" (every catalogue file shares one schema)`);
        }
    }
    return header;
}

function fatal(result, file) {
    const err = result.errors.find(e => e.type === 'fatal');
    if (err) throw new CatalogError(`cannot read ${rel(file)}: ${err.message}`);
}

/**
 * Merge per-file results, stamp `collection`, assert id integrity.
 */
function assemble(parts) {
    const data = [];
    const files = [];
    const seen = new Map(); // id → slug

    for (const { slug, file, wing, result } of parts) {
        fatal(result, file);
        const [lo, hi] = wing.idBlock;
        const legacy = new Set((wing.allowLegacyIds || []).map(Number));

        result.data.forEach((row, i) => {
            const rowNo = i + 2; // 1-based, header is line 1 (approximate when fields span lines)
            if (!/^\d+$/.test(row.id)) {
                throw new CatalogError(`${rel(file)} row ${rowNo}: id "${row.id}" is not an integer`);
            }
            const id = Number(row.id);
            if (seen.has(id)) {
                throw new CatalogError(`duplicate id ${id}: ${rel(file)} row ${rowNo} collides with wing "${seen.get(id)}"`);
            }
            if ((id < lo || id > hi) && !legacy.has(id)) {
                throw new CatalogError(`${rel(file)} row ${rowNo}: id ${id} is outside the "${slug}" block ${lo}–${hi}`);
            }
            seen.set(id, slug);
            row.collection = slug;
        });

        data.push(...result.data);
        files.push({ slug, file, rows: result.data.length });
    }
    return { data, files };
}

function structuralPass(entries) {
    let canonical = null;
    for (const { file } of entries) {
        const header = checkStructure(file, canonical);
        if (!canonical) canonical = header;
    }
    return canonical;
}

/**
 * Load every catalogue file and merge into one array.
 * @param {{dataDir?: string}} [options]
 * @returns {Promise<{data: Object[], files: {slug, file, rows}[], wings: Object[], columns: string[]}>}
 */
async function loadCatalog(options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const entries = listCatalogFiles(dataDir);
    const columns = structuralPass(entries);
    const parts = [];
    for (const entry of entries) {
        parts.push({ ...entry, result: await CSVHandler.readBooks(entry.file) });
    }
    return { ...assemble(parts), wings: entries.map(e => e.wing), columns };
}

/**
 * Synchronous variant for Eleventy _data modules and other sync contexts.
 * @param {{dataDir?: string}} [options]
 */
function loadCatalogSync(options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const entries = listCatalogFiles(dataDir);
    const columns = structuralPass(entries);
    const parts = entries.map(entry => ({ ...entry, result: CSVHandler.readBooksSync(entry.file) }));
    return { ...assemble(parts), wings: entries.map(e => e.wing), columns };
}

/**
 * Look a wing up by slug. Throws rather than falling back to the default wing:
 * a typo'd --wing must not quietly file a cryptology book in books.csv.
 * @param {string} slug
 * @param {string} [dataDir]
 * @returns {Object}
 */
function resolveWing(slug, dataDir = DATA_DIR) {
    const wings = loadWings(dataDir);
    const wing = wings.find(w => w.slug === slug);
    if (!wing) {
        throw new CatalogError(`unknown wing "${slug}" (known: ${wings.map(w => w.slug).join(', ')})`);
    }
    return wing;
}

/**
 * The default wing — what a script writes to when no wing is named.
 * @param {string} [dataDir]
 */
function defaultWing(dataDir = DATA_DIR) {
    return loadWings(dataDir).find(w => w.isDefault);
}

/**
 * Absolute path of a wing's CSV.
 * @param {Object|string} wing - wing object or slug
 * @param {string} [dataDir]
 */
function wingFile(wing, dataDir = DATA_DIR) {
    const w = typeof wing === 'string' ? resolveWing(wing, dataDir) : wing;
    return path.join(dataDir, w.file);
}

/**
 * The wing that owns this id, or null. Registry lookup only — no file is read,
 * because the block IS the answer.
 *
 * An explicit allowLegacyIds entry wins over a block match: a legacy id is by
 * definition one that sits outside its own wing's block, so it usually lands
 * inside somebody else's, and the wing that claims it is the one that has it.
 * @param {number|string} id
 * @param {string} [dataDir]
 */
function wingForId(id, dataDir = DATA_DIR) {
    const n = Number(id);
    if (!Number.isInteger(n)) return null;
    const wings = loadWings(dataDir);
    return wings.find(w => (w.allowLegacyIds || []).map(Number).includes(n))
        || wings.find(w => n >= w.idBlock[0] && n <= w.idBlock[1])
        || null;
}

/**
 * Next free id for a wing: one past the highest id it already holds, or the
 * bottom of its block when empty. Ids are per-wing — a first cryptology book
 * takes 10001, not one past the art catalogue's maximum.
 * @param {string} slug
 * @param {{dataDir?: string}} [options]
 * @returns {number}
 */
function nextIdForWing(slug, options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const wing = resolveWing(slug, dataDir);
    const [lo, hi] = wing.idBlock;
    const result = CSVHandler.readBooksSync(wingFile(wing, dataDir));
    fatal(result, wingFile(wing, dataDir));
    let max = lo - 1;
    for (const row of result.data) {
        const id = Number(row.id);
        if (Number.isInteger(id) && id >= lo && id <= hi && id > max) max = id;
    }
    const next = max + 1;
    if (next > hi) throw new CatalogError(`wing "${slug}" has no free ids left in block ${lo}–${hi}`);
    return next;
}

/**
 * Which catalogue file holds a row, given an id or an ISBN. An id resolves
 * from the registry alone; an ISBN needs a scan, so the merged load is only
 * paid for when the identifier is not an id.
 * @param {string|number} identifier
 * @param {{dataDir?: string}} [options]
 * @returns {{slug: string, file: string}|null}
 */
function fileForIdentifier(identifier, options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const byId = wingForId(identifier, dataDir);
    if (byId) return { slug: byId.slug, file: wingFile(byId, dataDir) };
    const { data } = loadCatalogSync({ dataDir });
    const row = data.find(r => r.isbn_asin === identifier || r.id === String(identifier));
    if (!row) return null;
    const wing = resolveWing(row.collection, dataDir);
    return { slug: wing.slug, file: wingFile(wing, dataDir) };
}

/**
 * Render the merged catalogue as one CSV string for the client-rendered
 * catalog page (/cms/data/catalog.csv). Source rows are passed through as
 * their original bytes (csv-parse raw mode) with one extra trailing column,
 * `collection`, so this file has 38 columns. It is an OUTPUT, never a source:
 * the loader still refuses a 38-column file under src/_data/.
 *
 * Only the default wing and wings whose `live` flag is set are emitted — this
 * file is what the client-rendered catalogue page fetches, so a wing being
 * catalogued but not yet published must not appear in it. The structural pass
 * still runs over every wing, so a broken unpublished file still fails the
 * build. Pass `includeUnpublished` for a full merge (backups, audits).
 * @param {{dataDir?: string, includeUnpublished?: boolean}} [options]
 * @returns {string}
 */
function renderMergedCsv(options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const all = listCatalogFiles(dataDir);
    structuralPass(all);
    const entries = options.includeUnpublished ? all : all.filter(e => e.wing.isDefault || e.wing.live);
    const out = [];
    entries.forEach(({ slug, file }, fileIndex) => {
        const records = parse(fs.readFileSync(file, 'utf8'), {
            columns: false,
            raw: true,
            relax_column_count: false,
            skip_empty_lines: true,
            quote: '"',
            escape: '"',
        });
        records.forEach(({ raw }, i) => {
            if (i === 0) {
                if (fileIndex === 0) out.push(raw.replace(/\r?\n$/, '') + ',"collection"\n');
                return; // later files: header already emitted
            }
            out.push(raw.replace(/\r?\n$/, '') + `,"${slug}"\n`);
        });
    });
    return out.join('');
}

/**
 * Write renderMergedCsv() to disk, creating parent directories.
 * @param {string} outFile
 * @param {{dataDir?: string}} [options]
 * @returns {{file: string, bytes: number}}
 */
function writeMergedCsv(outFile, options = {}) {
    const csv = renderMergedCsv(options);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, csv);
    return { file: outFile, bytes: Buffer.byteLength(csv) };
}

/**
 * Render the merged catalogue as the public JSON endpoint (/data/books.json,
 * documented on /api-documentation/ and listed in .well-known/api-catalog).
 *
 * One object per row: the 37 catalogue columns as strings, plus two derived
 * keys — `collection`, the wing the row came from, and `cover_url`, a cover
 * path that is known to resolve. Pretty-printed, because the endpoint is meant
 * to be readable by hand as well as by `jq`.
 *
 * `image_url` stays a verbatim mirror of the column, so the endpoint still
 * reports the catalogue as catalogued. But the column is blank on 799 rows and
 * the site still shows covers for 55 of them, because the templates fall back
 * to the filename the naming convention implies — a consumer reading image_url
 * alone would conclude those books have no cover, and would have to fetch every
 * other path to find out which ones 404. `cover_url` answers that: image_url if
 * a file is actually there, else the conventional path if THAT is there, else
 * empty. Never a broken URL, never a false negative.
 *
 * This used to be a checked-in snapshot under data/ that was passthrough-copied
 * to the site, so it could only ever go stale — by Sept 2026 it was serving 1586
 * rows of Nov 2025 data, with cover paths that no longer existed. It is now
 * generated at build time and has no source file.
 *
 * Emits the same rows as renderMergedCsv: the default wing plus any wing whose
 * `live` flag is set. A wing still being catalogued is not advertised.
 * @param {{dataDir?: string, includeUnpublished?: boolean}} [options]
 * @returns {string}
 */
function renderBooksJson(options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const { data, wings, columns } = loadCatalogSync(options);
    const published = new Set(
        wings.filter(w => options.includeUnpublished || w.isDefault || w.live).map(w => w.slug)
    );
    const keys = [...columns, 'collection'];
    // Cover files sit under src/assets; the data dir is src/_data.
    const srcDir = options.srcDir || path.dirname(dataDir);
    const rows = data
        .filter(b => published.has(b.collection))
        .map(b => ({
            ...Object.fromEntries(keys.map(k => [k, b[k] == null ? '' : String(b[k])])),
            cover_url: existingCoverPath(b, { srcDir }),
        }));
    return JSON.stringify(rows, null, 2) + '\n';
}

/**
 * Write renderBooksJson() to disk, creating parent directories.
 * @param {string} outFile
 * @param {{dataDir?: string, includeUnpublished?: boolean}} [options]
 * @returns {{file: string, bytes: number, rows: number}}
 */
function writeBooksJson(outFile, options = {}) {
    const json = renderBooksJson(options);
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, json);
    return { file: outFile, bytes: Buffer.byteLength(json), rows: JSON.parse(json).length };
}

module.exports = {
    DATA_DIR,
    EXPECTED_COLUMNS,
    CatalogError,
    loadWings,
    listCatalogFiles,
    loadCatalog,
    loadCatalogSync,
    resolveWing,
    defaultWing,
    wingFile,
    wingForId,
    nextIdForWing,
    fileForIdentifier,
    renderMergedCsv,
    writeMergedCsv,
    renderBooksJson,
    writeBooksJson,
};
