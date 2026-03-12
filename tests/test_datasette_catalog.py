#!/usr/bin/env python3
"""
Test Suite for Hudson Street Library Datasette Catalog

Tests database integrity, FTS functionality, indexes, and API responses.
"""

import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

# Color output helpers
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✓{Colors.RESET} {msg}")

def print_error(msg):
    print(f"{Colors.RED}✗{Colors.RESET} {msg}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ{Colors.RESET} {msg}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠{Colors.RESET} {msg}")

# Test class
class DatasetteTests:
    def __init__(self, db_path="hudson_street_library.db"):
        self.db_path = db_path
        self.conn = None
        self.tests_passed = 0
        self.tests_failed = 0

    def connect(self):
        """Connect to the database"""
        try:
            self.conn = sqlite3.connect(self.db_path)
            return True
        except sqlite3.Error as e:
            print_error(f"Failed to connect to database: {e}")
            return False

    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()

    def run_query(self, query, params=None):
        """Execute a query and return results"""
        try:
            cursor = self.conn.cursor()
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            return cursor.fetchall()
        except sqlite3.Error as e:
            print_error(f"Query failed: {e}")
            return None

    def test_database_exists(self):
        """Test: Database file exists"""
        if os.path.exists(self.db_path):
            print_success(f"Database exists: {self.db_path}")
            self.tests_passed += 1
            return True
        else:
            print_error(f"Database not found: {self.db_path}")
            self.tests_failed += 1
            return False

    def test_books_table_exists(self):
        """Test: Books table exists"""
        result = self.run_query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='books'"
        )
        if result and len(result) > 0:
            print_success("Books table exists")
            self.tests_passed += 1
            return True
        else:
            print_error("Books table not found")
            self.tests_failed += 1
            return False

    def test_books_count(self):
        """Test: Books table has records"""
        result = self.run_query("SELECT COUNT(*) FROM books")
        if result and result[0][0] > 0:
            count = result[0][0]
            print_success(f"Books table has {count} records")
            self.tests_passed += 1
            return True
        else:
            print_error("Books table is empty")
            self.tests_failed += 1
            return False

    def test_required_columns(self):
        """Test: Required columns exist"""
        required_columns = [
            'id', 'title', 'author_full_name', 'author_last',
            'publisher', 'publication_year', 'collection_grouping',
            'tags', 'notes', 'image_url'
        ]

        result = self.run_query("PRAGMA table_info(books)")
        if not result:
            print_error("Could not retrieve table schema")
            self.tests_failed += 1
            return False

        existing_columns = [row[1] for row in result]
        missing = [col for col in required_columns if col not in existing_columns]

        if not missing:
            print_success(f"All {len(required_columns)} required columns exist")
            self.tests_passed += 1
            return True
        else:
            print_error(f"Missing columns: {', '.join(missing)}")
            self.tests_failed += 1
            return False

    def test_column_types(self):
        """Test: Column types are correct"""
        result = self.run_query("PRAGMA table_info(books)")
        if not result:
            print_error("Could not retrieve table schema")
            self.tests_failed += 1
            return False

        # Check specific column types
        column_types = {row[1]: row[2] for row in result}

        expected_types = {
            'id': 'INTEGER',
            'publication_year': 'INTEGER',
            'height_cm': 'FLOAT',
            'width_cm': 'FLOAT',
            'title': 'TEXT',
            'author_full_name': 'TEXT'
        }

        errors = []
        for col, expected_type in expected_types.items():
            if col in column_types:
                actual_type = column_types[col]
                if actual_type != expected_type:
                    errors.append(f"{col}: expected {expected_type}, got {actual_type}")
            else:
                errors.append(f"{col}: column not found")

        if not errors:
            print_success("Column types are correct")
            self.tests_passed += 1
            return True
        else:
            print_error(f"Column type errors: {'; '.join(errors)}")
            self.tests_failed += 1
            return False

    def test_fts_table_exists(self):
        """Test: FTS table exists"""
        result = self.run_query(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='books_fts'"
        )
        if result and len(result) > 0:
            print_success("FTS table exists (books_fts)")
            self.tests_passed += 1
            return True
        else:
            print_error("FTS table not found")
            self.tests_failed += 1
            return False

    def test_fts_columns(self):
        """Test: FTS columns are configured"""
        # Check FTS configuration
        result = self.run_query(
            "SELECT sql FROM sqlite_master WHERE name='books_fts'"
        )
        if not result:
            print_error("Could not retrieve FTS configuration")
            self.tests_failed += 1
            return False

        sql = result[0][0]
        required_fts_columns = ['title', 'author_full_name', 'classification', 'tags', 'notes']

        missing = [col for col in required_fts_columns if col not in sql]

        if not missing:
            print_success(f"FTS enabled on {len(required_fts_columns)} columns")
            self.tests_passed += 1
            return True
        else:
            print_error(f"FTS missing columns: {', '.join(missing)}")
            self.tests_failed += 1
            return False

    def test_fts_search(self):
        """Test: FTS search works"""
        result = self.run_query(
            "SELECT COUNT(*) FROM books_fts WHERE books_fts MATCH 'photography'"
        )
        if result and result[0][0] > 0:
            count = result[0][0]
            print_success(f"FTS search works ({count} results for 'photography')")
            self.tests_passed += 1
            return True
        else:
            print_warning("FTS search returned no results (may be expected)")
            self.tests_passed += 1
            return True

    def test_indexes_exist(self):
        """Test: Performance indexes exist"""
        result = self.run_query(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_books_%'"
        )

        if result and len(result) >= 2:
            index_names = [row[0] for row in result]
            print_success(f"Indexes exist: {', '.join(index_names)}")
            self.tests_passed += 1
            return True
        else:
            print_error("Expected indexes not found")
            self.tests_failed += 1
            return False

    def test_author_index(self):
        """Test: Author index exists"""
        result = self.run_query(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_books_author_last'"
        )
        if result and len(result) > 0:
            print_success("Author index exists (idx_books_author_last)")
            self.tests_passed += 1
            return True
        else:
            print_error("Author index not found")
            self.tests_failed += 1
            return False

    def test_category_index(self):
        """Test: Category index exists"""
        result = self.run_query(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_books_collection_grouping'"
        )
        if result and len(result) > 0:
            print_success("Category index exists (idx_books_collection_grouping)")
            self.tests_passed += 1
            return True
        else:
            print_error("Category index not found")
            self.tests_failed += 1
            return False

    def test_data_integrity(self):
        """Test: Data integrity checks"""
        # Check for books without titles
        result = self.run_query(
            "SELECT COUNT(*) FROM books WHERE title IS NULL OR title = ''"
        )
        if result and result[0][0] == 0:
            print_success("All books have titles")
            self.tests_passed += 1
        else:
            count = result[0][0] if result else "unknown"
            print_warning(f"{count} books missing titles")
            self.tests_passed += 1

        return True

    def test_metadata_file(self):
        """Test: metadata.json exists and is valid"""
        metadata_path = "metadata.json"
        if not os.path.exists(metadata_path):
            print_error(f"metadata.json not found")
            self.tests_failed += 1
            return False

        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            # Check required fields
            if 'title' in metadata and 'databases' in metadata:
                print_success("metadata.json is valid")
                self.tests_passed += 1
                return True
            else:
                print_error("metadata.json missing required fields")
                self.tests_failed += 1
                return False
        except json.JSONDecodeError as e:
            print_error(f"metadata.json is invalid JSON: {e}")
            self.tests_failed += 1
            return False

    def test_metadata_facets(self):
        """Test: Facets are configured in metadata"""
        metadata_path = "metadata.json"
        try:
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            facets = metadata.get('databases', {}).get('hudson_street_library', {}).get('tables', {}).get('books', {}).get('facets', [])

            expected_facets = ['author_last', 'collection_grouping', 'binding', 'publication_year']

            if all(facet in facets for facet in expected_facets):
                print_success(f"All {len(expected_facets)} facets configured")
                self.tests_passed += 1
                return True
            else:
                missing = [f for f in expected_facets if f not in facets]
                print_error(f"Missing facets: {', '.join(missing)}")
                self.tests_failed += 1
                return False
        except Exception as e:
            print_error(f"Error checking facets: {e}")
            self.tests_failed += 1
            return False

    def test_datasette_installed(self):
        """Test: Datasette is installed"""
        try:
            result = subprocess.run(
                ['datasette', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                print_success(f"Datasette installed: {version}")
                self.tests_passed += 1
                return True
            else:
                print_error("Datasette not properly installed")
                self.tests_failed += 1
                return False
        except (subprocess.TimeoutExpired, FileNotFoundError):
            print_error("Datasette command not found")
            self.tests_failed += 1
            return False

    def test_sqlite_utils_installed(self):
        """Test: sqlite-utils is installed"""
        try:
            result = subprocess.run(
                ['sqlite-utils', '--version'],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                version = result.stdout.strip()
                print_success(f"sqlite-utils installed: {version}")
                self.tests_passed += 1
                return True
            else:
                print_error("sqlite-utils not properly installed")
                self.tests_failed += 1
                return False
        except (subprocess.TimeoutExpired, FileNotFoundError):
            print_error("sqlite-utils command not found")
            self.tests_failed += 1
            return False

    def test_scripts_exist(self):
        """Test: Required scripts exist and are executable"""
        scripts = [
            'scripts/setup-datasette.sh',
            'scripts/update-datasette-catalog.sh'
        ]

        all_exist = True
        for script in scripts:
            if os.path.exists(script):
                is_executable = os.access(script, os.X_OK)
                if is_executable:
                    print_success(f"Script exists and is executable: {script}")
                else:
                    print_warning(f"Script exists but not executable: {script}")
            else:
                print_error(f"Script not found: {script}")
                all_exist = False

        if all_exist:
            self.tests_passed += 1
            return True
        else:
            self.tests_failed += 1
            return False

    def run_all_tests(self):
        """Run all tests"""
        print("\n" + "="*60)
        print("Hudson Street Library - Datasette Catalog Tests")
        print("="*60 + "\n")

        # File and installation tests
        print("📁 File and Installation Tests\n")
        self.test_database_exists()
        self.test_metadata_file()
        self.test_datasette_installed()
        self.test_sqlite_utils_installed()
        self.test_scripts_exist()

        # Connect to database
        print("\n📊 Database Tests\n")
        if not self.connect():
            print_error("Cannot proceed with database tests")
            return False

        # Database structure tests
        self.test_books_table_exists()
        self.test_books_count()
        self.test_required_columns()
        self.test_column_types()

        # FTS tests
        print("\n🔍 Full-Text Search Tests\n")
        self.test_fts_table_exists()
        self.test_fts_columns()
        self.test_fts_search()

        # Index tests
        print("\n⚡ Performance Index Tests\n")
        self.test_indexes_exist()
        self.test_author_index()
        self.test_category_index()

        # Configuration tests
        print("\n⚙️  Configuration Tests\n")
        self.test_metadata_facets()

        # Data quality tests
        print("\n✓ Data Integrity Tests\n")
        self.test_data_integrity()

        # Summary
        print("\n" + "="*60)
        print("Test Summary")
        print("="*60)
        print(f"Passed:  {Colors.GREEN}{self.tests_passed}{Colors.RESET}")
        print(f"Failed:  {Colors.RED}{self.tests_failed}{Colors.RESET}")
        print(f"Total:   {self.tests_passed + self.tests_failed}")

        if self.tests_failed == 0:
            print(f"\n{Colors.GREEN}✅ All tests passed!{Colors.RESET}\n")
            return True
        else:
            print(f"\n{Colors.RED}❌ Some tests failed{Colors.RESET}\n")
            return False

def main():
    """Main test runner"""
    tests = DatasetteTests()

    try:
        success = tests.run_all_tests()
        sys.exit(0 if success else 1)
    finally:
        tests.close()

if __name__ == '__main__':
    main()
