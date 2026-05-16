# Hudson Street Library - System Overview

## Project Architecture

Hudson Street Library is a specialized photography book collection website built with **Eleventy (11ty)** and automatically deployed via **GitHub Actions** to **GitHub Pages**.

### Technology Stack

- **Static Site Generator**: Eleventy (11ty) v3.0
- **Template Engine**: Nunjucks (.njk files)
- **Styling**: Tailwind CSS (compiled locally via `npm run build:css`)
- **Image Processing**: @11ty/eleventy-img with WebP optimization
- **Data Storage**: CSV files + JSON for structured data
- **Deployment**: GitHub Actions → GitHub Pages
- **Custom Domain**: hudsonstreetlibrary.com (via CNAME)

## Core System Components

### 1. Data Layer
- **Books Database**: `src/_data/books.csv` - Master catalog of all books
- **News Feed**: `src/_data/news.json` - Library announcements and acquisitions
- **Collections**: Curated thematic groupings (fashion, photography, art, etc.)

### 2. Content Management
- **Book Pages**: Individual book detail pages in `src/books/`
- **Collection Pages**: Thematic collection showcases in `src/collections/`
- **News System**: Automated announcement generation
- **Image Assets**: Organized in `src/assets/images/` by category

### 3. Automated Pipelines

#### Image Processing Pipeline (`scripts/image-pipeline/`)
4-stage automated workflow:
1. **Upload/Add** - Handle incoming images from various sources
2. **API Integration** - Find missing book covers via Open Library, Google Books APIs
3. **Optimization** - Generate responsive WebP/JPEG variants (300w, 600w, 900w, 1200w)
4. **Categorization** - Auto-organize by collection using keyword matching

#### News Generation Pipeline (`scripts/news-pipeline/`)
7-step automated workflow:
1. **Database Addition** - New book added to CSV
2. **Collection Assignment** - Auto-categorization based on subjects
3. **Page Creation** - Generate book page from template
4. **Image Processing** - Handle cover optimization
5. **Index Updates** - Update collection pages
6. **News Generation** - Create announcement
7. **Site Integration** - Update navigation and feeds

### 4. Build & Deployment
- **Local Development**: `npm start` → http://localhost:8080 with live reload
- **Build Process**: Eleventy processes Nunjucks templates, optimizes images, generates static HTML
- **Automatic Deployment**: GitHub Actions builds and deploys on every push to `main`
- **Performance**: WebP images, lazy loading, responsive design

## Directory Structure

```
Hudson_Street_Library/
├── src/                    # All source files
│   ├── _data/             # Data files (books.csv, news.json)
│   ├── _includes/         # Templates and components
│   ├── assets/            # Images, CSS, JS
│   ├── books/             # Individual book pages
│   ├── collections/       # Collection showcase pages
│   └── pages/             # Static pages
├── scripts/               # Automation tools
│   ├── image-pipeline/    # 4-stage image processing system
│   └── news-pipeline/     # Automated news generation
├── docs/                  # Documentation
└── .github/workflows/     # GitHub Actions CI/CD
```

## Key Features

### Automated Content Management
- **Smart Categorization**: Books automatically assigned to collections based on keywords
- **Missing Cover Detection**: APIs automatically find and download missing book covers
- **News Generation**: New acquisitions automatically generate announcements
- **Responsive Images**: All images automatically optimized for web with multiple sizes

### Performance Optimizations
- **Modern Image Formats**: WebP with JPEG fallbacks
- **Lazy Loading**: Images load only when needed
- **Responsive Design**: Right-sized images for each device
- **CDN Delivery**: GitHub Pages global CDN

### Developer Experience
- **Live Reload**: Instant preview during development
- **CLI Tools**: Command-line interfaces for image and news pipelines
- **Automated Builds**: Zero-maintenance deployment
- **Clean Repository**: No built files tracked in git

## Data Flow

### Book Addition Workflow
1. **Manual Entry**: Book metadata added to `src/_data/books.csv`
2. **Pipeline Trigger**: News pipeline detects new entry
3. **Auto-Processing**: 
   - Collection assignment based on keywords
   - Book page generation from template
   - Cover image search via APIs
   - Image optimization (WebP + responsive variants)
4. **News Generation**: Automatic announcement creation
5. **Site Update**: Collection indexes and navigation updated
6. **Deployment**: GitHub Actions rebuilds and deploys site

### Image Processing Workflow
1. **Upload**: New images added to appropriate directories
2. **API Search**: Missing covers found via Open Library/Google Books
3. **Optimization**: Multiple format/size variants generated
4. **Categorization**: Images organized by collection keywords
5. **Integration**: Optimized images available for templates

## Integration Points

### External APIs
- **Open Library**: Free book cover and metadata API
- **Google Books**: High-quality covers and detailed metadata
- **WorldCat**: Academic and scholarly publication data

### Template System
- **Nunjucks Templates**: Dynamic content generation
- **Image Shortcodes**: `{% image %}` and `{% thumbnail %}` for optimized images
- **Component System**: Reusable book thumbnails, collection heroes
- **Data Binding**: CSV/JSON data automatically available in templates

### Performance Monitoring
- **GitHub Actions**: Build status and deployment logs
- **Core Web Vitals**: Lighthouse scores and performance metrics
- **Error Tracking**: Build failures and debugging information

## Security & Reliability

### Version Control
- **Git-based**: All changes tracked and versioned
- **Branch Protection**: Main branch protected, requires reviews
- **Rollback Capability**: Easy reversion to previous versions

### Backup & Recovery
- **Source Control**: All data in git repository
- **External APIs**: Multiple backup sources for book data
- **Automated Builds**: Consistent, reproducible deployments

### Access Control
- **GitHub Permissions**: Repository access controls
- **Deploy Keys**: Secure deployment credentials
- **API Rate Limiting**: Respectful external API usage

This architecture provides a scalable, maintainable, and performant system for managing a specialized photography book collection while automating routine content management tasks.