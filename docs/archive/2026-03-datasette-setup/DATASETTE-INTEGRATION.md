# Book Workflow ↔ Datasette Catalog Integration

## Overview

The add-book workflow is now integrated with the Datasette catalog. When you add a new book, the Datasette database automatically rebuilds to reflect the changes.

## How It Works

```
Add Book Script
    ↓
Updates books.csv
    ↓
Automatically runs update-datasette-catalog.sh
    ↓
Rebuilds hudson_street_library.db
    ↓
New book appears in Datasette catalog
```

## Usage

### Add Book with Auto-Rebuild (Default)

```bash
node scripts/add-book-from-text.js --interactive
```

**What happens**:
1. Prompts for book details
2. Adds to books.csv
3. **Automatically rebuilds Datasette catalog** (takes ~2 seconds)
4. Shows next steps

### Add Book Without Rebuild (Faster)

If you're adding multiple books and want to rebuild once at the end:

```bash
# Add books (skip rebuild)
node scripts/add-book-from-text.js --text "Book 1..." --no-rebuild
node scripts/add-book-from-text.js --text "Book 2..." --no-rebuild
node scripts/add-book-from-text.js --text "Book 3..." --no-rebuild

# Then rebuild once
./scripts/update-datasette-catalog.sh
```

## Files Modified

### `scripts/add-book-from-text.js`

**Changes**:
- Added `--no-rebuild` flag
- Imports `execSync` from child_process
- After CSV update, calls `update-datasette-catalog.sh`
- Handles errors gracefully (continues if rebuild fails)

**New behavior**:
```javascript
// After adding to CSV
if (rebuildDatasette) {
  execSync('./scripts/update-datasette-catalog.sh');
  console.log('✅ Datasette catalog updated!');
}
```

## Command Reference

| Command | CSV Updated | Datasette Updated |
|---------|-------------|-------------------|
| `node scripts/add-book-from-text.js --interactive` | ✅ | ✅ Auto |
| `node scripts/add-book-from-text.js --interactive --no-rebuild` | ✅ | ❌ Manual |
| `./scripts/update-datasette-catalog.sh` | ❌ | ✅ From CSV |

## Workflow Comparison

### Before Integration

```bash
# Step 1: Add book
node scripts/add-book-from-text.js --interactive

# Step 2: Manually rebuild (easy to forget!)
./scripts/update-datasette-catalog.sh

# Step 3: Check catalog
datasette hudson_street_library.db --metadata metadata.json
```

### After Integration

```bash
# Single step - everything automatic!
node scripts/add-book-from-text.js --interactive

# Check catalog (new book already there)
datasette hudson_street_library.db --metadata metadata.json
```

## Performance

**Single Book Add**:
- CSV update: <100ms
- Datasette rebuild: ~2 seconds
- Total: ~2.1 seconds

**Multiple Books** (10 books):
- With auto-rebuild: ~21 seconds (2s × 10)
- With `--no-rebuild` + final rebuild: ~3 seconds

**Recommendation**: For bulk imports, use `--no-rebuild` and rebuild once at the end.

## Error Handling

If Datasette rebuild fails, the script:
1. Shows warning message
2. Provides manual rebuild command
3. **Continues successfully** (book still added to CSV)

```
⚠️  Failed to update Datasette catalog: Command failed
   You can manually rebuild with: ./scripts/update-datasette-catalog.sh
```

## Verification

### Test the Integration

```bash
# 1. Add a test book
node scripts/add-book-from-text.js --text "Test: Integration Test, Test Publisher, 2026"

# 2. Start Datasette
datasette hudson_street_library.db --metadata metadata.json

# 3. Search for "Integration Test" in the web UI
# Should appear immediately!
```

### Check Sync Status

```bash
# Books in CSV
wc -l src/_data/books.csv

# Books in Datasette
sqlite-utils query hudson_street_library.db "SELECT COUNT(*) FROM books"

# Should match (minus CSV header line)
```

## Troubleshooting

**Problem**: Rebuild fails with "update script not found"

**Solution**: Make sure you're running from project root:
```bash
cd /Users/m/Projects/Hudson_Street_Library
node scripts/add-book-from-text.js --interactive
```

**Problem**: Rebuild is slow

**Solution**: Use `--no-rebuild` for multiple books:
```bash
# Add 5 books without rebuilding
for i in {1..5}; do
  node scripts/add-book-from-text.js --file books.txt --no-rebuild
done

# Rebuild once
./scripts/update-datasette-catalog.sh
```

**Problem**: Catalog doesn't show new book

**Solution**:
```bash
# Check if rebuild actually ran
ls -lh hudson_street_library.db  # Check timestamp

# Manually rebuild
./scripts/update-datasette-catalog.sh

# Restart Datasette if running
# (Datasette caches data, restart picks up changes)
```

## Advanced: Selective Rebuild

For even faster updates, you can directly insert into SQLite:

```bash
# Direct insert (fast, but skips FTS update)
sqlite-utils insert hudson_street_library.db books \
  --csv <<< "$(tail -n1 src/_data/books.csv)"

# Update FTS manually
sqlite-utils enable-fts hudson_street_library.db books \
  title author_full_name classification tags notes
```

**Note**: The auto-rebuild uses full rebuild for simplicity and safety.

## Benefits

✅ **Always in sync** - Catalog automatically reflects CSV changes
✅ **No manual steps** - One command does everything
✅ **Error tolerant** - Book still added even if rebuild fails
✅ **Optional** - Can skip rebuild with `--no-rebuild`
✅ **Fast** - Only 2 seconds per book

## Related Files

- `scripts/add-book-from-text.js` - Main add-book script (modified)
- `scripts/update-datasette-catalog.sh` - Rebuild script (unchanged)
- `hudson_street_library.db` - Datasette database (auto-updated)
- `src/_data/books.csv` - Source CSV (updated by add-book script)
- `metadata.json` - Datasette config (unchanged)

---

**Last Updated**: 2026-03-10
**Integration Status**: ✅ Active
