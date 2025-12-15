#!/bin/bash
echo "Starting Typpi..."
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    start index.html
else
    # Fallback for other environments, though likely running on Windows
    explorer.exe index.html
fi
