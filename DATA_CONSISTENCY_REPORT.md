# Books.CSV Data Consistency Report

**Analysis Date:** November 29, 2025
**Data File:** `/Users/imac/Projects/Hudson_Street_Library/src/_data/books.csv`
**Image Directory:** `/Users/imac/Projects/Hudson_Street_Library/src/assets/images/books/`

---

## Executive Summary

A comprehensive audit of the books.csv database revealed significant data quality issues across multiple categories. The dataset contains **1,565 book records** but has numerous consistency problems that require attention.

| Issue Category | Count | Severity |
|---|---|---|
| Missing image URLs | 1,185 | HIGH |
| Missing titles | 29 | CRITICAL |
| Missing image files (referenced but not found) | 158 | HIGH |
| Orphaned images (exist but not referenced) | 179 | MEDIUM |
| Duplicate books (same author + title) | 5 | MEDIUM |
| Duplicate IDs | 1 | CRITICAL |
| **TOTAL ISSUES** | **~1,600** | |

---

## 1. MISSING REQUIRED FIELDS

### 1.1 Missing Titles (CRITICAL) - 29 Issues

The following 29 book records are missing the required `title` field:

| Line | ID | Author |
|---|---|---|
| 156 | 155 | Bill Brant |
| 177 | 176 | Charles Burchfield |
| 178 | 177 | Rudy Burckhardt |
| 232 | 231 | Chuck Close |
| 255 | 254 | Gregory Crewdson |
| 264 | 263 | John Currin |
| 285 | 284 | Noah Davis |
| 287 | 286 | Jules de Ballingcourt |
| 330 | 329 | James Ensor |
| 377 | 376 | Genieve Figgis |
| 399 | 398 | Robert Frank |
| 431 | 430 | London Pictures |
| 705 | 704 | Karel Martens |
| 778 | 777 | Mark Morrisroe |
| 825 | 824 | Tony Oursler |
| 828 | 827 | Laura Owens |
| 839 | 838 | Marlo Pascual |
| 872 | 871 | Richard Phillips |
| 879 | 878 | Pierre et Gilles |
| 967 | 968 | Robert Robert Adams |
| 1015 | 1016 | Norman Saunders |
| 1071 | 1072 | Gary Simmons |
| 1119 | 1120 | Swoon |
| 1178 | 1179 | Ryan Trecartin |
| 1238 | 1239 | Carrie Mae Weens |
| 1240 | 1241 | Ai Weiwei |
| 1257 | 1260 | Jordan Wolfson |
| 1258 | 1261 | Mathew Wong |
| 1291 | 1297 | Lisa Yuskavage |

**Recommendation:** These records must have titles added before they can be properly displayed in the library system.

---

### 1.2 Missing Image URLs (HIGH PRIORITY) - 1,185 Issues

**1,185 book records (75.7% of the database) are missing the `image_url` field.**

This is a systemic issue affecting a massive portion of the database. Books without image URLs will not display cover images in the web interface.

**Recommendation:** This is a major data gap. Consider:
1. Batch-adding placeholder image URLs for records without images
2. Prioritizing image acquisition for the most valuable books
3. Implementing a workflow to systematically add images to records

---

## 2. DUPLICATE IDs

### Finding: 1 Duplicate ID

**ID 1440 appears on two lines:**
- Line 1433
- Line 1434

**Impact:** This creates ambiguity in the database. One of these records should have a unique ID assigned.

**Recommendation:** Audit these two records and assign a new unique ID to one of them, ensuring referential integrity.

---

## 3. DUPLICATE BOOKS (Same Author + Title)

### Finding: 5 Sets of Duplicate Books

Duplicate books indicate either:
- Data entry errors with multiple imports
- Intentional duplicates for different versions/conditions
- Need for consolidation

#### 3.1 Bryan Ray Turcotte - "Fucked Up + Photocopied"
- Line 1400, ID 1407
- Line 1401, ID 1408

#### 3.2 Mitsuhiro Matsuda - "Nicole times, vol."
- Line 1372, ID 1379
- Line 1375, ID 1382
- Line 1376, ID 1383
- Line 1377, ID 1384
- Line 1379, ID 1386
- Line 1381, ID 1388
- *Note: This author/title combination appears 7 times - likely a data quality issue*

#### 3.3 Nobuyoshi Araki - "Araki Teller, Teller Araki"
- Line 48, ID 47
- Line 54, ID 53

#### 3.4 Richard Prince - "Family Tweets"
- Line 920, ID 921
- Line 1517, ID 1523

#### 3.5 Thomas Andrew Denenberg and Glenn O'Brien - "Backstage Pass: Rock & Roll Photography"
- Line 1388, ID 1395
- Line 1389, ID 1396

**Recommendation:** Review each duplicate set to determine if they represent:
- Different editions/printings (keep both, clarify in description)
- Duplicate data entry (consolidate into one record)
- Different physical conditions (keep both with appropriate notes)

---

## 4. MISSING IMAGE FILES (Referenced but Not Found)

### Finding: 158 Missing Image Files

The CSV references 158 image files that do not exist in the `/src/assets/images/books/` directory.

**Sample of Missing Files (first 30):**

| Line | ID | Author | Title | Filename |
|---|---|---|---|---|
| 2 | 1 | Berenice Abbott | Documenting Science | 9783869304311.jpg |
| 6 | 5 | Berenice Abbott | Paris Portraits | 9783869303147.jpg |
| 7 | 6 | Masanao Abenavoli | The Movement of Clouds around Mount Fuji | 9783944669601.jpg |
| 9 | 8 | Gertrude Abercrombie | Gertrude Abercrombie | 9781949172027.jpg |
| 13 | 12 | Rita Ackerman | Rita Ackermann | 9780847836642.jpg |
| 14 | 13 | Robert Adams | Gone? | 9783865219176.jpg |
| 15 | 14 | Laurence Aëgerter | Photographic Treatment Book 1 | 9781911306269.jpg |
| 16 | 15 | Laurence Aëgerter | Photographic Treatment Book 2 | 9781911306276.jpg |
| 17 | 16 | Laurence Aëgerter | Photographic Treatment Book 3 | 9781911306283.jpg |
| 18 | 17 | Laurence Aëgerter | Photographic Treatment Book 4 | 9781911306290.jpg |
| 19 | 18 | Laurence Aëgerter | Photographic Treatment Book 5 | 9781911306306.jpg |
| 22 | 21 | Makoto Aida | Monument For Nothing | 9784766118049.jpg |
| 28 | 27 | Miles Aldridge | Please return Polaroid | 9783958297487.jpg |
| 30 | 29 | Merry Alpern | Dirty Windows | 9781881616580.jpg |
| 31 | 30 | Yoshitaka Amano | M by Ralf Christofor | 9783936859164.jpg |
| 37 | 36 | Christopher Anderson | Bleu Blanc Rouge | 9783775745321.jpg |
| 39 | 38 | Roger Andersson | Letters From Mayhem | 9781932698251.jpg |
| 44 | 43 | Lotta Antonsson | I Am Woman | 9789188031402.jpg |
| 49 | 48 | Nobuyoshi Araki | Monochrome Paradise | 9784908251009.jpg |
| 50 | 49 | Nobuyoshi Araki | Theater of Love | theater-of-love-araki.jpg |

**See full list below in Appendix A**

**Impact:** Users attempting to view these books will see broken image links or placeholder images.

**Recommendation:**
1. Prioritize sourcing images for books with ISBNs (easiest to match)
2. Create a systematic process for acquiring remaining cover images
3. Implement fallback placeholder images for missing covers
4. Add a flag in the database to identify books needing images

---

## 5. ORPHANED IMAGES (Exist but Not Referenced)

### Finding: 179 Orphaned Images

The `/src/assets/images/books/` directory contains 179 image files that are **not referenced** in the CSV database.

**Analysis:**
- Total images in directory: 397
- Referenced in CSV: 218
- Orphaned: 179 (45% of all images)

**Likely Causes:**
1. **Outdated filenames:** Old naming convention not matching current CSV references
2. **Old data:** Images from previous data imports or updates
3. **Unused backups:** Alternative image versions that are no longer needed
4. **Unlinked entries:** Books were removed from CSV but images remain

**Sample Orphaned Images (first 30):**

```
.DS_Store
9788894895070_cover-385w.jpg
A_gerter_Photographic_Treatment_Book_1_9781911306269.jpg
A_gerter_Photographic_Treatment_Book_2_9781911306276.jpg
A_gerter_Photographic_Treatment_Book_3_9781911306283.jpg
A_gerter_Photographic_Treatment_Book_4_9781911306290.jpg
A_gerter_Photographic_Treatment_Book_5_9781911306306.jpg
Abbott_American_Photographer_08716.jpg
Abbott_Berenice_Abbott_Changing_New_York_9781565845565.jpg
Abbott_Documenting_Science_9783869304311.jpg
Abbott_Paris_Portraits_9783869303147.jpg
Abenavoli_The_Movement_of_Clouds_around_Mount_Fuji_9783944669601.jpg
Abercrombie_Gertrude_Abercrombie_9781949172027.jpg
Ackerman_Rita_Ackermann_9780847836642.jpg
Adams_Gone_9783865219176.jpg
Aida_Monument_For_Nothing_9784766118049.jpg
Albers_Formulation_Articulation_9780500238288.jpg
Aldridge_Please_return_Polaroid_9783958297487.jpg
Alpern_Dirty_Windows_9781881616580.jpg
Amano_M_by_Ralf_Christofor_9783936859164.jpg
```

**See full list below in Appendix B**

**Recommendation:**
1. **Immediate:** Delete `.DS_Store` (system file, not a real image)
2. **Audit:** Determine if orphaned images should be:
   - Deleted (truly unused)
   - Linked to existing CSV entries (update CSV references)
   - Retained as backups (move to archive directory)
3. **Cleanup:** Remove unused images to reduce storage
4. **Process:** Implement naming convention consistency to prevent future orphaning

---

## 6. INVALID OR MALFORMED DATA

### Finding: No "NULL" String Issues

The CSV does not contain string values "NULL" in place of proper empty fields.

**Status:** PASS - No invalid NULL patterns detected

---

## Summary of Issues by Priority

### CRITICAL (Requires Immediate Action)
1. **Missing Titles (29 records)** - Cannot display books without titles
2. **Duplicate ID 1440** - Referential integrity violation

### HIGH (Requires Urgent Attention)
1. **Missing Image URLs (1,185 records)** - 75.7% of database missing images
2. **Missing Image Files (158)** - Broken image links for existing entries

### MEDIUM (Important but Not Urgent)
1. **Orphaned Images (179)** - Storage inefficiency and maintenance burden
2. **Duplicate Books (5 sets)** - Data quality and clarity issues

---

## Recommendations & Action Plan

### Immediate Actions (Week 1)
1. [ ] Populate missing titles for 29 records (IDs: 155, 176, 177, 231, etc.)
2. [ ] Resolve duplicate ID 1440 - assign new ID to one record
3. [ ] Delete `.DS_Store` from images directory
4. [ ] Review 5 duplicate book sets and decide on consolidation strategy

### Short-term (Weeks 2-4)
1. [ ] Create a placeholder image system for the 1,185 records missing `image_url`
2. [ ] Systematically acquire missing images for the 158 broken references
3. [ ] Audit orphaned images and determine keep/delete strategy
4. [ ] Clean up orphaned images directory

### Medium-term (Month 2)
1. [ ] Implement image URL standardization across all records
2. [ ] Create data validation rules to prevent future issues:
   - Title field required
   - Unique ID enforcement
   - Image URL format validation
3. [ ] Establish naming conventions for consistency
4. [ ] Set up automated validation in data import process

### Long-term (Ongoing)
1. [ ] Regular data quality audits (monthly)
2. [ ] Version control for CSV changes
3. [ ] Image optimization and management system
4. [ ] Data governance policies and documentation

---

## Technical Notes

**Data File Specifications:**
- Format: CSV with 29 columns
- Total Records: 1,565 books
- File Size: ~527 KB
- Character Encoding: UTF-8

**Key Columns:**
- `id` - Book identifier (should be unique - ISSUE: ID 1440 duplicated)
- `image_url` - Reference to cover image file
- `title` - Book title (29 records missing)
- Additional metadata: author, publisher, ISBN, year, etc.

**Image Directory:**
- Location: `/src/assets/images/books/`
- Total Files: 397
- Referenced: 218
- Orphaned: 179

---

## Appendix A: Complete List of Missing Image Files (158 total)

See detailed_issues.txt for the complete formatted list with all 158 missing image references sorted by ID.

**Summary Statistics for Missing Images:**
- Mostly ISBN-based filenames: 140 files
- Custom filenames: 18 files
- Placeholder references: 28 Richard Prince entries with placeholder-book-simple.svg

---

## Appendix B: Complete List of Orphaned Images (179 total)

See detailed_issues.txt for the complete alphabetically sorted list of all 179 orphaned image files in the directory.

**Storage Impact:**
- If average image size is ~100KB: ~18MB of unused storage
- Recommend cleanup after validation

---

## Contact & Questions

For questions about this report or data correction procedures, contact the library data management team.

**Report Generated:** 2025-11-29
**Analysis Tool:** Python 3 data validation script
