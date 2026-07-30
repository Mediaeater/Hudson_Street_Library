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

1. **Parses your text** - Extracts author, title, publisher, year, pages, binding, URLs
2. **Comprehensive metadata search** - Searches 7 high-quality sources in priority order:
   - Publisher's website (primary source, most accurate)
   - Library of Congress
   - Internet Archive
   - Google Books API
   - Open Library
   - WorldCat
   - LibraryThing
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

Roe Ethridge: In the Beginning
Loose Joints Publishing, 2026 | Three volume set
https://loosejoints.biz/products/in-the-beginning
```

**💡 Pro Tip:** Include the publisher's product URL in your text. The script will scrape the publisher's website first for the most accurate data!

### After Adding

The script tells you:
```
📸 Cover Image Instructions:
Place cover image at: src/assets/images/books/Ayoung_Kim_Synthetic_Storyteller_9783000841156.jpg
```

**Add cover manually:**
```bash
# Place your image file with exact name shown
cp ~/Downloads/cover.jpg src/assets/images/books/Ayoung_Kim_Synthetic_Storyteller_9783000841156.jpg
```

### Collection membership

Books auto-group into collection pages based on CSV fields (`collection_grouping`, `author_last`, `title`, `tags`). The match rules live in `src/_data/collections/<slug>.json`. To make a new book appear on a specific collection page, set its fields to match that config's `matchBy` rule. No manual edits to `src/collections/` are needed — see `docs/COLLECTIONS-GUIDE.md`.

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

# 2. CRITICAL: Validate CSV structure immediately
node scripts/validate-csv-structure.js

# 3. Add cover images manually
cp cover.jpg src/assets/images/books/[filename shown]

# 4. Run full test suite
npm test

# 5. Build site
npm run build

# 6. Commit
git add src/_data/books.csv src/assets/images/books/
git commit -m "Add: Ayoung Kim - Synthetic Storyteller"
git push
```

**⚠️ IMPORTANT:** Always run `node scripts/validate-csv-structure.js` immediately after modifying books.csv (whether using the script or manually). This catches column misalignment errors before they cause build failures.

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
- Cover acquisition is manual only

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

---

## 🛡️ CSV Error Prevention

**Critical: Always validate after CSV changes to prevent column misalignment errors.**

### The Problem

Manual CSV editing can introduce column misalignment (wrong number of commas), causing:
- Books not appearing in "Recently Added"
- Build failures
- Data in wrong fields (e.g., accession_no containing location value)

### Prevention Strategies

#### 1. Use the add-book-from-text.js script (Preferred)
The script ensures correct column count and structure.

#### 2. Validate immediately after any manual CSV edits
```bash
node scripts/validate-csv-structure.js
```
This catches column count errors before committing.

#### 3. Never manually add CSV rows via bash/heredoc
Manual comma counting is error-prone. Always use the script or CSV validation.

#### 4. Pre-commit hook already validates
Your test suite includes CSV validation, but only if you commit. Run validation earlier to catch issues sooner.

### Quick Validation Check

After adding books:
```bash
# Quick validation (< 1 second)
node scripts/validate-csv-structure.js

# If issues found, check the specific line numbers reported
# Fix the comma count, then re-validate
```

The validator checks:
- All rows have exactly 36 columns
- No unescaped quotes
- No embedded newlines
- Proper CSV parsing

---

## 📸 Cover Image Naming Convention

### Standard Format

```
{author_last}_{author_first}_{title}_{isbn}.jpg
```

### Rules

1. **Author name**: First and last name, underscore-separated
   - Remove all special characters (except underscores)
   - Convert spaces to underscores
   - Truncate at 50 characters

2. **Title**: Book title, underscore-separated
   - Remove special characters
   - Convert spaces to underscores
   - Truncate at 50 characters

3. **ISBN**: Optional but recommended
   - Strip all non-numeric characters (except X for ISBN-10)
   - Format: `_{isbn}` appended to filename

4. **Extension**: Always `.jpg` (lowercase)
   - Never use `.jpeg`, `.JPG`, `.JPEG`
   - If image is .png, convert to .jpg first

### Examples

**With ISBN:**
```
kim_ayoung_synthetic_storyteller_9783000841156.jpg
tillmans_wolfgang_truth_study_center_9783865601234.jpg
```

**Without ISBN:**
```
fischer_marc_who_shares_the_restroom_code_with_ice_agents.jpg
morgan_paul_static_magic_current_editions_no_10.jpg
```

**Complex names:**
```
gonzalez-torres_felix_forbidden_colors_9781739364946.jpg
→ Special character (hyphen) removed automatically
```

### Script Generation

The `add-book-from-text.js` script automatically generates correct filenames:

```javascript
// From: scripts/add-book-from-text.js line 231-246
function generateCoverFilename(author_last, author_first, title, isbn) {
  const cleanName = (str) => str
    .replace(/[^a-zA-Z0-9\s]/g, '')  // Remove special chars
    .replace(/\s+/g, '_')            // Spaces to underscores
    .substring(0, 50);                // Truncate at 50 chars

  const authorPart = author_last ?
    cleanName(`${author_first} ${author_last}`.trim()) :
    cleanName(author_first || 'Unknown');

  const titlePart = cleanName(title);
  const isbnPart = isbn ? `_${isbn.replace(/[^0-9X]/g, '')}` : '';

  return `${authorPart}_${titlePart}${isbnPart}.jpg`;
}
```

### Manual Naming Checklist

If creating cover filenames manually:
- ✅ All lowercase letters
- ✅ Underscores for spaces
- ✅ No special characters (hyphens, apostrophes, quotes)
- ✅ Extension is `.jpg` (not `.jpeg`)
- ✅ ISBN stripped of hyphens
- ✅ Total filename under ~150 characters

### Why This Convention?

1. **Consistent**: All covers follow same pattern
2. **Searchable**: Easy to find by author or title
3. **URL-safe**: No encoding needed for web paths
4. **Sortable**: Alphabetical sorting works correctly
5. **Automated**: Script handles complexity

---

## 🔍 Multi-Source Metadata Search

### How It Works

The script searches **7 high-quality data sources** in priority order, stopping when sufficient data is found. Each source provides different strengths:

| Priority | Source | Best For | Data Provided |
|----------|--------|----------|---------------|
| 1 | **Publisher Website** | Most accurate, primary source | Everything (varies by publisher) |
| 2 | **Library of Congress** | Authoritative, comprehensive | Full bibliographic data, subjects |
| 3 | **Internet Archive** | Older/rare books, public domain | Full text, scans, metadata |
| 4 | **Google Books** | General books, broad coverage | ISBN, description, covers |
| 5 | **Open Library** | Community-driven, extensive | ISBN, covers, editions |
| 6 | **WorldCat** | Library holdings worldwide | Bibliographic data |
| 7 | **LibraryThing** | Community metadata | Cover images, tags |

### Priority Strategy

**Why publisher first?**
- Primary source = most accurate
- Latest editions and printings
- Correct specifications (dimensions, binding)
- Best quality cover images
- Price and availability

**Why Library of Congress second?**
- Authoritative cataloging
- Subject classifications
- LCCN for identification
- Historical accuracy

**Why Internet Archive third?**
- Excellent for rare/out-of-print
- Full-text access when available
- Historical editions
- Public domain works

### Providing Publisher URLs

Include the publisher's product page URL in your book text for best results:

```
Roe Ethridge: In the Beginning
Loose Joints Publishing, 2026 | Hardcover
https://loosejoints.biz/products/in-the-beginning
```

**Supported Publishers** (optimized scraping patterns):
- Walther König (walther-koenig.de)
- Steidl (steidl.de)
- Aperture (aperture.org)
- MoMA (moma.org)
- Loose Joints (loosejoints.biz)
- Photobooks.io (photobooks.io)
- Generic pattern for others

### What Gets Enriched

When multiple sources are found, the script intelligently merges data:

**From publisher websites:**
- Exact title and author
- Precise specifications (size, binding, pages)
- Current price
- Best description
- High-res cover images

**From Library of Congress:**
- LCCN (Library of Congress Control Number)
- Subject classifications (detailed)
- Cataloging standards
- Historical publication data

**From Internet Archive:**
- Historical editions
- Full text when available
- Digitized images
- Public domain status

**From book APIs:**
- ISBNs (13 and 10)
- Categories and genres
- Publisher info
- Publication dates
- Descriptions

### Confidence Levels

The script assigns a confidence level based on source agreement:

- **High** (4+ sources): Data found in 4 or more sources
- **Medium** (2-3 sources): Data found in 2-3 sources
- **Low** (1 source): Data found in only 1 source
- **None** (0 sources): No data found, manual entry needed

### Example Output

```
🔍 COMPREHENSIVE METADATA SEARCH
═══════════════════════════════════════════════════
Title: In the Beginning
Author: Roe Ethridge
Publisher: Loose Joints Publishing
Publisher URL: https://loosejoints.biz/products/in-the-beginning
═══════════════════════════════════════════════════

📚 [1] Searching: Publisher Website
  🌐 Fetching: https://loosejoints.biz/products/in-the-beginning
  ✅ Found data in Publisher Website
  Title: In the Beginning
  Author: Roe Ethridge
  Publisher: Loose Joints Publishing
  Year: 2026
  ISBN: 978-1-912719-71-6
  Description: Three-volume facsimile set reuniting Ethridge's formative...

📚 [2] Searching: Library of Congress
  ✅ Found data in Library of Congress
  LCCN: 2026000123
  Subjects: Photography; American photographers; Documentary photography

📚 [3] Searching: Google Books API
  ✅ Found data in Google Books
  ISBN: 9781912719716
  Pages: 140

📊 AGGREGATING RESULTS
═══════════════════════════════════════════════════
Found data in 3 source(s):
  ✓ Publisher Website
  ✓ Library of Congress
  ✓ Google Books

Confidence: high
```

### Advanced Usage

**Control which sources to search:**
```javascript
const aggregator = new BookMetadataAggregator({
  sources: {
    publishers: { enabled: true, priority: 1 },
    googleBooks: { enabled: true, priority: 2 },
    // Disable others
    internetArchive: { enabled: false }
  }
});
```

**Disable publisher scraping:**
```javascript
const aggregator = new BookMetadataAggregator({
  enablePublisherScraping: false
});
```

This comprehensive approach ensures you get the most complete, accurate book data possible!
