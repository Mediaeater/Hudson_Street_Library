#!/usr/bin/env node
'use strict';
/**
 * Surgical single-row edit for the catalogue CSVs.
 *
 *   node scripts/set-book-fields.js <id> --json fields.json [--overwrite] [--dry-run]
 *
 * fields.json is one object of column -> value, e.g.
 *   { "description": "<p>…</p>", "page_count": 192, "tags": "Art, Photography" }
 *
 * Why not CSVHandler.write: it re-quotes every empty field and rewrites all
 * ~1800 rows. This raw-parses the file into arrays, changes only the named
 * cells of the one row, and stringifies with the file's own quoting style, so
 * `git diff` shows one line and a no-op run shows nothing.
 *
 * Refuses: an unknown column, `price` (never stored), `id` (a row's id is its
 * wing block membership), an id that isn't in the catalogue, a row whose field
 * count isn't the header's, a file that doesn't round-trip byte-for-byte, and — unless --overwrite — a cell that already has
 * a value. Values must be strings or numbers.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { fileForIdentifier, DATA_DIR } = require('./utils/catalog');

const FORBIDDEN = { price: 'the price field is always empty', id: 'ids are assigned by the ingest and fixed by wing block' };

class SetFieldsError extends Error {
    constructor(message) {
        super(message);
        this.name = 'SetFieldsError';
    }
}

function normalizeValue(column, value) {
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    if (typeof value === 'string') return value;
    throw new SetFieldsError(`${column}: value must be a string or number, got ${value === null ? 'null' : typeof value}`);
}

/**
 * @param {string|number} id
 * @param {Object<string, string|number>} fields
 * @param {{dataDir?: string, overwrite?: boolean, dryRun?: boolean}} [options]
 * @returns {{file: string, changed: string[], unchanged: string[]}}
 */
function setBookFields(id, fields, options = {}) {
    const dataDir = options.dataDir || DATA_DIR;
    const names = Object.keys(fields || {});
    if (!names.length) throw new SetFieldsError('no fields given');

    const located = fileForIdentifier(String(id), { dataDir });
    if (!located) throw new SetFieldsError(`no row with id ${id} in the catalogue`);

    const original = fs.readFileSync(located.file, 'utf8');
    const rows = parse(original, { relax_column_count: true });
    const header = rows[0];
    const render = () => {
        const out = stringify(rows, { header: false, quoted: true, quoted_empty: false });
        return original.endsWith('\n') ? out : out.replace(/\n$/, '');
    };
    // The whole method rests on parse -> stringify being the identity. A file
    // with explicit "" empties on some rows (hacking, media-theory) is not, and
    // an edit would rewrite unrelated lines, so refuse rather than churn.
    if (render() !== original) throw new SetFieldsError(`${path.basename(located.file)} does not round-trip byte-for-byte; an edit would rewrite lines other than row ${id}`);

    for (const name of names) {
        if (Object.prototype.hasOwnProperty.call(FORBIDDEN, name)) throw new SetFieldsError(`${name}: refused — ${FORBIDDEN[name]}`);
        if (!header.includes(name)) throw new SetFieldsError(`${name}: not a column of ${path.basename(located.file)}`);
    }

    const idCol = header.indexOf('id');
    const matches = rows.slice(1).filter(r => r[idCol] === String(id));
    if (!matches.length) throw new SetFieldsError(`no row with id ${id} in ${path.basename(located.file)}`);
    if (matches.length > 1) throw new SetFieldsError(`${matches.length} rows share id ${id} in ${path.basename(located.file)}`);
    const row = matches[0];
    if (row.length !== header.length) throw new SetFieldsError(`row ${id} has ${row.length} fields, header has ${header.length}; fix the structure first`);

    const changed = [];
    const unchanged = [];
    for (const name of names) {
        const col = header.indexOf(name);
        const next = normalizeValue(name, fields[name]);
        if (row[col] === next) {
            unchanged.push(name);
            continue;
        }
        if (row[col] !== '' && !options.overwrite) throw new SetFieldsError(`${name}: row ${id} already has a value; pass --overwrite to replace it`);
        row[col] = next;
        changed.push(name);
    }

    if (changed.length && !options.dryRun) {
        const out = render();
        const tmp = `${located.file}.tmp-${process.pid}`;
        fs.writeFileSync(tmp, out);
        fs.renameSync(tmp, located.file);
    }
    return { file: located.file, changed, unchanged };
}

function main(argv) {
    const args = argv.slice(2);
    const flag = name => args.includes(name);
    const jsonAt = args.indexOf('--json');
    const id = args.find((a, i) => !a.startsWith('--') && i !== jsonAt + 1);
    if (!id || jsonAt === -1 || !args[jsonAt + 1]) {
        console.error('usage: set-book-fields.js <id> --json <file> [--overwrite] [--dry-run]');
        return 2;
    }
    try {
        const fields = JSON.parse(fs.readFileSync(args[jsonAt + 1], 'utf8'));
        if (fields === null || typeof fields !== 'object' || Array.isArray(fields)) throw new SetFieldsError('the JSON file must hold one object of column: value');
        const result = setBookFields(id, fields, { overwrite: flag('--overwrite'), dryRun: flag('--dry-run') });
        const file = path.relative(process.cwd(), result.file);
        console.log(`${flag('--dry-run') ? 'would set' : 'set'} ${result.changed.length ? result.changed.join(', ') : '(nothing)'} on id ${id} in ${file}`);
        if (result.unchanged.length) console.log(`already equal: ${result.unchanged.join(', ')}`);
        return 0;
    } catch (err) {
        console.error(`set-book-fields: ${err.message}`);
        return 1;
    }
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { setBookFields, SetFieldsError };
