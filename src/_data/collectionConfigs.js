const fs = require('fs');
const path = require('path');

module.exports = function() {
  const dir = path.join(__dirname, 'collections');
  if (!fs.existsSync(dir)) return [];
  const hardcodedDir = path.join(__dirname, '..', 'collections');
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter(cfg => !fs.existsSync(path.join(hardcodedDir, `${cfg.slug}.html`)));
};
