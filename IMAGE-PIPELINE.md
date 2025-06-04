# Hudson Street Library - Complete Image Pipeline

The Image Pipeline is a comprehensive system that automates the complete workflow from image upload to optimized, categorized, and organized assets ready for web deployment.

## 🚀 Quick Start

```bash
# Initialize pipeline
node scripts/image-pipeline/cli.js status

# Upload images from a folder
node scripts/image-pipeline/cli.js upload --path ./new-images --recursive

# Process all uploaded images
node scripts/image-pipeline/cli.js process

# Find missing book covers
node scripts/image-pipeline/cli.js find --missing --download --limit 10

# Generate reports
node scripts/image-pipeline/cli.js report --metadata --path ./src/assets/images
```

## 📋 Pipeline Overview

The pipeline consists of 4 main stages that can be run individually or together:

```
1. UPLOAD/ADD → 2. API FETCH → 3. OPTIMIZATION → 4. CATEGORIZATION
     ↓              ↓              ↓                ↓
  📁 Folder     🔍 Find Image   ⚡ Optimize     📂 Organize
  📤 Upload     📚 Book APIs    🖼️ Resize      🏷️ Categorize
```

### Stage 1: Upload & Management 📤

**Purpose**: Handle incoming images from various sources
- Upload individual files or entire directories
- Scan folders recursively for images
- Generate unique filenames to prevent conflicts
- Create metadata sidecar files
- Organize incoming queue

**Use Cases**:
- Batch upload of new acquisitions
- Add single book covers
- Import from external sources
- Process scanned materials

### Stage 2: API Integration 🔍

**Purpose**: Find missing images using external APIs
- Search multiple book cover APIs (Open Library, Google Books, WorldCat)
- Download high-quality cover images
- Extract book metadata from APIs
- Match ISBNs to existing collection
- Rate limiting and caching

**Supported APIs**:
- **Open Library**: Free, good coverage
- **Google Books**: Rich metadata, high quality
- **WorldCat**: Academic focus
- **Custom APIs**: Extensible for additional sources

### Stage 3: Image Optimization ⚡

**Purpose**: Generate optimized web-ready images
- Multiple responsive sizes (300w, 600w, 900w, 1200w)
- Modern formats (WebP + JPEG fallbacks)
- Thumbnail generation (150w, 300w)
- Compression optimization
- Lazy loading markup generation

**Output**:
- Optimized images in `_site/assets/images/optimized/`
- Thumbnails in `_site/assets/images/thumbnails/`
- Responsive HTML markup
- Performance analytics

### Stage 4: Categorization & Organization 🏷️

**Purpose**: Automatically organize images by collection
- Keyword-based categorization
- Filename pattern recognition
- Metadata analysis
- Book information matching
- Directory organization

**Categories**: All 16 curated collections plus general storage
- art, black-photographers, books-on-books, collage
- comme-des-garcons, ephemera, fashion, matsuda-fashion
- music, music-photobooks, nyc, posters-and-paper
- queer, recently-added, small-books-big-images, woman-viewing-woman

## 🛠️ Installation & Setup

### Prerequisites

- Node.js 16+ and npm
- @11ty/eleventy-img (already installed)
- Sufficient disk space for image variants

### Setup

```bash
# Install dependencies
npm install axios csv-parse

# Create directory structure
node scripts/image-pipeline/cli.js status

# Verify setup
node scripts/image-pipeline/cli.js report
```

### Configuration

Edit `scripts/image-pipeline/pipeline-config.js` to customize:

- **Directory paths**: Where images are stored and processed
- **Collection keywords**: Terms for automatic categorization  
- **Optimization settings**: Sizes, formats, quality levels
- **API endpoints**: Book cover and metadata sources
- **Naming conventions**: File organization patterns

## 📖 Detailed Usage

### Upload Images

```bash
# Upload single image
node cli.js upload --path ./cover.jpg

# Upload entire directory
node cli.js upload --path ./new-acquisitions --recursive

# Check incoming queue
node cli.js status
```

### Process Pipeline

```bash
# Process all incoming images
node cli.js process

# Process specific directory
node cli.js process --path ./specific-folder

# Process with book information lookup
node cli.js process --book-info
```

### Find Missing Images

```bash
# Analyze collection for missing covers
node cli.js find --missing

# Download missing covers (limited)
node cli.js find --missing --download --limit 20

# Find specific ISBN
node cli.js find --isbn 9780123456789
```

### Manual Optimization

```bash
# Optimize specific directory
node cli.js optimize --path ./covers

# Custom optimization settings
node cli.js optimize --path ./images --sizes 400,800,1200 --formats webp,jpeg
```

### Categorization

```bash
# Categorize without moving files
node cli.js categorize --path ./images

# Categorize and organize into directories
node cli.js categorize --path ./images --organize
```

### Reports & Monitoring

```bash
# General pipeline status
node cli.js status

# Comprehensive report
node cli.js report --metadata --path ./src/assets/images

# Optimization statistics
node cli.js report
```

### Maintenance

```bash
# Clean old optimized images (7+ days)
node cli.js clean --optimized

# Clean with custom timeframe
node cli.js clean --optimized --days 30

# Clear processed files
node cli.js clean --processed

# Clear API cache
node cli.js clean --cache
```

## 🔧 Advanced Configuration

### Custom Collection Keywords

Add keywords to `pipeline-config.js` for better categorization:

```javascript
collections: {
  'photography-theory': ['theory', 'criticism', 'academic', 'analysis'],
  'street-photography': ['street', 'documentary', 'urban', 'candid'],
  // ... more collections
}
```

### API Configuration

Add custom book APIs:

```javascript
apis: {
  customAPI: 'https://api.example.com/covers/{isbn}',
  // Custom processing in finder.js
}
```

### Optimization Presets

Define collection-specific optimization:

```javascript
// In optimizer.js
const presets = {
  'book-covers': { sizes: [200, 400, 600], quality: { webp: 85 } },
  'exhibition-photos': { sizes: [800, 1200, 1600], quality: { webp: 90 } }
};
```

## 🤖 Automation Examples

### Scheduled Processing

```bash
# Crontab entry for daily processing
0 2 * * * cd /path/to/library && node scripts/image-pipeline/cli.js process
```

### Integration with Eleventy Build

```javascript
// In .eleventy.js
eleventyConfig.on('beforeBuild', async () => {
  const { spawn } = require('child_process');
  await new Promise(resolve => {
    const process = spawn('node', ['scripts/image-pipeline/cli.js', 'process']);
    process.on('close', resolve);
  });
});
```

### Batch Operations

```bash
#!/bin/bash
# Process new acquisitions workflow
echo "Starting acquisition processing..."

# Upload new images
node cli.js upload --path ./acquisitions/new --recursive

# Find any missing covers
node cli.js find --missing --download --limit 50

# Process everything through pipeline
node cli.js process

# Generate report
node cli.js report --metadata --path ./src/assets/images

echo "Processing complete!"
```

## 📊 Pipeline Analytics

The pipeline tracks comprehensive statistics:

### Processing Metrics
- Images processed per stage
- Success/failure rates
- Processing time per image
- Error categorization

### Optimization Analytics
- File size reductions
- Format distribution
- Quality scores
- Performance gains

### Collection Intelligence
- Categorization accuracy
- Keyword effectiveness
- Missing image identification
- Metadata completeness

## 🚨 Troubleshooting

### Common Issues

**Images not optimizing**:
- Check file permissions
- Verify supported formats
- Ensure sufficient disk space
- Check Eleventy image plugin installation

**API rate limiting**:
- Reduce batch size in config
- Increase rate limit intervals
- Use API keys if available
- Implement custom retry logic

**Categorization failures**:
- Review collection keywords
- Check filename patterns
- Verify metadata extraction
- Use manual categorization flags

**Performance issues**:
- Reduce batch sizes
- Enable parallel processing limits
- Clean old optimized files
- Monitor disk space

### Debug Mode

Enable verbose logging:

```bash
DEBUG=true node cli.js process --path ./test-images
```

### Validation

Test pipeline components individually:

```bash
# Test metadata extraction
node -e "
const MetadataProcessor = require('./scripts/image-pipeline/modules/metadata');
const processor = new MetadataProcessor(require('./scripts/image-pipeline/pipeline-config'));
processor.extractFromImage('./test-image.jpg').then(console.log);
"
```

## 🔄 Integration Points

### With Existing Systems

**CMS Integration**: Pipeline can be triggered from content management workflows
**Search Integration**: Optimized images automatically update search indices  
**Collection Pages**: New categorized images appear in collection listings
**Build Process**: Integrates with Eleventy's build pipeline

### Data Flow

```
📤 Upload → 🔍 Find → ⚡ Optimize → 🏷️ Categorize → 📂 Organize
    ↓         ↓          ↓            ↓             ↓
 Incoming  Book APIs  Web Images   Categories   Collection
  Queue   Metadata   Thumbnails    Assigned      Folders
```

## 🎯 Future Enhancements

- **AI-powered categorization**: Using image recognition APIs
- **Duplicate detection**: Identify and handle duplicate images
- **Color analysis**: Extract dominant colors for theming
- **OCR integration**: Extract text from book covers
- **Blockchain provenance**: Track image ownership and rights
- **CDN integration**: Automatic upload to CDN services
- **Quality scoring**: Automatic image quality assessment

---

*The Image Pipeline transforms Hudson Street Library from a manual image management system into an automated, intelligent, and scalable digital asset management platform.*