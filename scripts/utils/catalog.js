'use strict';
/**
 * Catalog loader — the one place that knows the catalogue is several CSV files.
 *
 * The library is split into "wings" (art, cryptology, ephemera, …). Each wing
 * is one CSV under src/_data/ sharing the same 37-column schema:
 *
 *   src/_data/books.csv            → wing "art" (the original catalogue; the
 *                                    rename to catalog/art.csv is deferred)
 *   src/_data/catalog/<slug>.csv   → wing "<slug>"
 *
 * Every row gets `collection` stamped from the file it came from. There is no
 * collection column in the files; the filename is the source of truth, so it
 * cannot drift.
 *
 * Eleventy (.eleventy.js), the _data modules, and scripts all go through
 * loadCatalog() / loadCatalogSync() rather than reading books.csv directly.
 */

const fs = require('fs');
const path = require('path');
const CSVHandler = require('./csv-handler');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'src', '_data');
const ART_FILE = 'books.csv';
const CATALOG_SUBDIR = 'catalog';
const DEFAULT_WING = 'art';

/**
 * List the catalogue files in load order: books.csv (art) first, then
 * catalog/*.csv sorted by name.
 * @param {string} [dataDir] - override for tests
 * @returns {{slug: string, file: string}[]}
 */
function listCatalogFiles(dataDir = DATA_DIR) {
    const files = [];
    const art = path.join(dataDir, ART_FILE);
    if (fs.existsSync(art)) files.push({ slug: DEFAULT_WING, file: art });

    const dir = path.join(dataDir, CATALOG_SUBDIR);
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir)
            .filter(f => f.endsWith('.csv'))
            .sort()
            .forEach(f => files.push({ slug: path.basename(f, '.csv'), file: path.join(dir, f) }));
    }
    return files;
}

function stamp(rows, slug) {
    for (const row of rows) row.collection = slug;
    return rows;
}

function fatal(result, file) {
    const err = result.errors.find(e => e.type === 'fatal');
    if (err) throw new Error(`catalog: cannot read ${file}: ${err.message}`);
}

function assemble(parts) {
    const data = [];
    const files = [];
    for (const { slug, file, result } of parts) {
        fatal(result, file);
        stamp(result.data, slug);
        data.push(...result.data);
        files.push({ slug, file, rows: result.data.length });
    }
    return { data, files };
}

/**
 * Load every catalogue file and merge into one array.
 * @param {{dataDir?: string}} [options]
 * @returns {Promise<{data: Object[], files: {slug: string, file: string, rows: number}[]}>}
 */
async function loadCatalog(options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const parts = [];
    for (const { slug, file } of listCatalogFiles(dataDir)) {
        parts.push({ slug, file, result: await CSVHandler.readBooks(file) });
    }
    return assemble(parts);
}

/**
 * Synchronous variant for Eleventy _data modules and other sync contexts.
 * @param {{dataDir?: string}} [options]
 * @returns {{data: Object[], files: {slug: string, file: string, rows: number}[]}}
 */
function loadCatalogSync(options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const parts = listCatalogFiles(dataDir).map(({ slug, file }) =>
        ({ slug, file, result: CSVHandler.readBooksSync(file) }));
    return assemble(parts);
}

module.exports = {
    DATA_DIR,
    DEFAULT_WING,
    listCatalogFiles,
    loadCatalog,
    loadCatalogSync,
};
