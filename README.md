# Hudson Street Library

A specialized photography book collection website built with Eleventy and deployed via GitHub Pages.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server (with live reload)
npm start

# Build the site
npm run build

# Run tests
npm test

# Add a new book (interactive)
npm run add

# Clean build directory
npm run clean

# Check deployment status
npm run deploy:check

# Deploy to live site (build + purge Cloudflare cache)
npm run deploy
```

Visit http://localhost:8080 when running the development server.

## 🚀 Deployment

The site deploys automatically via GitHub Actions when you push to `main`. After deployment completes, purge Cloudflare cache to update the live site:

```bash
npm run cache:purge
```

**Documentation**:
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) - Complete deployment workflows and troubleshooting
- [ELEVENTY-V3-MIGRATION.md](docs/ELEVENTY-V3-MIGRATION.md) - Eleventy v3 compatibility notes

**Key Requirements**:
- Node.js 22+ (for Eleventy v3)
- GitHub Actions enabled
- Cloudflare API token configured in `.env`

## 📚 Adding New Books

**Fastest method** - paste book text and auto-fill details:

```bash
npm run add
```

Then paste:
```
Ayoung Kim: Synthetic Storyteller
The Floorplan, 2025 | Softcover | 400 pages
```

The script will:
- Parse author, title, publisher, year, pages, binding
- Look up ISBN via Google Books API
- Assign sequential ID and accession date
- Generate proper cover filename
- Add to `books.csv` with backup

See [ADD-BOOK-GUIDE.md](docs/ADD-BOOK-GUIDE.md) for complete instructions.

## 📊 Current Status

- **Total Books**: 1,306 photography books
- **Book Covers**: 139 verified covers (11% coverage) 
- **Tagged Books**: 241 books (18.5% have tags)
- **Unique Tags**: 154 tags identified
- **Collections**: 15 curated collections
- **Data Quality**: ISBN validation completed, 1,242 issues fixed

### Daily Log

#### July 12, 2025 - Major Book Cover Cleanup & Strict Acquisition System
**Problem**: Discovered 500+ incorrect book covers (physics textbooks, phonetics books, etc.) polluting the collection
**Solution**: Created strict cover acquisition system with 80% title/author match requirement

**Work completed**:
1. **Identified & Removed Incorrect Covers**:
   - Removed 349 physics textbook duplicates (10,983 bytes each)
   - Removed 43 phonetics textbook duplicates (4,473 bytes)
   - Removed 29 Archive.org placeholder icons (3,777 bytes)
   - Removed 100+ other mismatched covers
   - Total: ~520 incorrect covers removed

2. **Created Strict Acquisition System** (`acquire-covers-strict.js`):
   - Requires 80% similarity match for both title AND author
   - Shows what was found vs what was expected
   - Prevents false positives that plagued the original system
   - Success rate: ~9-10% (but 100% accurate)

3. **Built Verification Tools**:
   - `verify-covers-visual.js` - Opens images for manual review
   - Progress tracking system to avoid re-reviewing
   - Batch processing with clear accept/reject workflow

4. **Results**:
   - Started with 859 covers (mostly wrong)
   - After cleanup: 139 verified correct covers
   - Processed 300 books, added 28 new verified covers
   - ISBN books: 30% coverage | Non-ISBN books: 3% coverage

**Key Insight**: Art/photography books are rarely in Google Books API. Better to have 139 correct covers than 859 wrong ones.

### Recent Updates
- ✅ Fixed critical book cover display issue (July 12)
- ✅ Created strict cover acquisition system preventing false positives
- ✅ Built visual verification tool for manual cover checking
- ✅ Cleaned up 520+ incorrect book covers
- ✅ Added 28 new verified covers through strict matching

### Next Steps
- 📌 Improve tag coverage (currently only 18.5%)
- 📌 Acquire remaining 549 book covers (43.2% missing)
- 📌 Standardize existing tags into proper categories
- 📌 Add more book metadata (descriptions, subjects)

## 📁 Project Structure

```
src/                  # All source files
├── _data/           # Data files (books.csv, news.json)
├── _includes/       # Templates and layouts
│   └── layouts/     # Page layouts (book.njk)
├── assets/          # Static assets
│   ├── images/      # All images organized by category
│   └── js/          # JavaScript files
├── books/           # Book pages
├── collections/     # Collection pages
├── news/           # News templates
└── pages/          # Static pages

docs/                # Documentation
├── architecture/    # Technical documentation
├── guides/         # How-to guides
└── DEPLOYMENT.md   # Deployment instructions

lib/                # Project-specific libraries
└── csv-handler.js   # CSV parsing utility

scripts/            # Utility scripts and automation
├── image-pipeline/ # Automated image processing system
└── news-pipeline/  # Automated news generation system
.github/            # GitHub Actions workflows
└── workflows/      # Automated build and deploy
```

## 🔄 Automated Deployment

The site is automatically built and deployed via GitHub Actions when changes are pushed to the `main` branch.

**No more manual builds!** Just push your changes and GitHub Actions will:
1. Build the site with Eleventy
2. Deploy to GitHub Pages
3. Update the live site at https://hudsonstreetlibrary.com

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment information.

## 🛠 Technology Stack

- **Static Site Generator**: [Eleventy](https://www.11ty.dev/) (11ty)
- **Templates**: Nunjucks (`.njk` files)
- **Styling**: Tailwind CSS
- **Testing**: Mocha
- **Deployment**: GitHub Actions + GitHub Pages
- **Custom Domain**: Configured via CNAME file

## 📝 Working with Content

### Adding/Editing Books
Edit the CSV file at `src/_data/books.csv`. Ensure proper CSV formatting:
- Use double quotes for fields containing commas
- Escape quotes by doubling them (`""`)
- Keep consistent column count

### Adding News Items
Edit `src/_data/news.json` with the news item structure:
```json
{
  "id": 1,
  "date": "2024-12-15",
  "title": "News Title",
  "excerpt": "Brief description",
  "content": "Full content",
  "category": "acquisitions",
  "featured": true
}
```

### Creating New Pages
1. Add HTML/Nunjucks files to `src/pages/` or appropriate directory
2. Use existing templates as reference
3. Commit and push - the site will build automatically

### Using Automated Pipelines

#### Image Pipeline
```bash
# Process new images
node scripts/image-pipeline/cli.js upload --path ./new-images --recursive
node scripts/image-pipeline/cli.js process

# Find missing book covers
node scripts/image-pipeline/cli.js find --missing --download --limit 10
```

#### News Pipeline
```bash
# Generate news for new book
node scripts/news-pipeline/cli.js generate-single --title "Book Title" --author "Author"

# Process CSV updates
node scripts/news-pipeline/cli.js process-csv --file _data/books.csv
```

## 🔧 Local Development

```bash
# Install dependencies (first time only)
npm install

# Start development server
npm start
# Visit http://localhost:8080

# Build site locally (outputs to _site/)
npm build

# Clean build directory
npm clean
```

## ⚡ Key Features

- **Automated Builds**: Push to main = automatic deployment
- **Clean Repository**: Built files (`_site/`) no longer tracked in git
- **Fast Development**: Live reload during local development
- **Modern Structure**: Organized source files in `src/` directory
- **Comprehensive Docs**: Everything documented in `docs/`
- **Image Pipeline**: Automated 4-stage image processing (Upload → API → Optimize → Categorize)
- **News Pipeline**: Automated news generation for new book acquisitions
- **Performance Optimized**: Responsive images with WebP format and lazy loading
- **Clickable Metadata**: Click any publisher, year, tag, or collection to see related books
- **Advanced Search**: Full-text search with filters, sorting, and visual browse mode
- **Tag System**: Books organized by tags with only 18.5% coverage (needs improvement)
- **Book Cover Acquisition**: 757 covers (56.8% coverage) from free APIs

## 🚨 Important Notes

1. **The `_site/` directory is automatically built** by GitHub Actions - no manual building required
2. **GitHub Pages Source**: Must be set to "GitHub Actions" in repository settings  
3. **All source files**: Live in the `src/` directory
4. **Images**: Referenced as `/assets/images/...` in HTML

## 📚 Documentation

**📖 [Complete Documentation Index](docs/INDEX.md)** - Central hub for all documentation

### Quick Links
- [Development Workflow Guide](docs/DEVELOPMENT-WORKFLOW.md) - Complete development guide for new developers
- [Frontend Development](docs/FRONTEND-DEVELOPMENT.md) - JavaScript, CSS, and template system
- [Build System](docs/BUILD-SYSTEM.md) - How Eleventy builds the site
- [Template System](docs/TEMPLATE-SYSTEM.md) - Working with Nunjucks templates
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) - Common problems and solutions

### Automated Systems
- [Image System Documentation](docs/IMAGE-SYSTEM-DOCUMENTATION.md) - Complete image pipeline and optimization
- [News Pipeline Documentation](docs/NEWS-PIPELINE-DOCUMENTATION.md) - Automated news generation system

### Deployment & Operations
- [Deployment Guide](docs/DEPLOYMENT.md) - How deployment works
- [GitHub Actions Pipeline](docs/GITHUB-ACTIONS-PIPELINE.md) - Detailed CI/CD documentation
- [Quick Reference](docs/DEPLOYMENT-QUICK-REFERENCE.md) - Essential commands and links

### Development
- [Architecture Overview](docs/architecture/SYSTEM-OVERVIEW.md) - System architecture
- [Data Structures](docs/DATA-STRUCTURES.md) - Database schema and data formats
- [Security Documentation](docs/SECURITY.md) - Security practices and guidelines
- [Testing Guide](docs/TESTING-GUIDE.md) - Testing framework and procedures
- [API Documentation](docs/API_DOCUMENTATION.md) - Book cover APIs and integration
- [Aggregate Views](docs/AGGREGATE-VIEWS.md) - Clickable metadata and filtering system

### User Guides
- [Book Workflow Guide](docs/BOOK_WORKFLOW_GUIDE.md) - Adding and managing books
- [Content Manager Guide](docs/CONTENT_MANAGER_GUIDE.md) - Using the CMS
- [Quick Start: Search](docs/QUICK-START-SEARCH.md) - How to use search and browse features

## 🆘 Troubleshooting

### Site not updating?
1. Check GitHub Actions tab for build status
2. Ensure GitHub Pages source is set to "GitHub Actions"
3. Clear browser cache
4. Wait 2-5 minutes for cache refresh

### Build failing?
1. Check error logs in GitHub Actions
2. Test locally with `npm build`
3. Verify all file paths are correct
4. Ensure CSV/JSON data is properly formatted

## 📧 Contact

For questions about the library collection, visit the contact section on the website.
For technical issues, open an issue in this repository.
