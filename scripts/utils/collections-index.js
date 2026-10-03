// The one place that decides which collection pages exist, what books each
// lists, and where each lives. The _data modules (collectionConfigs,
// exploreCollections, tagPages, wingPages) are slices of this index, so a count
// on a card and the page behind it cannot disagree.
//
// buildIndex is a pure function of its input and is what the tests call.
// getIndex loads the real catalogue once per build and memoises the result;
// .eleventy.js calls resetIndex before each build so --serve picks up edits.

const fs = require('fs');
const path = require('path');
const { loadCatalogSync, loadWings } = require('./catalog');
const { buildTagCollectionsByWing, newestWithCover } = require('./tag-collections');
const { matchesCollection } = require('./collection-matcher');
const { slugifyTag, resolveAlias, WING_CEILING, FACETS } = require('./tag-vocabulary');
const { derivedTerms } = require('./derived-terms');
const { hasCover, coverSrc } = require('./cover-path');

const DATA_DIR = path.join(__dirname, '..', '..', 'src', '_data');
const CONFIG_DIR = path.join(DATA_DIR, 'collections');
const STATIC_DIR = path.join(__dirname, '..', '..', 'src', 'collections');

// input: { books, wings, curated, staticSlugs, staticEntries, redirects }
//   books         every catalogue row, stamped with `collection` (its wing)
//   wings         wings.json as loaded; only the default and live wings get pages
//   curated       the parsed src/_data/collections/*.json configs
//   staticSlugs   slugs of the hand-built pages in src/collections/
//   staticEntries libraryCollections.json `collections`: the hand-built pages
//                 that are listed as collections but have no config
//   redirects     redirects.json rows ({ from, to, out })
//
// Two spellings are one term when they resolve to the same slug.
const termSlug = tag => slugifyTag(resolveAlias(tag));

// Throws on config mistakes only. Catalogue data never throws here: CI runs
// nothing but the build, so a tag typed into a CSV must not be able to fail it.
function buildIndex(input, options = {}) {
  const { books = [], curated: rawCurated = [], staticEntries = [], redirects = [] } = input;
  const coverCheck = options.hasCover || hasCover;
  const coverOf = options.coverSrc || coverSrc;
  const staticSlugs = new Set(input.staticSlugs || []);

  // Only published wings get collection pages. An unpublished wing has no
  // landing page to reach them from, so generating them would publish orphan
  // pages for a wing still being catalogued.
  const wings = (input.wings || []).filter(w => w.isDefault || w.live);
  const defaultWing = wings.find(w => w.isDefault).slug;

  // A slug owned by a legacy static page must not be generated (duplicate
  // permalink). Those pages live in the art wing's namespace, so the check only
  // applies there.
  const hasStaticPage = (wing, slug) => wing === defaultWing && staticSlugs.has(slug);

  rawCurated.forEach(cfg => {
    ['slug', 'title', 'matchBy'].forEach(key => {
      if (!cfg[key]) throw new Error(`curated collection "${cfg.slug || cfg.title || '?'}": missing ${key}`);
    });
    if ('coversTags' in cfg) {
      throw new Error(`curated collection "${cfg.slug}": coversTags is retired. A config owns a tag only by naming it in matchBy.tag`);
    }
  });

  // A curated config belongs to the art wing unless its JSON says otherwise.
  // Members are counted for every config, including one still shadowed by a
  // static page: the explore card for that page takes its count from here.
  // The card fields (image, featured, category) are the config's own; a config
  // without an image gets its newest cover, as a generated page does.
  const curated = rawCurated.map(raw => {
    const cfg = { wing: defaultWing, ...raw };
    const members = books
      .filter(b => (cfg.allWings || b.collection === cfg.wing) && matchesCollection(b, cfg));
    const bookIds = members.map(b => b.id);
    const cover = cfg.image ? null : newestWithCover(members, coverCheck);
    return {
      ...cfg,
      bookIds,
      bookCount: bookIds.length,
      image: cfg.image || (cover ? coverOf(cover) : null),
      featured: Boolean(cfg.featured),
      category: cfg.category || null,
      facet: cfg.facet || null,
      origin: 'curated',
      listed: true,
    };
  });

  // Record terms are read against the book's own wing: a classification counts
  // as a form only when that wing declares it.
  const wingBySlug = new Map((input.wings || []).map(w => [w.slug, w]));
  const tagTier = buildTagCollectionsByWing(books, {
    defaultWing,
    derive: book => derivedTerms(book, wingBySlug.get(book.collection || defaultWing)),
    hasCover: coverCheck,
    coverSrc: coverOf,
  });
  const tagCollections = [];

  // Who owns a tag term within a wing, in order: a curated config that names
  // the tag in matchBy.tag; a curated config whose slug is the term's slug; a
  // static page with that slug (art wing only); otherwise the generated page.
  // owners: wing slug -> Map(term slug -> curated config).
  const owners = {};
  wings.forEach(wing => {
    const wingCurated = curated.filter(c => c.wing === wing.slug);
    const owner = owners[wing.slug] = new Map(wingCurated.map(c => [c.slug, c]));
    const named = new Map();
    wingCurated.forEach(c => {
      [].concat(c.matchBy.tag || []).map(termSlug).filter(Boolean).forEach(slug => {
        if (named.has(slug) && named.get(slug) !== c) {
          throw new Error(`curated collections "${named.get(slug).slug}" and "${c.slug}" both name the tag "${slug}" in matchBy.tag`);
        }
        named.set(slug, c);
      });
    });
    named.forEach((c, slug) => owner.set(slug, c));

    (tagTier.get(wing.slug) || []).forEach(tc => {
      if (owner.has(tc.slug)) return;
      if (hasStaticPage(wing.slug, tc.slug)) return;
      tagCollections.push({ ...tc, listed: true });
    });
  });

  const liveCurated = curated.filter(cfg => !hasStaticPage(cfg.wing, cfg.slug));

  // The permalink is part of the page so collections.njk stays wing-agnostic.
  // `scope` is what the template filters books by: the config's wing, or every
  // wing when the config declares allWings (the page still publishes under the
  // config's own wing namespace).
  const permalinkOf = cfg => cfg.wing === defaultWing
    ? `collections/${cfg.slug}.html`
    : `${cfg.wing}/collections/${cfg.slug}.html`;
  const urlOf = cfg => `/${permalinkOf(cfg)}`;
  const pages = [...liveCurated, ...tagCollections].map(cfg => (
    { ...cfg, scope: cfg.allWings ? '*' : cfg.wing, permalink: permalinkOf(cfg), url: urlOf(cfg) }
  ));

  markListing(pages, books, defaultWing);

  const redirectOuts = new Set(redirects.map(r => r.out));
  const pageByUrl = new Map();
  pages.forEach(page => {
    if (pageByUrl.has(page.url)) {
      throw new Error(`two collections publish at ${page.url}: "${pageByUrl.get(page.url).title}" and "${page.title}"`);
    }
    // The redirect stub and the page would be written to the same file.
    if (redirectOuts.has(page.url)) {
      throw new Error(`collection "${page.title}" publishes at ${page.url}, which redirects.json also writes: remove the redirect row for ${page.url} or the alias that retired it`);
    }
    pageByUrl.set(page.url, page);
  });

  // Where a tag on a book page may link: the page that owns the term, with the
  // ids it lists. A config shadowed by a static page has no page of its own, so
  // its terms get no target; nor does a term only a static page owns, because
  // nothing here knows which books that page lists.
  const tagTargets = {};
  wings.forEach(wing => {
    const targets = tagTargets[wing.slug] = new Map();
    const add = (slug, page) => targets.set(slug, { url: page.url, ids: new Set(page.bookIds) });
    tagCollections.filter(tc => tc.wing === wing.slug)
      .forEach(tc => add(tc.slug, pageByUrl.get(urlOf(tc))));
    owners[wing.slug].forEach((cfg, slug) => {
      if (liveCurated.includes(cfg)) add(slug, pageByUrl.get(urlOf(cfg)));
    });
  });

  // What the explore page, the wing landings and the JSON endpoint list, per
  // wing: one group per facet in FACETS order, then the curated group. Listed
  // pages only. A term a curated config owns appears in its facet too, linking
  // to that config's page, so the Themes list does not lose Queer Culture just
  // because its page is curated.
  const listItem = (page, term) => ({
    name: term ? term.title : page.title,
    slug: page.slug,
    url: page.url,
    description: page.description || '',
    image: page.image || null,
    count: page.bookCount,
    featured: page.featured,
    category: page.category,
    facet: term ? term.facet : page.facet,
    origin: page.origin,
  });
  const listings = {};
  wings.forEach(wing => {
    const listed = pages.filter(p => p.wing === wing.slug && p.listed);
    const terms = tagTier.get(wing.slug) || [];

    const groups = FACETS.map(facet => {
      const items = listed.filter(p => p.autoGenerated && p.facet === facet.id).map(p => listItem(p));
      terms.filter(tc => tc.facet === facet.id).forEach(tc => {
        const cfg = owners[wing.slug].get(tc.slug);
        // No page when a static page shadows the config.
        const page = cfg && pageByUrl.get(urlOf(cfg));
        // A config naming two tags of one facet is listed once, under the larger.
        if (page && !items.some(i => i.url === page.url)) items.push(listItem(page, tc));
      });
      items.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      return { facet: facet.id, label: facet.label, items };
    });

    // The static entries are art-wing pages. They carry no count: nothing here
    // knows which books a hand-built page lists.
    const curatedItems = listed.filter(p => !p.autoGenerated).map(p => listItem(p));
    if (wing.slug === defaultWing) {
      staticEntries.forEach(e => curatedItems.push({
        name: e.name,
        slug: e.slug,
        url: e.path,
        description: e.description || '',
        image: e.image || null,
        featured: Boolean(e.featured),
        category: e.category || null,
        facet: null,
        origin: 'static',
      }));
    }
    curatedItems.sort((a, b) => a.featured - b.featured || a.name.localeCompare(b.name));
    groups.push({ facet: 'curated', label: 'Curated collections', items: curatedItems });

    listings[wing.slug] = groups.filter(g => g.items.length);
  });

  return {
    pages,
    pageByUrl,
    tagTargets,
    listings,
    curated,
    tagTier,
    wings,
    defaultWing,
    summary: `${liveCurated.length} curated + ${tagCollections.length} tag collections (${tagCollections.filter(c => c.wing !== defaultWing).length} outside ${defaultWing})`,
  };
}

// Built versus listed. Every page here builds, so its URL stays put, but two
// kinds are left out of the explore page and the wing landings:
//   whole-wing  a generated page covering most of its wing. The wing's own
//               landing page already is that list.
//   same set    a generated page listing exactly the books of another page. The
//               higher-ranked one is listed and the other points at it.
const ORIGIN_RANK = ['curated', 'hand', 'hand+derived', 'derived'];

function markListing(pages, books, defaultWing) {
  const wingSize = {};
  books.forEach(b => {
    const wing = b.collection || defaultWing;
    wingSize[wing] = (wingSize[wing] || 0) + 1;
  });

  const ranked = [...pages].sort((a, b) =>
    ORIGIN_RANK.indexOf(a.origin) - ORIGIN_RANK.indexOf(b.origin) || a.title.localeCompare(b.title));
  const firstWithSet = new Map();
  ranked.forEach(page => {
    const set = [...page.bookIds].sort().join(',');
    const twin = firstWithSet.get(set);
    if (!twin) firstWithSet.set(set, page);
    if (!page.autoGenerated) return;

    if (page.bookCount >= WING_CEILING * wingSize[page.wing]) {
      page.listed = false;
      page.unlistedReason = 'whole-wing';
    } else if (twin) {
      page.listed = false;
      page.sameAs = { title: twin.title, url: twin.url };
    }
  });
}

function loadInput() {
  const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
  const jsonIn = dir => !fs.existsSync(dir) ? [] : fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  const staticSlugs = !fs.existsSync(STATIC_DIR) ? [] : fs.readdirSync(STATIC_DIR)
    .filter(f => /\.(html|njk)$/.test(f))
    .map(f => f.replace(/\.(html|njk)$/, ''));

  return {
    books: loadCatalogSync().data,
    wings: loadWings(),
    curated: jsonIn(CONFIG_DIR).map(f => readJson(path.join(CONFIG_DIR, f))),
    staticSlugs,
    staticEntries: readJson(path.join(DATA_DIR, 'libraryCollections.json')).collections,
    redirects: readJson(path.join(DATA_DIR, 'redirects.json')),
  };
}

// The collection page a tag on this book's page links to, or '' when there is
// none. A tag links only to a page that lists the book: a term's page can leave
// the book out (an exclusive tag claimed it, or a curated shelf was hand-picked),
// and a link to a page without the book reads as a broken promise.
function tagUrl(tag, book, index = getIndex()) {
  const targets = index.tagTargets[book.collection || index.defaultWing];
  const target = targets && targets.get(termSlug(tag));
  return target && target.ids.has(book.id) ? target.url : '';
}

let memo = null;

function getIndex() {
  if (!memo) {
    memo = buildIndex(loadInput());
    console.log(`--- collectionConfigs: ${memo.summary}`);
  }
  return memo;
}

function resetIndex() {
  memo = null;
}

module.exports = { buildIndex, getIndex, resetIndex, tagUrl };
