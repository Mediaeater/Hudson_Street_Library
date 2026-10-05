#!/usr/bin/env node
/**
 * Cover report: which rows have no cover, which covers are suspect, and which
 * image files no row uses.
 *
 * It reads the catalogue the way the build does (loadCatalogSync, every wing),
 * takes each row's image_url at its word and checks the file on disk. It
 * guesses no filenames, fetches nothing and writes nothing.
 *
 *   node scripts/covers/report.js                     every wing
 *   node scripts/covers/report.js --wing hacking
 *   node scripts/covers/report.js --tag "Surveillance Index Edition Two"
 *   node scripts/covers/report.js --grouping Magazines
 *   node scripts/covers/report.js --ids 61,248,1300-1320
 *   node scripts/covers/report.js --summary           counts only
 *   node scripts/covers/report.js --orphans           list unused files too
 *   node scripts/covers/report.js --json
 *   node scripts/covers/report.js --check             exit 1 on a path that would 404
 *
 * Scope flags combine (AND). Orphan files are a fact about the whole
 * catalogue, so they are always computed against every row, whatever the scope.
 *
 * To put a cover on a row: scripts/covers/attach.js.
 */
const fs = require('fs');
const path = require('path');
const { loadCatalogSync, resolveWing } = require('../utils/catalog');
const { derivedCoverPath, isSet, isPlaceholder } = require('../utils/cover-path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const BOOKS_DIR_URL = '/assets/images/books';
const SMALL_BYTES = 8 * 1024;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

/**
 * "61,248,1300-1320" -> Set of id strings.
 * @param {string} spec
 * @returns {Set<string>}
 */
function parseIds(spec) {
    const ids = new Set();
    for (const piece of String(spec).split(',').map(s => s.trim()).filter(Boolean)) {
        const range = piece.match(/^(\d+)-(\d+)$/);
        if (range) {
            const [from, to] = [Number(range[1]), Number(range[2])];
            if (to < from || to - from > 100000) throw new Error(`Bad id range: ${piece}`);
            for (let id = from; id <= to; id++) ids.add(String(id));
        } else if (/^\d+$/.test(piece)) {
            ids.add(piece);
        } else {
            throw new Error(`Bad id: ${piece}`);
        }
    }
    return ids;
}

/**
 * Looks a site-absolute path up on disk with the exact case the path uses.
 * macOS would say yes to Cover.JPG for cover.jpg; the deployed site would 404.
 */
function makeDisk(srcDir) {
    const listings = new Map();
    const list = dir => {
        if (!listings.has(dir)) {
            let names = null;
            try { names = new Set(fs.readdirSync(dir)); } catch (_) { /* not a directory */ }
            listings.set(dir, names);
        }
        return listings.get(dir);
    };
    return {
        /** @returns {number} file size in bytes, or -1 when there is no such file */
        size(url) {
            const clean = path.posix.normalize(String(url));
            if (!clean.startsWith('/') || clean.includes('/../')) return -1;
            let dir = srcDir;
            const segments = clean.split('/').filter(Boolean);
            for (let i = 0; i < segments.length; i++) {
                const names = list(dir);
                if (!names || !names.has(segments[i])) return -1;
                dir = path.join(dir, segments[i]);
            }
            const stat = fs.statSync(dir);
            return stat.isFile() ? stat.size : -1;
        },
    };
}

/** Every image file under a directory, as site-absolute paths, with sizes. */
function walkImages(srcDir, dirUrl) {
    const out = [];
    const walk = url => {
        let entries;
        try { entries = fs.readdirSync(path.join(srcDir, url), { withFileTypes: true }); } catch (_) { return; }
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const child = `${url}/${entry.name}`;
            if (entry.isDirectory()) walk(child);
            else if (IMAGE_EXT.test(entry.name)) out.push({ path: child, bytes: fs.statSync(path.join(srcDir, child)).size });
        }
    };
    walk(dirUrl);
    return out.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * Text sources under src/ that can name an image without a catalogue row:
 * templates, pages, data files. One string, searched by filename.
 */
function pageSources(srcDir) {
    const chunks = [];
    const skip = new Set(['images', 'backups', 'catalog', 'node_modules']);
    const walk = dir => {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) { if (!skip.has(entry.name)) walk(full); }
            else if (/\.(html|njk|md|json|js|css|xml|txt)$/i.test(entry.name)) chunks.push(fs.readFileSync(full, 'utf8'));
        }
    };
    walk(srcDir);
    return chunks.join('\n');
}

const brief = row => ({
    id: row.id,
    wing: row.collection,
    author: [row.author_last, row.author_first].filter(isSet).join(', '),
    title: row.title,
    year: isSet(row.publication_year) ? row.publication_year : '',
    isbn: isSet(row.isbn_asin) ? row.isbn_asin : '',
});

/**
 * @param {Object} [options]
 * @param {string} [options.dataDir]  directory holding wings.json and catalog/
 * @param {string} [options.srcDir]   site source root that image_url is relative to
 * @param {string} [options.wing]     wing slug
 * @param {string} [options.tag]      exact tag, case-insensitive
 * @param {string} [options.grouping] exact collection_grouping, case-insensitive
 * @param {string|Iterable<string|number>} [options.ids]
 * @returns {Object} the report (see the bottom of the function)
 */
function auditCovers(options = {}) {
    const srcDir = options.srcDir || SRC;
    const catalogOptions = options.dataDir ? { dataDir: options.dataDir } : {};
    const { data } = loadCatalogSync(catalogOptions);
    const disk = makeDisk(srcDir);

    const scope = {};
    let rows = data;
    if (options.wing) {
        const wing = resolveWing(options.wing, options.dataDir);
        if (!wing) throw new Error(`No such wing: ${options.wing}`);
        scope.wing = wing.slug;
        rows = rows.filter(r => r.collection === wing.slug);
    }
    if (options.tag) {
        const want = options.tag.trim().toLowerCase();
        scope.tag = options.tag.trim();
        rows = rows.filter(r => String(r.tags || '').split(',').some(t => t.trim().toLowerCase() === want));
    }
    if (options.grouping) {
        const want = options.grouping.trim().toLowerCase();
        scope.grouping = options.grouping.trim();
        rows = rows.filter(r => String(r.collection_grouping || '').trim().toLowerCase() === want);
    }
    let unknownIds = [];
    if (options.ids !== undefined) {
        const ids = typeof options.ids === 'string' ? parseIds(options.ids) : new Set([...options.ids].map(String));
        scope.ids = ids.size;
        const known = new Set(data.map(r => r.id));
        unknownIds = [...ids].filter(id => !known.has(id));
        rows = rows.filter(r => ids.has(r.id));
    }

    const report = {
        scope,
        rows: rows.length,
        withCover: 0,
        blank: [],        // image_url empty: the page shows the placeholder
        unlinked: [],     // image_url empty, but a file sits at the legacy derived path and the page shows it
        placeholder: [],  // image_url is the placeholder file itself
        noSlash: [],      // image_url without its leading slash
        broken: [],       // image_url names a file that is not on disk (exact case)
        small: [],        // the cover is on disk but under 8 KB: a thumbnail or a stub
        byWing: {},
        unknownIds,
    };

    const wingTally = slug => (report.byWing[slug] = report.byWing[slug] || { rows: 0, blank: 0 });

    for (const row of rows) {
        const tally = wingTally(row.collection);
        tally.rows++;
        const url = isSet(row.image_url) ? row.image_url.trim() : '';

        if (!url) {
            const derived = derivedCoverPath(row);
            if (disk.size(derived) >= 0) report.unlinked.push({ ...brief(row), file: derived });
            else { report.blank.push(brief(row)); tally.blank++; }
            continue;
        }
        if (isPlaceholder(url)) { report.placeholder.push({ ...brief(row), image_url: url }); continue; }
        if (/^https?:\/\//i.test(url)) { report.withCover++; continue; }
        if (!url.startsWith('/')) { report.noSlash.push({ ...brief(row), image_url: url }); continue; }

        const bytes = disk.size(url);
        if (bytes < 0) { report.broken.push({ ...brief(row), image_url: url }); continue; }
        report.withCover++;
        if (bytes < SMALL_BYTES) report.small.push({ ...brief(row), image_url: url, bytes });
    }

    // Files, against the whole catalogue.
    const named = new Set();
    const derivedUse = new Set();
    for (const row of data) {
        if (isSet(row.image_url)) named.add(row.image_url.trim());
        else derivedUse.add(derivedCoverPath(row));
    }
    const files = walkImages(srcDir, BOOKS_DIR_URL);
    const unnamed = files.filter(f => !named.has(f.path));
    const unused = unnamed.filter(f => !derivedUse.has(f.path));
    const sources = unused.length ? pageSources(srcDir) : '';
    const onAPage = f => sources.includes(path.posix.basename(f.path)) || sources.includes(encodeURI(path.posix.basename(f.path)));
    report.files = {
        dir: BOOKS_DIR_URL,
        total: files.length,
        unnamed: unnamed.length,                                         // named by no image_url
        usedByPages: unused.filter(onAPage),                             // no row, but a template or page names the file
        orphans: unused.filter(f => !onAPage(f)),                        // named by nothing under src/
        small: files.filter(f => f.bytes < SMALL_BYTES),
    };

    return report;
}

function formatReport(report, { summary = false, orphans = false } = {}) {
    const out = [];
    const scopeBits = Object.entries(report.scope).map(([k, v]) => `${k}=${v}`);
    const line = r => `  ${String(r.id).padStart(6)}  ${String(r.wing).padEnd(13)} ${r.author || '(no author)'} | ${r.title}${r.year ? ` (${r.year})` : ''}${r.isbn ? `  ${r.isbn}` : ''}`;
    const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`;
    const section = (title, items, render) => {
        out.push('', `${title}: ${items.length}`);
        if (!summary) items.forEach(item => out.push(render(item)));
    };

    out.push(`Cover report${scopeBits.length ? ` (${scopeBits.join(', ')})` : ''}`);
    out.push(`Rows: ${report.rows}   with a cover: ${report.withCover + report.unlinked.length}   without: ${report.blank.length + report.placeholder.length + report.broken.length + report.noSlash.length}`);
    const wings = Object.entries(report.byWing).filter(([, t]) => t.blank).sort((a, b) => b[1].blank - a[1].blank);
    if (wings.length) out.push(`No cover by wing: ${wings.map(([slug, t]) => `${slug} ${t.blank}`).join(', ')}`);
    if (report.unknownIds.length) out.push(`Ids not in the catalogue: ${report.unknownIds.join(', ')}`);

    section('No cover (image_url blank, nothing on disk)', report.blank, line);
    if (report.placeholder.length) section('image_url is the placeholder file', report.placeholder, line);
    if (report.broken.length) section('BROKEN: image_url names a file that is not on disk', report.broken, r => `${line(r)}\n          ${r.image_url}`);
    if (report.noSlash.length) section('BROKEN: image_url has no leading slash', report.noSlash, r => `${line(r)}\n          ${r.image_url}`);
    if (report.unlinked.length) section('Cover on disk that image_url does not name (shown via the legacy filename)', report.unlinked, r => `${line(r)}\n          ${r.file}`);
    section('Cover under 8 KB', report.small, r => `${line(r)}\n          ${r.image_url}  ${kb(r.bytes)}`);

    const f = report.files;
    out.push('', `Files in ${f.dir}: ${f.total}   named by no image_url: ${f.unnamed}   of those named by a page or template: ${f.usedByPages.length}   orphans: ${f.orphans.length} (${f.orphans.filter(o => o.path.split('/').length > 5).length} in subfolders)   under 8 KB: ${f.small.length}`);
    const scoped = Object.keys(report.scope).length > 0;
    if (!summary) {
        if (f.small.length && (!scoped || orphans)) {
            out.push('', 'Files under 8 KB:');
            f.small.forEach(file => out.push(`  ${file.path}  ${kb(file.bytes)}`));
        }
        if (orphans) {
            out.push('', 'Orphan files (report only, nothing here deletes them):');
            f.orphans.forEach(file => out.push(`  ${file.path}  ${kb(file.bytes)}`));
        } else if (f.orphans.length) {
            out.push('(--orphans lists the unused files)');
        }
    }
    return out.join('\n');
}

function parseArgs(argv) {
    const options = {};
    const valueFlags = { '--wing': 'wing', '--tag': 'tag', '--grouping': 'grouping', '--ids': 'ids' };
    const boolFlags = { '--summary': 'summary', '--orphans': 'orphans', '--json': 'json', '--check': 'check', '--help': 'help', '-h': 'help' };
    for (let i = 0; i < argv.length; i++) {
        const [flag, inline] = argv[i].split(/=(.*)/s);
        if (valueFlags[flag]) {
            const value = inline !== undefined ? inline : argv[++i];
            if (value === undefined || value === '') throw new Error(`${flag} needs a value`);
            options[valueFlags[flag]] = value;
        } else if (boolFlags[argv[i]]) {
            options[boolFlags[argv[i]]] = true;
        } else {
            throw new Error(`Unknown option: ${argv[i]}`);
        }
    }
    return options;
}

function main() {
    let options;
    try {
        options = parseArgs(process.argv.slice(2));
    } catch (error) {
        console.error(error.message);
        console.error('Usage: node scripts/covers/report.js [--wing <slug>] [--tag <tag>] [--grouping <name>] [--ids 1,2,10-20] [--summary] [--orphans] [--json] [--check]');
        process.exit(2);
    }
    if (options.help) {
        console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, ''));
        return;
    }
    let report;
    try {
        report = auditCovers(options);
    } catch (error) {
        console.error(error.message);
        process.exit(2);
    }
    console.log(options.json ? JSON.stringify(report, null, 2) : formatReport(report, options));
    if (options.check && (report.broken.length || report.noSlash.length)) process.exit(1);
}

if (require.main === module) main();

module.exports = { auditCovers, formatReport, parseIds, parseArgs, SMALL_BYTES };
