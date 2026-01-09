# High & Medium Priority Bugs

**Generated:** 2026-01-09
**Priority:** P1-P2 - Fix within 1-2 weeks

## High Priority Bugs

### Bug 4: Undefined Global Database Variable

**Files:** `cms/api/books.js`, `cms/api/collections.js`
**Severity:** HIGH - Code Fragility

#### Issue
Both API files use `db` without importing it:
```javascript
const books = await db.query(query, queryParams);
```

They rely on `global.db` set in `server.js`, but have no explicit reference.

#### Impact
- Code won't work if tested independently
- Linters report undefined variable
- Maintenance confusion
- Hard to debug issues

#### Solution
Add explicit reference at top of both files:
```javascript
const db = global.db;
```

Or better, pass `db` as dependency through proper dependency injection.

---

### Bug 5: Missing Null Check for image-size Package

**File:** `scripts/utils/image-core.js:23-29`
**Severity:** HIGH - Runtime Errors

#### Issue
```javascript
let sizeOf;
try {
    sizeOf = promisify(require('image-size'));
} catch (error) {
    console.warn('image-size package not available - dimension validation disabled');
    sizeOf = null;
}
```

Code gracefully handles missing package but later code may call `sizeOf()` without checking if it's null.

#### Impact
- Runtime errors: "sizeOf is not a function"
- Image validation fails silently
- Build process may crash

#### Solution
Add null checks before all `sizeOf()` calls:
```javascript
if (sizeOf) {
    const dimensions = await sizeOf(imagePath);
}
```

---

## Medium Priority Bugs

### Bug 6: Unimplemented Placeholder Functions

**File:** `cms/api/books.js:544-560`
**Severity:** MEDIUM - Missing Functionality

#### Issue
Critical functions are just logging stubs:
```javascript
async function generateBookPage(bookId) {
    console.log(`Generating page for book ${bookId}`);
}

async function deleteBookPage(bookId) {
    console.log(`Deleting page for book ${bookId}`);
}

async function generateAcquisitionNews(bookId) {
    console.log(`Generating news for book ${bookId}`);
}
```

#### Impact
- Creating/updating/deleting books won't trigger site regeneration
- Manual workarounds required
- CMS doesn't integrate with static site

#### Solution Options
1. Implement functions to call Eleventy build
2. Remove functions if CMS is deprecated
3. Document as "future work"

---

### Bug 7: Missing showToast Dependency

**File:** `src/assets/js/batch-operations.js`
**Severity:** MEDIUM - Load Order Dependency

#### Issue
```javascript
showToast('Please select a valid CSV file', 'error');
```

File calls `showToast()` without importing it, relies on global scope from `shared.js`.

#### Impact
- If `shared.js` loads late or fails, errors occur
- Hard to track dependencies
- Maintenance confusion

#### Solution
Add explicit dependency check:
```javascript
if (typeof showToast === 'function') {
    showToast(message, type);
} else {
    console.error(message);
}
```

Or use proper module imports.

---

## Low Priority Issues

### Bug 8: Console.error for User-Facing Errors

**Files:** Throughout codebase
**Severity:** LOW - UX Issue

#### Issue
Many files use `console.error()` for error handling without user feedback.

#### Impact
- Users don't see helpful error messages
- Errors only in console
- Poor UX

#### Solution
Add proper error UI feedback in addition to console logging.

---

### Bug 9: Incomplete Error Handling in downloadImage

**File:** `acquire-covers.js:270-299`
**Severity:** LOW - Edge Case

#### Issue
```javascript
response.pipe(file);
```

If response stream errors mid-download, error handlers might not catch all cases.

#### Impact
- Partial downloads not cleaned up
- Disk space wasted
- Build confusion

#### Solution
Add error handler on response stream:
```javascript
response.on('error', (err) => {
    file.close();
    fs.unlink(filePath, () => {});
    reject(err);
});
```

---

## Execution Plan

### Week 1
- [ ] Fix Bug 4 - Add db references to API files
- [ ] Fix Bug 5 - Add sizeOf null checks
- [ ] Assess CMS status for Bugs 6-7

### Week 2
- [ ] Fix Bug 7 - Add showToast dependency check
- [ ] Fix Bug 8 - Improve error UI feedback
- [ ] Fix Bug 9 - Add stream error handlers

### Testing
- [ ] Run image pipeline with missing image-size package
- [ ] Test batch operations without shared.js
- [ ] Test acquire-covers with network interruption
