#!/bin/bash

# Hudson Street Library - Static CMS Startup Script
# No database required - file-based content management

echo "🚀 Starting Hudson Street Library Static CMS..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Kill any existing CMS processes
echo "🔄 Stopping existing CMS processes..."
pkill -f "node.*static-server.js" || true
pkill -f "node.*server-dev.js" || true

# Navigate to CMS directory
cd cms/

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing CMS dependencies..."
    npm install
fi

# Initialize static CMS if needed
echo "⚙️  Initializing Static CMS..."
node static-cms.js init

# Start the static CMS server
echo "🌟 Starting Static CMS server..."
echo "📡 Server will be available at: http://localhost:3001/admin"
echo "💾 Data storage: JSON files (no database)"
echo "🔨 Build command: Click 'Build Site' in admin or run 'node static-cms.js build'"
echo "🚀 Deploy command: Click 'Deploy' in admin or run 'node static-cms.js push'"
echo ""
echo "📚 Quick Commands:"
echo "  Add book:  node static-cms.js add '{\"title\":\"Book Title\",\"status\":\"available\"}'"
echo "  Build:     node static-cms.js build"
echo "  Deploy:    node static-cms.js push"
echo "  Stats:     node static-cms.js stats"
echo ""
echo "✋ Press Ctrl+C to stop the server"
echo ""

# Start server
node static-server.js