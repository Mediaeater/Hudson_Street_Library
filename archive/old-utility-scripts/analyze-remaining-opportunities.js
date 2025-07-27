const fs = require('fs');

function analyzeRemainingOpportunities() {
    const csvContent = fs.readFileSync('./src/_data/books.csv', 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    const imageUrlIndex = headers.indexOf('image_url');
    const isbnIndex = headers.indexOf('isbn_asin');
    const titleIndex = headers.indexOf('title');
    const authorIndex = headers.indexOf('author_full_name');
    const publisherIndex = headers.indexOf('publisher');
    const yearIndex = headers.indexOf('publication_year');
    
    let totalBooks = 0;
    let booksWithImages = 0;
    let booksWithValidISBN = 0;
    let highPriorityTargets = [];
    let recentBooks = [];
    let majorPublishers = [];
    
    const publishers = {};
    const years = {};
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        totalBooks++;
        
        const imageUrl = columns[imageUrlIndex] || '';
        const isbn = columns[isbnIndex] || '';
        const title = columns[titleIndex] || '';
        const author = columns[authorIndex] || '';
        const publisher = columns[publisherIndex] || '';
        const year = columns[yearIndex] || '';
        
        // Check if has image
        const hasImage = imageUrl && imageUrl.trim() !== '' && 
                         imageUrl.trim() !== '""' && 
                         imageUrl.trim().toLowerCase() !== '"null"' && 
                         imageUrl.trim().toLowerCase() !== 'null';
        
        if (hasImage) {
            booksWithImages++;
        }
        
        // Analyze ISBN quality
        const cleanISBN = isbn.replace(/"/g, '').trim();
        const isValidISBN = cleanISBN && 
                           cleanISBN !== '' && 
                           cleanISBN.toLowerCase() !== 'null' &&
                           /^[0-9-]{10,}$/.test(cleanISBN); // Basic ISBN pattern
        
        if (isValidISBN) {
            booksWithValidISBN++;
        }
        
        // Track publishers
        if (publisher && publisher !== 'NULL') {
            const cleanPublisher = publisher.replace(/"/g, '').trim();
            publishers[cleanPublisher] = (publishers[cleanPublisher] || 0) + 1;
        }
        
        // Track years
        if (year && year !== 'NULL') {
            const cleanYear = year.replace(/"/g, '').trim();
            if (/^\d{4}$/.test(cleanYear)) {
                years[cleanYear] = (years[cleanYear] || 0) + 1;
            }
        }
        
        // Identify high-priority targets (no image + valid ISBN + recent + major publisher)
        if (!hasImage && isValidISBN) {
            const cleanTitle = title.replace(/"/g, '').trim();
            const cleanAuthor = author.replace(/"/g, '').trim();
            const cleanPublisher = publisher.replace(/"/g, '').trim();
            const cleanYear = year.replace(/"/g, '').trim();
            
            const priority = calculatePriority(cleanTitle, cleanAuthor, cleanPublisher, cleanYear, cleanISBN);
            
            highPriorityTargets.push({
                title: cleanTitle,
                author: cleanAuthor,
                publisher: cleanPublisher,
                year: cleanYear,
                isbn: cleanISBN,
                priority: priority
            });
            
            // Track recent books (2010+)
            if (parseInt(cleanYear) >= 2010) {
                recentBooks.push({
                    title: cleanTitle,
                    author: cleanAuthor,
                    publisher: cleanPublisher,
                    year: cleanYear,
                    isbn: cleanISBN
                });
            }
        }
    }
    
    // Sort high priority targets
    highPriorityTargets.sort((a, b) => b.priority - a.priority);
    
    // Get top publishers
    const topPublishers = Object.entries(publishers)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20);
    
    console.log('📊 Remaining Acquisition Opportunities Analysis\n');
    
    console.log('Current Status:');
    console.log(`Total books: ${totalBooks}`);
    console.log(`Books with images: ${booksWithImages} (${((booksWithImages/totalBooks)*100).toFixed(1)}%)`);
    console.log(`Books with valid ISBNs: ${booksWithValidISBN}`);
    console.log(`High-priority targets: ${highPriorityTargets.length}`);
    console.log(`Recent books (2010+): ${recentBooks.length}\n`);
    
    console.log('Top 10 High-Priority Acquisition Targets:');
    highPriorityTargets.slice(0, 10).forEach((book, i) => {
        console.log(`${i+1}. "${book.title}" by ${book.author}`);
        console.log(`   Publisher: ${book.publisher} (${book.year})`);
        console.log(`   ISBN: ${book.isbn} | Priority: ${book.priority}\n`);
    });
    
    console.log('Top Publishers by Volume:');
    topPublishers.slice(0, 10).forEach(([publisher, count], i) => {
        console.log(`${i+1}. ${publisher}: ${count} books`);
    });
    
    console.log('\nRecommendations:');
    console.log('1. Focus on recent books (2010+) - higher API availability');
    console.log('2. Target major publishers (Steidl, Aperture, etc.) - better coverage');
    console.log('3. Try alternative APIs (WorldCat, Amazon, LibraryThing)');
    console.log('4. Consider manual acquisition for high-value titles');
    console.log('5. Implement ISBN cleaning and validation improvements');
    
    // Show sample of problematic ISBNs
    console.log('\nSample of Problematic ISBNs:');
    const problematicISBNs = [];
    for (let i = 1; i < Math.min(lines.length, 100); i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const columns = line.split(',');
        const isbn = columns[isbnIndex] || '';
        const cleanISBN = isbn.replace(/"/g, '').trim();
        
        if (cleanISBN && !(/^[0-9-]{10,}$/.test(cleanISBN))) {
            problematicISBNs.push(cleanISBN);
        }
    }
    
    console.log('Examples of invalid ISBNs that need cleaning:');
    problematicISBNs.slice(0, 10).forEach(isbn => {
        console.log(`- "${isbn}"`);
    });
}

function calculatePriority(title, author, publisher, year, isbn) {
    let score = 0;
    
    // Recent books get higher priority
    const yearNum = parseInt(year);
    if (yearNum >= 2015) score += 30;
    else if (yearNum >= 2010) score += 20;
    else if (yearNum >= 2000) score += 10;
    
    // Major publishers get higher priority
    const majorPublishers = ['Steidl', 'Aperture', 'Phaidon', 'Thames & Hudson', 'MOMA', 'Hatje Cantz', 'Damiani'];
    if (majorPublishers.some(pub => publisher.toLowerCase().includes(pub.toLowerCase()))) {
        score += 25;
    }
    
    // Clean ISBNs get higher priority
    if (/^978[0-9]{10}$/.test(isbn.replace(/-/g, ''))) {
        score += 15; // Valid ISBN-13
    } else if (/^[0-9]{9}[0-9X]$/.test(isbn.replace(/-/g, ''))) {
        score += 10; // Valid ISBN-10
    }
    
    // Well-known authors get priority
    const notableAuthors = ['Robert Frank', 'Diane Arbus', 'Richard Avedon', 'Annie Leibovitz', 'Nan Goldin'];
    if (notableAuthors.some(name => author.toLowerCase().includes(name.toLowerCase()))) {
        score += 20;
    }
    
    return score;
}

analyzeRemainingOpportunities();