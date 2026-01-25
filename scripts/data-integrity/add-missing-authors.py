#!/usr/bin/env python3
"""
Add missing author information for 10 music-related books.
"""

import csv
from datetime import datetime
from pathlib import Path

def add_missing_authors(csv_file):
    """Add missing author data to rows."""

    # Create backup
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
        'authors_added': 0,
    }

    # Author data to add
    author_updates = {
        '1397': {  # Bob Dylan - a man called alias
            'author_last': 'Williams',
            'author_first': 'Richard',
            'author_full_name': 'Richard Williams',
        },
        '1400': {  # Bruce Springsteen: Songs
            'author_last': 'Springsteen',
            'author_first': 'Bruce',
            'author_full_name': 'Bruce Springsteen',
        },
        '1401': {  # Cash - An American Man
            'author_last': 'Miller',
            'author_first': 'Bill',
            'author_full_name': 'Bill Miller',
        },
        '1410': {  # Journals by Kurt Cobain
            'author_last': 'Cobain',
            'author_first': 'Kurt',
            'author_full_name': 'Kurt Cobain',
            'editor': 'Julie Grau',
        },
        '1429': {  # The Bob Dylan Scrapbook 1956-1966
            'author_last': 'Santelli',
            'author_first': 'Robert',
            'author_full_name': 'Robert Santelli',
        },
        '1430': {  # The Definitive Dylan Songbook
            'author_last': 'Dylan',
            'author_first': 'Bob',
            'author_full_name': 'Bob Dylan',
            'editor': 'Edward J. Lozano',
        },
    }

    print(f"Reading {csv_file}...")
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames

        for row in reader:
            stats['total_rows'] += 1
            row_id = row.get('id', '')

            # Check if this row needs author updates
            if row_id in author_updates:
                updates = author_updates[row_id]
                for field, value in updates.items():
                    row[field] = value
                stats['authors_added'] += 1
                print(f"  Row {row_id}: Added {updates.get('author_full_name', 'author data')}")

            rows.append(row)

    # Write updated CSV
    print(f"\nWriting updated CSV...")
    with open(csv_file, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    return stats

def main():
    script_dir = Path(__file__).parent
    csv_file = script_dir / 'src' / '_data' / 'books.csv'

    if not csv_file.exists():
        print(f"Error: CSV file not found at {csv_file}")
        return

    print("=" * 80)
    print("ADD MISSING AUTHORS SCRIPT")
    print("=" * 80)
    print(f"\nFile: {csv_file}\n")
    print("Adding author data for 6 music-related books:\n")
    print("  1397: Dylan - A Man Called Alias → Richard Williams")
    print("  1400: Bruce Springsteen: Songs → Bruce Springsteen")
    print("  1401: Cash - An American Man → Bill Miller")
    print("  1410: Journals by Kurt Cobain → Kurt Cobain (ed. Julie Grau)")
    print("  1429: Bob Dylan Scrapbook → Robert Santelli")
    print("  1430: Definitive Dylan Songbook → Bob Dylan (ed. Edward J. Lozano)")
    print()

    stats = add_missing_authors(str(csv_file))

    # Report results
    print("\n" + "=" * 80)
    print("AUTHORS ADDED")
    print("=" * 80)
    print(f"\nTotal rows processed: {stats['total_rows']:,}")
    print(f"Books with authors added: {stats['authors_added']}")
    print("\n" + "=" * 80)

if __name__ == '__main__':
    main()
