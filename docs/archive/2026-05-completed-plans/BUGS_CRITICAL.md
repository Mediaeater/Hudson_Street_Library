# Critical Bugs - Immediate Action Required

**Generated:** 2026-01-09
**Priority:** P0 - Must fix before any deployment

## Overview
Three critical bugs will prevent the CMS server from starting and cause runtime failures in batch operations.

---

## Bug 1: Missing Module - books-workflow.js

**File:** `cms/server.js:64`
**Severity:** CRITICAL - Server Won't Start

### Issue
```javascript
app.use('/admin/api/books', require('./api/books-workflow'));
```

The file `cms/api/books-workflow.js` doesn't exist. Only `books.js` and `collections.js` exist in that directory.

### Impact
- Server crashes on startup with `MODULE_NOT_FOUND` error
- CMS completely unusable
- No book management possible

### Solution Options
1. **Option A (Recommended):** Remove line 64 since CMS is unrealized and not in use
2. **Option B:** Create stub `books-workflow.js` file for future development
3. **Option C:** Merge workflow functionality into `books.js`

### Fix Implementation
```bash
# Option A - Remove the line
sed -i '' '64d' cms/server.js
```

---

## Bug 2: Race Condition - batchOps Undefined

**File:** `src/assets/js/batch-operations.js:737-743`
**Severity:** CRITICAL - Runtime Failure

### Issue
```javascript
// Line 737-741: Initialize batch operations
let batchOps;
document.addEventListener('DOMContentLoaded', function() {
    batchOps = new BatchOperations();
});

// Line 743: Assign to global BEFORE initialization
window.batchOps = batchOps;  // batchOps is undefined here!
```

At line 743, `batchOps` is `undefined`, so onclick handlers will fail with "batchOps is not defined".

### Impact
- Manual book entry form completely broken
- Cannot remove book rows from batch entry
- All inline onclick handlers fail
- Console errors on every interaction

### Solution
Move the global assignment inside the DOMContentLoaded handler:

```javascript
let batchOps;
document.addEventListener('DOMContentLoaded', function() {
    batchOps = new BatchOperations();
    window.batchOps = batchOps;  // Move inside event handler
});
```

---

## Bug 3: Missing PostgreSQL Dependency

**File:** `cms/server.js:10` + `cms/package.json`
**Severity:** CRITICAL - Server Won't Start

### Issue
```javascript
// cms/server.js:10
const { Pool } = require('pg');
```

But `cms/package.json` doesn't include `pg` in dependencies.

### Impact
- Server crashes on startup with `MODULE_NOT_FOUND` for 'pg'
- Database connections impossible
- CMS completely unusable

### Solution Options
1. **Option A (Recommended):** Remove PostgreSQL code since CMS is unrealized
2. **Option B:** Add `pg` to dependencies if planning to use CMS

### Fix Implementation
```bash
# Option A - The CMS is not in active use, remove it
# (Already documented as "unrealized CMS plan")

# Option B - If activating CMS
cd cms && npm install --save pg
```

---

## Execution Plan

### Immediate (Today)
1. ✅ **Fix Bug 2** - Race condition in batch-operations.js (site is live, this affects users)
2. **Assess CMS usage** - Confirm CMS is not active

### Short-term (This Week)
3. **Fix Bug 1 & 3** - Either remove CMS code or fix dependencies
4. **Test batch operations** - Verify bug 2 fix works
5. **Document CMS status** - Clarify if it's deprecated or future work

### Testing Checklist
- [ ] Batch operations manual entry loads without errors
- [ ] Remove book row button works
- [ ] No console errors on page load
- [ ] Server starts without module errors (if CMS is kept)

---

## Notes
- The CMS in `cms/` appears to be from an unrealized implementation plan (see `docs/archive/unrealized-cms-plan/`)
- Current site uses flat-file CSV system, not database
- May want to remove entire CMS directory to avoid confusion
