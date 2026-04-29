# CSV Workflow Fix Plan

## Current Problems

1. **57 structural errors** in books.csv (lines 292-308 and others)
2. **Quote escaping failures** - embedded quotes in descriptions break parsing
3. **Multi-line descriptions** - literal newlines within CSV fields
4. **add-book script** bypasses robust CSVHandler class
5. **No pre-commit validation** - broken CSV can be committed
6. **Manual edits** directly on CSV without validation

## Solution Steps

### Phase 1: Fix Current CSV (IMMEDIATE)

1. **Clean the existing CSV**
   ```bash
   # Use the csv-handler to read and rewrite the file properly
   node scripts/fix-csv-formatting.js src/_data/books.csv src/_data/books_fixed.csv
   # Verify the fix
   node scripts/validate-csv-structure.js
   # If valid, replace original
   cp src/_data/books_fixed.csv src/_data/books.csv
   ```

2. **Alternative: Manual fix for George Condo books**
   - Lines 292-310 need description field consolidation
   - Remove literal newlines, keep only escaped content within single field
   - Ensure quotes are properly doubled: `""text""`

### Phase 2: Prevent Future Errors (CRITICAL)

1. **Update add-book script to use CSVHandler**
   - Replace direct csv-parse/stringify calls
   - Use `CSVHandler.readBooks()` and `CSVHandler.write()`
   - Benefit from automatic quote escaping and validation

2. **Add git pre-commit hook**
   ```bash
   # .git/hooks/pre-commit
   #!/bin/sh
   if git diff --cached --name-only | grep -q "books.csv"; then
     echo "📋 Validating books.csv..."
     node scripts/validate-csv-structure.js
     if [ $? -ne 0 ]; then
       echo "❌ CSV validation failed - commit rejected"
       exit 1
     fi
   fi
   ```

3. **Add CI validation step**
   - Run CSV validator in GitHub Actions on every PR
   - Fail the build if CSV is malformed

### Phase 3: Improve Tools (ENHANCEMENT)

1. **Better validator**
   - Current validator can't handle multi-line fields properly
   - Use csv-parse to validate instead of manual line counting

2. **CSV sanitizer script**
   - One-button fix for common issues:
     - Escape unescaped quotes
     - Remove literal newlines in descriptions
     - Normalize column count
   - Make it idempotent (safe to run multiple times)

3. **Add CSV linter to npm test**
   ```json
   "test:csv": "node scripts/validate-csv-structure.js"
   ```

### Phase 4: Documentation (MUST DO)

1. **Update CLAUDE.md with CSV rules**
   - NEVER manually edit books.csv
   - ALWAYS use scripts/add-book-from-text.js
   - ALWAYS run validator after any manual fix
   - NEVER use bash heredoc for CSV rows

2. **Create CSV_GUIDELINES.md**
   - Quote escaping rules
   - Multi-line field handling
   - Common pitfalls
   - Recovery procedures

## Implementation Priority

### HIGH (Do Now)
- [ ] Fix the 57 errors in current CSV
- [ ] Update add-book script to use CSVHandler
- [ ] Add pre-commit hook
- [ ] Document CSV rules in CLAUDE.md

### MEDIUM (This Week)
- [ ] Add CI validation
- [ ] Create CSV sanitizer script
- [ ] Add test:csv to npm test

### LOW (Nice to Have)
- [ ] Improve validator to handle multi-line fields
- [ ] Create CSV_GUIDELINES.md
- [ ] Add automated CSV linting on save (VS Code)

## Testing the Fix

```bash
# 1. Fix the CSV
node scripts/fix-csv-formatting.js src/_data/books.csv src/_data/books_fixed.csv

# 2. Validate
node scripts/validate-csv-structure.js

# 3. Test Eleventy build
npm run build

# 4. Test add-book workflow
npm run add

# 5. Commit with validation
git add src/_data/books.csv
git commit -m "Fix: Repair 57 CSV structural errors"
```

## Success Criteria

✅ Zero errors from `validate-csv-structure.js`
✅ Books.csv parses successfully in Eleventy
✅ Add-book script uses CSVHandler
✅ Pre-commit hook prevents broken CSV
✅ CI fails on invalid CSV
✅ Documentation updated

## Files to Modify

1. `src/_data/books.csv` - Fix current errors
2. `scripts/add-book-from-text.js` - Use CSVHandler
3. `.git/hooks/pre-commit` - Add validation hook
4. `.github/workflows/eleventy-build.yml` - Add CSV validation step
5. `package.json` - Add test:csv script
6. `.claude/CLAUDE.md` or `CLAUDE.md` - Document CSV rules
