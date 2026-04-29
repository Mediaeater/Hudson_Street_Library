# CSV Workflow Guide

## Critical Rules

### ⚠️ NEVER Manually Edit books.csv

**Why:** CSV files with 36 columns and complex multi-line descriptions are error-prone. Manual edits frequently break CSV structure due to:
- Improper quote escaping
- Literal newlines in fields
- Column misalignment
- Formula injection vulnerabilities

### ✅ ALWAYS Use Provided Scripts

**Adding books:**
```bash
npm run add  # Interactive mode
```

**Validating CSV:**
```bash
node scripts/validate-csv-robust.js
```

**Fixing corrupted CSV:**
```bash
node scripts/fix-csv-formatting.js src/_data/books.csv src/_data/books_fixed.csv
```

## How CSV Errors Happen

### Problem 1: Multi-line Descriptions

❌ **WRONG** (breaks CSV):
```csv
"241","Condo","George","...","<p>First paragraph.</p>

<p>Second paragraph.</p>",
```

✅ **CORRECT** (CSVHandler does this automatically):
```csv
"241","Condo","George","...","<p>First paragraph.</p>

<p>Second paragraph.</p>",
```
Note: The entire multi-line field is wrapped in quotes and newlines are preserved within.

### Problem 2: Quote Escaping

❌ **WRONG** (breaks CSV):
```csv
"...","Condo pioneered "Psychological Cubism," his approach...","..."
```

✅ **CORRECT**:
```csv
"...","Condo pioneered ""Psychological Cubism,"" his approach...","..."
```
Note: Quotes within fields must be doubled (`""` not `"`).

### Problem 3: Column Count Mismatch

books.csv has **exactly 36 columns**. Every row must have 36 fields. Missing or extra commas break the structure.

## The CSVHandler Solution

The `scripts/utils/csv-handler.js` class handles all these issues automatically:

- ✅ Properly escapes quotes
- ✅ Handles multi-line fields
- ✅ Validates column count
- ✅ Creates automatic backups
- ✅ Prevents CSV formula injection (security)
- ✅ Provides error recovery

## Updated Workflow (April 2026)

### Before (Error-Prone)
```javascript
// Direct csv-parse/stringify usage
const records = parse(content, { columns: true });
records.push(newBook);
fs.writeFileSync('books.csv', stringify(records));
```
**Result:** 57 structural errors, broken descriptions, quote escaping failures

### After (Robust)
```javascript
// CSVHandler usage
const result = await CSVHandler.readBooks();
result.data.push(newBook);
await CSVHandler.write(CSV_PATH, result.data);
```
**Result:** Zero errors, automatic backups, proper escaping

## Pre-Commit Validation

A git hook now prevents committing broken CSV:

```bash
$ git commit -m "Add book"
📋 Validating books.csv structure...
❌ CSV validation failed!
```

If this happens:
1. Run the fix script
2. Validate the fix
3. Replace the broken CSV
4. Commit again

## Emergency Recovery

If books.csv gets corrupted:

```bash
# Option 1: Use the automated backups
ls -lt ~/.hudson-library-backups/daily/
cp ~/.hudson-library-backups/daily/books_2026-04-29.csv src/_data/books.csv

# Option 2: Use git history
git show HEAD:src/_data/books.csv > src/_data/books.csv

# Option 3: Fix in place
node scripts/fix-csv-formatting.js src/_data/books.csv src/_data/books_fixed.csv
node scripts/validate-csv-robust.js
cp src/_data/books_fixed.csv src/_data/books.csv
```

## Testing Your Changes

After any CSV modification:

```bash
# 1. Validate structure
node scripts/validate-csv-robust.js

# 2. Test Eleventy build
npm run build

# 3. Test add-book workflow
npm run add

# 4. Run full test suite
npm test
```

## Common Mistakes to Avoid

1. ❌ Using bash heredoc to add CSV rows
2. ❌ Editing CSV in Excel (introduces hidden characters)
3. ❌ Copy-pasting from web (smart quotes break CSV)
4. ❌ Manual find/replace in CSV (breaks structure)
5. ❌ Skipping validation after edits

## Migration Complete (April 29, 2026)

- ✅ Fixed 57 structural errors in books.csv
- ✅ Updated add-book script to use CSVHandler
- ✅ Created robust validator (validate-csv-robust.js)
- ✅ Added pre-commit hook
- ✅ Replaced naive validator with CSVHandler-based validation

**Result:** CSV workflow is now error-proof. Use the scripts, not manual edits.
