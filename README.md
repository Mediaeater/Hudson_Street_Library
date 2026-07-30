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

The site deploys automatically via GitHub Actions when you push to `main`.
GitHub Pages serves the built site directly at hudsonstreetlibrary.com (via the
`CNAME` file). No CDN, no manual cache step.

**Documentation**: [DEPLOYMENT.md](docs/DEPLOYMENT.md)

**Key Requirements**:
- Node.js 22+ (for Eleventy v3)
- GitHub Actions enabled
- `gh-pages` branch as the Pages source (or GitHub Pages set to "GitHub Actions")

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

- **Total Books**: 1,722 photography books
- **Collections**: 15+ curated collections (see `src/_data/collections/`)
- **Source of Truth**: `src/_data/books.csv` (36 columns, validated by `npm run test:csv`)

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
npm run build

# Clean build directory
npm run clean
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
- [Data Structures](docs/DATA-STRUCTURES.md) - Schema and data formats
- [Security Documentation](docs/SECURITY.md) - Security practices and guidelines
- [Testing Patterns](docs/TESTING-PATTERNS.md) - Testing strategy and conventions
- [Aggregate Views](docs/AGGREGATE-VIEWS.md) - Clickable metadata and filtering system

### User Guides
- [Add-Book Guide](docs/ADD-BOOK-GUIDE.md) - Adding new books via `npm run add`
- [Quick Start: Search](docs/QUICK-START-SEARCH.md) - How to use search and browse features

## 🆘 Troubleshooting

### Site not updating?
1. Check GitHub Actions tab for build status
2. Ensure GitHub Pages source is set to "GitHub Actions"
3. Clear browser cache
4. Wait 2-5 minutes for cache refresh

### Build failing?
1. Check error logs in GitHub Actions
2. Test locally with `npm run build`
3. Verify all file paths are correct
4. Ensure CSV/JSON data is properly formatted (`npm run test:csv`)

## 📧 Contact

For questions about the library collection, visit the contact section on the website.
For technical issues, open an issue in this repository.
