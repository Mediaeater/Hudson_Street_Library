#!/usr/bin/env node
/**
 * verify-views.js — post-change sanity check for the built site.
 *
 * Cross-checks books.csv against the built Recently Added / Recently
 * Catalogued pages and validates cover files. Run after any change that
 * touches book data, templates, or filters:
 *
 *   npm run build && node scripts/verify-views.js
 *
 * Matches books by page slug (not title) to survive duplicate titles,
 * and reads the built HTML (not the templates) so it checks what a
 * visitor actually gets.
 */

const fs = require('fs');
const path = require('path');
const CSVHandler = require('./utils/csv-handler.js');

const SITE = path.join(__dirname, '..', '_site');
const BACKFILL_DAYS = 7; // must match recentlyCatalogued filter in .eleventy.js

function parseDate(s) {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s) : null;
}

// Per-book markers in the built HTML. The card link slug is primary, but
// Eleventy's slugify handles accents/&/apostrophes differently than a
// reimplementation would, so also try the HTML-escaped title + id comment.
function markers(book) {
  const slugify = s => String(s).toLowerCase().normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const m = [`_${book.id}/`];
  if (book.custom_page_url) m.push(book.custom_page_url);
  m.push(`/books/${slugify(book.author_last || '')}_${slugify(book.title || '')}_${book.id}/`);
  return m;
}
const onPage = (html, book) => markers(book).some(m => html.includes(m));

(async () => {
  let errors = 0;
  const fail = msg => { console.log('  ✗', msg); errors++; };

  const catPath = path.join(SITE, 'collections', 'recently_catalogued.html');
  const addedPath = path.join(SITE, 'collections', 'recently_added.html');
  for (const p of [catPath, addedPath]) {
    if (!fs.existsSync(p)) {
      console.log('✗ missing built page:', p, '— run npm run build first');
      process.exit(1);
    }
  }
  const cat = fs.readFileSync(catPath, 'utf8');
  const added = fs.readFileSync(addedPath, 'utf8');

  const { data: books } = await CSVHandler.readBooks();

  console.log('View membership (accession vs catalogued dates):');
  for (const b of books) {
    const a = parseDate(b.accession_no);
    const c = parseDate(b.cataloged_date);
    if (!a || !c) continue; // legacy rows without both dates: skip
    const days = Math.abs((c - a) / 86400000);
    const isBackfill = days >= BACKFILL_DAYS;
    const onCat = onPage(cat, b);
    const onAdded = onPage(added, b);
    if (isBackfill && !onCat) fail(`${b.id} "${b.title}" should be on Catalogued but isn't`);
    if (isBackfill && onAdded) fail(`${b.id} "${b.title}" is backfill but shows on Recently Added`);
    if (!isBackfill && onCat) fail(`${b.id} "${b.title}" is a new acquisition but shows on Catalogued`);
  }

  console.log('Cover files (exists + plausible image):');
  let smallWarnings = 0;
  for (const b of books) {
    if (!b.image_url) continue;
    if (b.image_url.endsWith('.svg')) continue; // deliberate placeholders
    const p = path.join(__dirname, '..', 'src', b.image_url.replace(/^\//, ''));
    if (!fs.existsSync(p)) { fail(`${b.id} "${b.title}" image_url missing on disk: ${b.image_url}`); continue; }
    const size = fs.statSync(p).size;
    // <2KB is almost certainly a corrupt/failed download (the 919-byte Parks
    // family); 2-5KB is a low-res legacy thumbnail — count, don't fail.
    if (size < 2000) fail(`${b.id} "${b.title}" cover corrupt (${size} bytes): ${b.image_url}`);
    else if (size < 5000) smallWarnings++;
  }
  if (smallWarnings) console.log(`  ⚠ ${smallWarnings} low-res legacy covers under 5KB (warning only)`);

  console.log('Nav links point where their labels say:');
  const nav = fs.readFileSync(path.join(__dirname, '..', 'src', '_includes', 'components', 'site-header.njk'), 'utf8');
  const navLinks = [...nav.matchAll(/href="([^"]+)"[^>]*>\s*\n?\s*([A-Za-z ]+?)\s*\n?\s*<\/a>/g)];
  for (const [, href, label] of navLinks) {
    const l = label.trim().toLowerCase();
    if (l.includes('catalog') && !href.includes('catalogued')) fail(`nav label "${label.trim()}" links to ${href}`);
    if (l === 'recent' && !href.includes('recently_added')) fail(`nav label "${label.trim()}" links to ${href}`);
  }

  const catCount = (cat.match(/View Details/g) || []).length;
  const addedCount = (added.match(/View Details/g) || []).length;
  console.log('---');
  console.log(`Catalogued page: ${catCount} cards · Recently Added: ${addedCount} cards`);
  if (errors === 0) {
    console.log('✅ verify-views PASSED');
  } else {
    console.log(`❌ verify-views FAILED — ${errors} error(s)`);
    process.exit(1);
  }
})();
