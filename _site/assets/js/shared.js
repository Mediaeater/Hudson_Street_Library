// Hudson Street Library - Shared JavaScript Functionality
// This file consolidates common JavaScript to eliminate duplication

class HudsonStreetLibrary {
    constructor() {
        this.init();
    }

    init() {
        // Initialize all components when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeComponents());
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        this.initMobileMenu();
        this.initSmoothScrolling();
        this.initImageErrorHandling();
        this.initBookThumbnails();
        this.updateCopyrightYear();
    }

    // Mobile Menu Functionality (consolidates duplicated code)
    initMobileMenu() {
        const mobileMenuButtons = document.querySelectorAll('button[aria-controls*="mobile-nav-menu"]');
        
        mobileMenuButtons.forEach(button => {
            const menuId = button.getAttribute('aria-controls');
            const mobileNavMenu = document.getElementById(menuId);
            
            if (mobileNavMenu) {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleMobileMenu(button, mobileNavMenu);
                });
            }
        });
    }

    toggleMobileMenu(button, menu) {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        
        button.setAttribute('aria-expanded', !isExpanded);
        menu.classList.toggle('hidden');
        menu.classList.toggle('flex');
        
        const icon = button.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        }
    }

    // Smooth Scrolling for Anchor Links (consolidates duplicated code)
    initSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Initialize Book Thumbnails
    initBookThumbnails() {
        // Prevent duplicate initialization
        if (this.thumbnailsInitialized) return;
        this.thumbnailsInitialized = true;

        const thumbnailImages = document.querySelectorAll('.thumbnail-image');
        
        thumbnailImages.forEach((img) => {
            // Skip if already processed
            if (img.dataset.processed === 'true') return;
            img.dataset.processed = 'true';
            
            const coverPath = this.generateThumbnailCoverPath(img);
            
            if (coverPath) {
                img.src = coverPath;
            } else {
                this.showThumbnailPlaceholder(img);
            }
        });
    }

    // Generate cover path using our acquisition naming convention
    generateThumbnailCoverPath(img) {
        const imageField = img.dataset.imageField;
        const title = img.dataset.title;
        const author = img.dataset.author;
        const isbn = img.dataset.isbn;
        
        // If there's an existing image field, try that first
        if (imageField && imageField.trim() && imageField !== 'null') {
            return `/assets/images/books/${imageField}`;
        }
        
        // Generate path from our acquired covers
        if (isbn && isbn !== 'NULL' && isbn !== '' && isbn !== 'null') {
            const cleanAuthor = author.replace(/[^a-zA-Z0-9.-]/g, '_');
            const cleanTitle = title.replace(/[^a-zA-Z0-9.-]/g, '_');
            const cleanISBN = isbn.replace(/[^a-zA-Z0-9.-]/g, '_');
            const coverFileName = `${cleanAuthor}_${cleanTitle}_${cleanISBN}`.replace(/_+/g, '_').replace(/^_|_$/g, '').substring(0, 100) + '.jpg';
            return `/assets/images/books/${coverFileName}`;
        }
        
        return null;
    }

    showThumbnailPlaceholder(img) {
        img.style.display = 'none';
        const placeholder = img.nextElementSibling;
        if (placeholder && placeholder.classList.contains('thumbnail-placeholder')) {
            placeholder.style.display = 'flex';
        }
    }

    // Global Image Error Handling
    initImageErrorHandling() {
        document.querySelectorAll('img[data-fallback]').forEach(img => {
            img.addEventListener('error', () => this.handleImageError(img));
        });
    }

    handleImageError(img) {
        const fallback = img.dataset.fallback;
        if (fallback && !img.dataset.attempted) {
            img.dataset.attempted = 'true';
            img.src = fallback;
        } else {
            // Show placeholder
            const placeholder = this.createImagePlaceholder(
                img.alt || 'Image not available',
                img.dataset.title || '',
                img.dataset.author || ''
            );
            img.parentNode.replaceChild(placeholder, img);
        }
    }

    createImagePlaceholder(alt, title, author) {
        const div = document.createElement('div');
        div.className = 'w-full h-full flex flex-col items-center justify-center text-gray-500 bg-gray-100 p-2';
        div.innerHTML = `
            <i class="fas fa-book text-2xl mb-1"></i>
            <p class="text-xs text-center leading-tight">${this.escapeHtml(title || alt)}</p>
            ${author ? `<p class="text-xs text-gray-400 mt-1 text-center">${this.escapeHtml(author)}</p>` : ''}
        `;
        return div;
    }

    // Update copyright year dynamically
    updateCopyrightYear() {
        const currentYear = new Date().getFullYear();
        document.querySelectorAll('.copyright-year').forEach(element => {
            element.textContent = currentYear;
        });
    }

    // XSS Protection Utility
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // URL Helper for consistent path resolution
    static resolvePath(path, base = '') {
        if (path.startsWith('http') || path.startsWith('//')) {
            return path;
        }
        if (path.startsWith('/')) {
            return path;
        }
        return base + path;
    }

    // Collection Data Helper (for future dynamic loading)
    static async loadCollectionData() {
        try {
            const response = await fetch('/data/collections.json');
            return await response.json();
        } catch (error) {
            console.warn('Could not load collection data:', error);
            return [];
        }
    }
}

// Initialize when script loads
new HudsonStreetLibrary();

// Global utilities
window.HSL = {
    resolvePath: HudsonStreetLibrary.resolvePath,
    loadCollectionData: HudsonStreetLibrary.loadCollectionData
};