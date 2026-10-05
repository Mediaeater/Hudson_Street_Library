/**
 * Where a book's cover actually lives.
 *
 * Three questions, answered separately, because the convention, the site and
 * the public JSON endpoint want different answers:
 *
 *   resolveCoverPath()  where the cover would be, by the naming convention —
 *                       image_url when the row has one, else the derived path.
 *                       No existence check. This is the convention, not a
 *                       promise about the filesystem.
 *   existingCoverPath() a path guaranteed to resolve, or '' when the library
 *                       holds no cover for the book. /data/books.json uses this
 *                       so a consumer never gets handed a 404.
 *   coverSrc()          what a page puts in <img src>: the existing path, or
 *                       the placeholder. The generateCoverPath filter in
 *                       .eleventy.js is this. Before Sept 2026 the filter was
 *                       resolveCoverPath, which meant 744 book pages emitted a
 *                       src that 404ed and relied on the templates' onerror to
 *                       swap the placeholder in — a request and a flash of
 *                       broken image per cover the library doesn't hold.
 *
 * derivedCoverPath is the legacy filename the old bulk acquirers wrote. It only
 * finds files already on disk. New covers are named by
 * conventionalCoverFilename and always written into image_url
 * (scripts/covers/attach.js), so nothing has to guess.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src');
const PLACEHOLDER = '/assets/images/placeholder-book.svg';

/**
 * A CSV cell counts as set only if it holds something other than the strings
 * the catalogue uses for "nothing here".
 */
function isSet(value) {
    return Boolean(value) && value !== 'NULL' && value !== 'null';
}

/**
 * 11 rows (Oct 2026) carry the placeholder file itself in image_url. The file
 * is on disk, but it is not a cover.
 */
function isPlaceholder(url) {
    return /\/placeholder-book[^/]*\.svg$/.test(String(url || ''));
}

/**
 * The path the cover *would* have under the naming convention, whether or not
 * a file is there: {author_last}_{title}_{isbn}.jpg, non-alphanumerics folded
 * to underscores, truncated to 100 characters.
 * @param {Object} book
 * @returns {string}
 */
function derivedCoverPath(book) {
    const clean = s => String(s).replace(/[^a-zA-Z0-9.-]/g, '_');
    const authorLast = clean(book.author_last || 'Unknown');
    const title = clean(book.title || 'Untitled');
    const isbn = clean(book.isbn_asin || '').replace(/[-\s]/g, '');

    const stem = isSet(isbn)
        ? `${authorLast}_${title}_${isbn}`
        : `${authorLast}_${title}_NULL`;

    const sanitized = stem
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 100);

    return `/assets/images/books/${sanitized}.jpg`;
}

/**
 * The filename a NEW cover gets (the convention in .claude/CLAUDE.md):
 * {author_last}_{author_first}_{title}_{isbn}.jpg, all lowercase, underscores
 * for spaces, nothing but a-z, 0-9 and underscores. A row with no ISBN ends in
 * its publication year instead, or in nothing when it has neither.
 *
 * This is not derivedCoverPath. That one describes the mixed-case names the
 * old acquirers wrote and is only ever used to find files already on disk.
 * @param {Object} book
 * @returns {string}
 */
function conventionalCoverFilename(book) {
    const part = value => String(isSet(value) ? value : '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/['\u2018\u2019]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

    const isbn = String(isSet(book.isbn_asin) ? book.isbn_asin : '').replace(/[^0-9Xx]/g, '').toLowerCase();
    const year = (String(book.publication_year || '').match(/\d{4}/) || [''])[0];
    const stem = [
        part(book.author_last) || 'unknown',
        part(book.author_first),
        part(book.title).substring(0, 120).replace(/_+$/, '') || 'untitled',
        isbn || year,
    ].filter(Boolean).join('_');

    return `${stem}.jpg`;
}

/**
 * Where the convention says the cover is: image_url if the row has one, else
 * the derived path. No existence check — see the module comment.
 * @param {Object} book
 * @returns {string}
 */
function resolveCoverPath(book) {
    if (!book) return PLACEHOLDER;
    return isSet(book.image_url) ? book.image_url : derivedCoverPath(book);
}

/**
 * Is there a file behind this site-absolute path? Anything that would escape
 * src/ is treated as absent rather than followed.
 * @param {string} url
 * @param {string} [srcDir]
 * @returns {boolean}
 */
function coverFileExists(url, srcDir = SRC) {
    if (!isSet(url)) return false;
    const file = path.resolve(srcDir, `.${path.posix.normalize(url)}`);
    if (file !== srcDir && !file.startsWith(srcDir + path.sep)) return false;
    return fs.existsSync(file);
}

/**
 * A cover path that is known to resolve, or '' when the library holds no file
 * for this book. Checks image_url first, then the conventional path — 55 rows
 * (Sept 2026) have a cover on disk that no one ever wrote into the column.
 * @param {Object} book
 * @param {{srcDir?: string}} [options]
 * @returns {string}
 */
function existingCoverPath(book, options = {}) {
    if (!book) return '';
    const srcDir = options.srcDir || SRC;
    if (!isPlaceholder(book.image_url) && coverFileExists(book.image_url, srcDir)) return book.image_url;
    const derived = derivedCoverPath(book);
    return coverFileExists(derived, srcDir) ? derived : '';
}

/**
 * The value a page puts in <img src>: a cover that is on disk, or the
 * placeholder. Never a path that 404s.
 * @param {Object} book
 * @param {{srcDir?: string}} [options]
 * @returns {string}
 */
function coverSrc(book, options = {}) {
    return existingCoverPath(book, options) || PLACEHOLDER;
}

/**
 * Does the library hold a cover for this book? The templates use it to fade
 * the placeholder, which is what the onerror handler used to do.
 * @param {Object} book
 * @param {{srcDir?: string}} [options]
 * @returns {boolean}
 */
function hasCover(book, options = {}) {
    return Boolean(existingCoverPath(book, options));
}

module.exports = {
    PLACEHOLDER,
    derivedCoverPath,
    conventionalCoverFilename,
    isSet,
    isPlaceholder,
    resolveCoverPath,
    coverFileExists,
    existingCoverPath,
    coverSrc,
    hasCover,
};
