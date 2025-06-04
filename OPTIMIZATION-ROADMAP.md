# Hudson Street Library - Optimization Roadmap

Based on research of digital library best practices, photography collections, and static site generators, this document outlines structural improvements to enhance the Hudson Street Library repository.

## Current Strengths ✅
- **Eleventy over Jekyll**: Excellent choice for this use case
- **GitHub Actions CI/CD**: Modern deployment pipeline  
- **Collection-based organization**: Matches museum best practices
- **Metadata in CSV**: Simple, editable format
- **Book directory structure**: Well-organized by collections

## Recommended Structural Changes

### 1. Enhanced Metadata Management
```
src/
├── _data/
│   ├── metadata/
│   │   ├── books.csv (current)
│   │   ├── dublin-core.json (standardized fields)
│   │   └── collections.yaml (collection definitions)
│   └── config/
│       ├── search-index.json
│       └── taxonomy.yaml (subjects, tags, etc.)
```

### 2. Asset Optimization Structure
```
src/
├── assets/
│   ├── images/
│   │   ├── books/ (high-res originals)
│   │   ├── covers/ (optimized covers)
│   │   ├── thumbnails/ (auto-generated)
│   │   └── collections/ (collection hero images)
│   └── data/ (JSON exports for search)
```

### 3. Templates & Components
```
src/
├── _includes/
│   ├── components/
│   │   ├── book-card.njk
│   │   ├── search-widget.njk
│   │   └── collection-grid.njk
│   ├── layouts/
│   │   ├── base.njk
│   │   ├── book.njk
│   │   └── collection.njk
│   └── partials/
│       ├── head.njk
│       ├── nav.njk
│       └── footer.njk
```

### 4. Enhanced Content Organization
```
src/
├── content/
│   ├── books/ (current structure - keep!)
│   ├── collections/ (collection pages)
│   ├── exhibitions/ (future virtual exhibitions)
│   └── about/
│       ├── acquisition-policy.md
│       ├── research-guidelines.md
│       └── technical-specs.md
```

### 6. Advanced Features to Consider

**Image Optimization (High Priority)**
- Implement @11ty/eleventy-img for responsive images
- Auto-generate thumbnails and optimized versions
- WebP/AVIF format support for better performance

**Enhanced Search (Medium Priority)**
- Full-text search using Lunr.js or similar
- Faceted search by subject, publisher, year
- Collection-specific search filters

**IIIF Integration (Future)**
- International Image Interoperability Framework
- Allows high-quality image viewing and sharing
- Standard used by major museums/libraries

**Metadata Standards (Medium Priority)**
- Dublin Core compliance
- Schema.org structured data for SEO
- OAI-PMH endpoint for library discovery

### 7. Documentation Structure
```
docs/
├── CONTRIBUTING.md
├── METADATA-GUIDE.md
├── COLLECTION-POLICIES.md
├── TECHNICAL-SETUP.md
└── API-DOCUMENTATION.md
```

### 8. Testing & Quality Assurance
```
tests/
├── metadata-validation/
├── link-checking/
├── image-validation/
└── accessibility-testing/
```

## Implementation Priority

1. **Image Optimization** - Implement responsive images and thumbnails
2. **Enhanced Search** - Better search functionality with filters
3. **Metadata Enhancement** - Add Dublin Core fields and structured data
4. **Component System** - Break templates into reusable components

## Research Sources

- **tannerdolby/eleventy-photo-gallery** - Excellent image handling patterns
- **Kitodo.Presentation** - Museum-grade digital library framework
- **Wax (minicomp)** - Lightweight digital exhibitions framework
- **Getty Research Institute Photo Archive** - Professional archive structure
- **Human Remains Digital Library** - Academic repository organization

## Current Status

- ✅ Repository restructured with src/ directory
- ✅ GitHub Actions deployment pipeline
- ✅ Collection-based book organization
- ✅ Comprehensive documentation system
- 🔄 **Next**: Image optimization implementation

---

*This roadmap ensures the Hudson Street Library maintains its simplicity while evolving into a professional-grade digital library system.*