# Magazine System Gaps & Improvements

**Generated:** 2026-01-09
**Updated:** 2026-01-09
**Status:** 157 issues with covers/pages, 3 incomplete collections (down from 4)

## System Overview

Magazine content requires paired directories:
- **Cover Images:** `src/assets/images/magazines/[name]/`
- **Issue Pages:** `src/books/magazines/[name]/`

Both must exist and stay in sync for proper display.

## Critical Gaps (P0)

### ✅ Gap 1: Purple Magazine - COMPLETED
**Status:** 33 covers, 33 HTML pages, 33 CSV entries

**Completion Date:** 2026-01-09

**Details:**
- Created all 33 HTML pages in `src/books/magazines/purple-magazine/`
- Added 33 CSV entries (IDs 1631-1663)
- Updated collection page with all links
- Issues 1-27: regular seasonal issues (1992-2005)
- Issues 28-33: special editions (25 Years, Index, LA, Paris, Cosmos, Brain)

**See:** `plans/PURPLE_MAGAZINE_COMPLETION.md` for full report

---

### Gap 2: Orphaned Blink Magazine
**Status:** 1 cover, 0 HTML pages, 0 CSV entry

**Details:**
- Image: `src/assets/images/magazines/blink/blink.jpg`
- No HTML page exists
- No books.csv entry
- Has collection page: `src/collections/blink.html`

**Impact:** Incomplete feature, broken links

**Fix Options:**
1. Create HTML page and CSV entry
2. Remove image and collection page if not needed

**Estimated Work:** 30 minutes

---

### Gap 3: Empty Useful Photography Collection
**Status:** 0 images, 0 pages, has collection page

**Details:**
- Both directories exist but are empty
- Collection page exists: `src/collections/useful-photography.html`
- Name conflicts with Erik Kessels book series

**Impact:** Confusing empty collection

**Fix:** Remove directories and collection page, or clarify purpose

---

### Gap 4: Purple Mag Book Inserts - Unclear Purpose
**Status:** 1 image, 0 HTML pages

**Details:**
- Image: `purple-richard-prince.jpeg`
- No HTML page
- No CSV entry
- Unclear if this is a book insert or magazine issue

**Fix:** Clarify purpose, create page if needed, or move to appropriate location

## Medium Priority Issues (P1)

### Issue 5: Naming Inconsistencies

**Record Culture:**
- Images: `record-culture-issue-1.jpg`
- HTML: `record-culture-1.html`
- Inconsistent "issue" in filename

**Le Petit Voyeur:**
- Images: `Le_Petit_Voyeur_Vol_1_Shop-1.jpg`
- HTML: `issue-1.html`
- Non-standard naming pattern

**Impact:** Maintenance confusion, harder to automate
**Fix:** Standardize to consistent pattern

---

### Issue 6: Collection Page Typo
**File:** `src/collections/le-petit-vouyer.html`
**Should be:** `le-petit-voyeur.html`

**Impact:** Inconsistent URL, potential broken links
**Fix:** Rename file, update references

---

### Issue 7: Missing Magazine CSV Entries

These magazines have images/pages but no books.csv entries:
- Blink Magazine (1 issue)
- Individual Purple Magazine issues (35 issues)

**Impact:** Not searchable, not in main catalog
**Fix:** Add CSV entries with proper metadata

## Low Priority Improvements (P2)

### Improvement 8: Standardize Image Naming
Create consistent naming convention across all magazines:
```
[magazine-name]-[issue-number].jpg
or
[magazine-name]-issue-[issue-number].jpg
```

### Improvement 9: Automated Sync Checker
Create script to verify:
- Every image has corresponding HTML page
- Every HTML page has CSV entry
- Naming consistency
- No orphaned files

### Improvement 10: Magazine Documentation
Update `MAGAZINE_COVERS_NEEDED.md` to reflect:
- Current status (Slanted & AFM complete)
- Purple Magazine needs
- Orphaned directories status

## Complete Magazine Status

| Magazine | Issues | Images | Pages | CSV | Status |
|----------|--------|--------|-------|-----|--------|
| Apartamento | 34 | ✓ 34 | ✓ 34 | ✓ 34 | Complete |
| AFM | 2 | ✓ 2 | ✓ 2 | ✓ 2 | Complete |
| Slanted | 2 | ✓ 2 | ✓ 2 | ✓ 2 | Complete |
| Toilet Paper | 22 | ✓ 22 | ✓ 22 | ✓ 22 | Complete |
| Esopus | 8 | ✓ 8 | ✓ 8 | ✓ 8 | Complete |
| Le Petit Voyeur | 7 | ✓ 7 | ✓ 7 | ✓ 7 | Complete |
| Record Culture | 10 | ✓ 10 | ✓ 10 | ✓ 10 | Complete |
| Purple Magazine | 33 | ✓ 33 | ✓ 33 | ✓ 33 | Complete |
| **Blink** | **1** | **✓ 1** | **✗ 0** | **✗ 0** | **Orphaned** |
| **Purple Inserts** | **1** | **✓ 1** | **✗ 0** | **✗ 0** | **Unclear** |
| **Useful Photo** | **0** | **✗ 0** | **✗ 0** | **N/A** | **Empty** |

## Action Plan

### Week 1: Critical Gaps
**Day 1-2:** Purple Magazine ✅ COMPLETED 2026-01-09
- [x] Create 33 HTML pages for Purple Magazine issues
- [x] Add 33 CSV entries
- [x] Test collection page links

**Day 3:** Blink Magazine
- [ ] Decide: keep or remove
- [ ] If keep: create HTML page and CSV entry
- [ ] If remove: delete image, collection page

**Day 4:** Cleanup
- [ ] Remove or clarify Useful Photography
- [ ] Resolve Purple Mag Book Inserts
- [ ] Fix le-petit-voyeur typo

### Week 2: Standardization
- [ ] Standardize Record Culture naming
- [ ] Standardize Le Petit Voyeur naming
- [ ] Update MAGAZINE_COVERS_NEEDED.md
- [ ] Document naming conventions

### Future: Automation
- [ ] Create sync checker script
- [ ] Add to CI/CD pipeline
- [ ] Automated directory structure validation

## Templates for Quick Generation

**HTML Page Template:**
```html
---
layout: layouts/book.njk
title: "[Magazine] Issue [#]"
bookId: "[ID]"
---
```

**CSV Entry Template:**
```csv
[ID],magazineName,[issue-title],Issue [#],,,,,,available,,,,,,,,/assets/images/magazines/[name]/[file].jpg,,[collection-id],,
```

## Success Metrics

**Week 1 Progress:**
- ✅ All Purple Magazine issues have pages (33/33 completed 2026-01-09)
- ⏳ No orphaned directories (3 remaining: Blink, Purple Inserts, Useful Photo)
- ⏳ All images have corresponding pages (Purple Magazine done, 3 gaps remain)

**Week 2 Targets:**
- [ ] Consistent naming across all magazines
- [ ] Updated documentation
- [ ] Zero broken links
