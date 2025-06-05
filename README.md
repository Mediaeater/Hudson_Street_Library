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

# Clean build directory
npm run clean

# Check deployment status
npm run deploy:check
```

Visit http://localhost:8080 when running the development server.

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

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment information.

## 🛠 Technology Stack

- **Static Site Generator**: [Eleventy](https://www.11ty.dev/) (11ty)
- **Templates**: Nunjucks (`.njk` files)
- **Styling**: Tailwind CSS (via CDN)
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

## 🚨 Important Notes

1. **Do NOT commit the `_site/` directory** - it's automatically built
2. **GitHub Pages Source**: Must be set to "GitHub Actions" in repository settings
3. **All source files**: Now live in the `src/` directory
4. **Images**: Referenced as `/assets/images/...` in HTML

## 📚 Documentation

### Automated Systems
- [Image System Documentation](IMAGE-SYSTEM-DOCUMENTATION.md) - Complete image pipeline and optimization
- [News Pipeline Documentation](NEWS-PIPELINE-DOCUMENTATION.md) - Automated news generation system

### Deployment & Operations
- [Deployment Guide](docs/DEPLOYMENT.md) - How deployment works
- [GitHub Actions Pipeline](docs/GITHUB-ACTIONS-PIPELINE.md) - Detailed CI/CD documentation
- [Deployment Monitoring](docs/DEPLOYMENT-MONITORING.md) - Status monitoring and troubleshooting
- [Quick Reference](docs/DEPLOYMENT-QUICK-REFERENCE.md) - Essential commands and links

### Development
- [Architecture Overview](docs/architecture/CMS-ARCHITECTURE.md) - System architecture
- [Claude AI Guide](docs/architecture/CLAUDE.md) - AI assistant instructions
- [Book Page Template](docs/guides/BOOK-PAGE-TEMPLATE.md) - Creating book pages

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