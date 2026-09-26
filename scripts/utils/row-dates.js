/**
 * When each catalogue row last changed, for the sitemap's <lastmod>.
 *
 * Google uses lastmod only while it stays accurate, and the build cannot work
 * it out for itself: CI checks out a shallow clone, so git history isn't there
 * to ask. The dates therefore live in a committed file, data/row-dates.json,
 * as { "<id>": { "hash": "<fingerprint>", "date": "YYYY-MM-DD" } }.
 * scripts/update-row-dates.js writes it (seeded from git blame, then kept
 * current by the pre-commit hook whenever a catalogue CSV is staged).
 *
 * The fingerprint is a hash of the row's parsed fields, keyed by column name,
 * trimmed, with empty fields dropped, so re-quoting the file or adding an empty
 * column doesn't count as an edit to every row. At build time a row
 * whose fingerprint no longer matches the file (edited in a commit that skipped
 * the hook) gets no date at all, rather than a stale one.
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DATES_FILE = path.join(__dirname, '..', '..', 'data', 'row-dates.json');

function fingerprint(header, fields) {
    const parts = [];
    header.forEach((col, i) => {
        const value = String(fields[i] ?? '').trim();
        if (value) parts.push(`${String(col).trim()}\x1e${value}`);
    });
    parts.sort();
    return crypto.createHash('sha1').update(parts.join('\x1f')).digest('hex').slice(0, 12);
}

/**
 * Every data row of one catalogue CSV as { id, hash }.
 * @param {string} file
 * @returns {{id: string, hash: string}[]}
 */
function readRows(file) {
    return parseRows(fs.readFileSync(file, 'utf8'));
}

/** readRows over CSV text rather than a path (the seeder parses old commits). */
function parseRows(text) {
    const [header, ...rows] = parse(text, { relax_column_count: true, bom: true });
    const idCol = header.indexOf('id');
    return rows.map(record => ({ id: String(record[idCol]).trim(), hash: fingerprint(header, record) }));
}

function readDates() {
    try {
        return JSON.parse(fs.readFileSync(DATES_FILE, 'utf8'));
    } catch (err) {
        if (err.code === 'ENOENT') return {};
        throw err;
    }
}

/**
 * { id: 'YYYY-MM-DD' } for every row whose recorded fingerprint still matches
 * the CSV. Rows without a trustworthy date are left out.
 * @param {string[]} files catalogue CSV paths
 * @returns {Object<string, string>}
 */
function verifiedRowDates(files) {
    const recorded = readDates();
    const out = {};
    for (const file of files) {
        for (const row of readRows(file)) {
            const entry = recorded[row.id];
            if (entry && entry.hash === row.hash) out[row.id] = entry.date;
        }
    }
    return out;
}

module.exports = { DATES_FILE, fingerprint, readRows, parseRows, readDates, verifiedRowDates };
