#!/usr/bin/env python3
"""
Link orphaned book cover images to their books in CSV by matching ISBNs and filenames.
"""

import os
import csv
import re
from collections import defaultdict

# Paths
CSV_PATH = 'src/_data/books.csv'
IMAGES_DIR = 'src/assets/images/books'
OUTPUT_CSV = 'src/_data/books_updated.csv'
REPORT_FILE = 'orphaned_images_report.txt'

def normalize_isbn(isbn):
    """Remove hyphens and spaces from ISBN"""
    return isbn.replace('-', '').replace(' ', '').strip()

def get_all_images():
    """Get all image files from books directory"""
    images = []
    for f in os.listdir(IMAGES_DIR):
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            images.append(f)
    return sorted(images)

def get_linked_images():
    """Get set of already linked image filenames from CSV"""
    linked = set()
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
        for match in re.findall(r'/assets/images/books/([^,"\s]+)', content):
            linked.add(match)
    return linked

def extract_isbn_from_filename(filename):
    """Extract ISBN from filename if present"""
    # Look for ISBN-13 pattern (starts with 978 or 979)
    match = re.search(r'(97[89]\d{10})', filename)
    if match:
        return match.group(1)

    # Look for ISBN-10 pattern or other numeric codes
    match = re.search(r'(\d{10,13})', filename)
    if match:
        return match.group(1)

    return None

def load_books():
    """Load all books from CSV into list of dicts"""
    books = []
    with open(CSV_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for row in reader:
            books.append(row)
    return books

def match_image_to_book(image_filename, books):
    """
    Try to match an image to a book by:
    1. ISBN in filename
    2. Author name + title in filename
    3. Title keywords in filename
    """
    matches = []

    # Extract ISBN from filename
    img_isbn = extract_isbn_from_filename(image_filename)

    for book in books:
        score = 0
        reasons = []

        # Match by ISBN
        book_isbn = normalize_isbn(book.get('isbn_asin', ''))
        if book_isbn and book_isbn != 'NULL' and img_isbn:
            if img_isbn in book_isbn or book_isbn in img_isbn:
                score += 100
                reasons.append(f"ISBN match: {book_isbn}")

        # Match by author last name
        author_last = book.get('author_last', '').strip()
        if author_last and author_last != 'NULL':
            # Check if author name is in filename (case insensitive)
            if author_last.lower() in image_filename.lower():
                score += 30
                reasons.append(f"Author match: {author_last}")

        # Match by title keywords
        title = book.get('title', '').strip()
        if title and title != 'NULL' and len(title) > 5:
            # Extract significant words from title (3+ chars)
            title_words = [w for w in re.findall(r'\w+', title) if len(w) > 3]
            # Check how many title words appear in filename
            matches_count = sum(1 for word in title_words if word.lower() in image_filename.lower())
            if matches_count >= 2:
                score += matches_count * 10
                reasons.append(f"Title words: {matches_count}")

        if score > 0:
            matches.append({
                'book': book,
                'score': score,
                'reasons': reasons
            })

    # Return best match if score is high enough
    if matches:
        matches.sort(key=lambda x: x['score'], reverse=True)
        best = matches[0]
        if best['score'] >= 100:  # Require at least ISBN match for auto-linking
            return best

    return None

def main():
    print("=" * 80)
    print("ORPHANED IMAGE LINKER")
    print("=" * 80)

    # Get images
    all_images = get_all_images()
    linked_images = get_linked_images()
    orphaned = [img for img in all_images if img not in linked_images]

    print(f"\nTotal images: {len(all_images)}")
    print(f"Already linked: {len(linked_images)}")
    print(f"Orphaned: {len(orphaned)}")

    # Load books
    books = load_books()
    print(f"Total books in CSV: {len(books)}")

    # Process first 50 orphaned images
    limit = 50
    print(f"\n{'='*80}")
    print(f"PROCESSING FIRST {limit} ORPHANED IMAGES")
    print(f"{'='*80}\n")

    matched = []
    unmatched = []

    for img in orphaned[:limit]:
        result = match_image_to_book(img, books)

        if result:
            matched.append({
                'image': img,
                'book_id': result['book']['id'],
                'author': result['book']['author_full_name'],
                'title': result['book']['title'][:50],
                'score': result['score'],
                'reasons': ', '.join(result['reasons'])
            })
        else:
            unmatched.append(img)

    # Print results
    print(f"\n✓ MATCHED: {len(matched)} images")
    print(f"✗ UNMATCHED: {len(unmatched)} images\n")

    print("MATCHED IMAGES (will be linked):")
    print("-" * 80)
    for i, m in enumerate(matched, 1):
        print(f"{i}. {m['image']}")
        print(f"   → Book #{m['book_id']}: {m['author']} - {m['title']}")
        print(f"   → Match: {m['reasons']} (score: {m['score']})")
        print()

    # Update CSV with matches
    updated_count = 0
    updated_books = []

    for book in books:
        # Check if any matched image belongs to this book
        for m in matched:
            if m['book_id'] == book['id']:
                # Update image_url field
                book['image_url'] = f"/assets/images/books/{m['image']}"
                updated_count += 1
                break
        updated_books.append(book)

    # Write updated CSV
    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        fieldnames = books[0].keys()
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_books)

    print(f"\n{'='*80}")
    print(f"RESULTS")
    print(f"{'='*80}")
    print(f"✓ Updated {updated_count} books with image paths")
    print(f"✓ Updated CSV saved to: {OUTPUT_CSV}")

    # Generate full report
    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write("=" * 80 + "\n")
        f.write("ORPHANED IMAGES REPORT\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Total orphaned images: {len(orphaned)}\n")
        f.write(f"Processed: {limit}\n")
        f.write(f"Matched: {len(matched)}\n")
        f.write(f"Unmatched: {len(unmatched)}\n\n")

        f.write("=" * 80 + "\n")
        f.write("ALL ORPHANED IMAGES (for manual review)\n")
        f.write("=" * 80 + "\n\n")

        for i, img in enumerate(orphaned, 1):
            f.write(f"{i}. {img}\n")

            # Try to extract useful info from filename
            isbn = extract_isbn_from_filename(img)
            if isbn:
                f.write(f"   ISBN in filename: {isbn}\n")

            # Extract apparent author/title from filename
            parts = img.replace('.jpg', '').replace('.jpeg', '').replace('.png', '').split('_')
            if len(parts) >= 2:
                f.write(f"   Apparent: {parts[0]} - {' '.join(parts[1:-1]) if len(parts) > 2 else parts[1]}\n")

            f.write("\n")

    print(f"✓ Full report saved to: {REPORT_FILE}")
    print(f"\nNext steps:")
    print(f"1. Review {OUTPUT_CSV} before replacing the original")
    print(f"2. Review {REPORT_FILE} for all orphaned images")
    print(f"3. Run: cp {OUTPUT_CSV} {CSV_PATH}")
    print()

if __name__ == '__main__':
    main()
