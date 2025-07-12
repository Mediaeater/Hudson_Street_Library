# Book Cover Acquisition Guide

## Overview

The Hudson Street Library uses a strict book cover acquisition system to ensure only correct, high-quality covers are added to the collection. This guide documents the current process and tools.

## The Problem We Solved

In July 2025, we discovered that our automated cover acquisition had downloaded 500+ incorrect covers:
- Physics textbooks instead of art books
- Phonetics books instead of photography books  
- Generic placeholders and unrelated titles

The root cause: Google Books API returns the "best match" which for art/photography books without ISBNs is often completely wrong.

## Current System

### 1. Strict Acquisition Script: `acquire-covers-strict.js`

**Key Features:**
- Requires 80% similarity match for BOTH title AND author
- Shows what was found vs what was expected
- Only downloads high-confidence matches
- Prevents false positives

**Usage:**
```bash
# Process 50 books starting from index 0
node acquire-covers-strict.js --start 0 --limit 50

# Continue from where you left off
node acquire-covers-strict.js --start 150 --limit 50
```

**Expected Success Rate:**
- Books with ISBNs: ~28% success
- Books without ISBNs: ~3% success
- Overall: ~9-10% success rate (but 100% accurate)

### 2. Visual Verification Tool: `verify-covers-visual.js`

**Key Features:**
- Opens each cover image automatically
- Shows expected book details
- Tracks progress (won't show same image twice)
- Batch deletion of incorrect covers

**Usage:**
```bash
# Start verification
node verify-covers-visual.js

# Options:
# [y] - Yes, correct cover (keep it)
# [n] - No, wrong cover (mark for deletion)
# [s] - Skip if unsure
# [q] - Quit and save progress
```

### 3. Status Check Tool: `check-cover-status.js`

**Usage:**
```bash
node check-cover-status.js
```

Shows:
- Total books and cover coverage
- ISBN vs non-ISBN coverage rates
- Authors missing most covers
- Progress tracking

## Best Practices

### 1. Focus on Books with ISBNs
Books with valid ISBNs have much better success rates (28% vs 3%)

### 2. Use the ISBN-only tool to find candidates:
```bash
node acquire-isbn-only.js
```

### 3. Always Verify New Covers
After running acquisition, use the visual tool to verify:
```bash
node verify-covers-visual.js
```

### 4. Commit Regularly
After verifying a batch of covers:
```bash
git add -A
git commit -m "Add X verified book covers"
git push origin main
```

## File Naming Convention

Covers are saved as:
```
Author_Name_Book_Title_ISBN.jpg
```
or
```
Author_Name_Book_Title_noISBN.jpg
```

Examples:
- `Roy_Lichtenstein_Lichtenstein_Posters_No_ISBN.jpg`
- `Keith_Haring_Keith_Haring_Journals_No_ISBN.jpg`

## API Limitations

### Google Books API (FREE)
- Good for mainstream books with ISBNs
- Poor for art/photography books
- Returns "best guess" which is often wrong

### DPLA (FREE, requires API key)
- Limited coverage for contemporary art books
- Better for historical content

### Archive.org (FREE)
- Often returns placeholder images
- Limited contemporary coverage

## Quality Over Quantity

**Important**: It's better to have 139 correct covers than 859 wrong ones. The strict matching ensures quality.

## Troubleshooting

### "No cover found" for most books
This is normal for art/photography books. They're rarely in free APIs.

### Script times out
This is normal. The script has delays to respect API rate limits. Just continue from where it left off.

### Verification tool won't start
Make sure you're in the project root directory and have all dependencies installed:
```bash
npm install
```

## Future Improvements

1. **Paid APIs**: Consider art-specific book APIs
2. **Manual Upload**: System for uploading verified covers
3. **Community Contributions**: Allow users to submit covers
4. **Museum APIs**: Check if art museums have book cover APIs

## Summary

The strict acquisition system prioritizes accuracy over quantity. While the success rate is low (~10%), every cover added is verified to be correct. This is essential for maintaining the quality and integrity of the Hudson Street Library collection.