#!/bin/bash
# Script to cleanup port 3000 before running E2E tests
# This prevents "interrupted" test status from port conflicts
# Cross-platform compatible: macOS, Linux, Windows Git Bash

echo "Checking for processes on port 3000..."

# Detect OS and find process ID on port 3000
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS: use lsof
  PID=$(lsof -ti:3000 2>/dev/null)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux: try ss first (modern), fallback to lsof
  PID=$(ss -lptn 'sport = :3000' 2>/dev/null | awk 'NR>1 {match($0, /pid=([0-9]+)/, arr); print arr[1]}' | head -1)
  if [ -z "$PID" ]; then
    PID=$(lsof -ti:3000 2>/dev/null)
  fi
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  # Windows Git Bash: use netstat
  PID=$(netstat -ano 2>/dev/null | grep ':3000' | awk '{print $5}' | head -1)
else
  echo "⚠ Warning: Unsupported OS ($OSTYPE), using lsof..."
  PID=$(lsof -ti:3000 2>/dev/null)
fi

if [ -z "$PID" ]; then
  echo "✓ Port 3000 is free"
  exit 0
else
  # Count processes found
  PID_COUNT=$(echo "$PID" | wc -w | tr -d ' ')
  echo "Found $PID_COUNT process(es) on port 3000: $PID"

  # Validate these are Node.js processes before killing
  for pid in $PID; do
    if ps -p "$pid" > /dev/null 2>&1; then
      PROC_NAME=$(ps -p "$pid" -o comm= 2>/dev/null)
      if [[ ! "$PROC_NAME" =~ "node" ]]; then
        echo "⚠ Warning: Process $pid ($PROC_NAME) is not a Node.js process"
        echo "✗ Refusing to kill non-Node process. Please free port 3000 manually."
        exit 1
      fi
    fi
  done

  echo "Killing Node.js process(es)..."
  kill -9 $PID 2>/dev/null || true

  # Wait up to 5 seconds for port to be freed with retry logic
  for i in {1..10}; do
    sleep 0.5

    # Check if port is free (using same detection method)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      CHECK_PID=$(lsof -ti:3000 2>/dev/null)
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      CHECK_PID=$(ss -lptn 'sport = :3000' 2>/dev/null | awk 'NR>1 {match($0, /pid=([0-9]+)/, arr); print arr[1]}' | head -1)
      if [ -z "$CHECK_PID" ]; then
        CHECK_PID=$(lsof -ti:3000 2>/dev/null)
      fi
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
      CHECK_PID=$(netstat -ano 2>/dev/null | grep ':3000' | awk '{print $5}' | head -1)
    else
      CHECK_PID=$(lsof -ti:3000 2>/dev/null)
    fi

    if [ -z "$CHECK_PID" ]; then
      echo "✓ Port 3000 is now free"
      exit 0
    fi
  done

  echo "✗ Failed to free port 3000 after 5 seconds"
  echo "Remaining process(es): $CHECK_PID"
  exit 1
fi
