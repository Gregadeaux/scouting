#!/bin/bash
# Script to cleanup port 3000 before running E2E tests
# This prevents "interrupted" test status from port conflicts

echo "Checking for processes on port 3000..."

# Find process ID on port 3000
PID=$(lsof -ti:3000)

if [ -z "$PID" ]; then
  echo "✓ Port 3000 is free"
  exit 0
else
  echo "Found process(es) on port 3000: $PID"
  echo "Killing process(es)..."
  kill -9 $PID 2>/dev/null || true
  sleep 1

  # Verify port is now free
  if lsof -ti:3000 > /dev/null 2>&1; then
    echo "✗ Failed to free port 3000"
    exit 1
  else
    echo "✓ Port 3000 is now free"
    exit 0
  fi
fi
