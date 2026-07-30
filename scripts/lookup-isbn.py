#!/usr/bin/env python3
"""
ISBN Lookup Tool - Fetch LCC classification and metadata from multiple sources.

Usage:
    python3 scripts/lookup-isbn.py 9789685979146
    python3 scripts/lookup-isbn.py 978-3-03860-434-1

Data Sources (in order):
    1. OpenLibrary API (openlibrary.org)
    2. Library of Congress SRU API (loc.gov)
    3. Google Books API (fallback for basic metadata)

Output:
    Formatted metadata suitable for CSV import including:
    - LCC classification
    - LCCN (Library of Congress Control Number)
    - Title, Author, Publisher, Year
    - Subject headings
"""

import argparse
import json
import sys
import urllib.parse
import urllib.request
from typing import Any
from xml.etree import ElementTree as ET


class ISBNLookup:
    """Handles ISBN lookups across multiple data sources."""

    def __init__(self, isbn: str):
        """Initialize with ISBN, normalizing format."""
        self.isbn = self._normalize_isbn(isbn)
        self.isbn_display = isbn
        self.metadata: dict[str, Any] = {}

    @staticmethod
    def _normalize_isbn(isbn: str) -> str:
        """Remove hyphens and spaces from ISBN."""
        return isbn.replace('-', '').replace(' ', '')

    def fetch_all(self) -> dict[str, Any]:
        """Try all data sources in order until successful."""
        print(f"Looking up ISBN: {self.isbn_display}")
        print("-" * 80)

        # Try OpenLibrary first (most complete and reliable for LCC)
        if self._try_openlibrary():
            return self.metadata

        # Try Library of Congress SRU
        if self._try_loc_sru():
            return self.metadata

        # Try Google Books as fallback (no LCC but has basic metadata)
        if self._try_google_books():
            return self.metadata

        print("\nERROR: ISBN not found in any data source")
        return {}

    def _try_openlibrary(self) -> bool:
        """Fetch data from OpenLibrary API."""
        print("\n[1/3] Trying OpenLibrary API...")

        try:
            # Try the main ISBN endpoint
            url = f"https://openlibrary.org/isbn/{self.isbn}.json"
            response = self._fetch_url(url)

            if response:
                data = json.loads(response)
                self._parse_openlibrary(data)

                # If we didn't get LCC, try the Books API
                if not self.metadata.get('lcc'):
                    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{self.isbn}&format=json&jscmd=data"
                    response = self._fetch_url(url)
                    if response:
                        books_data = json.loads(response)
                        if f"ISBN:{self.isbn}" in books_data:
                            self._parse_openlibrary_books_api(books_data[f"ISBN:{self.isbn}"])

                print("✓ Found in OpenLibrary")
                return True

        except Exception as e:
            print(f"✗ OpenLibrary lookup failed: {e}")

        return False

    def _parse_openlibrary(self, data: dict) -> None:
        """Parse OpenLibrary JSON response."""
        # Title
        self.metadata['title'] = data.get('title', '')
        if 'subtitle' in data:
            self.metadata['title'] += f": {data['subtitle']}"

        # Authors - need to fetch author names from author keys
        if 'authors' in data:
            authors = []
            for author_ref in data['authors']:
                if isinstance(author_ref, dict) and 'key' in author_ref:
                    author_name = self._fetch_openlibrary_author(author_ref['key'])
                    if author_name:
                        authors.append(author_name)
            self.metadata['authors'] = authors

        # Publishers
        self.metadata['publishers'] = data.get('publishers', [])

        # Publication date
        self.metadata['year'] = data.get('publish_date', '')

        # LCC Classifications
        if 'lc_classifications' in data:
            self.metadata['lcc'] = data['lc_classifications']

        # LCCN
        if 'lccn' in data:
            lccn_list = data['lccn']
            if lccn_list:
                self.metadata['lccn'] = lccn_list[0] if isinstance(lccn_list, list) else lccn_list

        # Subjects
        self.metadata['subjects'] = data.get('subjects', [])

    def _parse_openlibrary_books_api(self, data: dict) -> None:
        """Parse OpenLibrary Books API response to supplement data."""
        # Fill in missing LCC
        if 'classifications' in data and 'lc_classifications' in data['classifications']:
            if not self.metadata.get('lcc'):
                self.metadata['lcc'] = data['classifications']['lc_classifications']

        # Fill in missing authors
        if 'authors' in data and not self.metadata.get('authors'):
            self.metadata['authors'] = [a.get('name', '') for a in data['authors']]

        # Fill in missing subjects
        if 'subjects' in data and not self.metadata.get('subjects'):
            subjects = [s.get('name', '') for s in data['subjects']]
            self.metadata['subjects'] = subjects

    def _fetch_openlibrary_author(self, author_key: str) -> str | None:
        """Fetch author name from OpenLibrary author key."""
        try:
            url = f"https://openlibrary.org{author_key}.json"
            response = self._fetch_url(url, timeout=5)
            if response:
                author_data = json.loads(response)
                return author_data.get('name', '')
        except:
            pass
        return None

    def _try_loc_sru(self) -> bool:
        """Fetch data from Library of Congress SRU API."""
        print("\n[2/3] Trying Library of Congress SRU API...")

        try:
            # Build SRU query for ISBN search
            query = f'bath.isbn={self.isbn}'
            params = {
                'version': '1.1',
                'operation': 'searchRetrieve',
                'query': query,
                'recordSchema': 'mods',
                'maximumRecords': '1'
            }

            url = f"http://lx2.loc.gov:210/LCDB?{urllib.parse.urlencode(params)}"
            response = self._fetch_url(url, timeout=10)

            if response:
                self._parse_loc_sru(response)
                if self.metadata.get('title'):
                    print("✓ Found in Library of Congress")
                    return True

        except Exception as e:
            print(f"✗ LOC SRU lookup failed: {e}")

        return False

    def _parse_loc_sru(self, xml_response: str) -> None:
        """Parse Library of Congress SRU XML response."""
        try:
            # Parse XML
            root = ET.fromstring(xml_response)

            # Define namespaces
            ns = {
                'srw': 'http://www.loc.gov/zing/srw/',
                'mods': 'http://www.loc.gov/mods/v3'
            }

            # Find the first record
            record = root.find('.//srw:recordData/mods:mods', ns)
            if record is None:
                return

            # Title
            title_elem = record.find('.//mods:titleInfo/mods:title', ns)
            if title_elem is not None:
                self.metadata['title'] = title_elem.text or ''

            # Subtitle
            subtitle_elem = record.find('.//mods:titleInfo/mods:subTitle', ns)
            if subtitle_elem is not None and subtitle_elem.text:
                self.metadata['title'] += f": {subtitle_elem.text}"

            # Authors
            authors = []
            for name in record.findall('.//mods:name[@type="personal"]', ns):
                name_part = name.find('.//mods:namePart', ns)
                if name_part is not None and name_part.text:
                    authors.append(name_part.text)
            self.metadata['authors'] = authors

            # Publishers
            publishers = []
            for pub in record.findall('.//mods:originInfo/mods:publisher', ns):
                if pub.text:
                    publishers.append(pub.text)
            self.metadata['publishers'] = publishers

            # Year
            date_elem = record.find('.//mods:originInfo/mods:dateIssued', ns)
            if date_elem is not None:
                self.metadata['year'] = date_elem.text or ''

            # LCC Classification
            lcc_list = []
            for classification in record.findall('.//mods:classification[@authority="lcc"]', ns):
                if classification.text:
                    lcc_list.append(classification.text)
            if lcc_list:
                self.metadata['lcc'] = lcc_list

            # LCCN
            for identifier in record.findall('.//mods:identifier[@type="lccn"]', ns):
                if identifier.text:
                    self.metadata['lccn'] = identifier.text
                    break

            # Subjects
            subjects = []
            for subject in record.findall('.//mods:subject/mods:topic', ns):
                if subject.text:
                    subjects.append(subject.text)
            self.metadata['subjects'] = subjects

        except Exception as e:
            print(f"Error parsing LOC SRU response: {e}")

    def _try_google_books(self) -> bool:
        """Fetch data from Google Books API (fallback, no LCC)."""
        print("\n[3/3] Trying Google Books API (fallback)...")

        try:
            url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{self.isbn}"
            response = self._fetch_url(url)

            if response:
                data = json.loads(response)
                if 'items' in data and len(data['items']) > 0:
                    self._parse_google_books(data['items'][0])
                    print("✓ Found in Google Books (limited metadata, no LCC)")
                    return True

        except Exception as e:
            print(f"✗ Google Books lookup failed: {e}")

        return False

    def _parse_google_books(self, item: dict) -> None:
        """Parse Google Books API response."""
        volume_info = item.get('volumeInfo', {})

        self.metadata['title'] = volume_info.get('title', '')
        self.metadata['authors'] = volume_info.get('authors', [])
        self.metadata['publishers'] = [volume_info.get('publisher', '')] if volume_info.get('publisher') else []
        self.metadata['year'] = volume_info.get('publishedDate', '')
        self.metadata['subjects'] = volume_info.get('categories', [])

        # Google Books doesn't provide LCC or LCCN
        print("  Note: Google Books does not provide LCC classification or LCCN")

    @staticmethod
    def _fetch_url(url: str, timeout: int = 15) -> str | None:
        """Fetch URL content with error handling."""
        try:
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'ISBN-Lookup-Tool/1.0 (Library Cataloging)'}
            )
            with urllib.request.urlopen(req, timeout=timeout) as response:
                return response.read().decode('utf-8')
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            raise
        except Exception:
            raise

    def format_output(self) -> str:
        """Format metadata for display and CSV import."""
        if not self.metadata:
            return "No data found"

        output = []
        output.append("\nMETADATA FOUND:")
        output.append("=" * 80)

        # ISBN
        output.append(f"ISBN:        {self.isbn_display}")

        # LCC Classification
        lcc = self.metadata.get('lcc', [])
        if lcc:
            lcc_str = lcc[0] if isinstance(lcc, list) else lcc
            output.append(f"LCC:         {lcc_str}")
        else:
            output.append("LCC:         [NOT FOUND]")

        # LCCN
        lccn = self.metadata.get('lccn', '')
        if lccn:
            output.append(f"LCCN:        {lccn}")
        else:
            output.append("LCCN:        [NOT FOUND]")

        # Title
        title = self.metadata.get('title', '')
        output.append(f"Title:       {title}")

        # Authors
        authors = self.metadata.get('authors', [])
        if authors:
            authors_str = '; '.join(authors)
            output.append(f"Authors:     {authors_str}")

        # Publishers
        publishers = self.metadata.get('publishers', [])
        if publishers:
            pub_str = publishers[0] if isinstance(publishers, list) else publishers
            output.append(f"Publisher:   {pub_str}")

        # Year
        year = self.metadata.get('year', '')
        output.append(f"Year:        {year}")

        # Subjects
        subjects = self.metadata.get('subjects', [])
        if subjects:
            output.append("\nSubjects:")
            for subject in subjects[:10]:  # Limit to first 10
                output.append(f"  - {subject}")
            if len(subjects) > 10:
                output.append(f"  ... and {len(subjects) - 10} more")

        # CSV-ready format
        output.append("\n" + "=" * 80)
        output.append("CSV FORMAT (for copy-paste):")
        output.append("-" * 80)

        lcc_csv = lcc[0] if isinstance(lcc, list) and lcc else ''
        authors_csv = '; '.join(authors) if authors else ''
        publisher_csv = publishers[0] if isinstance(publishers, list) and publishers else ''
        subjects_csv = '; '.join(subjects[:5]) if subjects else ''  # First 5 subjects

        output.append(f"{self.isbn}|{lcc_csv}|{lccn}|{title}|{authors_csv}|{publisher_csv}|{year}|{subjects_csv}")

        return '\n'.join(output)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Fetch LCC classification and metadata from ISBN',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scripts/lookup-isbn.py 9789685979146
  python3 scripts/lookup-isbn.py 978-3-03860-434-1

Data Sources (in priority order):
  1. OpenLibrary API - Most complete, includes LCC
  2. Library of Congress SRU - Authoritative source
  3. Google Books API - Fallback, no LCC data

Output includes:
  - LCC classification
  - LCCN (Library of Congress Control Number)
  - Title, Author, Publisher, Year
  - Subject headings
  - CSV-formatted output for easy import
        """
    )

    parser.add_argument('isbn', help='ISBN-10 or ISBN-13 (with or without hyphens)')
    parser.add_argument('--json', action='store_true', help='Output raw JSON instead of formatted text')

    args = parser.parse_args()

    # Perform lookup
    lookup = ISBNLookup(args.isbn)
    metadata = lookup.fetch_all()

    # Output results
    if args.json:
        print(json.dumps(metadata, indent=2))
    else:
        print(lookup.format_output())

    # Exit code: 0 if data found, 1 if not
    sys.exit(0 if metadata else 1)


if __name__ == '__main__':
    main()
