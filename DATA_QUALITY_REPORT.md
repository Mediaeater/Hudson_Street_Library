# Hudson Street Library Books CSV - Data Quality Report

**Generated:** 2026-01-09
**File:** `src/_data/books.csv`
**Total Records:** 1,597 entries

---

## Executive Summary

The books.csv file contains **1,366 data quality issues** across multiple categories. The most significant problems are:

1. **75.4% missing cover images** (1,204 of 1,597 books)
2. **30 missing titles** (critical data)
3. **132 missing author first names** (mostly single-name authors)
4. **8 ISBN duplicates** (13 duplicate instances)
5. **Incomplete dimension data** (283 entries)

---

## Detailed Findings

### 1. Duplicate Entries

#### Duplicate ISBNs (8 ISBN values, 13 duplicate instances)

Books sharing the same ISBN (should be unique identifiers):

| ISBN | Count | Entries |
|------|-------|---------|
| **978-0300151633** | 2 | ID 1395, 1396 - "Backstage Pass: Rock & Roll Photography" |
| **978-1584230007** | 2 | ID 1407, 1408 - "Fucked Up + Photocopied" |
| **9781597111300** | 2 | ID 833, 865 - "Invisible..." vs "Choli Cholie" |
| **9782940524020** | 3 | ID 613, 656, 1294 - "KEIM", "New Stationary Department", "Vanity" |
| **9783037645574** | 2 | ID 741, 1226 - "Laying the Ghost" vs "A Black Hole..." |
| **9783944669236** | 2 | ID 66, 558 - "Transformations" (same book, different entries) |
| **9789464460070** | 2 | ID 739, 1224 - "Bottom Ash Observatory" vs "Book of Hours" |
| **9789491843426** | 2 | ID 632, 1114 - "Imperial Courts" vs "Hexamilies" |

**Issue:** These ISBNs appear multiple times with different book IDs, suggesting either:
- Data entry errors (duplicate records of same book)
- ISBN mismatches (wrong ISBN assigned to different books)
- Books from different editions with same ISBN

**Recommendation:** Review each duplicate ISBN pair manually to determine if entries are duplicates or genuinely different books.

---

#### Duplicate IDs (1 ID value with 2 instances)

| ID | Rows | Titles |
|---|----|--------|
| **1440** | 1418, 1419 | "Lorna Simpson" vs "Folksongs" |

**Issue:** ID 1440 appears twice with completely different books. IDs should be unique.

---

#### Duplicate Title + Author Combinations (6 combinations, 16 total instances)

| Author | Title | Instances | IDs |
|--------|-------|-----------|-----|
| **Araki, Nobuyoshi** | "Araki Teller, Teller Araki" | 2 | 47, 53 |
| **MacIndoe, Graham** | "All the Young Punks" | 2 | 1393, 1503 |
| **Matsuda, Mitsuhiro** | "Nicole Times, Vol." | 7 | 1379, 1382-1384, 1386, 1388, 1392 |
| **O'Brien, Thomas / Denenberg, Andrew** | "Backstage Pass: Rock & Roll Photography" | 2 | 1395, 1396 |
| **Prince, Richard** | "Family Tweets" | 2 | 921, 1523 |
| **Turcotte, Bryan Ray** | "Fucked Up + Photocopied" | 2 | 1407, 1408 |

**Issue:** Same books appear as separate records. The Matsuda entry is particularly problematic with 7 instances.

**Recommendation:** Consolidate duplicate entries and maintain single record per unique book.

---

### 2. Missing Required Fields

#### Missing Titles (30 entries - CRITICAL)

These entries completely lack title information:

- **IDs:** 155, 176, 177, 230, 253, 262, 282, 284, 326, 329, 372, 376, 394, 398, 425, 430, 693, 704, 766, 777, 811, 824, 827, 838, 857, 871, 864, 878, 953, 968, 1016, 1056, 1072, 1104, 1120, 1162, 1179, 1219, 1221, 1239, 1241, 1260, 1261, 1271, 1292, 1276, 1297

**Affected Authors:** Brant (Bill), Burchfield (Charles), Burckhardt (Rudy), Close (Chuck), Crewdson (Gregory), Currin (John), Davis (Noah), and others.

**Issue:** These entries have author information but no title, making them unsearchable and incomplete in the catalog.

**Recommendation:** Fill in missing titles from publisher information, ISBN lookups, or archive records. Mark as "Title Unknown" if unavailable.

---

#### Missing Author First Names (132 entries)

Most are legitimate single-name artists/creators:
- Banksy, Brassai, Nara, JR, Ai Weiwei, Swoon, Trecartin, etc.

**Issue:** 132 entries lack `author_first` value, but many are intentional (single-name artists).

**Recommendation:** Use author_full_name field to identify single-name entries. No action needed for intentional cases; update only where first names are genuinely missing and available.

---

### 3. Missing Cover Images (1,204 entries - 75.4%)

**Statistics:**
- Books with cover images: **393 (24.6%)**
- Books without cover images: **1,204 (75.4%)**
- Books with content (description/price) but no cover: **232 entries**

**Examples of missing covers:**
- ID 2: American Photographer
- ID 3: Berenice Abbott: Changing New York
- ID 4: Exhibition catalogs (Toronto)
- ID 7: Anaesthesia
- ID 9: Rita Ackermann & Andro Wekua

**Issue:** The vast majority of entries lack `image_url` field values. This significantly impacts the library's web interface and catalog completeness.

**Recommendation:**
1. Priority: Digitize/add covers for books with substantial metadata (description, price, dimensions)
2. Create a systematic process for adding ISBN-based cover lookups
3. Use book cover APIs (OpenLibrary, Google Books, etc.) for automated cover retrieval
4. Track cover acquisition as an ongoing project

---

### 4. ISBN Format Issues

**Status:** None found - all ISBNs follow valid formats (ISBN-10, ISBN-13, or ASIN)

---

### 5. Publication Year Issues

**Status:** None found - all dates are valid YYYY format and within reasonable historical range

---

### 6. Dimension Data Quality

**Status:** 283 entries have incomplete dimension data

**Pattern:** Many entries have only height, or only height + width, missing depth.

**Recommendation:** Complete dimension data where available from book metadata; leave blank for unknown values rather than partial entries.

---

### 7. CSV Parsing Issues

**Status:** No malformed rows detected - CSV structure is sound throughout

---

## Data Quality Summary Table

| Issue Category | Count | Severity | % of Dataset |
|---|---|---|---|
| Missing cover images | 1,204 | High | 75.4% |
| Incomplete dimensions | 283 | Low | 17.7% |
| Missing titles | 30 | Critical | 1.9% |
| Missing author_first | 132 | Low | 8.3% |
| Duplicate ISBNs | 8 | Medium | 0.5% |
| Duplicate title+author | 6 | Medium | 0.4% |
| Duplicate IDs | 1 | Critical | 0.06% |
| **TOTAL ISSUES** | **1,366** | — | — |

---

## Recommended Actions (Priority Order)

### Immediate (Critical)

1. **Fix Duplicate ID 1440**
   - Decide if entries are duplicates (delete one) or different books (assign unique ID)
   - Verify which is "Lorna Simpson" monograph vs "Folksongs"

2. **Fill Missing Titles (30 entries)**
   - Use ISBN lookups, publisher websites, or archive records
   - Create a task list for researchers to complete

3. **Reconcile Duplicate ISBNs**
   - Review the 13 duplicate ISBN instances
   - Determine if genuine duplicates or ISBN errors
   - Consolidate or correct as needed

### Short-term (High Priority)

4. **Add Cover Images (1,204 missing)**
   - Implement automated ISBN-based cover lookup (OpenLibrary API, Google Books)
   - Prioritize books with full metadata (description, price, dimensions)
   - Create manual review workflow for books without ISBN matches

5. **Complete Author Data**
   - Validate that 132 `author_first` empty entries are legitimate single-name artists
   - Add first names where data is available

### Long-term (Maintenance)

6. **Standardize Dimensions**
   - Complete partial dimension entries
   - Establish data entry standards (always record all three: H × W × D)

7. **Deduplication Process**
   - Implement quarterly audit for new duplicate entries
   - Create merge/consolidation workflow for identified duplicates

---

## Data Entry Standards to Prevent Future Issues

1. **Required Fields:** Enforce entry of `id`, `title`, `author_last` at minimum
2. **ISBN Validation:** Validate ISBN/ASIN format during data entry
3. **Unique Constraints:** Check for duplicate ISBNs/IDs before committing entries
4. **Cover Images:** Make `image_url` mandatory for published books, or set default placeholder
5. **Dimensions:** Either complete all three dimensions or leave all blank (no partial entries)
6. **Author Names:** Document whether entries use single-name artists; validate against authority records

---

## Files Referenced

- **CSV File:** `/Users/m/Projects/Hudson_Street_Library/src/_data/books.csv`
- **Analysis Date:** 2026-01-09
- **Records Analyzed:** 1,597

---

## Next Steps

1. Share this report with library management/curatorial team
2. Prioritize issue resolution based on impact on user experience
3. Create GitHub issues/tasks for each recommendation
4. Establish data maintenance schedule and ownership
