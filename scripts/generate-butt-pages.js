const fs = require('fs');
const path = require('path');

const issuesData = {
  3: { year: 2002, season: "Issue #3", desc: "Early issue of the legendary gay culture and lifestyle magazine featuring photography, interviews, and creative queer content." },
  4: { year: 2002, season: "Issue #4", desc: "Pioneering gay culture magazine from the early 2000s with bold photography and intimate stories." },
  5: { year: 2003, season: "Issue #5", desc: "Independent gay culture magazine featuring distinctive photography and honest storytelling." },
  6: { year: 2003, season: "Issue #6", desc: "Celebrating gay culture through provocative imagery and personal narratives." },
  7: { year: 2004, season: "Issue #7", desc: "Iconic issue from the mid-2000s featuring groundbreaking queer photography." },
  8: { year: 2004, season: "Issue #8", desc: "Continued exploration of gay culture with raw, authentic content." },
  9: { year: 2005, season: "Issue #9", desc: "Featuring bold photography and intimate portraits of queer life." },
  10: { year: 2005, season: "Issue #10", desc: "Milestone 10th issue celebrating queer culture and creativity." },
  11: { year: 2006, season: "Issue #11", desc: "Continuing the tradition of honest, sex-positive gay content." },
  12: { year: 2006, season: "Issue #12", desc: "Features provocative photography and candid interviews." },
  13: { year: 2007, season: "Issue #13", desc: "Documenting queer life through photography and personal stories." },
  14: { year: 2007, season: "Issue #14", desc: "Bold issue featuring international queer perspectives." },
  15: { year: 2008, season: "Issue #15", desc: "Creative exploration of gay identity and culture." },
  16: { year: 2008, season: "Issue #16", desc: "Showcasing diverse voices in the queer community." },
  17: { year: 2009, season: "Issue #17", desc: "Independent gay culture magazine with artistic photography." },
  18: { year: 2009, season: "Issue #18", desc: "Featuring experimental photography and queer narratives." },
  19: { year: 2010, season: "Issue #19", desc: "Celebrating a decade of queer publishing excellence." },
  20: { year: 2010, season: "Issue #20", desc: "Milestone 20th issue with special features and photography." },
  21: { year: 2011, season: "Issue #21", desc: "Bold photography and honest storytelling continue." },
  22: { year: 2011, season: "Issue #22", desc: "Exploring contemporary queer culture through visual arts." },
  23: { year: 2012, season: "Issue #23", desc: "Featuring international contributors and diverse perspectives." },
  24: { year: 2012, season: "Issue #24", desc: "Sex-positive content with artistic integrity." },
  25: { year: 2013, season: "Issue #25", desc: "Quarter-century issue celebrating queer culture." },
  26: { year: 2013, season: "Issue #26", desc: "Continuing the legacy of independent queer publishing." },
  27: { year: 2014, season: "Issue #27", desc: "Fresh perspectives on queer life and culture." },
  28: { year: 2014, season: "Issue #28", desc: "Provocative photography and intimate interviews." },
  29: { year: 2015, season: "Issue #29", desc: "Creative queer content from around the world." },
  30: { year: 2015, season: "Issue #30", desc: "Major milestone issue with retrospective content." },
  31: { year: 2023, season: "Spring 2023", desc: "Classic volume with essays, photography & queer culture." },
  32: { year: 2023, season: "Summer 2023", desc: "Soulful issue with global queer content." },
  33: { year: 2023, season: "Autumn 2023", desc: "Loaded with sex, lust & creative queer content." },
  34: { year: 2024, season: "Spring 2024", desc: "Spring 2024 issue with queer content." },
  35: { year: 2024, season: "December 2024", desc: "Hot and wild cover featuring Giorgi Kikonishvili." },
  36: { year: 2025, season: "Spring 2025", desc: "Thickest, most holy issue yet." },
  37: { year: 2025, season: "Autumn 2025", desc: "Straight-talking bangers only." }
};

const generatePage = (issueNum) => {
  const data = issuesData[issueNum];

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BUTT Magazine Issue #${issueNum} | Hudson Street Library</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="../../../../assets/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body class="bg-gray-50 text-gray-800">

    <!-- Standard Header -->
    <header class="sticky top-0 w-full bg-white z-50 py-4 shadow-md">
        <div class="container mx-auto px-6">
            <div class="flex justify-between items-center">
                <a href="/" class="text-xl sm:text-2xl font-bold tracking-tight text-teal-900">HUDSON STREET LIBRARY</a>
                <nav class="desktop-nav hidden md:flex space-x-6 lg:space-x-8 items-center text-neutral-700 text-sm lg:text-base">
                    <a href="/#about" class="nav-item hover:text-teal-700">About</a>
                    <a href="/collection-explore.html" class="nav-item hover:text-teal-700">Collections</a>
                    <a href="/static-demo/" class="nav-item hover:text-teal-700">Search</a>
                    <a href="/#publications" class="nav-item hover:text-teal-700">Publications</a>
                    <a href="/collections/recently_added.html" class="nav-item hover:text-teal-700">News</a>
                    <a href="/#contact" class="nav-item hover:text-teal-700">Contact</a>
                </nav>
                <button class="mobile-nav-button md:hidden focus:outline-none text-teal-800" aria-label="Toggle menu">
                    <i class="fas fa-bars text-xl"></i>
                </button>
            </div>
            <!-- Mobile Menu -->
            <nav class="mobile-menu hidden">
                <div class="px-6 py-4 space-y-3">
                    <a href="/#about" class="block py-2 text-neutral-700 hover:text-teal-700">About</a>
                    <a href="/collection-explore.html" class="block py-2 text-neutral-700 hover:text-teal-700">Collections</a>
                    <a href="/static-demo/" class="block py-2 text-neutral-700 hover:text-teal-700">Search</a>
                    <a href="/#publications" class="block py-2 text-neutral-700 hover:text-teal-700">Publications</a>
                    <a href="/collections/recently_added.html" class="block py-2 text-neutral-700 hover:text-teal-700">News</a>
                    <a href="/#contact" class="block py-2 text-neutral-700 hover:text-teal-700">Contact</a>
                </div>
            </nav>
        </div>
    </header>

    <main class="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 max-w-7xl">
        <!-- Breadcrumb -->
        <nav class="breadcrumb mb-6 text-sm text-gray-600" aria-label="Breadcrumb">
            <a href="/" class="hover:text-gray-800">Home</a>
            <span class="mx-2">/</span>
            <a href="/collection-explore.html" class="hover:text-gray-800">Collections</a>
            <span class="mx-2">/</span>
            <a href="/collections/butt.html" class="hover:text-gray-800">BUTT Magazine</a>
            <span class="mx-2">/</span>
            <span class="text-gray-900">Issue #${issueNum}</span>
        </nav>

        <!-- Back Button -->
        <a href="/collections/butt.html" class="inline-flex items-center gap-2 mb-8 text-teal-700 hover:text-teal-900 transition-colors">
            <i class="fas fa-arrow-left"></i>
            <span>Back to BUTT Magazine Collection</span>
        </a>

        <!-- Main Content -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">

            <!-- Left Column: Image -->
            <div>
                <h1 class="text-3xl md:text-4xl font-bold mb-2">Issue #${issueNum}</h1>
                <p class="text-xl text-gray-600 mb-8">${data.season} — ${data.year}</p>

                <!-- Cover Image -->
                <div class="mb-8">
                    <div class="aspect-[3/4] relative overflow-hidden rounded-sm shadow-xl max-w-[75%]">
                        <img src="/assets/images/magazines/butt/butt-${issueNum}.jpg"
                             alt="BUTT Magazine Issue ${issueNum}"
                             class="w-full h-full object-cover">
                    </div>
                </div>
            </div>

            <!-- Right Column: Details -->
            <div>
                <!-- About Section -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">About This Issue</h3>
                    <div class="prose prose-gray max-w-none text-gray-700 leading-relaxed">
                        <p>${data.desc}</p>

                        <p class="mt-4">BUTT Magazine is a legendary independent gay culture and lifestyle magazine known for its distinctive photography, intimate interviews, and honest storytelling.</p>
                    </div>
                </div>

                <!-- Details -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Details</h3>
                    <div class="space-y-2 text-sm md:text-base">
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Issue:</span>#${issueNum}</p>
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Published:</span>${data.season} — ${data.year}</p>
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Publisher:</span>BUTT Publications</p>
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Format:</span>Magazine</p>
                        <p><span class="font-semibold text-gray-700 inline-block min-w-[120px]">Location:</span>Hudson Street Library, NYC</p>
                    </div>
                </div>

                <!-- External Links -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Learn More</h3>
                    <div class="space-y-3">
                        <a href="https://buttmagazine.com/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-teal-700 hover:text-teal-900 transition-colors">
                            <i class="fas fa-external-link-alt text-sm"></i>
                            <span>BUTT Magazine Official Site</span>
                        </a>
                        <a href="https://buttmagazine.com/library/butt-${issueNum}/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2 text-teal-700 hover:text-teal-900 transition-colors">
                            <i class="fas fa-external-link-alt text-sm"></i>
                            <span>View Issue #${issueNum} on BUTT</span>
                        </a>
                    </div>
                </div>

                <!-- Collection Link -->
                <div class="mb-8">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">Part of Collection</h3>
                    <a href="/collections/butt.html" class="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 transition-colors">
                        <i class="fas fa-folder-open"></i>
                        <span>BUTT Magazine Collection</span>
                    </a>
                </div>

            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-neutral-900 text-neutral-300 py-16 mt-16">
        <div class="container mx-auto px-6">
            <div class="flex flex-col md:flex-row justify-between pb-12 border-b border-neutral-700">
                <div class="mb-8 md:mb-0">
                    <h3 class="text-2xl font-bold mb-4 text-white">HUDSON STREET LIBRARY</h3>
                    <p class="text-neutral-400 max-w-xs">A specialized photography and art book collection in Manhattan's West Village.</p>
                </div>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-8">
                    <div>
                        <h4 class="font-semibold text-lg mb-4 text-neutral-100">Explore</h4>
                        <ul class="space-y-2 text-neutral-400">
                            <li><a href="/" class="hover:text-white">Home</a></li>
                            <li><a href="/#about" class="hover:text-white">About</a></li>
                            <li><a href="/collection-explore.html" class="hover:text-white">Collections</a></li>
                            <li><a href="/static-demo/" class="hover:text-white">Search</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="pt-12 text-center text-neutral-500 text-sm">
                <p>© 2025 Hudson Street Library. All rights reserved.</p>
            </div>
        </div>
    </footer>

    <script>
        // Mobile menu toggle
        const mobileNavButton = document.querySelector('.mobile-nav-button');
        const mobileMenu = document.querySelector('.mobile-menu');

        if (mobileNavButton) {
            mobileNavButton.addEventListener('click', () => {
                mobileMenu.classList.toggle('active');
                const icon = mobileNavButton.querySelector('i');
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            });
        }
    </script>

</body>
</html>
`;
};

// Generate all pages
const outputDir = path.join(__dirname, '../src/books/magazines/butt');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

for (let i = 3; i <= 37; i++) {
  const content = generatePage(i);
  const filename = path.join(outputDir, `butt-${i}.html`);
  fs.writeFileSync(filename, content);
  console.log(`Created: butt-${i}.html`);
}

console.log(`\n✓ Generated 35 BUTT Magazine issue pages`);
