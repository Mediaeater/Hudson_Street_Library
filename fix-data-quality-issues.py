#!/usr/bin/env python3
"""
Fix data quality issues identified in the CSV analysis:
1. Invalid ISBNs
2. Misplaced URLs (category tags in URL fields)
3. Inconsistent NULL representations (NA, n/a)
"""

import csv
from datetime import datetime
from pathlib import Path

def fix_data_quality(csv_file):
    """Fix all data quality issues."""

    # Create backup
    csv_path = Path(csv_file)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = csv_path.parent / 'backups'
    backup_dir.mkdir(exist_ok=True)
    backup_path = backup_dir / f"{csv_path.stem}_backup_{timestamp}{csv_path.suffix}"
    print(f"Creating backup: {backup_path}")
    with open(csv_file, 'rb') as src:
        with open(backup_path, 'wb') as dst:
            dst.write(src.read())

    # Read CSV
    rows = []
    fieldnames = None
    stats = {
        'total_rows': 0,
        'isbn_fixes': 0,
        'url_fixes': 0,
        'null_fixes': 0,
    }

    print(f"Reading {csv_file}...")
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames

        for row in reader:
            stats['total_rows'] += 1
            row_id = row.get('id', '')

            # Fix invalid ISBNs
            isbn = row.get('isbn_asin', '')

            # Row 2: -08716 -> 0-08716-193-6 (McGraw-Hill standard format)
            if row_id == '2' and isbn == '-08716':
                row['isbn_asin'] = ''  # Remove invalid partial ISBN
                stats['isbn_fixes'] += 1

            # Row 40: 978863356279 -> 9783863356279 (add missing digit)
            elif row_id == '40' and isbn == '978863356279':
                row['isbn_asin'] = '9783863356279'
                stats['isbn_fixes'] += 1

            # Row 67: 978194288455 -> 9781942884552 (complete ISBN-13)
            elif row_id == '67' and isbn == '978194288455':
                row['isbn_asin'] = '9781942884552'
                stats['isbn_fixes'] += 1

            # Row 207: -x -> empty
            elif row_id == '207' and isbn == '-x':
                row['isbn_asin'] = ''
                stats['isbn_fixes'] += 1

            # Row 222: 978-0-9574724-6-4 -> 9780957472464 (remove hyphens)
            elif row_id == '222' and '978-0-9574724-6-4' in isbn:
                row['isbn_asin'] = '9780957472464'
                stats['isbn_fixes'] += 1

            # Row 415: x -> empty
            elif row_id == '415' and isbn == 'x':
                row['isbn_asin'] = ''
                stats['isbn_fixes'] += 1

            # Row 566: 978909034193 -> 9789090341934 (add checksum digit)
            elif row_id == '566' and isbn == '978909034193':
                row['isbn_asin'] = '9789090341934'
                stats['isbn_fixes'] += 1

            # Row 604: 97808109121 -> empty (incomplete, can't fix without source)
            elif row_id == '604' and isbn == '97808109121':
                row['isbn_asin'] = ''
                stats['isbn_fixes'] += 1

            # Row 646: 00421 -> empty
            elif row_id == '646' and isbn == '00421':
                row['isbn_asin'] = ''
                stats['isbn_fixes'] += 1

            # Row 837: 00131 -> empty
            elif row_id == '837' and isbn == '00131':
                row['isbn_asin'] = ''
                stats['isbn_fixes'] += 1

            # Row 981: 0005 -> empty
            elif row_id == '981' and isbn == '0005':
                row['isbn_asin'] = ''
                stats['isbn_fixes'] += 1

            # Row 1034: 978807091256 -> 9788070912560 (add checksum)
            elif row_id == '1034' and isbn == '978807091256':
                row['isbn_asin'] = '9788070912560'
                stats['isbn_fixes'] += 1

            # Row 1098: 97809957434110 -> 9780995743410 (remove extra digit)
            elif row_id == '1098' and isbn == '97809957434110':
                row['isbn_asin'] = '9780995743410'
                stats['isbn_fixes'] += 1

            # Row 1262: 978-4-910574-01-1 -> 9784910574011 (remove hyphens)
            elif row_id == '1262' and '978-4-910574-01-1' in isbn:
                row['isbn_asin'] = '9784910574011'
                stats['isbn_fixes'] += 1

            # Rows 1419-1424: NA -> empty
            if isbn in ['NA', 'n/a', 'N/A']:
                row['isbn_asin'] = ''
                stats['null_fixes'] += 1

            # Fix misplaced URLs
            artist_url = row.get('artist_url', '')
            publisher_url = row.get('publisher_url', '')

            # Row 566: Descriptive text in artist_url
            if row_id == '566' and 'Includes: Including a signed print' in artist_url:
                row['artist_url'] = ''
                stats['url_fixes'] += 1

            # Row 823: "Photography" in publisher_url
            if row_id == '823' and publisher_url == 'Photography':
                row['publisher_url'] = ''
                stats['url_fixes'] += 1

            # Row 1057: ISBN in artist_url field (full row data corruption)
            if row_id == '1057':
                # This row has data corruption - reset to basic data
                row['artist_url'] = ''
                row['publisher_url'] = ''
                stats['url_fixes'] += 1

            # Row 1116: Categories in publisher_url
            if row_id == '1116' and 'Appropriation (Art)' in publisher_url:
                row['publisher_url'] = 'https://www.romapublications.org/'
                stats['url_fixes'] += 1

            # Rows 1241, 1260, 1261, 1265-1267, 1281: "Individual Artist/Photographer Monographs" in publisher_url
            if row_id in ['1241', '1260', '1261', '1265', '1266', '1267', '1281']:
                if 'Individual' in publisher_url and 'Monograph' in publisher_url:
                    row['publisher_url'] = ''
                    stats['url_fixes'] += 1

            # Fix inconsistent NULL in author fields (rows 157, 1192-1203)
            author_first = row.get('author_first', '')
            if author_first in ['NA', 'n/a', 'N/A']:
                row['author_first'] = ''
                stats['null_fixes'] += 1

            # Row 32: n/a in editor and contributors
            if row_id == '32':
                if row.get('editor', '') == 'n/a':
                    row['editor'] = ''
                    stats['null_fixes'] += 1
                if row.get('contributors', '') == 'n/a':
                    row['contributors'] = ''
                    stats['null_fixes'] += 1

            rows.append(row)

    # Write fixed CSV
    print(f"Writing fixed CSV...")
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
    print("DATA QUALITY FIX SCRIPT")
    print("=" * 80)
    print(f"\nFile: {csv_file}\n")
    print("Fixing:")
    print("  - 18 invalid ISBNs")
    print("  - 11 misplaced URLs")
    print("  - Inconsistent NULL representations\n")
    print("Proceeding with fixes...")

    stats = fix_data_quality(str(csv_file))

    # Report results
    print("\n" + "=" * 80)
    print("FIXES COMPLETE")
    print("=" * 80)
    print(f"\nTotal rows processed: {stats['total_rows']:,}")
    print(f"ISBN fixes: {stats['isbn_fixes']}")
    print(f"URL fixes: {stats['url_fixes']}")
    print(f"NULL consistency fixes: {stats['null_fixes']}")
    print(f"Total fixes: {stats['isbn_fixes'] + stats['url_fixes'] + stats['null_fixes']}")
    print("\n" + "=" * 80)

if __name__ == '__main__':
    main()
