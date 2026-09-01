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

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'src', '_data');
const WINGS_FILE = 'wings.json';
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
    if (!Array.isArray(wings) || wings.length === 0) {
        throw new CatalogError(`${rel(file)} must be a non-empty array of wings`);
    }
    const slugs = new Set();
    for (const w of wings) {
        if (!w.slug || !w.file || !Array.isArray(w.idBlock) || w.idBlock.length !== 2) {
            throw new CatalogError(`${rel(file)}: every wing needs slug, file and idBlock [lo, hi] (offending: ${JSON.stringify(w)})`);
        }
        if (slugs.has(w.slug)) throw new CatalogError(`${rel(file)}: duplicate wing slug "${w.slug}"`);
        slugs.add(w.slug);
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
 * Render the merged catalogue as one CSV string for the client-rendered
 * catalog page (/cms/data/catalog.csv). Source rows are passed through as
 * their original bytes (csv-parse raw mode) with one extra trailing column,
 * `collection`, so this file has 38 columns. It is an OUTPUT, never a source:
 * the loader still refuses a 38-column file under src/_data/.
 * @param {{dataDir?: string}} [options]
 * @returns {string}
 */
function renderMergedCsv(options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const entries = listCatalogFiles(dataDir);
    structuralPass(entries);
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

module.exports = {
    DATA_DIR,
    EXPECTED_COLUMNS,
    CatalogError,
    loadWings,
    listCatalogFiles,
    loadCatalog,
    loadCatalogSync,
    renderMergedCsv,
    writeMergedCsv,
};
