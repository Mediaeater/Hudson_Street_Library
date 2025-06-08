#!/bin/bash

# Update image paths in all HTML files
echo "Updating image paths in HTML files..."

# Update paths in src directory (portable sed syntax)
find src -name "*.html" -type f -exec sed -i.bak \
  -e 's|src="imgs/|src="/assets/images/site/|g' \
  -e 's|src="/imgs/|src="/assets/images/|g' \
  -e 's|src="../imgs/|src="/assets/images/|g' \
  -e 's|src="../../imgs/|src="/assets/images/|g' \
  {} \; && find src -name "*.bak" -delete

# Update JavaScript paths (portable sed syntax)
find src -name "*.html" -type f -exec sed -i.bak \
  -e 's|src="js/|src="/assets/js/|g' \
  -e 's|src="../js/|src="/assets/js/|g' \
  {} \; && find src -name "*.bak" -delete

# Update collection-explore.html links (portable sed syntax)
find src -name "*.html" -type f -exec sed -i.bak \
  -e 's|href="collection-explore.html"|href="/collection-explore.html"|g' \
  -e 's|href="../collection-explore.html"|href="/collection-explore.html"|g' \
  {} \; && find src -name "*.bak" -delete

# Update index.html links (portable sed syntax)
find src -name "*.html" -type f -exec sed -i.bak \
  -e 's|href="index.html"|href="/"|g' \
  -e 's|href="../index.html"|href="/"|g' \
  {} \; && find src -name "*.bak" -delete

echo "Path updates complete!"