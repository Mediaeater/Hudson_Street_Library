# CLAUDE CODE - HUDSON STREET LIBRARY PROJECT GUIDE

## 🚨 CRITICAL: READ THIS FIRST BEFORE ANY WORK

### PROJECT OVERVIEW
This is the Hudson Street Library website - a photography book collection with 1,306 books. The site is built with Eleventy and deployed via GitHub Pages.

### ⚠️ ESTABLISHED SYSTEMS - DO NOT CHANGE

#### 1. BOOK COVER ACQUISITION SYSTEM
**USE ONLY**: `scripts/covers/acquire-covers.js`
```bash
# This is the ONLY way to acquire covers
node scripts/covers/acquire-covers.js --limit 50
```

**WHY**: 
- This script has been tested and works perfectly
- It saves covers with the exact naming pattern the website expects
- Format: `Author_Name_Book_Title_ISBN.jpg` in `src/assets/images/books/`
- The website JavaScript looks for this EXACT pattern

**DO NOT**:
- Create new acquisition scripts
- Use the image pipeline for book covers
- Try to "improve" the system
- Change file naming patterns

#### 2. DEPLOYMENT SYSTEM
- Push to main branch → GitHub Actions automatically builds and deploys
- NO manual builds needed
- Site updates at: https://hudsonstreetlibrary.com

#### 3. DATA STRUCTURE
- Book data: `src/_data/books.csv`
- Cover images: `src/assets/images/books/`
- Site templates: `src/_includes/`
- Static pages: `src/pages/`

#### 4. MAGAZINE DIRECTORY SYSTEM
Magazines use two paired directories that must stay in sync:

| Purpose | Directory |
|---------|-----------|
| Cover images (.jpg, .gif) | `src/assets/images/magazines/[magazine-name]/` |
| Issue detail pages (.html) | `src/books/magazines/[magazine-name]/` |

**When adding a new magazine:**
1. Create matching subdirectories in BOTH locations
2. Add cover images to `src/assets/images/magazines/[magazine-name]/`
3. Add issue HTML pages to `src/books/magazines/[magazine-name]/`
4. Update collection page in `src/collections/`

**Current magazines:** afm, apartamento, le-petit-voyeur, purple-magazine, purple-mag-book-inserts, record-culture, slanted, toilet-paper, useful-photography

**Image path in HTML:** `/assets/images/magazines/[magazine-name]/[filename]`

See README.md files in each directory for details.

### 📁 KEY FILES TO KNOW

1. **README.md** - Project overview and current status
2. **scripts/covers/acquire-covers.js** - The ONLY cover acquisition script to use
3. **src/_data/books.csv** - Book database (1,306 entries)
4. **src/_includes/layouts/book.njk** - How individual book pages work

### 🛑 COMMON MISTAKES TO AVOID

1. **Creating new scripts** - Don't. Use existing ones.
2. **Using image pipeline** - It's NOT for book covers
3. **Changing file naming** - The website expects specific patterns
4. **Manual optimization** - Not needed, causes problems
5. **Assuming improvements** - The current system works. Don't fix what isn't broken.

### ✅ CORRECT WORKFLOW

1. **To add book covers**:
   ```bash
   node scripts/covers/acquire-covers.js --limit 50
   git add -A && git commit -m "Add book covers" && git push
   ```

2. **To check progress**:
   ```bash
   ls -1 src/assets/images/books/*.jpg | wc -l
   ```

3. **To build locally** (rarely needed):
   ```bash
   npm run build
   npm start  # For dev server
   ```

### 📊 CURRENT STATUS
- Total books: 1,306
- Books with covers: ~900+
- Coverage: ~69%
- Target: 80% (1,045 covers)

### 🔧 IF SOMETHING BREAKS

1. **Covers not showing?**
   - Check file is in `src/assets/images/books/`
   - Check naming: `Author_Title_ISBN.jpg`
   - Don't create new scripts to fix it

2. **Site not updating?**
   - Check GitHub Actions tab
   - Wait 2-5 minutes for deployment
   - Clear browser cache

### 📝 DOCUMENTATION
- **README.md** - General project info
- **docs/CURRENT-STATUS.md** - What worked yesterday
- **docs/** - Detailed documentation
- **This file** - What Claude Code needs to know

### 🎯 GOLDEN RULES

1. **If it works, don't change it**
2. **Use established scripts only**
3. **Follow existing patterns**
4. **Check what was done yesterday**
5. **Ask before creating new approaches**

### ⏰ LAST SUCCESSFUL APPROACH
See README.md Daily Log for recent progress:
- Use scripts/covers/acquire-covers.js for cover acquisition
- Zero cost using free APIs (Open Library, Google Books)
- Strict matching prevents false positives

---
**Remember**: This project has working systems. Use them. Don't reinvent them.