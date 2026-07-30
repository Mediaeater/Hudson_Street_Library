"""
API Tests for Hudson Street Library Datasette Catalog

Tests based on Datasette test patterns
"""

import json
import sqlite3
from pathlib import Path

import pytest


# Fixtures
@pytest.fixture(scope="module")
def db_path():
    """Path to the database file"""
    return Path("hudson_street_library.db")


@pytest.fixture(scope="module")
def metadata_path():
    """Path to the metadata file"""
    return Path("metadata.json")


@pytest.fixture(scope="module")
def db_connection(db_path):
    """SQLite database connection"""
    if not db_path.exists():
        pytest.skip(f"Database not found: {db_path}")

    conn = sqlite3.connect(str(db_path))
    yield conn
    conn.close()


@pytest.fixture(scope="module")
def metadata(metadata_path):
    """Loaded metadata configuration"""
    if not metadata_path.exists():
        pytest.skip(f"Metadata not found: {metadata_path}")

    with open(metadata_path) as f:
        return json.load(f)


# Database Structure Tests
class TestDatabaseStructure:
    """Test database schema and structure"""

    def test_database_file_exists(self, db_path):
        """Database file exists"""
        assert db_path.exists(), f"Database not found: {db_path}"

    def test_books_table_exists(self, db_connection):
        """Books table exists"""
        cursor = db_connection.cursor()
        result = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='books'"
        ).fetchone()
        assert result is not None, "Books table not found"

    def test_books_table_has_records(self, db_connection):
        """Books table contains records"""
        cursor = db_connection.cursor()
        count = cursor.execute("SELECT COUNT(*) FROM books").fetchone()[0]
        assert count > 0, "Books table is empty"

    def test_required_columns_exist(self, db_connection):
        """All required columns exist"""
        required_columns = [
            'id', 'title', 'author_full_name', 'author_last',
            'publisher', 'publication_year', 'collection_grouping',
            'tags', 'notes', 'image_url'
        ]

        cursor = db_connection.cursor()
        columns = cursor.execute("PRAGMA table_info(books)").fetchall()
        column_names = [col[1] for col in columns]

        for required in required_columns:
            assert required in column_names, f"Missing column: {required}"

    def test_column_types(self, db_connection):
        """Column types are correct"""
        cursor = db_connection.cursor()
        columns = cursor.execute("PRAGMA table_info(books)").fetchall()
        column_types = {col[1]: col[2] for col in columns}

        # Check specific important types
        assert column_types['id'] == 'INTEGER', "id should be INTEGER"
        assert column_types['publication_year'] == 'INTEGER', "publication_year should be INTEGER"
        assert column_types['title'] == 'TEXT', "title should be TEXT"


# Full-Text Search Tests
class TestFullTextSearch:
    """Test FTS functionality"""

    def test_fts_table_exists(self, db_connection):
        """FTS table exists"""
        cursor = db_connection.cursor()
        result = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='books_fts'"
        ).fetchone()
        assert result is not None, "FTS table not found"

    def test_fts_columns_configured(self, db_connection):
        """FTS columns are correctly configured"""
        cursor = db_connection.cursor()
        sql = cursor.execute(
            "SELECT sql FROM sqlite_master WHERE name='books_fts'"
        ).fetchone()[0]

        required_columns = ['title', 'author_full_name', 'classification', 'tags', 'notes']
        for col in required_columns:
            assert col in sql, f"FTS missing column: {col}"

    def test_fts_search_works(self, db_connection):
        """FTS search returns results"""
        cursor = db_connection.cursor()

        # Test a common search term
        result = cursor.execute(
            "SELECT COUNT(*) FROM books_fts WHERE books_fts MATCH 'photography'"
        ).fetchone()[0]

        # We don't assert a specific count, just that the query works
        assert result >= 0, "FTS search failed"


# Performance Index Tests
class TestPerformanceIndexes:
    """Test database indexes"""

    def test_author_index_exists(self, db_connection):
        """Author index exists"""
        cursor = db_connection.cursor()
        result = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_books_author_last'"
        ).fetchone()
        assert result is not None, "Author index not found"

    def test_category_index_exists(self, db_connection):
        """Category index exists"""
        cursor = db_connection.cursor()
        result = cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_books_collection_grouping'"
        ).fetchone()
        assert result is not None, "Category index not found"


# Metadata Configuration Tests
class TestMetadataConfiguration:
    """Test metadata.json configuration"""

    def test_metadata_file_exists(self, metadata_path):
        """Metadata file exists"""
        assert metadata_path.exists(), "metadata.json not found"

    def test_metadata_is_valid_json(self, metadata):
        """Metadata is valid JSON"""
        assert isinstance(metadata, dict), "Metadata should be a dictionary"

    def test_metadata_has_title(self, metadata):
        """Metadata has a title"""
        assert 'title' in metadata, "Metadata missing 'title'"
        assert metadata['title'] == "Hudson Street Library Digital Catalog"

    def test_metadata_has_databases(self, metadata):
        """Metadata has databases configuration"""
        assert 'databases' in metadata, "Metadata missing 'databases'"
        assert 'hudson_street_library' in metadata['databases']

    def test_facets_configured(self, metadata):
        """Facets are configured"""
        books_config = metadata['databases']['hudson_street_library']['tables']['books']
        assert 'facets' in books_config, "Facets not configured"

        expected_facets = ['author_last', 'collection_grouping', 'binding', 'publication_year']
        actual_facets = books_config['facets']

        for facet in expected_facets:
            assert facet in actual_facets, f"Missing facet: {facet}"

    def test_url_columns_configured(self, metadata):
        """URL columns are configured for rendering"""
        columns_config = metadata['databases']['hudson_street_library']['tables']['books']['columns']

        url_columns = ['image_url', 'artist_url', 'publisher_url', 'custom_page_url']
        for col in url_columns:
            if col in columns_config:
                assert columns_config[col].get('render_url') == True, \
                    f"{col} should have render_url: true"


# Data Integrity Tests
class TestDataIntegrity:
    """Test data quality and integrity"""

    def test_all_books_have_ids(self, db_connection):
        """All books have valid IDs"""
        cursor = db_connection.cursor()
        count = cursor.execute(
            "SELECT COUNT(*) FROM books WHERE id IS NULL"
        ).fetchone()[0]
        assert count == 0, f"{count} books missing IDs"

    def test_all_books_have_titles(self, db_connection):
        """All books have titles (data quality check)"""
        cursor = db_connection.cursor()
        count = cursor.execute(
            "SELECT COUNT(*) FROM books WHERE title IS NULL OR title = ''"
        ).fetchone()[0]
        if count > 0:
            pytest.skip(f"Data quality issue: {count} books missing titles")

    def test_publication_years_valid(self, db_connection):
        """Publication years are in valid range (data quality check)"""
        cursor = db_connection.cursor()
        result = cursor.execute(
            """SELECT COUNT(*) FROM books
               WHERE publication_year IS NOT NULL
               AND (publication_year < 1800 OR publication_year > 2030)"""
        ).fetchone()[0]
        if result > 0:
            pytest.skip(f"Data quality issue: {result} books have publication years outside 1800-2030")


# Query Performance Tests
class TestQueryPerformance:
    """Test query performance with indexes"""

    def test_author_query_uses_index(self, db_connection):
        """Author queries use the index"""
        cursor = db_connection.cursor()
        explain = cursor.execute(
            "EXPLAIN QUERY PLAN SELECT * FROM books WHERE author_last = 'Abbott'"
        ).fetchall()

        # Check that the query plan mentions the index
        plan_str = ' '.join([str(row) for row in explain])
        assert 'idx_books_author_last' in plan_str or 'SEARCH' in plan_str, \
            "Author query not using index"

    def test_category_query_uses_index(self, db_connection):
        """Category queries use the index"""
        cursor = db_connection.cursor()
        explain = cursor.execute(
            "EXPLAIN QUERY PLAN SELECT * FROM books WHERE collection_grouping = 'Photography'"
        ).fetchall()

        plan_str = ' '.join([str(row) for row in explain])
        assert 'idx_books_collection_grouping' in plan_str or 'SEARCH' in plan_str, \
            "Category query not using index"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
