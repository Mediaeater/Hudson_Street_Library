#!/bin/bash
# Configure git to use the repository's tracked .githooks/ directory
# (CSV validation, monotonic count guard, row-date updates, hardcoded collection
# guard, design system check, and gitleaks secret scan).
#
# Run once per clone: bash scripts/install-pre-commit-hook.sh

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
chmod +x "$PROJECT_DIR/.githooks/pre-commit"
git -C "$PROJECT_DIR" config core.hooksPath .githooks

echo "✅ Configured git core.hooksPath = .githooks"
