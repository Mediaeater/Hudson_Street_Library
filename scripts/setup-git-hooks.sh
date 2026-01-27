#!/usr/bin/env bash

# Setup script for installing Git hooks
# This makes the pre-commit hook opt-in rather than automatic

set -e

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the root directory of the git repository
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo ".")
cd "$GIT_ROOT"

echo ""
echo -e "${BLUE}Installing Git hooks...${NC}"
echo ""

# Create hooks directory if it doesn't exist
HOOKS_DIR=".git/hooks"
if [ ! -d "$HOOKS_DIR" ]; then
  echo -e "${YELLOW}Warning: .git/hooks directory not found. Is this a git repository?${NC}"
  exit 1
fi

# Copy pre-commit hook
SOURCE_HOOK=".git-hooks/pre-commit"
TARGET_HOOK="$HOOKS_DIR/pre-commit"

if [ ! -f "$SOURCE_HOOK" ]; then
  echo -e "${YELLOW}Error: Source hook not found at $SOURCE_HOOK${NC}"
  exit 1
fi

# Backup existing hook if present
if [ -f "$TARGET_HOOK" ]; then
  BACKUP="${TARGET_HOOK}.backup.$(date +%Y%m%d-%H%M%S)"
  echo "Backing up existing pre-commit hook to: $BACKUP"
  cp "$TARGET_HOOK" "$BACKUP"
fi

# Copy and make executable
cp "$SOURCE_HOOK" "$TARGET_HOOK"
chmod +x "$TARGET_HOOK"

echo -e "${GREEN}✓ Pre-commit hook installed${NC}"
echo ""
echo "The pre-commit hook will now run tests before each commit."
echo ""
echo -e "${BLUE}Usage:${NC}"
echo "  • Normal commit: git commit -m 'message'"
echo "    Tests will run automatically"
echo ""
echo "  • Skip hook temporarily: git commit --no-verify -m 'message'"
echo "    Use this when you need to commit work-in-progress"
echo ""
echo -e "${BLUE}To uninstall:${NC}"
echo "  rm $TARGET_HOOK"
echo ""
