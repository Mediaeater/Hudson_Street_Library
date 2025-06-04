#!/bin/bash

# Download book covers with fallback options

# Function to download cover with fallbacks
download_cover() {
    local isbn=$1
    local filename=$2
    local title=$3
    
    echo "Downloading cover for: $title (ISBN: $isbn)"
    
    # Try Open Library first
    curl -L "https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg" -o "imgs/collage/${filename}" -s
    
    # Check if we got a real image (more than 1KB)
    if [ -f "imgs/collage/${filename}" ]; then
        size=$(stat -f%z "imgs/collage/${filename}" 2>/dev/null || stat -c%s "imgs/collage/${filename}" 2>/dev/null)
        if [ "$size" -gt 1000 ]; then
            echo "✓ Successfully downloaded from Open Library"
            return 0
        else
            rm "imgs/collage/${filename}"
        fi
    fi
    
    # Try Google Books as fallback
    clean_isbn=$(echo $isbn | tr -d '-')
    curl -L "https://books.google.com/books/content?vid=ISBN${clean_isbn}&printsec=frontcover&img=1&zoom=1" -o "imgs/collage/${filename}" -s
    
    # Check if we got a real image
    if [ -f "imgs/collage/${filename}" ]; then
        size=$(stat -f%z "imgs/collage/${filename}" 2>/dev/null || stat -c%s "imgs/collage/${filename}" 2>/dev/null)
        if [ "$size" -gt 1000 ]; then
            echo "✓ Successfully downloaded from Google Books"
            return 0
        else
            rm "imgs/collage/${filename}"
        fi
    fi
    
    echo "✗ Could not download cover for $title"
    return 1
}

# Download our three collage books
download_cover "978-9188031402" "lotta-antonsson-i-am-woman.jpg" "I Am Woman - Lotta Antonsson"
download_cover "978-1912719242" "pacifico-silano-sunshine.jpg" "I Wish I Never Saw the Sunshine - Pacifico Silano"
download_cover "978-0300254334" "ray-johnson-co.jpg" "Ray Johnson c/o"

echo ""
echo "Download complete. Checking results:"
ls -lh imgs/collage/*.jpg | grep -E "(lotta|pacifico|ray)"