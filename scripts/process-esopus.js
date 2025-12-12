#!/usr/bin/env node
/**
 * Process Esopus Magazine - Create issue pages
 */

const fs = require('fs');
const path = require('path');

const issues = [
  {
    issue: 25,
    season: 'Spring 2018',
    isbn: '9780989911740',
    pages: 256,
    artists: 'Noriko Ambe, Paolo Arao, Tina Barney, John Edmonds, Elizabeth Ferry, Anish Kapoor',
    features: 'Francine Prose reflections',
    note: 'Final Issue'
  },
  {
    issue: 24,
    season: 'Spring 2017',
    isbn: '9780989911733',
    pages: 230,
    artists: 'Carlos Amorales, Ted Barker, Hayden Dunham, Marco Maggi, Tony Tasset, Jane/Louise Wilson',
    features: 'Interview with translator Ann Goldstein'
  },
  {
    issue: 23,
    season: 'Spring 2016',
    isbn: '9780989911726',
    pages: 254,
    artists: 'Karo Akpokiere, Chuck Kelton, Stefan Kürten, Marilyn Minter, Mickalene Thomas, Jody Wood',
    features: 'Essay by Karl Ove Knausgaard'
  },
  {
    issue: 22,
    season: 'Spring 2015',
    isbn: '9780989911719',
    pages: 300,
    artists: 'Nina Katchadourian, Teresa Matas, Melissa Meyer, Fred Tomaselli, William Villalongo, Martin Wilner',
    features: 'Medicine and creativity themed issue',
    note: 'Medicine & Creativity'
  },
  {
    issue: 19,
    season: 'Spring 2013',
    isbn: '9780981574585',
    pages: 172,
    artists: 'Sharon Core, Joyce Pensato, John Sparagana',
    features: '100 frames from David Lynch\'s Blue Velvet',
    note: 'New format with slipcase'
  },
  {
    issue: 15,
    season: 'Fall 2010',
    isbn: '9780981574547',
    pages: 180,
    artists: 'Alex Bag, Dara Birnbaum, Johan Grimonprez',
    features: 'Devoted entirely to television',
    note: 'Television Issue',
    title: 'Issue 15: Television'
  },
  {
    issue: 14,
    season: 'Spring 2010',
    isbn: '9780981574530',
    pages: 200,
    artists: '12 artists\' projects',
    features: 'Composed entirely of artists\' projects',
    note: '12 Artists\' Projects',
    title: 'Issue 14: Projects'
  }
];

const PAGES_DIR = path.join(__dirname, '../src/books/magazines/esopus');

if (!fs.existsSync(PAGES_DIR)) fs.mkdirSync(PAGES_DIR, { recursive: true });

function createIssuePage(issue) {
  const title = issue.title || `Issue ${issue.issue}`;
  const filename = `esopus-${issue.issue}.html`;
  const filepath = path.join(PAGES_DIR, filename);

  const html = `---
permalink: /books/magazines/esopus/esopus-${issue.issue}.html
---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Esopus ${title} | Hudson Street Library</title>
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
            <a href="/collections/esophus.html" class="text-sm text-teal-700 hover:text-teal-900">
                <i class="fas fa-arrow-left mr-1"></i> Back to Esopus Collection
            </a>
        </div>

        <div class="max-w-4xl mx-auto">
            <div class="grid md:grid-cols-2 gap-8 lg:gap-12">
                <div class="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                    <img src="/assets/images/magazines/esopus/esopus-${issue.issue}.jpg"
                         alt="Esopus ${title}"
                         class="w-full h-full object-cover">
                </div>
                <div>
                    <h1 class="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Esopus</h1>
                    <p class="text-xl text-gray-600 mb-4">${title}</p>
                    ${issue.note ? `<p class="text-sm text-teal-700 mb-4">${issue.note}</p>` : ''}

                    <div class="space-y-3 text-sm text-gray-600 mb-6">
                        <p><span class="font-medium text-gray-800">Editor:</span> Tod Lippy</p>
                        <p><span class="font-medium text-gray-800">Publisher:</span> Esopus Foundation</p>
                        <p><span class="font-medium text-gray-800">Season:</span> ${issue.season}</p>
                        <p><span class="font-medium text-gray-800">ISBN:</span> ${issue.isbn}</p>
                        <p><span class="font-medium text-gray-800">Pages:</span> ${issue.pages}</p>
                    </div>

                    <div class="prose prose-gray">
                        <h3 class="text-lg font-semibold text-gray-900 mb-2">Featured Artists</h3>
                        <p>${issue.artists}</p>
                        ${issue.features ? `<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">Special Features</h3><p>${issue.features}</p>` : ''}
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
  console.log(`✓ Created: ${filename}`);
}

console.log('\\nCreating Esopus issue pages...\\n');
for (const issue of issues) {
  createIssuePage(issue);
}
console.log('\\nDone!');
