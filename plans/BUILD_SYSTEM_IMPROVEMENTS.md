# Build System Improvements

**Generated:** 2026-01-09
**Focus:** Dependencies, performance, consistency

## High Priority Issues

### Issue 1: Outdated Axios (Security Risk)
**Current:** 1.9.0
**Latest:** 1.13.2
**Priority:** P0 - Security

**Risk:** Known vulnerabilities in older versions
**Fix:** `npm update axios`
**Test:** Verify cover acquisition still works

---

### Issue 2: CSV Handler Path Inconsistency
**File:** `.eleventy.js:6`
**Priority:** P0 - Maintenance Risk

**Issue:**
```javascript
const CSVHandler = require("./lib/csv-handler");
```

But actual location is: `./scripts/utils/csv-handler`

**Impact:**
- Build succeeds (suggesting another copy exists at `./lib/`)
- Inconsistent imports across codebase
- Maintenance confusion

**Fix:**
1. Audit: find all csv-handler locations
2. Standardize to single location
3. Update all imports
4. Remove duplicates

---

### Issue 3: _site Directory in Git
**Priority:** P1 - Repository Cleanliness

**Issue:** Built files tracked in git:
- 900+ modified files in `_site/`
- Deleted book pages still showing in status
- Bloats repository

**Fix:**
```bash
echo "_site/" >> .gitignore
git rm -r _site/
git commit -m "Remove built files from git, add to gitignore"
```

---

### Issue 4: Cover Acquisition in Build Pipeline
**File:** `.eleventy.js:17-27`
**Priority:** P1 - Performance

**Issue:**
```javascript
eleventyConfig.on("beforeBuild", async () => {
    console.log("Running cover acquisition...");
    const { exec } = require('child_process');
    exec('node acquire-covers.js --limit 10 --strict', ...);
});
```

Runs API calls on every build, adding 10+ seconds.

**Impact:**
- Slow builds (especially CI/CD)
- Unnecessary API calls
- Rate limit risk

**Fix:**
```javascript
// Only run in development, not production
if (process.env.NODE_ENV !== 'production') {
    eleventyConfig.on("beforeBuild", async () => {
        // ... cover acquisition
    });
}
```

Or remove entirely and run separately.

## Medium Priority Issues

### Issue 5: Outdated GitHub Actions
**Priority:** P2 - Security & Performance

**Current versions:**
- `actions/checkout@v3` → v4 available
- `actions/setup-node@v3` → v4 available
- `actions/upload-artifact@v3` → v4 available

**Fix:**
Update `.github/workflows/maintenance.yml`:
```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
- uses: actions/upload-artifact@v4
```

---

### Issue 6: Node Version Inconsistency
**Priority:** P2 - Consistency

**Current:**
- `build-and-deploy.yml`: Node 22
- `maintenance.yml`: Node 18

**Fix:** Update maintenance workflow to Node 22

---

### Issue 7: Dead Tailwind Plugin Code
**File:** `.eleventy.js:29-36`
**Priority:** P2 - Code Cleanliness

**Issue:** Commented-out code with note about Eleventy v3 incompatibility.

**Fix:** Remove dead code, add clear documentation about Tailwind setup

---

### Issue 8: Build Order Dependency Not Documented
**File:** `generate-book-pages.js:14`
**Priority:** P2 - Documentation

**Issue:**
Script requires template at `_site/books/templates/BOOK-TEMPLATE/index.html` created by Eleventy first.

**Impact:** Could break if template location changes

**Fix:**
Add error check:
```javascript
const templatePath = '_site/books/templates/BOOK-TEMPLATE/index.html';
if (!fs.existsSync(templatePath)) {
    console.error('Error: Book template not found. Run Eleventy build first.');
    process.exit(1);
}
```

## Low Priority Updates

### Issue 9: Other Outdated Dependencies

**Safe to update (patch/minor):**
- `@11ty/eleventy`: 3.1.0 → 3.1.2
- `autoprefixer`: 10.4.21 → 10.4.23
- `better-sqlite3`: 12.4.1 → 12.5.0
- `csv-stringify`: 6.5.2 → 6.6.0
- `dotenv`: 17.2.0 → 17.2.3

**Major version available (needs testing):**
- `glob`: 11.0.3 → 13.0.0 (breaking changes)
- `tailwindcss`: 3.4.18 → 4.1.18 (major rewrite)

**Action:** Run `npm update` for safe updates

## Action Plan

### Week 1: Critical Security & Performance
**Day 1:**
- [ ] Update Axios to latest version
- [ ] Test cover acquisition
- [ ] Add _site/ to .gitignore
- [ ] Remove _site/ from git

**Day 2:**
- [ ] Audit CSV handler locations
- [ ] Standardize to single path
- [ ] Update all imports

**Day 3:**
- [ ] Move cover acquisition out of build
- [ ] Or add NODE_ENV check
- [ ] Test build performance

### Week 2: Consistency & Cleanup
**Day 1:**
- [ ] Update GitHub Actions to v4
- [ ] Standardize Node version to 22
- [ ] Test CI/CD pipeline

**Day 2:**
- [ ] Remove dead Tailwind code
- [ ] Add build dependency checks
- [ ] Update documentation

**Day 3:**
- [ ] Run npm update for safe dependencies
- [ ] Test all functionality
- [ ] Document dependency update policy

### Future: Major Updates
**Month 2:**
- [ ] Test glob v13 upgrade
- [ ] Test Tailwind v4 upgrade
- [ ] Create migration plan if beneficial

## Performance Targets

**Current Build Time:** ~45 seconds (with cover acquisition)
**Target After Fixes:** ~20 seconds

**Breakdown:**
- Remove cover acquisition: -15 seconds
- Update dependencies: -5 seconds
- Clean _site/ from git: -5 seconds
- Total improvement: ~55% faster

## Dependency Update Policy

Going forward:
1. **Security updates:** Apply immediately
2. **Patch updates:** Monthly
3. **Minor updates:** Quarterly with testing
4. **Major updates:** Evaluate annually, plan migration

## Success Metrics

**Week 1 Complete:**
- No security vulnerabilities in dependencies ✓
- Build time under 25 seconds ✓
- Clean git repository (no _site/) ✓

**Week 2 Complete:**
- All GitHub Actions using latest versions ✓
- Consistent Node versions across workflows ✓
- No dead code in configuration files ✓
