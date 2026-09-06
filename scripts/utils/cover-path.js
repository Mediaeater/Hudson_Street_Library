/**
 * Where a book's cover actually lives.
 *
 * Two different questions, answered separately, because the site and the public
 * JSON endpoint want different answers:
 *
 *   resolveCoverPath()  what the page puts in <img src> — the catalogue's
 *                       image_url when it has one, otherwise the filename the
 *                       naming convention says the cover would have. It does
 *                       NOT check the file is there; the templates carry an
 *                       onerror handler that swaps in the placeholder.
 *   existingCoverPath() a path guaranteed to resolve, or '' when the library
 *                       holds no cover for the book. /data/books.json uses this
 *                       so a consumer never gets handed a 404.
 *
 * The convention itself (acquire-covers.js, and the generateCoverPath filter in
 * .eleventy.js, which now calls in here) lives in derivedCoverPath so the two
 * cannot drift apart.
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
 * The cover path a page renders: image_url if the row has one, else the
 * conventional path. No existence check — see the module comment.
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
    if (coverFileExists(book.image_url, srcDir)) return book.image_url;
    const derived = derivedCoverPath(book);
    return coverFileExists(derived, srcDir) ? derived : '';
}

module.exports = {
    PLACEHOLDER,
    derivedCoverPath,
    resolveCoverPath,
    coverFileExists,
    existingCoverPath,
};
