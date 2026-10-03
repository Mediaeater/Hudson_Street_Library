const { getIndex } = require('../../scripts/utils/collections-index');

// Pagination source for collections.njk: curated configs plus auto-generated
// tag collections. The art wing publishes at /collections/<slug>.html (where it
// always has); every other wing publishes under its own prefix,
// /<wing>/collections/<slug>.html. Which pages exist and what each lists is
// decided in scripts/utils/collections-index.js.
module.exports = () => getIndex().pages;
