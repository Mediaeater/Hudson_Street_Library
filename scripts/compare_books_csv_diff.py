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

    common_ids = ids1.intersection(ids2)

    diff_count = 0

    print(f"Comparing {file1} (File 1) vs {file2} (File 2)")
    print("=" * 80)

    for i in common_ids:
        row1 = data1[i]
        row2 = data2[i]

        common_fields = set(row1.keys()).intersection(set(row2.keys()))
        row_diffs = []
        for field in common_fields:
            val1 = row1[field]
            val2 = row2[field]
            if val1 != val2:
                row_diffs.append((field, val1, val2))

        if row_diffs:
            diff_count += 1
            if diff_count <= 10: # Print first 10 diffs
                print(f"ID {i}:")
                for field, val1, val2 in row_diffs:
                    print(f"  {field}:")
                    print(f"    File 1: '{val1}'")
                    print(f"    File 2: '{val2}'")
                print("-" * 40)

    print(f"\nTotal rows with differences: {diff_count}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python compare_books_csv.py <books.csv> <books_fixed.csv>")
        sys.exit(1)

    compare_csvs(sys.argv[1], sys.argv[2])
