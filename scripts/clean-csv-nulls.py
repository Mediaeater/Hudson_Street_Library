#!/usr/bin/env python3
"""
CSV Cleanup Script: Replace "NULL" string literals with empty fields

This script:
1. Reads the books.csv file
2. Replaces all literal "NULL" strings with empty strings
3. Creates a backup of the original file
4. Writes the cleaned version
5. Reports statistics on changes made
"""

import csv
import os
import sys
from datetime import datetime
from pathlib import Path

def clean_null_literals(input_file, output_file=None, backup=True):
    """
    Clean NULL literals from CSV file.

    Args:
        input_file: Path to input CSV
        output_file: Path to output CSV (defaults to input_file)
        backup: Whether to create backup of original

    Returns:
        Dictionary with statistics
    """

    input_path = Path(input_file)
    if not input_path.exists():
        print(f"Error: File not found: {input_file}")
        sys.exit(1)

    if output_file is None:
        output_file = input_file

    output_path = Path(output_file)

    # Create backup
    if backup and input_file == output_file:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = input_path.parent / f"{input_path.stem}_backup_{timestamp}{input_path.suffix}"
        print(f"Creating backup: {backup_path}")
        with open(input_file, 'rb') as src:
            with open(backup_path, 'wb') as dst:
                dst.write(src.read())

    # Read and clean
    stats = {
        'total_rows': 0,
        'total_null_replacements': 0,
        'null_replacements_by_field': {},
    }

    rows = []
    fieldnames = None

    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames

        for row in reader:
            stats['total_rows'] += 1
            for key in row:
                if row[key] == 'NULL':
                    row[key] = ''
                    stats['total_null_replacements'] += 1
                    if key not in stats['null_replacements_by_field']:
                        stats['null_replacements_by_field'][key] = 0
                    stats['null_replacements_by_field'][key] += 1
            rows.append(row)

    # Write cleaned version
    print(f"Writing {output_file}...")
    with open(output_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return stats

def main():
    """Main entry point."""

    # Path to books.csv
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_file = project_root / 'src' / '_data' / 'books.csv'

    if not csv_file.exists():
        print(f"Error: CSV file not found at {csv_file}")
        sys.exit(1)

    print("=" * 80)
    print("CSV NULL LITERAL CLEANUP SCRIPT")
    print("=" * 80)
    print(f"\nFile: {csv_file}")
    print("\nThis will replace all literal 'NULL' strings with empty fields.")
    print("A backup will be created automatically.\n")

    # Auto-confirm for non-interactive execution
    print("Proceeding with cleanup...")

    # Run cleanup
    stats = clean_null_literals(str(csv_file))

    # Report results
    print("\n" + "=" * 80)
    print("CLEANUP COMPLETE")
    print("=" * 80)
    print(f"\nTotal rows processed: {stats['total_rows']:,}")
    print(f"Total NULL replacements: {stats['total_null_replacements']:,}")
    print(f"\nNULL replacements by field:")

    for field in sorted(stats['null_replacements_by_field'].keys()):
        count = stats['null_replacements_by_field'][field]
        print(f"  {field}: {count:,}")

    print("\n" + "=" * 80)
    print(f"Output file: {csv_file}")
    print("=" * 80)

if __name__ == '__main__':
    main()
