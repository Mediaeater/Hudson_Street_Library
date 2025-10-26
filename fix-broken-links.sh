#!/bin/bash

echo "Fixing broken links across the site..."

# 1. Fix search links: /static-demo/ -> /static-demo.html
echo "1. Fixing search links..."
find src -type f \( -name "*.html" -o -name "*.njk" \) -exec sed -i.linkfix \
  -e 's|href="/static-demo/"|href="/static-demo.html"|g' \
  -e 's|href="../static-demo/"|href="/static-demo.html"|g' \
  {} \;

# 2. Fix collection pages: ../index.html#anchor -> /#anchor
echo "2. Fixing collection page anchor links..."
find src/collections -type f -name "*.html" -exec sed -i.linkfix \
  -e 's|href="../index\.html#about"|href="/#about"|g' \
  -e 's|href="../index\.html#publications"|href="/#publications"|g' \
  -e 's|href="../index\.html#contact"|href="/#contact"|g' \
  -e 's|href="../news\.html"|href="/news.html"|g' \
  {} \;

# 3. Fix hardcoded domain URLs
echo "3. Fixing hardcoded domain URLs..."
find src -type f -name "*.html" -exec sed -i.linkfix \
  -e 's|https://hudsonstreetlibrary\.com/collection-explore\.html|/collection-explore.html|g' \
  -e 's|https://hudsonstreetlibrary\.com/static-demo\.html|/static-demo.html|g' \
  {} \;

# 4. Fix relative image paths in collection pages
echo "4. Fixing relative image paths..."
find src/collections -type f -name "*.html" -exec sed -i.linkfix \
  -e 's|src="../assets/images/|src="/assets/images/|g' \
  -e 's|src="../imgs/|src="/assets/images/|g' \
  {} \;

# 5. Fix news.njk links
echo "5. Fixing news.njk..."
sed -i.linkfix \
  -e 's|href="index\.html"|href="/"|g' \
  -e 's|href="/index\.html#|href="/#|g' \
  src/news.njk

# 6. Fix collection-explore.html
echo "6. Fixing collection-explore.html..."
sed -i.linkfix \
  -e 's|href="index\.html#about"|href="/#about"|g' \
  -e 's|href="index\.html#publications"|href="/#publications"|g' \
  -e 's|href="index\.html#contact"|href="/#contact"|g' \
  src/collection-explore.html

# 7. Fix recently_added.html About link
echo "7. Fixing recently_added.html..."
sed -i.linkfix \
  -e 's|href="index\.html#about"|href="/#about"|g' \
  src/collections/recently_added.html

echo "Done! Cleaning up backup files..."
find src -name "*.linkfix" -delete

echo "Link fixes complete!"
