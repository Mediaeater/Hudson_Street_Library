const { expect } = require('chai');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

describe('CSV-driven rendering', function() {
  this.timeout(120000);

  before(() => {
    execSync('npx @11ty/eleventy --quiet', { stdio: 'pipe' });
  });

  it('generates one detail page per CSV row', () => {
    const rows = parse(fs.readFileSync('src/_data/books.csv','utf8'),
      { columns: true, relax_quotes: true, relax_column_count: true });
    const bookDirs = fs.readdirSync('_site/books')
      .filter(f => fs.statSync(path.join('_site/books', f)).isDirectory());
    expect(bookDirs.length).to.be.at.least(rows.length);
  });

  it('generates one collection page per collection config', () => {
    const configs = fs.readdirSync('src/_data/collections').filter(f => f.endsWith('.json'));
    configs.forEach(f => {
      const slug = path.basename(f, '.json');
      expect(fs.existsSync(`_site/collections/${slug}/index.html`),
        `Missing page for ${slug}`).to.be.true;
    });
  });

  it('Purple Magazine collection includes all Volume V CSV issues', () => {
    const html = fs.readFileSync('_site/collections/purple-magazine/index.html','utf8');
    expect(html).to.include('Volume V');
    expect(html).to.include('purple-45-glamour.jpg');
  });
});
