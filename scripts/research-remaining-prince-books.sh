#!/bin/bash

# Continue researching remaining Richard Prince books
# This script identifies books still needing research and processes them in priority order

echo "=== Continuing Richard Prince Research ==="
echo ""

# Get list of books still needing research
node scripts/analyze-prince-books.js > /tmp/prince-analysis.txt

echo "Analyzing remaining books..."
echo ""

# Count remaining
remaining=$(grep "Needs significant research" /tmp/prince-analysis.txt | grep -o "[0-9]*" | head -1)
echo "Books still needing research: $remaining"
echo ""

# Show next priorities
echo "Next priority books (lowest completeness scores):"
grep "| ✗" /tmp/prince-analysis.txt | head -15
echo ""

echo "Strategies:"
echo "1. Wait for remaining background agents to complete"
echo "2. Manually research high-priority books (major catalogs, recent publications)"
echo "3. Create basic entries for ephemera and limited editions"
echo ""

# Check agent status
echo "Checking for new agent completions..."
recent_completions=$(find /tmp/prince-research-batch* -name "*.json" -mmin -10 2>/dev/null | wc -l | tr -d ' ')

if [ "$recent_completions" -gt 0 ]; then
  echo "✓ Found $recent_completions new research files in last 10 minutes"
  echo "  Run: node scripts/update-prince-books-from-research.js"
else
  echo "⏳ No new completions in last 10 minutes"
fi

echo ""
echo "Current status: $(find /tmp/prince-research-batch* -name "*.json" 2>/dev/null | wc -l | tr -d ' ') total research files created"
