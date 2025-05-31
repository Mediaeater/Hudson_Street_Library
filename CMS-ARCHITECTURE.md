# Hudson Street Library - CMS Architecture

## Current Architecture

The Hudson Street Library uses a **headless CMS architecture** with two main components:

### 1. Frontend (Static HTML + JavaScript)
- **Location**: Root directory (`/`)
- **Technology**: Static HTML with vanilla JavaScript
- **Hosting**: GitHub Pages
- **Key Files**:
  - `index.html`, `collection-explore.html`, etc. - Static HTML pages
  - `js/api.js` - API connection to Directus
  - `js/cms-integration.js` - Integrates CMS data into pages
  - `js/render-utils.js` - Utility functions for rendering

### 2. Backend (Directus CMS)
- **Location**: `/cms` directory
- **Technology**: Directus (headless CMS) with PostgreSQL
- **Hosting**: Docker containers (local development)
- **Access**: http://localhost:8055/admin
- **Key Features**:
  - Collections: Books, Collections, New Acquisitions
  - Import scripts for Google Sheets data
  - RESTful API for frontend consumption

## Other Directories

### `/frontend` Directory (Not Currently Used)
This contains a Next.js application that was started but is not currently deployed. It could be used as a future upgrade path if you want:
- Server-side rendering (SSR)
- Better SEO
- Dynamic routing
- Modern React development

### `/hudson-library-cms` Directory
This appears to be an incomplete/duplicate CMS setup and can be removed.

## How It Works

1. **Content Management**: 
   - Editors log into Directus at http://localhost:8055/admin
   - They create/edit books, collections, and acquisitions

2. **Data Flow**:
   - Directus exposes data via REST API
   - Static HTML pages load JavaScript files
   - JavaScript fetches data from Directus API
   - Data is rendered into the HTML dynamically

3. **Deployment**:
   - Frontend: Automatically deployed via GitHub Pages
   - Backend: Needs to be deployed to a server (currently local only)

## Production Considerations

For production, you'll need to:

1. **Deploy Directus** to a cloud provider (e.g., DigitalOcean, AWS, Heroku)
2. **Update API URLs** in `js/api.js` to point to production Directus
3. **Configure CORS** in Directus to allow requests from hudsonstreetlibrary.com
4. **Set up SSL** for the Directus instance

## Recommended Next Steps

1. **Keep current architecture** - It's working and simple
2. **Deploy Directus to production** - So content can be managed online
3. **Remove unused directories** - `/hudson-library-cms` can be deleted
4. **Document the API endpoints** - For future maintenance

## Future Considerations

If you need more dynamic features in the future, consider:
- Migrating to the Next.js frontend in `/frontend`
- Or using a static site generator like Astro or 11ty
- Both would provide better build-time optimization while keeping the Directus backend