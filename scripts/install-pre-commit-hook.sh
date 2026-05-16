#!/bin/bash
# Install repo pre-commit hook that blocks hardcoded collection pages.
# Run this once per clone: bash scripts/install-pre-commit-hook.sh

set -e

HOOKS_DIR="$(git rev-parse --git-common-dir)/hooks"
HOOK_FILE="$HOOKS_DIR/pre-commit"

cat > "$HOOK_FILE" <<'HOOK'
#!/bin/bash
# Pre-commit guard: block re-introduction of hardcoded collection pages.
# Collection pages must be driven by src/_data/collections/<slug>.json.
# See docs/archive/2026-05-completed-plans/2026-04-20-csv-single-source-of-truth.md

NEW_HARDCODED=$(git diff --cached --name-only --diff-filter=A | grep -E '^src/collections/[^/]+\.html$' || true)

if [ -n "$NEW_HARDCODED" ]; then
  echo "ERROR: new hardcoded collection page(s) staged:"
  echo "$NEW_HARDCODED" | sed 's/^/  /'
  echo ""
  echo "Collection pages must be driven by src/_data/collections/<slug>.json,"
  echo "not hardcoded HTML. See docs/COLLECTIONS-GUIDE.md."
  exit 1
fi

exit 0
HOOK

chmod +x "$HOOK_FILE"
echo "Installed pre-commit hook at $HOOK_FILE"
