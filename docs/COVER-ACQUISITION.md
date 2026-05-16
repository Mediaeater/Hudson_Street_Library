# Book Cover Acquisition Guide

This document consolidates all cover acquisition documentation for the Hudson Street Library project.

## Table of Contents

1. [Overview](#overview)
2. [Tools](#tools)
3. [Best Practices](#best-practices)
4. [API Documentation](#api-documentation)
5. [Troubleshooting](#troubleshooting)
6. [Historical Notes](#historical-notes)

## Overview

The Hudson Street Library uses automated tools to acquire book cover images from various online sources. The system is designed to find and download high-quality cover images for books in the library's catalog.

## Tools

### 1. Cover Acquisition Script (`scripts/covers/acquire-covers.js`)

The main tool for downloading book covers. It supports multiple modes and options:

```bash
# Basic usage
node scripts/covers/acquire-covers.js --limit 50

# Artist-specific acquisition
node scripts/covers/acquire-covers.js --artist "Tillmans" --limit 20

# Strict mode (high confidence matching)
node scripts/covers/acquire-covers.js --strict --limit 100

# Batch processing
node scripts/covers/acquire-covers.js --batch 25 --limit 100

# Dry run (preview without downloading)
node scripts/covers/acquire-covers.js --dry-run --limit 10
```

**Options:**
- `--limit <n>`: Number of books to process (default: 50)
- `--artist <name>`: Filter by artist name (e.g., "Tillmans", "Prince")
- `--strict`: Enable similarity matching (80% threshold)
- `--batch <size>`: Process in batches with delays
- `--min-size <bytes>`: Minimum image size (default: 3000)
- `--dry-run`: Preview what would be downloaded
- `--help`: Show help message

### 2. Cover Utilities (`scripts/covers/cover-utils.js`)

Comprehensive tool for managing and analyzing covers:

```bash
# Analyze cover status
node scripts/covers/cover-utils.js analyze

# Verify cover integrity
node scripts/covers/cover-utils.js verify

# Check specific artist
node scripts/covers/cover-utils.js check --artist "Kruger"

# Fix filenames
node scripts/covers/cover-utils.js fix-names --dry-run

# Generate mapping
node scripts/covers/cover-utils.js map
```

**Commands:**
- `analyze`: Analyze cover status and opportunities
- `verify`: Verify cover file integrity
- `check`: Check current cover status
- `fix-names`: Fix cover filenames to match convention
- `delete <pattern>`: Delete covers matching pattern
- `map`: Generate cover-to-book mapping

## Best Practices

### 1. Image Quality Standards
- **Minimum size**: 3KB (3000 bytes)
- **Recommended size**: 10-100KB
- **Format**: JPEG preferred
- **Resolution**: At least 200x300 pixels

### 2. Filename Convention
```
AuthorLastName_BookTitle_ISBN.jpg
```
Examples:
- `Tillmans_Portraits_9781891024368.jpg`
- `Prince_American_Dream_9780847843596.jpg`

### 3. Acquisition Strategy
1. Always check if cover already exists before downloading
2. Use strict mode for high-value or artist-specific books
3. Process in batches to avoid rate limiting
4. Verify downloads after acquisition

### 4. Rate Limiting
- Google Books: 1 second between requests
- Open Library: 0.5 second between API switches
- Batch delays: 10 seconds between batches of 25

## API Documentation

### Google Books API
- **Endpoint**: `https://www.googleapis.com/books/v1/volumes`
- **Rate limit**: Generous, but respect 1 req/sec
- **Image sizes**: thumbnail, smallThumbnail, medium, large, extraLarge
- **Best for**: Books with valid ISBNs

### Open Library API
- **Endpoint**: `https://openlibrary.org/api/books`
- **Rate limit**: Moderate, respect delays
- **Image sizes**: small, medium, large
- **Best for**: Older or academic books

### LibraryThing API
- **Status**: Currently blocked (403 errors)
- **Alternative**: Manual acquisition may be needed

## Troubleshooting

### Common Issues

1. **HTTP/HTTPS Protocol Errors**
   - Solution: Script automatically converts HTTP to HTTPS

2. **Image Too Small**
   - Solution: Adjust `--min-size` parameter
   - Default is 3000 bytes

3. **No Cover Found**
   - Try without strict mode
   - Check ISBN validity
   - Consider manual search

4. **Rate Limiting (429 errors)**
   - Increase delays
   - Use batch mode
   - Reduce request frequency

### Invalid ISBNs
Some books have malformed ISBNs like "-08716". These typically won't return results from APIs.

## Historical Notes

### Consolidation Effort (July 2024)
- Consolidated 14 separate acquisition scripts into one
- Reduced code duplication by ~70%
- Standardized CLI interface
- Improved error handling and retry logic

### Previous Scripts (Archived)
- `acquire-covers-batch.js`: Batch processing
- `acquire-covers-strict.js`: Similarity matching
- `acquire-tillmans-covers.js`: Artist-specific
- `acquire-covers-enhanced.js`: Redirect handling
- Plus 10 other variants

### Cover Acquisition Statistics
- Total books in catalog: 1,306
- Books with ISBNs: 359
- Current success rate: ~30%
- Most challenging: Artist monographs and limited editions

## Future Improvements

1. **Additional APIs**
   - Amazon Product API (requires approval)
   - WorldCat
   - Publisher-specific APIs

2. **Machine Learning**
   - Cover quality assessment
   - Automatic cropping/enhancement
   - Duplicate detection

3. **Manual Upload Interface**
   - Web UI for manual cover uploads
   - Batch upload from folders
   - Cover approval workflow

---

*Last updated: July 2024*