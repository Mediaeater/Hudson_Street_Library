const { expect } = require('chai');
const collectionConfigs = require('../src/_data/collectionConfigs');
const redirects = require('../src/_data/redirects.json');

// Every collection URL the site has ever published. Append-only: a URL may
// move (with a redirect) but a line never leaves this file.
const frozen = require('./fixtures/collection-permalinks.json');

describe('published collection permalinks', () => {
  const live = new Set(collectionConfigs().map(c => '/' + c.permalink));
  const redirectTo = new Map(redirects.map(r => [r.from, r.to]));

  it('has a frozen list to check', () => {
    expect(frozen).to.be.an('array').with.length.of.at.least(89);
    expect(new Set(frozen).size).to.equal(frozen.length);
  });

  it('still builds or redirects every frozen URL', () => {
    const dead = frozen.filter(url => !live.has(url) && !live.has(redirectTo.get(url)));
    expect(dead, `no longer built and not redirected to a live collection: ${dead.join(', ')} (add a row to redirects.json)`).to.deep.equal([]);
  });
});
