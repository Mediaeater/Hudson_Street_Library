// The collections vocabulary: which spellings are one term, which facet a term
// belongs to, and how many books a term needs before it gets a page.
//
// Keys are written as display names for readability. Every lookup goes through
// slugifyTag(), so case, accents, apostrophes and hyphen-versus-space never
// matter ("Black and White" = "black-and-white").

const THRESHOLD = 15;
const FACET_THRESHOLD = { person: 8 };
const WING_CEILING = 0.9;            // >= 90% of a wing: built, not listed

// Display order on the explore page, wing landings and /tags/.
const FACETS = [
  { id: 'theme',     label: 'Themes' },
  { id: 'medium',    label: 'Mediums' },
  { id: 'genre',     label: 'Genres' },
  { id: 'format',    label: 'Formats' },
  { id: 'place',     label: 'Places' },
  { id: 'period',    label: 'Eras' },               // what the book is about, not when it was published
  { id: 'person',    label: 'Artists & Authors' },
  { id: 'series',    label: 'Series & Imprints' },
  { id: 'published', label: 'Published' },
];

// facet -> hand tags (canonical names, after aliases). A tag missing from this
// map is a theme.
const TAG_FACETS = {
  theme: [
    'Queer Culture', 'Fashion', 'Culture', 'Music', 'Surveillance', 'Pop Culture', 'Punk',
    'Architecture', 'Japanese Fashion', 'Menswear', 'Rock', 'Erotica', 'Archive', 'Nature',
    'Family', 'Sexuality', 'Protest', 'Civil Rights', 'Disaster', 'AIDS', 'DJs',
    'Electronic Music', 'Americana', 'History', 'Digital Culture', 'Art History',
    'Vernacular Architecture', 'Comme des Garçons', 'Black Photographers',
    'African American Photographers', 'African American Art', 'Women Photographers',
    'Skateboarding', 'War', 'Design History', 'Photobooks', 'LGBTQ',
    // cryptology, hacking
    'Codes and Ciphers', 'Cryptography', 'Military History', 'Cryptanalysis', 'Privacy',
    'Signals Intelligence', 'Law', 'Hacking',
  ],
  medium: [
    'Photography', 'Art', 'Painting', 'Collage', 'Drawing', 'Sculpture', 'Graphic Design',
    'Design', 'Film', 'Illustration', 'Video Art', 'Installation Art', 'Typography',
    'Photomontage', 'Media Art', 'Printmaking', 'Comics', 'Digital Art', 'Performance Art',
    'Polaroids', 'Sound Art', 'Text Art',
  ],
  genre: [
    'Contemporary Art', 'Portraiture', 'Documentary', 'Appropriation Art', 'Conceptual Art',
    'Found Photography', 'Street Photography', 'Street Art', 'Color Photography', 'Landscape',
    'Nudes', 'Modernism', 'Vernacular Photography', 'Photojournalism',
    'Contemporary Photography', 'Fashion Photography', 'Pop Art', 'Graffiti', 'Typology',
    'Conceptual Photography', 'Found Imagery', 'Black-and-White Photography',
    'Self-Portraiture', 'Poetry', 'Still Life', 'Surrealism', 'Staged Photography',
    'Mail Art', 'Abstract Art', 'Dada', 'Political Art', 'Travel Photography', 'Fiction',
    'photography-artistic',
  ],
  format: [
    'Exhibition Catalog', 'Photobook', 'Magazines', 'Limited Edition', 'Zines', 'Artist Book',
    'Periodical', 'Museum Publication', 'Self-Published', 'Catalogs', 'Art Book',
    'Photographer Monograph', 'Artist Monograph', 'Reference', 'Anthology', 'Biography',
    'Monograph', 'Retrospective', 'Collaboration', 'Photographers', 'Facsimile',
    'Artist Writings', 'Ephemera', 'Posters', 'Poster', 'Broadside', 'Exhibition Poster',
    'Puzzles', "Children's Books", 'Textbook', 'Manual', 'Declassified Report', 'Museum Shop',
  ],
  place: [
    'New York City', 'Japanese Photography', 'American Art', 'American Photography', 'Japan',
    'France', 'Paris', 'Los Angeles', 'Swiss Art', 'Belgian Art', 'British Photography',
    'Japanese Art', 'Mexico', 'Italy', 'Germany',
  ],
  period: ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '20th Century Photography', 'World War II'],
  person: ['Richard Prince', 'Peter Hujar'],
  series: ['Surveillance Index', 'Surveillance Index Edition One', 'Surveillance Index Edition Two',
           'Nazraeli Press', 'One Picture Book', 'Purple Magazine', 'ARN'],
};

// variant -> canonical display name. Merges near-duplicate tags without
// touching the CSVs: a book tagged with any variant appears in the canonical
// collection.
const TAG_ALIASES = {
  'appropriation': 'Appropriation Art',
  'contemporary': 'Contemporary Art',
  'documentary photography': 'Documentary',
  'exhibition catalogue': 'Exhibition Catalog',
  'exhibition catalogues': 'Exhibition Catalog',
  'exhibition catalogs': 'Exhibition Catalog',
  'portraits': 'Portraiture',
  'portrait': 'Portraiture',
  'portrait photography': 'Portraiture',
  'nude': 'Nudes',
  'nude photography': 'Nudes',
  'new york': 'New York City',
  'nyc': 'New York City',
  'landscape photography': 'Landscape',
  'landscapes': 'Landscape',
  'installation': 'Installation Art',
  'archives': 'Archive',
  'artist books': 'Artist Book',
  "artists' books": 'Artist Book',      // also covers Artists'-Books and Artist's Books (same slug)
  'black and white': 'Black-and-White Photography',
  'black and white photography': 'Black-and-White Photography',
  'african american photographers': 'Black Photographers',
  'self-portrait': 'Self-Portraiture',
  'video': 'Video Art',
  'conceptual': 'Conceptual Art',
  'polaroid': 'Polaroids',
  // classification value -> existing tag page
  'zine': 'Zines',
  // people: one person, two spellings in the author columns
  'ed ruscha': 'Edward Ruscha',
  'alex da corte': 'Alex Da Corte',     // fixes the display casing of "Alex DA Corte"
};
// Deliberately not aliased: Magazines/Magazine -> Periodical, Photobooks ->
// Photobook, Catalogs, Art Book, Graffiti -> Street Art, Design/Graphic Design,
// Fashion/Fashion Photography, Found Imagery/Vernacular Photography,
// Japan/Japanese Photography. Each pair holds books that belong to one and not
// the other.

// Letters NFKD does not decompose into a base letter plus a combining mark.
const TRANSLITERATE = { 'ø': 'o', 'æ': 'ae', 'œ': 'oe', 'ß': 'ss', 'ł': 'l', 'đ': 'd', 'ð': 'd', 'þ': 'th', 'ı': 'i' };

function slugifyTag(name) {
  return name
    .toLowerCase()
    .replace(/[øæœßłđðþı]/g, c => TRANSLITERATE[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// One slug-keyed map per aliases object, so a caller passing its own aliases
// (the unit tests do) gets the same slug matching as the default.
const aliasMaps = new WeakMap();

function aliasMap(aliases) {
  if (!aliasMaps.has(aliases)) {
    aliasMaps.set(aliases, new Map(Object.entries(aliases).map(([variant, canonical]) => [slugifyTag(variant), canonical])));
  }
  return aliasMaps.get(aliases);
}

// The canonical display name for a tag, or the tag itself when it has no alias.
function resolveAlias(tag, aliases = TAG_ALIASES) {
  return aliasMap(aliases).get(slugifyTag(tag)) || tag;
}

const facetBySlug = new Map();
Object.entries(TAG_FACETS).forEach(([facet, names]) => {
  names.forEach(name => facetBySlug.set(slugifyTag(name), facet));
});

function facetOf(name) {
  return facetBySlug.get(slugifyTag(name)) || 'theme';
}

module.exports = {
  THRESHOLD, FACET_THRESHOLD, WING_CEILING, FACETS, TAG_FACETS, TAG_ALIASES,
  slugifyTag, resolveAlias, facetOf,
};
