#!/usr/bin/env python3
"""
Validate Library of Congress Classification (LCC) format in books.csv.

LCC format patterns:
- Starts with 1-3 capital letters (A-Z)
- Followed by numbers (1-9999)
- Optional: decimal point and more numbers
- Optional: cutter number (space + capital letter + numbers)
- Optional: year at end
"""

import csv
import re
import sys
from pathlib import Path
from typing import NamedTuple


class LCCValidationResult(NamedTuple):
    """Result of LCC validation for a single entry."""
    book_id: str
    lcc_value: str
    is_valid: bool
    error_message: str = ""


class LCCStats(NamedTuple):
    """Statistics from LCC validation."""
    total_entries: int
    entries_with_lcc: int
    valid_lcc: int
    invalid_lcc: int
    entries_without_lcc: int


# LCC pattern breakdown:
# ^[A-Z]{1,3}             - Start with 1-3 capital letters (class)
# \d+                     - Followed by one or more digits (subclass number)
# (?:\.\d+)?              - Optional decimal point and digits (for decimal classification)
# (?:\.[A-Z]\d+)?         - Optional dot + letter + digits (cutter number format 1)
# (?:\s+[A-Z]\d+)*        - Zero or more space + letter + digits (cutter number format 2)
# (?:\s+\d{4})?           - Optional year (4 digits)
# $                       - End of string
#
# Examples:
#   HT168.N5 M47 2021  -> HT + 168 + .N5 + M47 + 2021
#   ND237.Y87 A4 2006  -> ND + 237 + .Y87 + A4 + 2006
#   Z1003.5.U5         -> Z + 1003.5 + .U5
#   PS3                -> PS + 3
LCC_PATTERN = re.compile(
    r'^[A-Z]{1,3}\d+(?:\.\d+)?(?:\.[A-Z]\d+)?(?:\s+[A-Z]\d+)*(?:\s+\d{4})?$'
)


def validate_lcc(lcc_value: str) -> tuple[bool, str]:
    """
    Validate LCC format.

    Args:
        lcc_value: The LCC string to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not lcc_value or not lcc_value.strip():
        return False, "Empty value"

    lcc_clean = lcc_value.strip()

    if LCC_PATTERN.match(lcc_clean):
        return True, ""

    # Provide specific error messages
    if not re.match(r'^[A-Z]', lcc_clean):
        return False, "Must start with capital letter(s)"

    if not re.match(r'^[A-Z]{1,3}', lcc_clean):
        return False, "Must start with 1-3 capital letters"

    if not re.match(r'^[A-Z]{1,3}\d', lcc_clean):
        return False, "Letters must be followed by digits"

    return False, "Invalid LCC format (check cutter numbers, decimals, or year)"


def validate_books_csv(csv_path: Path) -> tuple[list[LCCValidationResult], LCCStats]:
    """
    Read books.csv and validate LCC field (column 25, 0-indexed).

    Args:
        csv_path: Path to books.csv file

    Returns:
        Tuple of (list of validation results, statistics)
    """
    results = []
    total_entries = 0
    entries_with_lcc = 0
    valid_lcc = 0
    invalid_lcc = 0

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)

        # Verify we have the right column
        if len(header) <= 25:
            print(f"Error: CSV has only {len(header)} columns, expected at least 26")
            sys.exit(1)

        if header[25] != 'lcc':
            print(f"Warning: Column 25 is '{header[25]}', expected 'lcc'")

        for row in reader:
            total_entries += 1

            if len(row) <= 25:
                continue

            book_id = row[0]
            lcc_value = row[25]

            if lcc_value and lcc_value.strip():
                entries_with_lcc += 1
                is_valid, error = validate_lcc(lcc_value)

                if is_valid:
                    valid_lcc += 1
                else:
                    invalid_lcc += 1

                results.append(LCCValidationResult(
                    book_id=book_id,
                    lcc_value=lcc_value,
                    is_valid=is_valid,
                    error_message=error
                ))

    entries_without_lcc = total_entries - entries_with_lcc

    stats = LCCStats(
        total_entries=total_entries,
        entries_with_lcc=entries_with_lcc,
        valid_lcc=valid_lcc,
        invalid_lcc=invalid_lcc,
        entries_without_lcc=entries_without_lcc
    )

    return results, stats


def print_report(results: list[LCCValidationResult], stats: LCCStats) -> None:
    """Print validation report."""
    print("=" * 80)
    print("LCC VALIDATION REPORT")
    print("=" * 80)
    print()

    print("SUMMARY")
    print("-" * 80)
    print(f"Total entries in CSV:        {stats.total_entries:>6}")
    print(f"Entries with LCC data:       {stats.entries_with_lcc:>6}")
    print(f"  Valid LCC entries:         {stats.valid_lcc:>6}")
    print(f"  Invalid LCC entries:       {stats.invalid_lcc:>6}")
    print(f"Entries without LCC data:    {stats.entries_without_lcc:>6}")
    print()

    if stats.entries_with_lcc > 0:
        valid_pct = (stats.valid_lcc / stats.entries_with_lcc) * 100
        print(f"Validation rate: {valid_pct:.1f}% of entries with LCC data are valid")
        print()

    # Show valid entries
    valid_results = [r for r in results if r.is_valid]
    if valid_results:
        print("VALID LCC ENTRIES")
        print("-" * 80)
        for result in valid_results:
            print(f"  ID {result.book_id:>5}: {result.lcc_value}")
        print()

    # Show invalid entries
    invalid_results = [r for r in results if not r.is_valid]
    if invalid_results:
        print("INVALID LCC ENTRIES")
        print("-" * 80)
        for result in invalid_results:
            print(f"  ID {result.book_id:>5}: '{result.lcc_value}'")
            print(f"           Error: {result.error_message}")
        print()

    print("=" * 80)


def main() -> None:
    """Main entry point."""
    # Determine path to books.csv
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    csv_path = project_root / 'src' / '_data' / 'books.csv'

    if not csv_path.exists():
        print(f"Error: Could not find books.csv at {csv_path}")
        sys.exit(1)

    print(f"Validating LCC entries in: {csv_path}")
    print()

    results, stats = validate_books_csv(csv_path)
    print_report(results, stats)

    # Exit with error code if there are invalid entries
    if stats.invalid_lcc > 0:
        sys.exit(1)


if __name__ == '__main__':
    main()
