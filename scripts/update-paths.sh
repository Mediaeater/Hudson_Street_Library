#!/bin/bash

# Update image paths in all HTML files
echo "Updating image paths in HTML files..."

# Update paths in src directory
find src -name "*.html" -type f -exec sed -i '' \
  -e 's|src="imgs/|src="/assets/images/site/|g' \
  -e 's|src="/imgs/|src="/assets/images/|g' \
  -e 's|src="../imgs/|src="/assets/images/|g' \
  -e 's|src="../../imgs/|src="/assets/images/|g' \
  {} \;

# Update JavaScript paths
find src -name "*.html" -type f -exec sed -i '' \
  -e 's|src="js/|src="/assets/js/|g' \
  -e 's|src="../js/|src="/assets/js/|g' \
  {} \;

# Update collection-explore.html links
find src -name "*.html" -type f -exec sed -i '' \
  -e 's|href="collection-explore.html"|href="/collection-explore.html"|g' \
  -e 's|href="../collection-explore.html"|href="/collection-explore.html"|g' \
  {} \;

# Update index.html links
find src -name "*.html" -type f -exec sed -i '' \
  -e 's|href="index.html"|href="/"|g' \
  -e 's|href="../index.html"|href="/"|g' \
  {} \;

echo "Path updates complete!"