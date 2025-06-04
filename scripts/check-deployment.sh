#!/bin/bash

# GitHub Actions Deployment Status Checker
# Usage: ./scripts/check-deployment.sh

echo "🔍 Hudson Street Library - Deployment Status Checker"
echo "=================================================="

# Get repository info
REPO_OWNER="Mediaeater"
REPO_NAME="Hudson_Street_Library"
REPO_URL="https://github.com/$REPO_OWNER/$REPO_NAME"

echo "📂 Repository: $REPO_URL"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Get current branch and latest commit
CURRENT_BRANCH=$(git branch --show-current)
LATEST_COMMIT=$(git rev-parse HEAD)
SHORT_COMMIT=$(git rev-parse --short HEAD)

echo "🌿 Current Branch: $CURRENT_BRANCH"
echo "📝 Latest Commit: $SHORT_COMMIT"
echo ""

# Check if on main branch
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: You're not on the main branch"
    echo "   Deployments only trigger from the main branch"
    echo ""
fi

# Check local build
echo "🔧 Testing Local Build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Local build successful"
else
    echo "❌ Local build failed"
    echo "   Run 'npm run build' to see detailed errors"
fi
echo ""

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Commit and push to deploy these changes"
    echo ""
fi

# Check if ahead of remote
AHEAD=$(git rev-list --count HEAD@{upstream}..HEAD 2>/dev/null || echo "unknown")
if [ "$AHEAD" != "0" ] && [ "$AHEAD" != "unknown" ]; then
    echo "📤 You have $AHEAD commit(s) not pushed to remote"
    echo "   Run 'git push' to trigger deployment"
    echo ""
fi

# Provide helpful links
echo "🔗 Useful Links:"
echo "   • Actions: $REPO_URL/actions"
echo "   • Deployments: $REPO_URL/deployments"
echo "   • Live Site: https://hudsonstreetlibrary.com"
echo ""

echo "💡 Quick Commands:"
echo "   • Deploy: git push origin main"
echo "   • Local dev: npm start"
echo "   • Test build: npm run build"
echo ""

echo "✨ Done! Check the links above for deployment status."