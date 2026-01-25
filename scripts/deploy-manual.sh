#!/bin/bash

# Manual Deployment to GitHub Pages (bypasses GitHub Actions)
# This pushes the built _site directory directly to gh-pages branch

set -e

echo "🚀 Manual Deployment to GitHub Pages"
echo "====================================="
echo ""

# Check if on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You're on branch '$CURRENT_BRANCH', not 'main'"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "❌ Error: You have uncommitted changes"
    echo "   Commit or stash them first"
    exit 1
fi

# Build the site
echo "🔧 Building site..."
npm run build

if [ ! -d "_site" ]; then
    echo "❌ Error: _site directory not found"
    exit 1
fi

echo "✅ Build complete"
echo ""

# Copy manual book pages if they exist
if [ -d "src/books/manual" ]; then
    echo "📋 Copying manual book pages..."
    cp -r src/books/manual/* _site/books/
    echo "✅ Manual pages copied"
    echo ""
fi

# Deploy to gh-pages branch
echo "📤 Deploying to gh-pages branch..."

cd _site

# Initialize git if needed
if [ ! -d ".git" ]; then
    git init
    git remote add origin https://github.com/Mediaeater/Hudson_Street_Library.git
fi

git add -A
git commit -m "Deploy: $(date -u +'%Y-%m-%d %H:%M:%S UTC')" || echo "No changes to commit"

# Force push to gh-pages
echo "🚀 Pushing to gh-pages..."
git push origin HEAD:gh-pages --force

cd ..

echo ""
echo "✅ Deployment complete!"
echo "🌐 Site: https://hudsonstreetlibrary.com"
echo "⏱️  Changes may take 1-2 minutes to appear"
echo ""
echo "💡 Tip: Clear your browser cache (Cmd+Shift+R) if you don't see changes"
