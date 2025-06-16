# Hudson Street Library

A specialized photography book collection website built with Eleventy (11ty) and deployed via GitHub Actions. This project showcases a comprehensive digital library system with automated image processing, news generation, and collection management.

## 📋 Project Overview

Hudson Street Library is a digital archive and collection management system for a specialized photography book collection located in Manhattan's West Village. The system features:

- **Digital Library Interface**: Browse and search through curated collections of photography books
- **Automated Content Management**: Pipeline systems for image processing and news generation
- **Responsive Design**: Modern, accessible interface built with Tailwind CSS
- **Static Site Performance**: Fast, SEO-optimized site generated with Eleventy
- **Automated Deployment**: GitHub Actions-powered CI/CD to GitHub Pages

## ✨ Features

### Core Functionality
- **Book Collection Management**: Comprehensive catalog with metadata, cover images, and detailed descriptions
- **Curated Collections**: 16+ themed collections (Fashion, NYC Photobooks, Queer Photography, etc.)
- **Advanced Search**: Filter and discover books by author, title, subject, and collection
- **News System**: Automated announcements for new acquisitions and collection updates
- **Responsive Image Optimization**: Multi-format, multi-size image generation with lazy loading

### Automated Systems
- **4-Stage Image Pipeline**: Upload → API Fetch → Optimization → Categorization
- **News Generation Pipeline**: Automatic news creation for book acquisitions
- **Collection Auto-categorization**: Smart assignment of books to collections based on metadata
- **Performance Optimization**: WebP format generation, responsive sizing, lazy loading

### User Experience
- **Mobile-First Design**: Optimized for all device sizes
- **Accessibility Compliance**: WCAG guidelines, semantic markup, keyboard navigation
- **Fast Loading**: Core Web Vitals optimized, sub-2s page loads
- **SEO Optimized**: Semantic HTML, meta tags, structured data

## 🚀 Installation

### Prerequisites
- Node.js 16+ and npm
- Git for version control

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Mediaeater/Hudson_Street_Library.git
   cd Hudson_Street_Library
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   # Visit http://localhost:8080
   ```

4. **Build the site**
   ```bash
   npm run build
   # Output generated in _site/
   ```

## 💻 Usage

### Basic Development Workflow

```bash
# Start development with live reload
npm start

# Build production site
npm run build

# Clean build directory
npm run clean

# Check deployment status
npm run deploy:check
```

### Working with Content

#### Adding Books
Edit the CSV file at `src/_data/books.csv`:
```csv
"Title","Author, First","Author, Last","Publisher","Date","Subject classification, tags"
"New Book","Author","Name","Publisher","2024","photography,nyc,street"
```

#### Creating Collections
1. Add HTML file to `src/collections/`
2. Follow existing collection template structure
3. Update collection explore page with new collection

#### Adding News Items
Edit `src/_data/news.json`:
```json
{
  "id": 1,
  "date": "2024-12-15",
  "title": "New Acquisition: Book Title",
  "excerpt": "Brief description of the acquisition",
  "content": "Full announcement content",
  "category": "acquisitions",
  "featured": true
}
```

### Automated Pipelines

#### Image Processing Pipeline
```bash
# Upload new images
node scripts/image-pipeline/cli.js upload --path ./new-images --recursive

# Process through pipeline
node scripts/image-pipeline/cli.js process

# Find missing book covers
node scripts/image-pipeline/cli.js find --missing --download --limit 10

# Generate reports
node scripts/image-pipeline/cli.js report --metadata
```

#### News Generation Pipeline
```bash
# Generate news for single book
node scripts/news-pipeline/cli.js generate-single --title "Book Title" --author "Author Name"

# Process CSV updates
node scripts/news-pipeline/cli.js process-csv --file _data/books.csv

# Test generation
node scripts/news-pipeline/cli.js test-generation
```

## 📚 API Documentation

### Eleventy Shortcodes

#### Image Optimization
```njk
{% image "src/assets/images/book.jpg", "Alt text", "(min-width: 768px) 50vw, 100vw", "css-class" %}
```

#### Thumbnail Generation  
```njk
{% thumbnail "src/assets/images/book.jpg", "Alt text", "thumbnail-class" %}
```

### Data Access

#### Books Data
```javascript
// Access in templates
{{ books | length }} books in collection

// Filter by collection
{% for book in books %}
  {% if book['Collection Grouping'] == 'Fashion' %}
    // Display fashion books
  {% endif %}
{% endfor %}
```

#### News Data
```javascript
// Access in templates
{{ news | length }} news items

// Filter by category
{% for item in news %}
  {% if item.category == 'acquisitions' %}
    // Display acquisition news
  {% endif %}
{% endfor %}
```

## ⚙️ Configuration

### Environment Variables
No environment variables required for basic operation. Optional configurations:

- `DEBUG=true` - Enable verbose logging for pipeline operations
- `NODE_ENV=production` - Production build optimizations

### Configuration Files

#### Eleventy Configuration (`.eleventy.js`)
```javascript
// Image processing settings
const imageConfig = {
  widths: [300, 600, 900, 1200],
  formats: ["webp", "jpeg"],
  outputDir: "_site/assets/images/optimized/"
};

// Template formats
templateFormats: ["njk", "html", "liquid", "md"]
```

#### Pipeline Configuration (`scripts/image-pipeline/pipeline-config.js`)
```javascript
// Collection mapping
collections: {
  'fashion': ['fashion', 'clothing', 'design'],
  'photography': ['photography', 'photobook', 'photos'],
  'nyc': ['new york', 'manhattan', 'brooklyn']
}
```

### Custom Domain
Configure in `CNAME` file:
```
hudsonstreetlibrary.com
```

## 🤝 Contributing

### Development Guidelines

1. **Branch Strategy**: Create feature branches from `main`
2. **Code Style**: Follow existing patterns, use descriptive variable names
3. **Documentation**: Update relevant documentation for new features
4. **Testing**: Test locally before pushing, validate with sample data

### Adding Features

1. **New Collections**:
   - Add HTML file to `src/collections/`
   - Update collection explore page
   - Add collection mapping to pipeline config

2. **New Content Types**:
   - Create template in `src/_includes/layouts/`
   - Add data processing logic if needed
   - Update navigation and indexes

3. **Pipeline Modifications**:
   - Update relevant pipeline modules
   - Add tests for new functionality
   - Update CLI help documentation

### Contribution Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and test locally
npm start
npm run build

# 3. Commit and push
git add .
git commit -m "Add new feature: description"
git push origin feature/new-feature

# 4. Create pull request on GitHub
```

## 🧪 Testing

### Manual Testing
```bash
# Test local build
npm run build

# Test development server
npm start

# Test image pipeline
node scripts/image-pipeline/cli.js test

# Test news pipeline
node scripts/news-pipeline/cli.js test-generation
```

### Validation Scripts
```bash
# Validate CSV data
node scripts/validate-csv.js

# Check for broken links
node scripts/check-links.js

# Validate image paths
node scripts/validate-images.js
```

### Performance Testing
- **Lighthouse**: Built into Chrome DevTools
- **PageSpeed Insights**: https://pagespeed.web.dev/
- **GTmetrix**: For comprehensive performance analysis

### Test Coverage
Current testing covers:
- ✅ Build process validation
- ✅ Image pipeline functionality  
- ✅ News generation system
- ✅ Data validation
- ⚠️ End-to-end user flows (manual testing)
- ⚠️ Cross-browser compatibility (manual testing)

## 🚀 Deployment

### Automated Deployment (GitHub Actions)

The site deploys automatically when changes are pushed to `main`:

1. **GitHub Actions** triggers on push to main
2. **Dependencies** installed (Node.js, npm packages)
3. **Build Process** runs Eleventy to generate static site
4. **Deploy** to GitHub Pages automatically

### Manual Deployment Steps

If needed, you can deploy manually:

```bash
# 1. Build the site
npm run build

# 2. Commit changes (if any)
git add .
git commit -m "Update content"

# 3. Push to main branch
git push origin main

# 4. GitHub Actions will handle the rest
```

### Deployment Configuration

#### GitHub Pages Settings
1. Repository Settings → Pages
2. Source: "GitHub Actions" (not "Deploy from a branch")
3. Custom domain: Configure in CNAME file

#### GitHub Actions Workflow
Located at `.github/workflows/build-and-deploy.yml`:
```yaml
name: Build and Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm run build
      - uses: actions/deploy-pages@v4
```

### Deployment Monitoring

```bash
# Check deployment status
npm run deploy:check

# Monitor via GitHub
# → Repository → Actions tab
# → Repository → Deployments tab
```

## 📦 Dependencies

### Core Dependencies
```json
{
  "@11ty/eleventy": "^3.0.0",           // Static site generator
  "@11ty/eleventy-img": "^6.0.4",      // Image processing
  "axios": "^1.9.0",                   // HTTP client for API calls  
  "csv-parse": "^5.6.0",               // CSV data parsing
  "csv-stringify": "^6.4.5",           // CSV data writing
  "slugify": "^1.6.6"                  // URL slug generation
}
```

### External Dependencies
- **Tailwind CSS**: Via CDN for styling
- **Font Awesome**: Via CDN for icons
- **Google Fonts**: Playfair Display & Montserrat

### Browser Support
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Features**: ES6+, CSS Grid, Flexbox, WebP images
- **Graceful Degradation**: JPEG fallbacks, progressive enhancement

### Node.js Version
- **Required**: Node.js 16+
- **Recommended**: Node.js 18+ (LTS)
- **Package Manager**: npm (included with Node.js)

## 🔧 Troubleshooting

### Common Issues

#### Site Not Updating After Push
```bash
# Check GitHub Actions status
# Go to repository → Actions tab

# Verify GitHub Pages configuration
# Settings → Pages → Source: "GitHub Actions"

# Clear browser cache
# Ctrl+F5 or Cmd+Shift+R

# Wait for cache refresh (2-5 minutes)
```

#### Local Build Failures
```bash
# Clean and rebuild
npm run clean
npm install
npm run build

# Check for file path issues
# Ensure all paths use forward slashes
# Verify image paths are correct

# Validate CSV data
# Check for malformed CSV entries
# Ensure proper escaping of quotes
```

#### Image Pipeline Issues
```bash
# Check file permissions
chmod +x scripts/image-pipeline/cli.js

# Verify image formats
# Supported: JPEG, PNG, WebP, AVIF, TIFF, GIF

# Check disk space
df -h

# Clear pipeline cache
node scripts/image-pipeline/cli.js clean --cache
```

#### Missing Book Covers
```bash
# Run cover finder
node scripts/image-pipeline/cli.js find --missing --download --limit 10

# Check API connectivity
curl -I https://covers.openlibrary.org/

# Verify ISBN formatting
# Should be 10 or 13 digits
```

### Debug Mode

Enable verbose logging:
```bash
# Image pipeline debug
DEBUG=true node scripts/image-pipeline/cli.js process

# News pipeline debug  
DEBUG=news-pipeline node scripts/news-pipeline/cli.js test

# Eleventy debug
DEBUG=Eleventy* npx eleventy
```

### Performance Issues

#### Slow Build Times
```bash
# Profile build performance
npx eleventy --serve --incremental

# Reduce image processing load
# Process images in batches
# Use smaller batch sizes in config

# Check for memory leaks
node --inspect scripts/image-pipeline/cli.js process
```

#### Large File Sizes
```bash
# Analyze bundle size
npx eleventy --pathprefix=/analyze/

# Optimize images further
# Reduce quality settings in config
# Use more aggressive compression

# Clean old optimized files
node scripts/image-pipeline/cli.js clean --optimized --days 7
```

## 📝 Changelog

### Version 2.0.0 (January 2025)
#### Major Features
- ✨ **Comprehensive Image Pipeline**: 4-stage automated image processing system
- ✨ **News Generation System**: Automated announcements for new acquisitions
- ✨ **Enhanced Collections**: 16+ curated collections with improved navigation
- ✨ **Performance Optimization**: WebP generation, responsive images, lazy loading

#### Infrastructure
- 🔧 **GitHub Actions Deployment**: Automated CI/CD pipeline
- 🔧 **Source Code Reorganization**: Clean `src/` directory structure
- 🔧 **Documentation Overhaul**: Comprehensive guides and references

#### Content & Design
- 🎨 **Responsive Design**: Mobile-first, accessible interface
- 📚 **Enhanced Book Pages**: Detailed metadata, improved layouts
- 🔍 **Search Improvements**: Better filtering and discovery
- 📰 **News System**: Dynamic content updates and announcements

### Version 1.0.0 (2024)
#### Initial Release
- 📖 **Basic Book Collection**: Core catalog functionality
- 🏗️ **Eleventy Foundation**: Static site generation setup
- 🎨 **Initial Design**: Basic styling and layout
- 📁 **Collection Structure**: Initial organization system

### Recent Updates
- **2025-01-15**: Added newspapers collection and The Manipulator entry page
- **2025-01-10**: Enhanced image optimization with multiple formats
- **2025-01-05**: Implemented automated news generation pipeline
- **2024-12-20**: Deployed GitHub Actions workflow
- **2024-12-15**: Major documentation update and system consolidation

---

## 📞 Support

### Getting Help

1. **Documentation**: Check relevant docs in `/docs/` directory
2. **Issues**: Create issue on GitHub repository
3. **Local Testing**: Run `npm run deploy:check` for diagnostics

### Development Resources

- **Eleventy Documentation**: https://www.11ty.dev/docs/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **GitHub Actions**: https://docs.github.com/en/actions

### Contact

For questions about the library collection itself, visit the contact section on the website. For technical issues or contributions, use the GitHub repository issue tracker.

---

*Hudson Street Library - A specialized photography book collection in Manhattan's West Village*