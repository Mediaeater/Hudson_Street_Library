#!/usr/bin/env node

/**
 * Cloudflare Cache Purge Script
 * Purges specific URLs or entire cache from Cloudflare
 *
 * Usage:
 *   node scripts/purge-cloudflare-cache.js                    # Purge specific URLs
 *   node scripts/purge-cloudflare-cache.js --all              # Purge everything
 *   node scripts/purge-cloudflare-cache.js --urls url1 url2   # Purge specific URLs
 */

require('dotenv').config();
const https = require('https');

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;

// Default URLs to purge (commonly updated pages)
const DEFAULT_URLS = [
  'https://hudsonstreetlibrary.com/collections/recently_added.html',
  'https://hudsonstreetlibrary.com/static-demo/',
  'https://hudsonstreetlibrary.com/static-demo/index.html',
  'https://hudsonstreetlibrary.com/cms/data/books.csv',
  'https://hudsonstreetlibrary.com/index.html',
  'https://hudsonstreetlibrary.com/collection-explore.html'
];

function purgeCache(urls = null) {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    console.error('❌ Error: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID must be set in .env file');
    process.exit(1);
  }

  const endpoint = `/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache`;

  let postData;
  if (urls === 'all') {
    postData = JSON.stringify({ purge_everything: true });
    console.log('🗑️  Purging ALL Cloudflare cache...');
  } else {
    const urlsToPurge = urls || DEFAULT_URLS;
    postData = JSON.stringify({ files: urlsToPurge });
    console.log('🗑️  Purging Cloudflare cache for:');
    urlsToPurge.forEach(url => console.log(`   - ${url}`));
  }

  const options = {
    hostname: 'api.cloudflare.com',
    port: 443,
    path: endpoint,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const response = JSON.parse(data);

        if (response.success) {
          console.log('✅ Cache purged successfully!');
          console.log('⏱️  Changes should be visible in a few seconds.');
        } else {
          console.error('❌ Cache purge failed:');
          console.error(JSON.stringify(response.errors, null, 2));
          process.exit(1);
        }
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.error('Response:', data);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request failed:', error.message);
    process.exit(1);
  });

  req.write(postData);
  req.end();
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Cloudflare Cache Purge Script

Usage:
  node scripts/purge-cloudflare-cache.js              Purge default URLs (recently updated pages)
  node scripts/purge-cloudflare-cache.js --all        Purge entire cache
  node scripts/purge-cloudflare-cache.js --urls URL1 URL2  Purge specific URLs

Examples:
  node scripts/purge-cloudflare-cache.js
  node scripts/purge-cloudflare-cache.js --all
  node scripts/purge-cloudflare-cache.js --urls https://hudsonstreetlibrary.com/index.html

Environment Variables (set in .env):
  CLOUDFLARE_API_TOKEN - Your Cloudflare API token with Cache Purge permission
  CLOUDFLARE_ZONE_ID   - Your Cloudflare Zone ID for hudsonstreetlibrary.com
`);
  process.exit(0);
}

if (args.includes('--all')) {
  purgeCache('all');
} else if (args.includes('--urls')) {
  const urlIndex = args.indexOf('--urls');
  const urls = args.slice(urlIndex + 1);
  if (urls.length === 0) {
    console.error('❌ Error: --urls requires at least one URL');
    process.exit(1);
  }
  purgeCache(urls);
} else {
  purgeCache();
}
