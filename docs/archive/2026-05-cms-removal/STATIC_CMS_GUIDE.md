# Hudson Street Library - Static CMS Guide

## 🚀 No-Database Content Management System

This is a **file-based content management system** that requires **no PostgreSQL database**. Perfect for one-person operations who want to generate static pages and commit directly to git.

## ✨ Key Features

- **📂 JSON File Storage**: All data stored in simple JSON files
- **🔨 Static Site Generation**: Uses Eleventy to build static pages
- **🌐 Git-Based Deployment**: Changes committed and pushed automatically
- **💻 Web Interface**: Full admin dashboard with workflow functionality
- **⚡ Zero Database Setup**: No PostgreSQL or complex setup required

## 🏗️ Architecture

```
Hudson Street Library Static CMS
├── 💾 Data Storage (JSON files)
│   └── src/_data/libraryCollections.json - Collection data
├── 🌐 Web Interface
│   ├── Admin Dashboard           - Library statistics & controls
│   ├── Book Workflow            - 4-step guided book addition
│   └── Build & Deploy           - One-click site generation
└── 🔨 Build System
    ├── Eleventy (11ty)          - Static site generator  
    ├── Git Integration          - Automatic commits
    └── Live Deployment          - Push to remote repo
```

## 🚀 Quick Start

### 1. Start the CMS Server

```bash
# From project root directory
./start-static-cms.sh
```

This will:
- Install dependencies if needed
- Initialize JSON data files  
- Start server on http://localhost:3001/admin
- Display helpful commands and shortcuts

### 2. Access Admin Interface

Open your browser to: **http://localhost:3001/admin**

### 3. Add Your First Book

1. Click **"Add Book"** in the dashboard
2. Follow the 4-step workflow:
   - **Step 1**: Book Details (title, author, etc.)
   - **Step 2**: Image Upload & Processing
   - **Step 3**: Collection Assignment
   - **Step 4**: Preview & Publish

### 4. Build & Deploy

- **Build Site**: Click "Build Site" to generate static pages
- **Deploy**: Click "Deploy" to build and push to git
- **View Live**: Changes appear on your live site immediately

## 🎯 Perfect For

✅ **One-person operations**  
✅ **Simple deployment needs**  
✅ **Git-based workflows**  
✅ **Static site hosting**  
✅ **No database maintenance**  

❌ **Not for complex multi-user systems**  
❌ **Not for high-traffic real-time apps**  

## 📊 Data Management

### Collections Data (`src/_data/libraryCollections.json`)
```json
{
  "collections": [
    {
      "id": "photography",
      "name": "Photography", 
      "description": "Photography books and portfolios",
      "bookCount": 15
    }
  ],
  "metadata": {
    "lastUpdated": "2025-06-16T12:15:50.123Z",
    "totalCollections": 5
  }
}
```

## 🔧 Command Line Interface

The Static CMS includes a powerful CLI for automation:

```bash
# Navigate to cms directory first
cd cms/

# Initialize CMS data files
node static-cms.js init

# Add a book via command line
node static-cms.js add '{"title":"New Book","status":"available"}'

# Build static pages  
node static-cms.js build

# Push to git repository
node static-cms.js push

# View library statistics
node static-cms.js stats
```

## 🌐 API Endpoints

The web interface provides REST API endpoints:

### Dashboard & Statistics
- `GET /admin/api/dashboard/stats` - Library overview statistics
- `GET /admin/api/books` - List books with pagination & search
- `GET /admin/api/collections` - List all collections

### Book Management  
- `POST /admin/api/books` - Add new book
- `GET /admin/api/books/:id` - Get book details
- `PUT /admin/api/books/:id` - Update book
- `DELETE /admin/api/books/:id` - Delete book

### Batch Operations
- `POST /admin/api/books/batch/manual` - Manual batch entry
- `POST /admin/api/books/batch/csv` - CSV import

### Build & Deploy
- `POST /admin/api/build` - Generate static pages
- `POST /admin/api/deploy` - Build and push to git

## 📦 Workflow Features

### 4-Step Book Addition
1. **Book Details**: Form with validation, ISBN lookup
2. **Image Upload**: Drag & drop, processing, optimization  
3. **Collection Assignment**: Smart suggestions, manual selection
4. **Preview & Publish**: Review, SEO preview, final publishing

### Batch Operations
- **CSV Import**: Upload spreadsheet with multiple books
- **ISBN Batch Lookup**: Paste ISBNs, auto-fetch details
- **Manual Entry**: Quick form for multiple books

### Build & Deploy
- **Static Generation**: Eleventy builds optimized pages
- **Git Integration**: Automatic commits with descriptive messages
- **Live Updates**: Changes appear immediately on site

## 🛠️ Development Workflow

For developers working on the CMS:

```bash
# Start development server
npm run dev

# Build static site  
npm run build

# Clean build directory
npm run clean

# Start static CMS
./start-static-cms.sh
```

## 📁 File Structure

```
├── cms/
│   ├── static-cms.js           # Core CMS logic
│   ├── static-server.js        # Web interface server
│   ├── package.json           # CMS dependencies
│   └── .env                   # Environment config
├── src/
│   ├── _data/
│   │   └── libraryCollections.json # Collections
│   ├── admin/
│   │   ├── index.html         # Admin dashboard
│   │   └── books/new.html     # Book workflow
│   └── assets/
│       ├── js/book-workflow.js # Frontend workflow logic
│       └── css/admin.css       # Admin styling
├── start-static-cms.sh         # Startup script
└── docs/
    └── STATIC_CMS_GUIDE.md     # This guide
```

## 🔒 Security & Backup

### Data Safety
- **Git History**: All changes tracked in repository
- **JSON Backup**: Simple file-based backup strategy
- **Local Files**: No external database dependencies

### Recommended Practices
- **Regular Commits**: Use the deploy button frequently
- **File Backups**: Copy JSON files periodically
- **Git Remotes**: Keep remote repository updated

## 🐛 Troubleshooting

### Common Issues

**Server Won't Start**
```bash
# Kill existing processes
pkill -f "node.*static-server"
# Restart
./start-static-cms.sh
```

**Build Errors**
```bash
# Check Eleventy configuration
npm run build
# Fix template issues in src/_data/
```

**Git Issues**
```bash
# Check git status
git status
# Manual commit if needed
git add . && git commit -m "Manual update"
```

### Error Messages

| Error | Solution |
|-------|----------|
| `EADDRINUSE port 3001` | Kill existing server with `pkill -f node` |
| `Eleventy template error` | Check JSON file syntax in `src/_data/` |
| `Git commit failed` | Check git configuration and repository status |
| `Permission denied` | Make scripts executable with `chmod +x` |

## 📞 Support

This static CMS is designed to be simple and self-contained. For issues:

1. **Check this guide** - Most common issues covered
2. **Review console output** - Error messages are descriptive  
3. **Check git status** - Ensure repository is clean
4. **Restart the server** - Many issues resolved by restart

---

## 🎉 Summary

The Hudson Street Library Static CMS provides:

✅ **No database complexity** - Just JSON files  
✅ **One-person friendly** - Perfect for solo operations  
✅ **Git-integrated** - Changes committed automatically  
✅ **Web interface** - Full featured admin dashboard  
✅ **Static output** - Fast, secure, deployable anywhere  

**Perfect for content creators who want powerful features without database overhead!**

---

## 🔄 Migration from PostgreSQL

**Previous System Removed**: All PostgreSQL database files, Docker configurations, and database-related dependencies have been completely removed from the project.

**What Changed**:
- ❌ Removed: PostgreSQL database, Docker setup, migration scripts
- ❌ Removed: Database dependencies (`pg`, `bcrypt`, `jsonwebtoken`)  
- ❌ Removed: Complex server setup and authentication
- ✅ Added: Simple JSON file storage (`src/_data/*.json`)
- ✅ Added: Static CMS with web interface (`static-server.js`)
- ✅ Added: Git-based deployment workflow
- ✅ Added: Eleventy static site generation

**Data Migration**: Your existing book data remains available in `src/_data/books.csv`. The static CMS reads from and writes to these files directly.

**No Data Loss**: All your book records, collections, and content are preserved in the transition to the static system.