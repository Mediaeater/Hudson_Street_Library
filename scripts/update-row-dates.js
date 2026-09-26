#!/usr/bin/env node
/**
 * Keep data/row-dates.json in step with the catalogue CSVs. The sitemap reads
 * it for <lastmod>; see scripts/utils/row-dates.js for why it exists.
 *
 *   node scripts/update-row-dates.js           rows that are new or changed get today
 *   node scripts/update-row-dates.js --seed    rebuild every date from git history
 *   node scripts/update-row-dates.js --check   exit 1 if the file is out of date
 *
 * The pre-commit hook runs the default mode whenever a catalogue CSV is staged
 * and stages the result, so a row's date moves exactly when its fields do.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { loadCatalogSync } = require('./utils/catalog');
const { DATES_FILE, readRows, parseRows, readDates } = require('./utils/row-dates');

const ROOT = path.join(__dirname, '..');
const mode = process.argv.includes('--seed') ? 'seed'
    : process.argv.includes('--check') ? 'check' : 'update';

function isoDate(d) {
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * { id: date } — the date of the last commit that changed each row's fields.
 * Walks every committed version of the file oldest-first and compares
 * fingerprints, so a commit that only re-quoted the file dates nothing. The
 * working-tree version counts as today. Needs full history (not CI's shallow
 * clone); run it locally.
 */
function historyDates(file) {
    const rel = path.relative(ROOT, file);
    const log = execFileSync('git', ['log', '--reverse', '--format=%H %ct', '--', rel], { cwd: ROOT, encoding: 'utf8' });
    const versions = log.trim().split('\n').filter(Boolean).map(l => {
        const [sha, ct] = l.split(' ');
        return { date: isoDate(new Date(Number(ct) * 1000)), text: () => execFileSync('git', ['show', `${sha}:${rel}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }) };
    });
    versions.push({ date: isoDate(new Date()), text: () => fs.readFileSync(file, 'utf8') });

    const last = {};   // id -> hash in the previous parsable version
    const dates = {};  // id -> date that hash first appeared
    for (const v of versions) {
        let rows;
        try { rows = parseRows(v.text()); } catch { continue; } // a broken historical commit
        for (const { id, hash } of rows) {
            if (last[id] !== hash) dates[id] = v.date;
            last[id] = hash;
        }
    }
    return dates;
}

const today = isoDate(new Date());
const recorded = mode === 'seed' ? {} : readDates();
const next = {};
let changed = 0;

for (const { file } of loadCatalogSync().files) {
    const history = mode === 'seed' ? historyDates(file) : null;
    for (const row of readRows(file)) {
        if (history) {
            next[row.id] = { hash: row.hash, date: history[row.id] || today };
            continue;
        }
        const prev = recorded[row.id];
        if (prev && prev.hash === row.hash) {
            next[row.id] = prev;
        } else {
            next[row.id] = { hash: row.hash, date: today };
            changed++;
        }
    }
}
const removed = Object.keys(recorded).filter(id => !(id in next)).length;

// One row per line, in id order, so a commit's diff shows exactly the rows it touched.
const ids = Object.keys(next).sort((a, b) => Number(a) - Number(b) || a.localeCompare(b));
const body = `{\n${ids.map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(next[id])}`).join(',\n')}\n}\n`;

if (mode === 'check') {
    const current = fs.existsSync(DATES_FILE) ? fs.readFileSync(DATES_FILE, 'utf8') : '';
    if (current !== body) {
        console.error(`row-dates.json is out of date (${changed} changed, ${removed} removed). Run: node scripts/update-row-dates.js`);
        process.exit(1);
    }
    console.log(`row-dates.json current (${ids.length} rows)`);
    process.exit(0);
}

fs.mkdirSync(path.dirname(DATES_FILE), { recursive: true });
fs.writeFileSync(DATES_FILE, body);
console.log(mode === 'seed'
    ? `row-dates.json seeded from git history: ${ids.length} rows`
    : `row-dates.json: ${changed} row(s) dated ${today}, ${removed} removed, ${ids.length} total`);
