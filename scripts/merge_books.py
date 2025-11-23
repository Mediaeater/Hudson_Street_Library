import csv
import sys
import os

def merge_books_csv(books_csv_path, books_fixed_csv_path):
    print(f"Merging {books_fixed_csv_path} missing rows into {books_csv_path}")

    # Load books.csv
    books_rows = []
    books_fieldnames = []
    with open(books_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        books_fieldnames = reader.fieldnames
        for row in reader:
            books_rows.append(row)

    books_ids = set(row['id'] for row in books_rows if row['id'])
    print(f"Loaded {len(books_rows)} rows from {books_csv_path}")

    # Load books_fixed.csv
    fixed_rows = {}
    with open(books_fixed_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['id']:
                fixed_rows[row['id']] = row

    # Identify missing IDs
    ids_to_restore = ['909', '911', '1254', '1256', '1264', '1281', '1292', '1300', '1556', '1557']
    restored_count = 0

    for id_to_restore in ids_to_restore:
        if id_to_restore in fixed_rows and id_to_restore not in books_ids:
            print(f"Restoring ID {id_to_restore}")
            row_to_add = fixed_rows[id_to_restore]
            # Ensure row has all fields from books.csv
            new_row = {field: row_to_add.get(field, '') for field in books_fieldnames}
            books_rows.append(new_row)
            restored_count += 1
        elif id_to_restore in books_ids:
            print(f"ID {id_to_restore} already exists in books.csv, skipping restore.")
        else:
            print(f"ID {id_to_restore} not found in books_fixed.csv, cannot restore.")

    # Sort by ID numerically
    try:
        books_rows.sort(key=lambda x: int(x['id']) if x['id'].isdigit() else float('inf'))
    except ValueError:
        # Fallback if IDs are not all numeric
        print("Warning: Non-numeric IDs found, sorting lexicographically")
        books_rows.sort(key=lambda x: x['id'])

    # Write back to books.csv
    with open(books_csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=books_fieldnames)
        writer.writeheader()
        writer.writerows(books_rows)

    print(f"Merged {restored_count} rows. Total rows: {len(books_rows)}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python merge_books.py <books.csv> <books_fixed.csv>")
        sys.exit(1)

    merge_books_csv(sys.argv[1], sys.argv[2])
