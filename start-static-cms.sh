#!/bin/bash

# Hudson Street Library - Static CMS Startup Script
# File-based content management that generates static pages and commits to git
# No PostgreSQL database needed - perfect for one-person operations

set -e

echo "🚀 Starting Hudson Street Library Static CMS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill any existing servers
echo "🔧 Checking for existing servers..."
pkill -f "node.*static-server" 2>/dev/null || echo "   No existing servers found"

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# Check if cms directory exists
if [ ! -d "cms" ]; then
    echo "❌ CMS directory not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "cms/node_modules" ]; then
    echo "   Installing CMS dependencies..."
    cd cms && npm install && cd ..
fi

if [ ! -d "node_modules" ]; then
    echo "   Installing main project dependencies..."
    npm install
fi

# Initialize CMS data files
echo "🔧 Initializing Static CMS..."
cd cms && node static-cms.js init && cd ..

# Start the static CMS server
echo "🌐 Starting Static CMS Server..."
cd cms && node static-server.js &
CMS_PID=$!
cd ..

# Wait a moment for server to start
sleep 2

# Check if server started successfully
if ps -p $CMS_PID > /dev/null; then
    echo "✅ Static CMS Server started successfully!"
    echo ""
    echo "🎯 ACCESS YOUR CMS:"
    echo "   Admin Interface: http://localhost:3001/admin"
    echo "   API Base URL:    http://localhost:3001/admin/api"
    echo ""
    echo "📚 QUICK COMMANDS:"
    echo "   Add Book:       http://localhost:3001/admin/books/new"
    echo "   View Books:     http://localhost:3001/admin/books"
    echo "   Collections:    http://localhost:3001/admin/collections"
    echo ""
    echo "🔧 CLI OPERATIONS:"
    echo "   cd cms/"
    echo "   node static-cms.js init          # Initialize data files"
    echo "   node static-cms.js build         # Generate static pages"
    echo "   node static-cms.js push          # Push to git repository"
    echo "   node static-cms.js stats         # View library statistics"
    echo ""
    echo "🛠️  BUILD & DEPLOY:"
    echo "   npm run build                    # Build static site with Eleventy"
    echo "   npm run dev                      # Development server"
    echo ""
    echo "🔗 WORKFLOW:"
    echo "   1. Add books via web interface or CLI"
    echo "   2. Click 'Build Site' in admin to generate static pages"
    echo "   3. Click 'Deploy' to commit changes to git"
    echo "   4. Changes appear live on your hosted site"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 Ready! Open http://localhost:3001/admin in your browser"
    echo ""
    echo "💡 TIP: Keep this terminal open. Press Ctrl+C to stop the server."
    echo ""
    
    # Keep the script running and show server output
    wait $CMS_PID
else
    echo "❌ Failed to start Static CMS Server"
    echo "   Check the error messages above"
    exit 1
fi