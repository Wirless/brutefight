#!/bin/bash

# Script to modify server.js to use port 4444

# Check if server.js exists
if [ ! -f "server.js" ]; then
    echo "Error: server.js not found in the current directory."
    exit 1
fi

# Create a backup of the original file
cp server.js server.js.bak

# Replace the PORT line with the new port
sed -i 's/const PORT = process.env.PORT || config.game?.port || 80;/const PORT = process.env.PORT || config.game?.port || 4444;/' server.js

# Check if the replacement was successful
if grep -q "const PORT = process.env.PORT || config.game?.port || 4444;" server.js; then
    echo "Success: Port in server.js has been set to 4444."
else
    echo "Warning: Could not automatically update the port in server.js."
    echo "Please manually edit server.js and change the PORT line to use port 4444."
fi

echo "A backup of the original file has been saved as server.js.bak" 