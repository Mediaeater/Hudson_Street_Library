/**
 * Book Cover Image Loader with Fallback Support
 * Tries multiple sources to find the best available book cover
 */

function loadBookCover(imgElement, isbn, title) {
    // Remove any hyphens from ISBN for some APIs
    const cleanISBN = isbn.replace(/-/g, '');
    
    // Define cover sources in order of preference
    const coverSources = [
        // 1. Open Library (most reliable, no API key needed)
        `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
        
        // 2. Google Books API (good quality, no key needed for covers)
        `https://books.google.com/books/content?vid=ISBN${cleanISBN}&printsec=frontcover&img=1&zoom=1`,
        
        // 3. Open Library with clean ISBN (fallback)
        `https://covers.openlibrary.org/b/isbn/${cleanISBN}-L.jpg`,
        
        // 4. Placeholder image (final fallback)
        '../imgs/book-placeholder.jpg'
    ];
    
    let currentIndex = 0;
    
    function tryNextSource() {
        if (currentIndex >= coverSources.length) {
            console.error(`No cover found for ISBN: ${isbn}`);
            return;
        }
        
        const testImg = new Image();
        testImg.onload = function() {
            // Check if it's not a placeholder/1x1 pixel image
            if (this.width > 1 && this.height > 1) {
                imgElement.src = coverSources[currentIndex];
                imgElement.alt = `Cover of ${title}`;
            } else {
                currentIndex++;
                tryNextSource();
            }
        };
        
        testImg.onerror = function() {
            currentIndex++;
            tryNextSource();
        };
        
        testImg.src = coverSources[currentIndex];
    }
    
    tryNextSource();
}

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Find all book cover images with data-isbn attribute
    const bookCovers = document.querySelectorAll('img[data-isbn]');
    
    bookCovers.forEach(img => {
        const isbn = img.getAttribute('data-isbn');
        const title = img.getAttribute('data-title') || 'Book';
        
        if (isbn) {
            loadBookCover(img, isbn, title);
        }
    });
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { loadBookCover };
}