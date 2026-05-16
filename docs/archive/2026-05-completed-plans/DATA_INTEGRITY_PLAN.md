# Data Integrity Improvement Plan

**Generated:** 2026-01-09
**Source:** books.csv analysis
**Total Issues:** 1,366 across 1,597 books

## Executive Summary

Data quality analysis found critical issues affecting user experience and site functionality:
- **30 books missing titles** (show as blank in catalog)
- **1,204 books missing covers** (75.4% - visual gaps)
- **8 duplicate ISBNs** affecting 17 books
- **1 duplicate ID** causing database conflicts

## Critical Issues (P0)

### Issue 1: Duplicate Book ID
**ID 1440 appears twice:**
1. "Lorna Simpson" (no ISBN)
2. "Folksongs" by Alec Soth (ISBN 9783865218063)

**Impact:** Database corruption, page generation conflicts
**Fix:** Reassign one book to next available ID (1597+)

### Issue 2: Missing Titles (30 books)
Books have metadata but no title field:
- Banksy (ID 248-249)
- Burchfield (ID 336)
- Close (ID 436, 437, 439)
- Crewdson (ID 478)
- And 24 more...

**Impact:** Blank entries in catalog, broken search, poor UX
**Fix:** Research and add titles from author/ISBN data

## High Priority Issues (P1)

### Issue 3: Missing Cover Images (1,204 books)
**Coverage:** Only 24.6% of books have covers
**Target:** 80% coverage (1,045 covers)
**Gap:** 845 covers needed

**Strategy:**
1. Use `acquire-covers.js` with ISBN lookup
2. Manual sourcing for books without ISBN
3. Implement cover upload interface

**Timeline:**
- Month 1: +200 covers via automated lookup
- Month 2-3: +400 covers via manual sourcing
- Month 4: +245 covers reaching 80% target

### Issue 4: Duplicate ISBNs (8 unique ISBNs, 17 books)

**Examples:**
- ISBN 9781597112819: Banksy "Wall and Piece" (appears 3x)
- ISBN 9780989531214: Avedon "An Autobiography" (appears 2x)
- ISBN 9788862084130: Araki "Araki Teller Teller Araki" (appears 2x)

**Impact:** Confusion, potential merge needed, data inconsistency
**Fix:** Audit each, determine if true duplicates or data entry errors

## Medium Priority Issues (P2)

### Issue 5: Duplicate Title+Author (6 combos, 16 books)

**Examples:**
- "Guyton\Wade": 10 entries (IDs 1079-1088)
- "Araki\Nobuyoshi Araki": 2 entries
- "Abbott\Berenice": 2 entries

**Likely:** Different editions, collections, or catalog systems
**Fix:** Add edition info to disambiguate

### Issue 6: Incomplete Physical Dimensions (283 books)
Books have partial dimension data (height but no width, etc.)

**Impact:** Incomplete catalog information
**Fix:** Low priority - add when convenient

## Action Plan & Timeline

### Week 1: Critical Fixes
- [ ] Resolve duplicate ID 1440
- [ ] Begin title research for 30 missing titles
- [ ] Audit all 8 duplicate ISBNs

### Week 2-4: Data Cleanup
- [ ] Complete missing title research
- [ ] Consolidate or document duplicate ISBNs
- [ ] Add edition information to disambiguate duplicates

### Month 2-4: Cover Acquisition
- [ ] Run automated cover lookup (target: +600 covers)
- [ ] Manual sourcing for high-value books without ISBN
- [ ] Reach 80% cover coverage target

### Ongoing: Prevention
- [ ] Implement pre-save validation rules
- [ ] Add unique constraints to ID field
- [ ] Add ISBN format validation
- [ ] Quarterly data quality audits

## Validation Rules to Implement

```javascript
// Prevent future issues
const validationRules = {
    id: { type: 'integer', unique: true, required: true },
    title: { type: 'string', required: true, minLength: 1 },
    isbn: {
        type: 'string',
        format: /^(97[89])?\d{9}[\dX]$/,
        unique: true
    },
    dimensions: {
        // All or none - prevent partial data
        validate: (book) => {
            const dims = [book.height, book.width, book.depth];
            const filled = dims.filter(d => d !== null && d !== '');
            return filled.length === 0 || filled.length === 3;
        }
    }
};
```

## Success Metrics

**By End of Month 1:**
- Zero duplicate IDs
- Zero missing titles
- All duplicate ISBNs documented/resolved
- +200 covers added (40% → 52% coverage)

**By End of Month 4:**
- 80% cover coverage achieved
- All validation rules implemented
- Automated quality monitoring in place
- Clean data ready for public launch

## Output Files Reference

All detailed analysis available in:
- `DATA_QUALITY_INDEX.md` - Navigation guide
- `DATA_QUALITY_SUMMARY.txt` - Executive summary
- `DATA_QUALITY_REPORT.md` - Technical details
- `DATA_QUALITY_ISSUES.csv` - Machine-readable issue list
- `DATA_QUALITY_DUPLICATES.csv` - Duplicate analysis
