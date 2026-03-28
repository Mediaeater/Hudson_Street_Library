const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// Read existing news
const newsPath = 'src/_data/news.json';
const news = JSON.parse(fs.readFileSync(newsPath, 'utf-8'));

// Get next ID
const lastId = Math.max(...news.map(n => n.id));
const nextId = lastId + 1;

// Create comprehensive March acquisitions news item
const marchAcquisitions = {
  id: nextId,
  date: '2026-03-27',
  category: 'acquisitions',
  featured: true,
  title: "March 2026 Acquisitions: Contemporary Art, Photography, and Artists' Books",
  excerpt: "A significant expansion featuring George Condo's DESTE Foundation catalog, Larry Clark and James Gilroy's collaborative project, Melissa Shook's feminist photography milestone, Nazraeli's One Picture Book series, and essential titles on contemporary art and artists' books.",
  content: `<p>Hudson Street Library is pleased to announce a major collection expansion with twelve significant acquisitions spanning contemporary art, documentary photography, and artists' books. This diverse selection represents some of the most compelling publications in recent months, from major institutional catalogs to intimate collaborative projects.</p>

<h2 class="text-xl font-bold mt-8 mb-4">Contemporary Art Highlights</h2>

<p class="mt-6"><strong><a href="/books/condo_the-mad-and-the-lonely_1759/">George Condo: The Mad and the Lonely</a></strong> (DESTE Foundation, 2026) — Exhibition catalog documenting Condo's site-specific installation at the historic Slaughterhouse venue on Hydra, Greece. Born in 1957, Condo pioneered "Psychological Cubism," a movement that departs from classical Cubism by representing multiple emotional and psychological states simultaneously within single figures. This catalog features small-scale paintings and sculptures exploring madness, loneliness, and psychological isolation, with works installed in the former animal cages of the slaughterhouse—a haunting architectural dialogue. Condo's work is held in collections at MoMA, The Metropolitan Museum, and Whitney Museum.</p>

<p class="mt-6"><strong><a href="/books/prince_works-from-the-astrup-fearnley-collection_1742/">Richard Prince: Works from the Astrup Fearnley Collection</a></strong> (Astrup Fearnley Museet, 2026) — Comprehensive survey of Prince's work from one of Europe's most important private contemporary art collections, documenting his pioneering appropriation practice across photography, painting, and sculpture.</p>

<h2 class="text-xl font-bold mt-8 mb-4">Documentary Photography & Collaboration</h2>

<p class="mt-6"><strong><a href="/books/clark_bedtime-stories-for-bad-boys-and-girls_1760/">Larry Clark & James Gilroy: Bedtime Stories for Bad Boys and Girls</a></strong> (Dashwood Projects, 2026) — A rare collaborative work pairing photographs by Larry Clark with drawings by James Gilroy. The two artists met in downtown New York during the early 1970s and have remained friends for over five decades. This 94-page book documents ten interconnected narratives spanning from the 1950s through the 1970s and beyond, preserving candid recollections of youth, artistic life, and survival in an era that claimed many of their peers. Clark (b. 1943) pioneered confessional documentary photography with <em>Tulsa</em> (1971) and defined 1990s youth culture with his film <em>Kids</em>. Gilroy (b. 1948), trained at Art Students League, brings figurative expressionist drawing practice to their collaboration. Published in conjunction with the Dashwood Projects exhibition (March 25–April 4, 2026).</p>

<p class="mt-6"><strong><a href="/books/shook_daily-self-portraits-1972-1973_1758/">Melissa Shook: Daily Self-Portraits 1972-1973</a></strong> (TBW Books, 2024) — Groundbreaking feminist photography project featuring daily self-portraits created between 1972-1973, titled "To Prove That I Exist." Melissa Shook (1939-2020) pioneered diaristic photography, influencing artists from Nan Goldin to contemporary practitioners. This first monograph presents 400 pages of work from the artist who studied at Bard College and Art Students League. Her photographs are held in museum collections including MoMA, The Met, Nelson-Atkins Museum, and Moderna Museet. Nominated for Paris Photo–Aperture Awards 2024.</p>

<h2 class="text-xl font-bold mt-8 mb-4">Nazraeli Press: One Picture Book Two Series</h2>

<p class="mt-6">Four essential volumes from Nazraeli's acclaimed limited edition series, each limited to 500 numbered copies with removable signed prints:</p>

<p class="mt-6"><strong><a href="/books/shibata_one-picture-book-two-vol-52_lone-pine_1743/">Toshio Shibata: Lone Pine</a></strong> (Vol. 52) — Japanese master photographer's contemplative landscape work</p>

<p class="mt-6"><strong><a href="/books/ikeda_one-picture-book-two-vol-51_desert-daze_1744/">Yoko Ikeda: Desert Daze</a></strong> (Vol. 51) — Evocative desert photography exploring light and form</p>

<p class="mt-6"><strong><a href="/books/fitch_one-picture-book-two-vol-50_plywood-signs_1745/">Steve Fitch: Plywood Signs</a></strong> (Vol. 50) — Documentary study of vernacular American signage</p>

<p class="mt-6"><strong><a href="/books/templeton_one-picture-book-two-vol-49_all-hallows-eve_1746/">Ed Templeton: All Hallows Eve</a></strong> (Vol. 49) — The skateboarder-artist's distinctive photographic vision</p>

<h2 class="text-xl font-bold mt-8 mb-4">Artists' Books & Publishing</h2>

<p class="mt-6"><strong><a href="/books/desjardin_the-book-on-books-on-artists-books_1741/">Arnaud Desjardin: The Book on Books on Artists' Books</a></strong> (Onomatopee, 2026) — Essential meta-analysis examining the history, theory, and practice of artists' books as a medium. This comprehensive study explores how artists have used the book form as primary artistic medium, from conceptual art to contemporary publishing practices.</p>

<p class="mt-6"><strong><a href="/books/steiner_sisters-issue-2_1747/">SISTERS Issue 2</a></strong> and <strong><a href="/books/steiner_sisters-1-the-archive-issue_1748/">SISTERS #1: The Archive Issue</a></strong> by Danko Steiner and Ana Steiner — Independent photography magazine exploring contemporary image-making practices and archival approaches.</p>

<p class="mt-6"><strong><a href="/books/mcknight_posthume_1749/">Mark Armijo McKnight: Posthume</a></strong> (2026) — Contemporary photography exploring themes of memory, loss, and presence.</p>

<p class="mt-6">All titles are now cataloged with comprehensive metadata and available for research visits by appointment. This acquisition strengthens the library's holdings in contemporary art, documentary photography, feminist art history, and artists' publishing practices.</p>`,
  image: '/assets/images/books/condo_george_the_mad_and_the_lonely_9786185039455.jpg',
  link: ''
};

// Add to beginning of news array (most recent first)
news.unshift(marchAcquisitions);

// Write updated news
fs.writeFileSync(newsPath, JSON.stringify(news, null, 2));

console.log('✅ Created March 2026 acquisitions news item (ID:', nextId, ')');
console.log('📰 Title:', marchAcquisitions.title);
console.log('📅 Date:', marchAcquisitions.date);
console.log('📚 Featured:', marchAcquisitions.featured);
