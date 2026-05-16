# Quick Start Guide: Cover Acquisition Testing

## 5-Minute Quick Start

### 1. Run the Tool

```bash
cd /Users/imac/Projects/Hudson_Street_Library
node test-cover-acquisition.js
```

### 2. Search for a Book

When prompted, enter a search term:
```
Enter search term (ISBN, artist, or title) or "q" to quit: Tillmans
```

### 3. Select a Book

Pick a number from the list:
```
Select book number (1-5) or "c" to cancel: 1
```

### 4. Review the Cover

The cover image will open automatically. Check:
- Is this the correct book?
- Is the image quality good enough?
- Are the dimensions acceptable?

### 5. Approve or Reject

Type your choice:
- `y` - Save the cover
- `n` - Delete it
- `s` - Skip (keep for later review)
- `q` - Quit

### 6. Continue or Exit

```
Test another book? (y/n): n
```

## Common Commands

| Command | Action |
|---------|--------|
| `node test-cover-acquisition.js` | Start interactive mode |
| `node test-cover-acquisition.js --dry-run` | Test without saving |
| `node test-cover-acquisition.js --help` | Show help |

## Quick Tips

1. **Search by last name**: `Tillmans` finds all Wolfgang Tillmans books
2. **Search by ISBN**: `9781891024368` finds exact match
3. **Search by title**: `Portraits` finds books with "Portraits" in title
4. **Cancel anytime**: Press `Ctrl+C` or type `q`

## File Locations

- **Approved covers**: `src/assets/images/books/`
- **Skipped covers**: `.temp-covers/`
- **Session log**: `cover-acquisition-log.json`

## Example Session (30 seconds)

```bash
$ node test-cover-acquisition.js

# Search
> Tillmans

# Select
> 1

# Wait for image to open
# Review the cover

# Approve
> y

# Done?
> n
```

## What Gets Saved?

When you approve (`y`):
- ✅ Cover saved to `src/assets/images/books/Author_Title_ISBN.jpg`
- ✅ Entry added to `cover-acquisition-log.json`
- ✅ Statistics updated

When you reject (`n`):
- ❌ Temporary file deleted
- ✅ Rejection logged (so you don't retry)

When you skip (`s`):
- ⏸️ File kept in `.temp-covers/`
- ✅ Skip logged for later review

## Next Steps

After testing a few books:

1. **Review the log**:
   ```bash
   cat cover-acquisition-log.json
   ```

2. **Check approved covers**:
   ```bash
   ls -lh src/assets/images/books/
   ```

3. **Review skipped covers**:
   ```bash
   ls -lh .temp-covers/
   ```

4. **Bulk process** (when confident):
   ```bash
   node scripts/covers/acquire-covers.js --artist "Tillmans" --limit 50
   ```

## Troubleshooting

**No covers found?**
- Try a different search term
- Check if the book has an ISBN
- Some books may not be in the APIs

**Image won't open?**
- Check your default image viewer
- The file is in `.temp-covers/` - open manually

**Permission errors?**
- Ensure directories are writable:
  ```bash
  ls -ld src/assets/images/books/
  ```

## That's It!

You're ready to start testing cover acquisition. The tool is designed to be self-explanatory with helpful prompts at each step.

Happy testing! 📚✨
