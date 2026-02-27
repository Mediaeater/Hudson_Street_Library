#!/bin/bash
# Download Butt Magazine covers from their website
# This script will attempt to download covers for issues 3-37

DEST_DIR="src/assets/images/magazines/butt"
BASE_URL="https://buttmagazine.com"

echo "Downloading Butt Magazine covers..."
echo "Destination: $DEST_DIR"
echo

for i in {3..37}; do
    echo "Processing issue #$i..."
   
    # Try to fetch the issue page and extract the image
    PAGE_URL="$BASE_URL/library/butt-$i/"
    OUTPUT_FILE="$DEST_DIR/butt-$i.jpg"
   
    # Download using wget with JavaScript support would be ideal, but let's try curl first
    # For now, create a list of URLs to manually download
    echo "$PAGE_URL" >> scripts/butt-urls-to-download.txt
done

echo
echo "Created URL list in scripts/butt-urls-to-download.txt"
echo "Please visit https://buttmagazine.com/library/ and save the cover images manually"
echo "Or use a browser automation tool to download them"
