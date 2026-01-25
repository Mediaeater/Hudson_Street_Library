const fs = require('fs');
const path = require('path');

// Find all Richard Prince book directories
const booksDir = path.join(__dirname, '_site', 'books');
const princeBooks = [];

// Read all directories starting with prince_
const allDirs = fs.readdirSync(booksDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('prince_'))
  .map(dirent => dirent.name);

console.log(`Found ${allDirs.length} Richard Prince books`);

// Simple regex-based extraction
allDirs.forEach(dirName => {
  const htmlPath = path.join(booksDir, dirName, 'index.html');

  if (fs.existsSync(htmlPath)) {
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Extract title
    const titleMatch = html.match(/<h1[^>]*class="book-title[^"]*"[^>]*>(.*?)<\/h1>/s);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // Extract publisher
    const publisherMatch = html.match(/<span[^>]*class="field-label"[^>]*>Publisher<\/span>\s*<span[^>]*class="field-value"[^>]*>(.*?)<\/span>/s);
    const publisher = publisherMatch ? publisherMatch[1].replace(/<[^>]+>/g, '').trim() : 'Publisher unknown';

    // Extract year
    const yearMatch = html.match(/<span[^>]*class="field-label"[^>]*>Published<\/span>\s*<span[^>]*class="field-value"[^>]*>(\d{4})/);
    const year = yearMatch ? yearMatch[1] : '';

    // Extract cover image - look for the actual image in the book page
    const imgMatch = html.match(/<img[^>]+src="(\.\.\/\.\.\/assets\/images\/[^"]+)"[^>]*alt=""[^>]*class="[^"]*w-full h-full object-contain/);
    let coverImage = '/assets/images/placeholder-book.svg';

    if (imgMatch) {
      coverImage = imgMatch[1].replace('../..', '');
    } else {
      // Fallback: try to find any Prince image
      const fallbackMatch = html.match(/src="(\.\.\/\.\.\/assets\/images\/books\/Prince[^"]+)"/i);
      if (fallbackMatch) {
        coverImage = fallbackMatch[1].replace('../..', '');
      }
    }

    // Extract description
    const descMatch = html.match(/<div[^>]*class="description-text[^"]*"[^>]*>[\s\S]*?<p>(.*?)<\/p>/);
    let description = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : 'Published date unknown';
    if (description.length > 150) {
      description = description.substring(0, 150) + '...';
    }

    // Create book object
    princeBooks.push({
      id: dirName,
      title: title || dirName.replace('prince_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      publisher: publisher,
      year: year,
      coverImage: coverImage,
      description: description,
      url: `/books/${dirName}/`
    });
  }
});

// Sort books by year (descending) and then by title
princeBooks.sort((a, b) => {
  const yearA = parseInt(a.year) || 0;
  const yearB = parseInt(b.year) || 0;
  if (yearB !== yearA) return yearB - yearA;
  return a.title.localeCompare(b.title);
});

console.log(`Processed ${princeBooks.length} books`);

// Generate the collection HTML page
const collectionHTML = `---
permalink: /collections/richard-prince.html
---
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Richard Prince Publications | Hudson Street Library</title>
    <link rel="stylesheet" href="/assets/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        .item-card { transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .item-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0, 0, 0, 0.07); }

        .line-divider { position: relative; padding-bottom: 8px; margin-bottom: 16px; }
        .line-divider::after { content: ''; position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; width: 60px; height: 1px; background: #0f766e; }

        .hero-image-container { box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1); }
    </style>
</head>
<body class="bg-gray-50 text-gray-800">

    <!-- Standard Site Header -->
    <header class="sticky top-0 w-full bg-white z-50 py-4 shadow-md">
        <div class="container mx-auto px-6">
            <div class="flex justify-between items-center">
                <a href="/" class="text-xl sm:text-2xl font-bold tracking-tight text-teal-900">HUDSON STREET LIBRARY</a>
                <nav id="main-nav" class="hidden md:flex space-x-6 lg:space-x-8 items-center text-neutral-700 text-sm lg:text-base">
                    <a href="/#about" class="nav-item hover:text-teal-700">About</a>
                    <a href="/collection-explore.html" class="nav-item hover:text-teal-700 font-semibold text-teal-700">Collections</a>
                    <a href="/static-demo/" class="nav-item hover:text-teal-700">Search</a>
                    <a href="/#publications" class="nav-item hover:text-teal-700">Publications</a>
                    <a href="/collections/recently_added.html" class="nav-item hover:text-teal-700">News</a>
                    <a href="/#contact" class="nav-item hover:text-teal-700">Contact</a>
                </nav>
                <button class="md:hidden focus:outline-none text-teal-800" aria-label="Toggle menu" aria-controls="mobile-nav-menu" aria-expanded="false">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
        </div>
        <!-- Mobile Nav Structure (hidden initially) -->
        <nav id="mobile-nav-menu" class="hidden md:hidden absolute top-full left-0 right-0 bg-white shadow-lg px-6 py-4 space-y-3 flex-col z-40">
             <a href="/#about" class="block py-2 text-neutral-700 hover:text-teal-700">About</a>
             <a href="/collection-explore.html" class="block py-2 text-neutral-700 hover:text-teal-700 font-semibold text-teal-700">Collections</a>
             <a href="/static-demo/" class="block py-2 text-neutral-700 hover:text-teal-700">Search</a>
             <a href="/#publications" class="block py-2 text-neutral-700 hover:text-teal-700">Publications</a>
             <a href="/collections/recently_added.html" class="block py-2 text-neutral-700 hover:text-teal-700">News</a>
             <a href="/#contact" class="block py-2 text-neutral-700 hover:text-teal-700">Contact</a>
        </nav>
    </header>

    <main>
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">

            <!-- Collection Header -->
            <div class="max-w-3xl mx-auto text-center mb-12 md:mb-16">
                <h1 class="text-4xl sm:text-5xl font-bold title-font mb-4 text-gray-900">Richard Prince</h1>
                <div class="line-divider inline-block"></div>
                <p class="text-base sm:text-lg text-gray-600 leading-relaxed mt-4">
                    A barely comprehensive, not even close to complete collection of publications by and about Richard Prince, the influential American artist known for his appropriation photography, cowboys, jokes, and social media work. Spanning exhibition catalogs, artist books, and rare publications from the 1980s through today.
                </p>
                <div class="mt-8">
                    <a href="/collection-explore.html" class="text-sm text-teal-700 hover:text-teal-900 transition-colors">
                        <i class="fas fa-arrow-left mr-1"></i> Back to All Collections
                    </a>
                </div>
            </div>

            <!-- Grid for Items within this Collection -->
            <div id="item-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-8">

${princeBooks.map(book => `                <!-- ${book.title} -->
                <article class="item-card group bg-white rounded-lg overflow-hidden border border-gray-100">
                     <a href="${book.url}" class="block">
                        <div class="relative overflow-hidden aspect-[3/4] bg-gray-200">
                            <img src="${book.coverImage}"
                                 alt="${book.title}"
                                 class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
                        </div>
                        <div class="p-3 sm:p-4">
                            <h3 class="text-base font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
                                ${book.title}
                            </h3>
                            <p class="text-sm text-gray-500 mt-1 truncate">${book.publisher}${book.year ? ' • ' + book.year : ''}</p>
                            <p class="text-xs text-gray-400 mt-1">Richard Prince</p>
                        </div>
                    </a>
                </article>
`).join('\n')}
            </div>

             <p id="no-items-message" class="text-center text-gray-500 py-12 hidden">No items currently displayed in this collection.</p>

        </div>
    </main>

    {% include "components/site-footer.njk" %}

    <script>
        // Mobile Menu Toggle Logic
        const mobileMenuButton = document.querySelector('button.md\\\\:hidden');
        const mobileNavMenu = document.getElementById('mobile-nav-menu');

        if (mobileMenuButton && mobileNavMenu) {
            mobileMenuButton.addEventListener('click', function() {
                const isExpanded = mobileMenuButton.getAttribute('aria-expanded') === 'true';
                mobileMenuButton.setAttribute('aria-expanded', !isExpanded);
                mobileNavMenu.classList.toggle('hidden');
                mobileNavMenu.classList.toggle('flex');
                const icon = mobileMenuButton.querySelector('i');
                if (icon) {
                    icon.classList.toggle('fa-bars');
                    icon.classList.toggle('fa-times');
                }
            });
        }

        // Smooth Scrolling for on-page anchors (if any added later)
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                if (this.hash) {
                   const targetElement = document.querySelector(this.hash);
                   if (targetElement) {
                        e.preventDefault();
                        const headerOffset = document.querySelector('header')?.offsetHeight || 70;
                        const elementPosition = targetElement.getBoundingClientRect().top;
                        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                        window.scrollTo({ top: offsetPosition, behavior: "smooth" });
                        // Close mobile menu if open
                        if (mobileMenuButton.getAttribute('aria-expanded') === 'true') {
                             mobileMenuButton.click();
                        }
                   }
                }
            });
        });
    </script>

</body>
</html>
`;

// Write the collection page
const outputPath = path.join(__dirname, 'src', 'collections', 'richard-prince.html');
fs.writeFileSync(outputPath, collectionHTML, 'utf8');
console.log(`\nSuccessfully created Richard Prince collection page at: ${outputPath}`);
console.log(`Total books in collection: ${princeBooks.length}`);
