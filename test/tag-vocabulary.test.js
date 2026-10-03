const { expect } = require('chai');
const {
  THRESHOLD, FACET_THRESHOLD, FACETS, TAG_FACETS, TAG_ALIASES,
  slugifyTag, resolveAlias, facetOf,
} = require('../scripts/utils/tag-vocabulary');
const tagCollections = require('../scripts/utils/tag-collections');

describe('tag-vocabulary', () => {
  it('is what tag-collections re-exports', () => {
    expect(tagCollections.slugifyTag).to.equal(slugifyTag);
    expect(tagCollections.TAG_ALIASES).to.equal(TAG_ALIASES);
    expect(tagCollections.THRESHOLD).to.equal(THRESHOLD);
  });

  it('sets 15 books for a page and 8 for a person', () => {
    expect(THRESHOLD).to.equal(15);
    expect(FACET_THRESHOLD.person).to.equal(8);
  });

  describe('slugifyTag', () => {
    it('gives one slug to spellings that differ by case, hyphen or apostrophe', () => {
      expect(slugifyTag('Black and White')).to.equal(slugifyTag('black-and-white'));
      expect(slugifyTag("Artists' Books")).to.equal(slugifyTag('Artists Books'));
    });
    it('transliterates the letters NFKD leaves alone', () => {
      expect(slugifyTag('Øæœßłđðþı')).to.equal('oaeoesslddthi');
    });
    it('reproduces the slugs of plain ASCII names', () => {
      expect(slugifyTag('20th Century Photography')).to.equal('20th-century-photography');
      expect(slugifyTag('Black-and-White Photography')).to.equal('black-and-white-photography');
    });
  });

  describe('resolveAlias', () => {
    it('returns the canonical name for a variant in any spelling', () => {
      expect(resolveAlias('Exhibition Catalogue')).to.equal('Exhibition Catalog');
      expect(resolveAlias('NEW YORK')).to.equal('New York City');
      expect(resolveAlias('Black-and-White')).to.equal('Black-and-White Photography');
      expect(resolveAlias("Artist's Books")).to.equal('Artist Book');
    });
    it('returns the tag itself when it has no alias', () => {
      expect(resolveAlias('Punk')).to.equal('Punk');
      expect(resolveAlias('Magazines')).to.equal('Magazines');
    });
    it('matches a whole tag, never part of one', () => {
      expect(resolveAlias('New York School')).to.equal('New York School');
      expect(resolveAlias('Video Games')).to.equal('Video Games');
    });
    it('uses the aliases it is given', () => {
      expect(resolveAlias('Exhibition Catalogue', {})).to.equal('Exhibition Catalogue');
      expect(resolveAlias('hip hop', { 'Hip-Hop': 'Rap' })).to.equal('Rap');
    });
  });

  describe('facetOf', () => {
    it('looks a name up by slug', () => {
      expect(facetOf('photography')).to.equal('medium');
      expect(facetOf('Comme des Garcons')).to.equal('theme');
      expect(facetOf('black and white photography')).to.equal('genre');
      expect(facetOf('New York City')).to.equal('place');
    });
    it('files an unlisted name under theme', () => {
      expect(facetOf('Skiing')).to.equal('theme');
    });
  });

  describe('the registry', () => {
    const facetIds = FACETS.map(f => f.id);

    it('files hand tags only under declared facets', () => {
      Object.keys(TAG_FACETS).forEach(facet => expect(facetIds).to.include(facet));
    });

    it('lists no name in two facets', () => {
      const seen = new Map();
      Object.entries(TAG_FACETS).forEach(([facet, names]) => {
        names.forEach(name => {
          const slug = slugifyTag(name);
          expect(seen.has(slug), `"${name}" is in ${seen.get(slug)} and ${facet}`).to.equal(false);
          seen.set(slug, facet);
        });
      });
    });

    it('gives every alias target that is a hand tag a facet', () => {
      // The two person targets are author-column spellings; their facet comes
      // from the person rule, not from this map.
      const people = ['Edward Ruscha', 'Alex Da Corte'];
      const listed = new Set(Object.values(TAG_FACETS).flat().map(slugifyTag));
      Object.values(TAG_ALIASES).filter(t => !people.includes(t)).forEach(target => {
        expect(listed.has(slugifyTag(target)), `"${target}" has no TAG_FACETS entry`).to.equal(true);
      });
    });

    it('never aliases a canonical name away from itself', () => {
      Object.values(TAG_ALIASES).forEach(target => {
        expect(resolveAlias(target)).to.equal(target);
      });
    });
  });
});
