import csv
import sys

def load_csv(filepath):
    data = {}
    fieldnames = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            if 'id' in row and row['id']:
                data[row['id']] = row
    return data, fieldnames

def compare_csvs(file1, file2):
    data1, fieldnames1 = load_csv(file1)
    data2, fieldnames2 = load_csv(file2)

    ids1 = set(data1.keys())
    ids2 = set(data2.keys())

    missing_in_2 = ids1 - ids2
    missing_in_1 = ids2 - ids1

    print(f"Total IDs in {file1}: {len(ids1)}")
    print(f"Total IDs in {file2}: {len(ids2)}")

    print("\n" + "="*80)
    print(f"IDs present in {file1} (books.csv) but missing in {file2} (books_fixed.csv) ({len(missing_in_2)}):")
    print("-" * 80)
    sorted_ids_1 = sorted(list(missing_in_2), key=lambda x: int(x) if x.isdigit() else x)
    print(", ".join(sorted_ids_1))
    # We assume these are the new ones we want to keep.

    print("\n" + "="*80)
    print(f"IDs present in {file2} (books_fixed.csv) but missing in {file1} (books.csv) ({len(missing_in_1)}):")
    print("-" * 80)
    sorted_ids_2 = sorted(list(missing_in_1), key=lambda x: int(x) if x.isdigit() else x)
    for i in sorted_ids_2:
        row = data2[i]
        print(f"ID: {i}")
        print(f"  Author: {row.get('author_first', '')} {row.get('author_last', '')}")
        print(f"  Title: {row.get('title', '')}")
        print(f"  Publisher: {row.get('publisher', '')}")
        print(f"  Year: {row.get('publication_year', '')}")
        print("-" * 20)

    common_ids = ids1.intersection(ids2)
    print("\n" + "="*80)
    print(f"Common IDs: {len(common_ids)}")

    diff_count = 0
    diff_fields = {}

    for i in common_ids:
        row1 = data1[i]
        row2 = data2[i]

        # Compare all fields present in both
        common_fields = set(row1.keys()).intersection(set(row2.keys()))
        row_diffs = []
        for field in common_fields:
            val1 = row1[field]
            val2 = row2[field]
            if val1 != val2:
                row_diffs.append(field)
                diff_fields[field] = diff_fields.get(field, 0) + 1

        if row_diffs:
            diff_count += 1
            # print(f"ID {i} differs in: {', '.join(row_diffs)}")
            # if diff_count < 5:
            #     print(f"  {file1}: {row1}")
            #     print(f"  {file2}: {row2}")

    print(f"\nNumber of common rows with differences: {diff_count}")
    if diff_fields:
        print("Fields with differences count:")
        for field, count in sorted(diff_fields.items(), key=lambda x: x[1], reverse=True):
            print(f"  {field}: {count}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python compare_books_csv.py <books.csv> <books_fixed.csv>")
        sys.exit(1)

    compare_csvs(sys.argv[1], sys.argv[2])
