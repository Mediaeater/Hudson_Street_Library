#!/bin/bash

# Hudson Street Library - Start Script
# Starts both frontend (Eleventy) and backend (CMS API) servers

set -e

echo "Starting Hudson Street Library..."
echo "========================================================================"

# Get project root
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# Check for dependencies
echo "Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "   Installing main dependencies..."
    npm install
fi

if [ ! -d "cms/node_modules" ]; then
    echo "   Installing CMS dependencies..."
    cd cms && npm install && cd ..
fi

# Kill any existing servers on these ports
echo "Cleaning up existing servers..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || echo "   Port 8080 is free"
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "   Port 3001 is free"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "WARNING: No .env file found. Copy .env.example to .env and configure if needed."
fi

# Create log directory
mkdir -p logs

echo ""
echo "Starting servers..."
echo ""

# Start CMS Backend Server (Express + PostgreSQL)
echo "   Starting CMS API Server (port 3001)..."
node cms/server.js > logs/cms-server.log 2>&1 &
CMS_PID=$!
echo "   CMS Server PID: $CMS_PID"

# Give the backend a moment to start
sleep 2

# Check if CMS server started
if ! ps -p $CMS_PID > /dev/null 2>&1; then
    echo "ERROR: CMS Server failed to start. Check logs/cms-server.log"
    exit 1
fi

# Start Eleventy Frontend Dev Server
echo "   Starting Eleventy Frontend (port 8080)..."
npm start > logs/eleventy.log 2>&1 &
ELEVENTY_PID=$!
echo "   Eleventy PID: $ELEVENTY_PID"

# Give Eleventy a moment to start
sleep 3

# Check if Eleventy started
if ! ps -p $ELEVENTY_PID > /dev/null 2>&1; then
    echo "ERROR: Eleventy failed to start. Check logs/eleventy.log"
    kill $CMS_PID 2>/dev/null
    exit 1
fi

echo ""
echo "All servers started successfully!"
echo ""
echo "========================================================================"
echo "ACCESS YOUR SITE:"
echo ""
echo "   Frontend (Eleventy):  http://localhost:8080"
echo "   CMS Admin:            http://localhost:3001/admin"
echo "   API Base:             http://localhost:3001/admin/api"
echo "   Health Check:         http://localhost:3001/health"
echo ""
echo "========================================================================"
echo "LOGS:"
echo "   CMS Server:  tail -f logs/cms-server.log"
echo "   Eleventy:    tail -f logs/eleventy.log"
echo ""
echo "TO STOP:"
echo "   Press Ctrl+C or run: ./stop.sh"
echo ""
echo "========================================================================"

# Save PIDs to file for stop script
echo "$CMS_PID" > .server-pids
echo "$ELEVENTY_PID" >> .server-pids

# Cleanup function
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $CMS_PID 2>/dev/null && echo "   Stopped CMS Server"
    kill $ELEVENTY_PID 2>/dev/null && echo "   Stopped Eleventy"
    rm -f .server-pids
    echo "All servers stopped"
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM

# Keep script running and wait for both processes
wait $CMS_PID $ELEVENTY_PID
