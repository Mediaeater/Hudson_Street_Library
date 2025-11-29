import csv
import json
import re
import sys
import argparse
from collections import defaultdict
import shutil
import datetime
import urllib.request
import urllib.error
import time

# Extended keyword dictionary
KEYWORD_MAP = {
    # Art
    "painting": "Art",
    "sculpture": "Art",
    "drawings": "Art",
    "sketchbook": "Art",
    "watercolour": "Art",
    "watercolor": "Art",
    "installation": "Art",
    "exhibition": "Art",
    "gallery": "Art",
    "museum": "Art",
    "modern art": "Art",
    "contemporary art": "Art",
    "art history": "Art",
    "artist": "Art",
    "painter": "Art",
    "sculptor": "Art",
    "louise bourgeois": "Art",
    "richard prince": "Art",
    "warhol": "Art",
    "picasso": "Art",
    "matisse": "Art",
    "dali": "Art",
    "basquiat": "Art",

    # Photography
    "photography": "Photography",
    "photographer": "Photography",
    "photographs": "Photography",
    "photo": "Photography",
    "photos": "Photography",
    "camera": "Photography",
    "portrait": "Photography",
    "landscape": "Photography",
    "daguerreotype": "Photography",
    "polaroid": "Photography",
    "ansel adams": "Photography",
    "cartier-bresson": "Photography",
    "leibovitz": "Photography",
    "arbus": "Photography",
    "avedon": "Photography",
    "mapplethorpe": "Photography",
    "berenice abbott": "Photography",
    "stieglitz": "Photography",
    "steichen": "Photography",
    "man ray": "Photography",

    # Architecture & Design
    "architecture": "Architecture",
    "architect": "Architecture",
    "building": "Architecture",
    "houses": "Architecture",
    "interiors": "Design",
    "design": "Design",
    "graphic design": "Design",
    "typography": "Design",
    "poster": "Design",
    "furniture": "Design",
    "fashion": "Fashion",
    "costume": "Fashion",
    "textile": "Fashion",
    "style": "Fashion",
    "vogue": "Fashion",
    "couture": "Fashion",
    "matsuda": "Fashion",
    "comme des garçons": "Fashion",
    "rei kawakubo": "Fashion",
    "yohji yamamoto": "Fashion",
    "issey miyake": "Fashion",

    # History & Biography
    "history": "History",
    "biography": "Biography",
    "autobiography": "Biography",
    "memoir": "Biography",
    "diary": "Biography",
    "letters": "Biography",
    "journal": "Biography",
    "life of": "Biography",

    # Specific Topics
    "nyc": "New York City",
    "new york": "New York City",
    "manhattan": "New York City",
    "brooklyn": "New York City",
    "harlem": "New York City",
    "music": "Music",
    "musician": "Music",
    "jazz": "Music",
    "rock": "Music",
    "concert": "Music",
    "cinema": "Film",
    "film": "Film",
    "movie": "Film",
    "hollywood": "Film",
    "travel": "Travel",
    "guide": "Travel",
    "journey": "Travel",
    "cooking": "Cooking",
    "food": "Cooking",
    "recipes": "Cooking",
    "poetry": "Poetry",
    "poems": "Poetry",
    "fiction": "Fiction",
    "novel": "Fiction",
    "stories": "Fiction",
    "philosophy": "Philosophy",
    "science": "Science",
    "nature": "Nature",
    "garden": "Nature",
    "plants": "Nature",
    "birds": "Nature",
    "animals": "Nature",

    # Formats
    "catalog": "Catalog",
    "catalogue": "Catalog",
    "handbook": "Reference",
    "dictionary": "Reference",
    "encyclopedia": "Reference",
    "atlas": "Reference",
    "magazine": "Periodical",
    "journal": "Periodical",
    "review": "Periodical"
}

def fetch_open_library_metadata(isbn):
    """
    Fetches metadata from Open Library API for a given ISBN.
    Returns a list of subject names (tags) if found.
    """
    if not isbn:
        return []

    # Clean ISBN
    isbn = re.sub(r'[^0-9X]', '', isbn.upper())

    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&jscmd=data&format=json"

    try:
        # User-Agent is polite
        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'HudsonStreetLibrary/1.0 (internal tool; contact@hudsonstreetlibrary.org)'}
        )

        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                book_data = data.get(f"ISBN:{isbn}")

                if book_data:
                    subjects = []
                    # Extract subjects
                    if 'subjects' in book_data:
                        subjects.extend([s['name'] for s in book_data['subjects']])

                    # Simplify subjects to broad categories if possible, or return as is
                    # For now, let's just return the top 5 subjects to avoid clutter
                    return subjects[:5]

    except Exception as e:
        print(f"Warning: Failed to fetch metadata for ISBN {isbn}: {e}")

    return []

def apply_heuristics(title, author, publisher):
    tags = set()
    title_lower = title.lower()

    # Check for "Exhibition of" or similar
    if "exhibition" in title_lower or "catalog" in title_lower:
        tags.add("Exhibition Catalog")

    # Check for specific publishers known for genres
    if publisher:
        pub_lower = publisher.lower()
        if "taschen" in pub_lower:
            tags.add("Art Book")
        if "aperture" in pub_lower:
            tags.add("Photography")
        if "phaidon" in pub_lower:
            tags.add("Art Book")

    return tags

def infer_tags(row, use_network=False):
    inferred_tags = set()

    # Combine relevant text fields
    text = f"{row.get('title', '')} {row.get('author_full_name', '')} {row.get('publisher', '')}".lower()

    # Keyword matching
    sorted_keywords = sorted(KEYWORD_MAP.keys(), key=len, reverse=True)

    for keyword in sorted_keywords:
        pattern = r'\b' + re.escape(keyword) + r'\b'
        if re.search(pattern, text):
            inferred_tags.add(KEYWORD_MAP[keyword])

    # Heuristics
    inferred_tags.update(apply_heuristics(row.get('title', ''), row.get('author_full_name', ''), row.get('publisher', '')))

    # Network Lookup (ISBN)
    # Only look up if we have few tags (less than 2), to enrich sparse records
    if use_network and len(inferred_tags) < 2 and row.get('isbn_asin'):
        print(f"Fetching Open Library data for {row.get('title')[:30]} ({row.get('isbn_asin')})...")
        ol_tags = fetch_open_library_metadata(row.get('isbn_asin'))
        if ol_tags:
            print(f"  -> Found: {', '.join(ol_tags)}")
            inferred_tags.update(ol_tags)
        time.sleep(0.5) # Rate limiting

    return list(inferred_tags)

def main():
    parser = argparse.ArgumentParser(description="Enrich book tags based on metadata inference.")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without writing to file.")
    parser.add_argument("--file", default="src/_data/books.csv", help="Path to books.csv")
    parser.add_argument("--network", action="store_true", help="Enable network calls to Open Library API (slow).")
    args = parser.parse_args()

    filepath = args.file

    print(f"Reading from {filepath}...")

    updated_rows = []
    stats = {
        "total": 0,
        "enriched": 0,
        "already_tagged": 0
    }

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames

            for row in reader:
                stats["total"] += 1
                current_tags = row.get('tags', '').strip()

                existing_tag_set = set([t.strip() for t in current_tags.split(',') if t.strip()])

                # Logic: If book has very few tags, try to enrich it
                new_tags = infer_tags(row, use_network=args.network)
                added_tags = []

                for tag in new_tags:
                    # Clean tag (remove commas if API returned them)
                    clean_tag = tag.replace(',', '')
                    if clean_tag not in existing_tag_set:
                        existing_tag_set.add(clean_tag)
                        added_tags.append(clean_tag)

                if added_tags:
                    stats["enriched"] += 1
                    if args.dry_run:
                        print(f"[Enrich] {row['title'][:50]}... -> Added: {', '.join(added_tags)}")
                else:
                    if current_tags:
                        stats["already_tagged"] += 1

                # Update row
                row['tags'] = ", ".join(sorted(list(existing_tag_set)))
                updated_rows.append(row)

    except FileNotFoundError:
        print(f"Error: File {filepath} not found.")
        sys.exit(1)

    print("-" * 30)
    print(f"Total processed: {stats['total']}")
    print(f"Books enriched: {stats['enriched']}")

    if args.dry_run:
        print("Dry run complete. No changes written.")
    else:
        # Backup
        backup_path = filepath + ".backup_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(filepath, backup_path)
        print(f"Backup created at {backup_path}")

        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(updated_rows)
        print(f"Successfully updated {filepath}")

if __name__ == "__main__":
    main()
