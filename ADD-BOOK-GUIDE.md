# Quick Add Book Guide

## 🚀 Optimal Method: Text to CSV

The fastest way to add new books to the collection.

### One-Command Workflow

```bash
node scripts/add-book-from-text.js --interactive
```

Then paste your book description:
```
Ayoung Kim: Synthetic Storyteller
The Floorplan, 2025 | Softcover | 400 pages
```

Press Enter twice, review details, type `y` to add.

### What It Does

1. **Parses your text** - Extracts author, title, publisher, year, pages, binding
2. **Looks up ISBN** - Searches Google Books API automatically
3. **Assigns next ID** - Gets sequential ID (e.g., 1577)
4. **Adds accession date** - Today's date as YYYY-MM-DD
5. **Generates cover filename** - Following strict naming convention
6. **Updates CSV** - Adds to `books.csv` with backup

### Book Text Format

**Format 1: Author and Title on Same Line**
```
Author Name: Book Title
Publisher, Year | Binding | Page count | Other details
```

**Format 2: Title Only**
```
Book Title
Publisher, Year | Binding | Page count
```

**Examples:**
```
Ayoung Kim: Synthetic Storyteller
The Floorplan, 2025 | Softcover | 400 pages

Delivery Dancer's Arc: Inverse
The National Asian Culture Center | 228 pages | paperback | 150 color images

Wolfgang Tillmans: Truth Study Center
Walther König, 2005 | Hardcover | 256 pages
```

### After Adding

The script tells you:
```
📸 Cover Image Instructions:
Place cover image at: src/assets/images/books/Ayoung_Kim_Synthetic_Storyteller_9783000841156.jpg

Or run cover acquisition:
  node acquire-covers.js --limit 1
```

**Two options for covers:**

**Option A: Manual** (if you have the image)
```bash
# Place your image file with exact name shown
cp ~/Downloads/cover.jpg src/assets/images/books/Ayoung_Kim_Synthetic_Storyteller_9783000841156.jpg
```

**Option B: Auto-fetch** (if ISBN found)
```bash
# Script will download from Google Books/Open Library
node acquire-covers.js --limit 1
```

### Batch Mode

Add multiple books from a text file:

**Create `books-to-add.txt`:**
```
Ayoung Kim: Synthetic Storyteller
The Floorplan, 2025 | Softcover | 400 pages

Delivery Dancer's Arc: Inverse
The National Asian Culture Center | 228 pages | paperback | 150 color images

Wolfgang Tillmans: Truth Study Center
Walther König, 2005 | Hardcover | 256 pages
```

**Run:**
```bash
node scripts/add-book-from-text.js --file books-to-add.txt
```

### Complete Workflow

```bash
# 1. Add book(s)
node scripts/add-book-from-text.js --interactive

# 2. Add cover images (manual or auto)
# Manual: cp cover.jpg src/assets/images/books/[filename shown]
# Auto:   node acquire-covers.js --limit 5

# 3. Validate
npm test

# 4. Build site
npm run build

# 5. Commit
git add src/_data/books.csv src/assets/images/books/
git commit -m "Add: Ayoung Kim - Synthetic Storyteller"
git push
```

### What Gets Filled In

**Automatically:**
- `id` - Next sequential (e.g., 1577)
- `author_first`, `author_last`, `author_full_name` - Parsed from text
- `title` - Extracted from text
- `publisher` - Parsed from metadata line
- `publication_year` - Extracted 4-digit year
- `page_count` - From "X pages"
- `binding` - Hardcover/Softcover/Paperback detected
- `isbn_asin` - Looked up via Google Books API
- `accession_no` - Today's date (YYYY-MM-DD)
- `location` - "Hudson Street Library, NYC"
- `image_url` - Generated filename path

**Optional (you can add later):**
- Physical dimensions (height_cm, width_cm, depth_cm)
- Editor, contributors, designer
- Detailed description
- Tags, classification
- Artist URL, publisher URL

### Tips

✅ **Do:**
- Include year in text (helps ISBN lookup)
- Specify binding type (Hardcover/Softcover/Paperback)
- Add page count if known
- Use consistent format for multiple books

❌ **Don't:**
- Skip the publisher (needed for ISBN lookup)
- Use inconsistent separators (stick to `|` or `,`)
- Add books with duplicate titles without checking first

### Troubleshooting

**ISBN not found?**
- Add manually later by editing CSV
- Or run `node acquire-covers.js` after adding ISBN

**Wrong author parsing?**
- Complex names may split incorrectly
- Edit CSV directly: `src/_data/books.csv`
- Look for the ID shown in output

**Cover filename too long?**
- Script truncates at 50 chars per section
- You can rename cover and update `image_url` in CSV

### All Available Options

```bash
# Interactive mode (recommended)
node scripts/add-book-from-text.js --interactive

# Single book from command line
node scripts/add-book-from-text.js --text "Author: Title\nPublisher, Year"

# Multiple books from file
node scripts/add-book-from-text.js --file books-to-add.txt

# Help
node scripts/add-book-from-text.js --help
```

### Field Reference

When ISBN lookup succeeds, these get auto-filled:
- Publisher (if not already parsed)
- Publication year (if not already found)
- Page count (if not specified)
- Description (first 500 chars from API)

Your manually entered data always takes priority over API data.

---

## Why This Method?

**vs Manual CSV editing:**
- ✅ No need to know CSV format
- ✅ Automatic ID assignment
- ✅ Auto accession dates
- ✅ ISBN lookup included
- ✅ Proper filename generation

**vs CMS upload:**
- ✅ Version controlled (git)
- ✅ Consistent data format
- ✅ Automated validation
- ✅ Direct to production-ready CSV

**vs ISBN-only scripts:**
- ✅ Works for books without ISBNs
- ✅ Handles rare/self-published books
- ✅ Preserves your publisher info
- ✅ More accurate for art books

This is the **one optimal method** for your workflow.
