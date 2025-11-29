import csv
import sys

def analyze_books(filepath):
    total_books = 0
    no_tags = 0
    no_class = 0
    no_desc = 0
    no_metadata = 0
    has_isbn = 0
    missing_metadata_but_has_isbn = 0

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_books += 1
                tags = row.get('tags', '').strip()
                classification = row.get('classification', '').strip()
                description = row.get('description', '').strip()
                isbn = row.get('isbn_asin', '').strip()

                if not tags:
                    no_tags += 1
                if not classification:
                    no_class += 1
                if not description:
                    no_desc += 1

                metadata_missing = not tags and not classification and not description
                if metadata_missing:
                    no_metadata += 1

                if isbn:
                    has_isbn += 1
                    if metadata_missing:
                        missing_metadata_but_has_isbn += 1

        print(f"Total Books: {total_books}")
        print(f"Missing Tags: {no_tags} ({no_tags/total_books*100:.1f}%)")
        print(f"Missing Classification: {no_class} ({no_class/total_books*100:.1f}%)")
        print(f"Missing Description: {no_desc} ({no_desc/total_books*100:.1f}%)")
        print(f"Missing All Metadata: {no_metadata} ({no_metadata/total_books*100:.1f}%)")
        print(f"Has ISBN: {has_isbn} ({has_isbn/total_books*100:.1f}%)")
        print(f"Missing Metadata but has ISBN: {missing_metadata_but_has_isbn}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    analyze_books('src/_data/books.csv')
