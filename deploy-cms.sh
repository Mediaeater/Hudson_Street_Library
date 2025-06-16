#!/bin/bash

# Hudson Street Library CMS Deployment Script

echo "🚀 Deploying Hudson Street Library CMS..."

# Check if running in development or production
if [ "$NODE_ENV" = "production" ]; then
    echo "📦 Production deployment mode"
    SERVER_FILE="server.js"
    PORT=${PORT:-3001}
else
    echo "🛠️  Development deployment mode"
    SERVER_FILE="server-dev.js"
    PORT=3001
fi

# Navigate to CMS directory
cd cms/

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating environment configuration..."
    cp .env.example .env
    echo "✅ Please configure .env file with your settings"
fi

# Kill any existing processes
echo "🔄 Stopping existing CMS processes..."
pkill -f "node $SERVER_FILE" || true

# Start the server
echo "🌟 Starting CMS server on port $PORT..."
if [ "$1" = "--background" ]; then
    nohup node $SERVER_FILE > cms.log 2>&1 &
    echo "📋 Server started in background. Check cms.log for output."
    echo "🌐 Admin interface: http://localhost:$PORT/admin"
else
    node $SERVER_FILE
fi