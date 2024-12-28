#!/bin/bash

# Function to kill a process by name or port
kill_process() {
  local process_name=$1
  local port=$2

  # Kill by process name
  if [ -n "$process_name" ]; then
    if pgrep "$process_name" > /dev/null; then
      echo "Killing $process_name..."
      pkill "$process_name"
    else
      echo "$process_name is not running."
    fi
  fi

  # Kill by port if specified
  if [ -n "$port" ]; then
    local pid=$(lsof -ti:$port)
    if [ -n "$pid" ]; then
      echo "Killing process on port $port (PID: $pid)..."
      kill -9 $pid
    fi
  fi
}

# Terminate existing processes
kill_process "hardhat" 8545
kill_process "react-scripts"

# Open multiple terminal windows/tabs for different processes
osascript <<EOF
tell application "Terminal"
    # Terminal 1: Hardhat Node
    do script "cd $(pwd); npx hardhat node"
    
    # Terminal 2: Deploy Contracts
    do script "cd $(pwd); npx hardhat run scripts/deploy3contracts.js --network localhost"
    
    # Terminal 3: React App
    do script "cd ../frontend; npm run dev"
end tell
EOF
