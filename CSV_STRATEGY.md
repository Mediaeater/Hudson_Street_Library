# CSV File Strategy for Hudson Street Library

This document outlines the strategy for managing the data files (CSV) used to generate the Hudson Street Library website.

## Current State Analysis

The repository currently contains several CSV files with "book" data, leading to potential confusion about the source of truth.

### File Inventory

1.  **`src/_data/books.csv`** (541 KB)
    *   **Status**: **Active / Source of Truth**.
    *   **Description**: This is the primary data file used by `generate-book-pages.js` to build the site. It is also the file targeted by the `fix-data-quality-issues.py` script. It contains the most complete and up-to-date dataset.

2.  **`src/_data/books_backup.csv`** (539 KB)
    *   **Status**: **Redundant / Backup**.
    *   **Description**: A static backup file. It is slightly smaller than the active `books.csv`, suggesting it is out of date.

3.  **`src/_data/books_original.csv`** (539 KB)
    *   **Status**: **Redundant / Historical**.
    *   **Description**: Likely the original export or starting point of the dataset. Useful for historical comparison but should not be used for site generation.

4.  **`src/_data/books_fixed.csv`** (533 KB)
    *   **Status**: **Obsolete**.
    *   **Description**: This file is smaller than the others and appears to be an intermediate output or a "fixed" version from a previous manual process or older script. It is not currently used by the build process.

5.  **`cms/uploads/d45adaf8-4eff-40a8-b0c5-0cef4b33eb28.csv`** (343 KB)
    *   **Status**: **CMS Export / Fragment**.
    *   **Description**: This file is significantly smaller (approx. 63% of `books.csv`) and has different headers (e.g., "Author, Last" instead of "author_last"). It appears to be a raw export or a source upload for the CMS. **Warning**: Replacing `src/_data/books.csv` with this file would likely result in significant data loss and break the build due to header mismatches.

## Recommended Strategy

### 1. Consolidation
*   **Source of Truth**: Maintain **`src/_data/books.csv`** as the single, authoritative source of truth for the website build.
*   **Modifications**: All automated scripts (`fix-data-quality-issues.py`, etc.) should read from and write to this file (safely, with backups).

### 2. Cleanup & Archiving
To reduce clutter and confusion:
*   **Archive**: Move `books_original.csv`, `books_backup.csv`, and `books_fixed.csv` to a `src/_data/archive/` directory (or delete them if confirmed unnecessary).
*   **Ignore**: Ensure the `archive/` directory is either ignored by the build process or explicitly excluded.

### 3. Backup Management
*   **Automated Backups**: The `fix-data-quality-issues.py` script currently creates backups in the same directory (`src/_data/`).
*   **Improvement**: Modify the script to save timestamped backups to a dedicated `src/_data/backups/` directory. This keeps the main data directory clean while preserving safety.

### 4. CMS Integration
*   **Workflow**: If the CMS uploads new CSVs (like the one in `cms/uploads/`), a data normalization step is required to map the CMS headers (e.g., "Author, Last") to the site's expected schema ("author_last") before merging into `src/_data/books.csv`.
*   **Caution**: Do not overwrite `books.csv` with raw CMS uploads without validation and mapping.

## Implementation Plan

1.  Refactor `fix-data-quality-issues.py` to use `src/_data/backups/`.
2.  Create `src/_data/archive/` and move old static CSVs there.
3.  Verify the build process continues to work with `src/_data/books.csv`.
