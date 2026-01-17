#!/bin/bash

# Hudson Street Library - Stop Script
# Stops all running servers

echo "Stopping Hudson Street Library servers..."

# Stop servers by PID file if it exists
if [ -f ".server-pids" ]; then
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null && echo "   Stopped process $pid"
        fi
    done < .server-pids
    rm -f .server-pids
fi

# Also kill any processes on the ports (backup method)
lsof -ti:8080 | xargs kill -9 2>/dev/null && echo "   Killed process on port 8080"
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo "   Killed process on port 3001"

echo "All servers stopped"
