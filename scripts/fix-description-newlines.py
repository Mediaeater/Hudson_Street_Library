#!/usr/bin/env python3
"""
Fix embedded newlines in description fields.

This script:
1. Identifies rows with embedded newlines in description field
2. Shows preview of problematic content
3. Optionally replaces newlines with spaces or removes them
4. Creates backup before modifying
"""

import csv
import sys
from pathlib import Path
from datetime import datetime

def find_newline_issues(csv_file):
    """Find rows with newlines in description field."""

    issues = []

    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row_num, row in enumerate(reader, start=2):
            description = row.get('description', '')
            if description and ('\n' in description or '\r' in description):
                issues.append({
                    'row': row_num,
                    'id': row['id'],
                    'title': row['title'],
                    'author': row['author_full_name'],
                    'description_length': len(description),
                    'newline_count': description.count('\n') + description.count('\r'),
                })

    return issues

def fix_newlines(csv_file, mode='replace', backup=True):
    """
    Fix newlines in description field.

    Args:
        csv_file: Path to CSV file
        mode: 'replace' (with spaces), 'remove', or 'preview' (no changes)
        backup: Whether to create backup

    Returns:
        Dictionary with statistics
    """

    # Create backup if modifying
    if backup and mode != 'preview':
        csv_path = Path(csv_file)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = csv_path.parent / f"{csv_path.stem}_backup_{timestamp}{csv_path.suffix}"
        print(f"Creating backup: {backup_path}")
        with open(csv_file, 'rb') as src:
            with open(backup_path, 'wb') as dst:
                dst.write(src.read())

    # Read CSV
    rows = []
    fieldnames = None
    stats = {
        'total_rows': 0,
        'rows_with_newlines': 0,
        'total_newlines_removed': 0,
    }

    print(f"Reading {csv_file}...")
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames

        for row in reader:
            stats['total_rows'] += 1
            description = row.get('description', '')

            if description and ('\n' in description or '\r' in description):
                stats['rows_with_newlines'] += 1
                newline_count = description.count('\n') + description.count('\r')
                stats['total_newlines_removed'] += newline_count

                if mode == 'replace':
                    # Replace newlines with spaces
                    cleaned = description.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
                    # Clean up multiple spaces
                    while '  ' in cleaned:
                        cleaned = cleaned.replace('  ', ' ')
                    row['description'] = cleaned
                elif mode == 'remove':
                    # Remove newlines entirely
                    row['description'] = description.replace('\r\n', '').replace('\n', '').replace('\r', '')

            rows.append(row)

    # Write back if not preview mode
    if mode != 'preview':
        print(f"Writing {csv_file}...")
        with open(csv_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    return stats

def main():
    """Main entry point."""

    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_file = project_root / 'src' / '_data' / 'books.csv'

    if not csv_file.exists():
        print(f"Error: CSV file not found at {csv_file}")
        sys.exit(1)

    print("=" * 80)
    print("DESCRIPTION FIELD NEWLINE FIX SCRIPT")
    print("=" * 80)
    print(f"\nFile: {csv_file}\n")

    # Find issues
    print("Scanning for embedded newlines...")
    issues = find_newline_issues(str(csv_file))

    if not issues:
        print("\nNo newline issues found!")
        sys.exit(0)

    print(f"\nFound {len(issues)} row(s) with embedded newlines:\n")

    for issue in issues:
        print(f"Row {issue['row']} (ID: {issue['id']})")
        print(f"  Title: {issue['title'][:70]}")
        print(f"  Author: {issue['author']}")
        print(f"  Newlines: {issue['newline_count']}")
        print()

    # Auto-execute with replace mode for non-interactive execution
    print("Replacing newlines with spaces...")
    stats = fix_newlines(str(csv_file), mode='replace', backup=True)

    # Report results
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    print(f"\nTotal rows processed: {stats['total_rows']:,}")
    print(f"Rows with newlines: {stats['rows_with_newlines']}")
    print(f"Total newlines handled: {stats['total_newlines_removed']}")
    print("\n" + "=" * 80)

if __name__ == '__main__':
    main()
