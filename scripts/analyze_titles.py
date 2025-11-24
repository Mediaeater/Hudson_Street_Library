import csv
import json
import re

def load_keywords(json_path):
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    keyword_map = {}
    for collection in data['collections']:
        tags = collection.get('keywords', [])
        # Also use the category and name as keywords
        tags.append(collection.get('category'))
        tags.append(collection.get('name'))

        # Clean and unique
        tags = [t.lower() for t in tags if t]

        for tag in tags:
            if tag not in keyword_map:
                keyword_map[tag] = []
            keyword_map[tag].append(collection['id'])

    return keyword_map

def analyze_titles(books_path, keywords_map):
    total_missing = 0
    recoverable = 0

    print("--- Analysis of Title Inference ---")

    with open(books_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            tags = row.get('tags', '').strip()
            classification = row.get('classification', '').strip()
            description = row.get('description', '').strip()

            # Focus on books with NO metadata
            if not tags and not classification and not description:
                total_missing += 1
                title = row.get('title', '').lower()
                author = row.get('author_full_name', '').lower()

                found_tags = set()

                # Check against keywords
                # We sort keywords by length descending to match phrases first
                sorted_keywords = sorted(keywords_map.keys(), key=len, reverse=True)

                for keyword in sorted_keywords:
                    # Simple substring match for now, but word boundary is better
                    pattern = r'\b' + re.escape(keyword) + r'\b'
                    if re.search(pattern, title) or re.search(pattern, author):
                        found_tags.add(keyword)

                if found_tags:
                    recoverable += 1
                    if recoverable <= 10: # Sample output
                        print(f"Title: {row.get('title')}")
                        print(f"  -> Inferred Tags: {', '.join(found_tags)}")

    print(f"\nTotal books with no metadata: {total_missing}")
    print(f"Recoverable via Title/Author keywords: {recoverable} ({recoverable/total_missing*100:.1f}%)")

if __name__ == "__main__":
    keywords = load_keywords('src/_data/libraryCollections.json')
    analyze_titles('src/_data/books.csv', keywords)
