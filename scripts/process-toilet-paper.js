#!/usr/bin/env node
/**
 * Process Toilet Paper Magazine - Download covers and create issue pages
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Toilet Paper magazine data compiled from artbook.com and shoptoiletpaper.com
const issues = [
  { issue: 1, isbn: '9781935202332', date: '2011-01-31', year: 2011, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-1-132.jpg' },
  { issue: 2, isbn: '9781935202592', date: '2011-07-31', year: 2011, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-2-132.jpg' },
  { issue: 3, isbn: '9781935202608', date: '2011-09-30', year: 2011, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-3-132.jpg' },
  { issue: 4, isbn: '9781935202783', date: '2011-11-30', year: 2011, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-4-132.jpg' },
  { issue: 5, isbn: '9782840665311', date: '2012-05-31', year: 2012, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-5-132.jpg' },
  { issue: 6, isbn: '9788897856061', date: '2012-10-31', year: 2012, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-6-132.jpg' },
  { issue: 7, isbn: '9788862082808', date: '2013-03-31', year: 2013, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-7-140.jpg' },
  { issue: 8, isbn: '9788862082860', date: '2013-10-31', year: 2013, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-8-132.jpg' },
  { issue: 9, isbn: '9788862082945', date: '2014-05-31', year: 2014, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-9-142.jpg' },
  { issue: 10, isbn: '9788862083393', date: '2014-10-31', year: 2014, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-10-132.jpg' },
  { issue: 11, isbn: '9788862083850', date: '2015-05-31', year: 2015, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-11-132.jpg' },
  { issue: 12, isbn: '9788862084284', date: '2016-03-22', year: 2016, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-12-131.jpg' },
  { issue: 13, isbn: '9788862084901', date: '2016-09-27', year: 2016, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-13-132.jpg' },
  { issue: 14, isbn: '9788862085366', date: '2017-04-25', year: 2017, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-14-132.jpg' },
  { issue: 15, isbn: '9788862085564', date: '2017-11-21', year: 2017, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-15-132.jpg' },
  { issue: 16, isbn: '9788862085854', date: '2018-09-25', year: 2018, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-16-132.jpg' },
  { issue: 17, isbn: '9788862086134', date: '2019-05-21', year: 2019, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-17-193.jpg' },
  { issue: 18, isbn: '9788862087582', date: '2022-06-14', year: 2022, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-18-96.png' },
  { issue: 19, isbn: '9788862087834', date: '2022-11-08', year: 2022, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-19-95.png' },
  { issue: 20, isbn: '9788862087902', date: '2023-10-24', year: 2023, coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-issue-20-76.png' },
];

// Books (no calendars)
const books = [
  {
    title: 'Toilet Paper (Deluxe Volume)',
    isbn: '9788862082105',
    date: '2012-11-30',
    year: 2012,
    coverUrl: 'https://s.turbifycdn.com/aah/artbook/maurizio-cattelan-pierpaolo-ferrari-toilet-paper-67.png',
    description: 'Deluxe volume collecting images from the first five issues plus unpublished material.'
  },
  {
    title: 'Toilet Paper: Diamond Collection',
    isbn: '9788862083478',
    date: '2014-03-31',
    year: 2014,
    coverUrl: 'https://s.turbifycdn.com/aah/artbook/toilet-paper-diamond-collection-138.png',
    description: 'Limited edition of 1,000 numbered copies with lenticular image and new photographs.'
  },
];

const IMAGES_DIR = path.join(__dirname, '../src/assets/images/magazines/toilet-paper');
const PAGES_DIR = path.join(__dirname, '../src/books/magazines/toilet-paper');

// Ensure directories exist
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR, { recursive: true });

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const filepath = path.join(IMAGES_DIR, filename);

    if (fs.existsSync(filepath)) {
      console.log(`  ✓ Already exists: ${filename}`);
      return resolve(filepath);
    }

    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(filepath);

    console.log(`  ↓ Downloading: ${filename}`);

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filename).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        fs.unlinkSync(filepath);
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`  ✓ Downloaded: ${filename}`);
        resolve(filepath);
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

function createIssuePage(issue) {
  const filename = `toilet-paper-${issue.issue}.html`;
  const filepath = path.join(PAGES_DIR, filename);
  const ext = issue.coverUrl.split('.').pop();
  const coverFilename = `toilet-paper-${issue.issue}.${ext}`;

  const html = `---
permalink: /books/magazines/toilet-paper/toilet-paper-${issue.issue}.html
---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Toilet Paper Issue ${issue.issue} | Hudson Street Library</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/assets/css/design-system.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-50 text-gray-800">
    <header class="sticky top-0 w-full bg-white z-50 py-4 shadow-md">
        <div class="container mx-auto px-6">
            <div class="flex justify-between items-center">
                <a href="/" class="text-xl sm:text-2xl font-bold tracking-tight text-teal-900">HUDSON STREET LIBRARY</a>
                <nav class="hidden md:flex space-x-6 lg:space-x-8 items-center text-neutral-700 text-sm lg:text-base">
                    <a href="/#about" class="hover:text-teal-700">About</a>
                    <a href="/collection-explore.html" class="hover:text-teal-700 font-semibold text-teal-700">Collections</a>
                    <a href="/static-demo/" class="hover:text-teal-700">Search</a>
                    <a href="/#contact" class="hover:text-teal-700">Contact</a>
                </nav>
            </div>
        </div>
    </header>

    <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div class="mb-6">
            <a href="/collections/toilet-paper.html" class="text-sm text-teal-700 hover:text-teal-900">
                <i class="fas fa-arrow-left mr-1"></i> Back to Toilet Paper Collection
            </a>
        </div>

        <div class="max-w-4xl mx-auto">
            <div class="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div class="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                    <img src="/assets/images/magazines/toilet-paper/${coverFilename}"
                         alt="Toilet Paper Issue ${issue.issue}"
                         class="w-full h-full object-cover">
                </div>
                <div>
                    <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Toilet Paper</h1>
                    <p class="text-xl text-gray-600 mb-4">Issue ${issue.issue}</p>

                    <div class="space-y-3 text-sm text-gray-600 mb-6">
                        <p><span class="font-medium text-gray-800">Editors:</span> Maurizio Cattelan, Pierpaolo Ferrari</p>
                        <p><span class="font-medium text-gray-800">Publisher:</span> Damiani</p>
                        <p><span class="font-medium text-gray-800">Year:</span> ${issue.year}</p>
                        <p><span class="font-medium text-gray-800">ISBN:</span> ${issue.isbn}</p>
                        <p><span class="font-medium text-gray-800">Format:</span> Paperback, 9 x 11.5 in, 40 pages</p>
                    </div>

                    <div class="prose prose-gray">
                        <p>An artists' magazine created by Maurizio Cattelan and Pierpaolo Ferrari. The magazine contains no text; each picture springs from an idea, often simple, and through a complex orchestration of people it becomes the materialization of the artists' mental outbursts.</p>
                        <p class="mt-4">Toilet Paper combines the vernacular of commercial photography with twisted narrative tableaux and surrealistic imagery, challenging the limits of the contemporary art economy through its accessible magazine format.</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    {% include "components/site-footer.njk" %}
</body>
</html>
`;

  fs.writeFileSync(filepath, html);
  console.log(`  ✓ Created page: ${filename}`);
}

async function main() {
  console.log('\\n=== Processing Toilet Paper Magazine ===\\n');

  // Download magazine covers
  console.log('Downloading magazine covers...');
  for (const issue of issues) {
    const ext = issue.coverUrl.split('.').pop();
    const filename = `toilet-paper-${issue.issue}.${ext}`;
    try {
      await downloadImage(issue.coverUrl, filename);
    } catch (err) {
      console.error(`  ✗ Failed: ${filename} - ${err.message}`);
    }
  }

  // Download book covers
  console.log('\\nDownloading book covers...');
  for (const book of books) {
    const ext = book.coverUrl.split('.').pop();
    const slug = book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    const filename = `${slug}.${ext}`;
    try {
      await downloadImage(book.coverUrl, filename);
    } catch (err) {
      console.error(`  ✗ Failed: ${filename} - ${err.message}`);
    }
  }

  // Create issue pages
  console.log('\\nCreating issue pages...');
  for (const issue of issues) {
    createIssuePage(issue);
  }

  console.log('\\n=== Done! ===\\n');
  console.log(`Images saved to: ${IMAGES_DIR}`);
  console.log(`Pages saved to: ${PAGES_DIR}`);
}

main().catch(console.error);
