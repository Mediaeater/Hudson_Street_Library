const fs = require('fs');
const path = require('path');
const CSVHandler = require('../utils/csv-handler');

// Configuration
const CSV_PATH = './src/_data/books.csv';
const OUTPUT_DIR = './tag-analysis';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Function to extract and normalize tags
function extractTags(tagString) {
    if (!tagString || tagString === 'NULL' || tagString === '') {
        return [];
    }
    
    // Split by comma and clean up
    return tagString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag.length < 100) // Filter out overly long "tags"
        .map(tag => {
            // Normalize capitalization
            return tag.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        });
}

// Main aggregation function
async function aggregateByTags() {
    console.log('📚 Aggregating Hudson Street Library books by tags...\n');
    
    // Read and parse CSV properly
    const books = await CSVHandler.read(CSV_PATH);
    
    console.log(`Total books: ${books.length}\n`);
    
    // Check if we have cover images
    const existingCovers = fs.readdirSync('./src/assets/images/books')
        .filter(f => f.endsWith('.jpg'));
    const coverLookup = new Set(existingCovers);
    
    // Aggregate by tags
    const tagMap = new Map();
    const tagStats = {
        totalBooks: books.length,
        booksWithTags: 0,
        booksWithoutTags: 0,
        totalUniqueTags: 0,
        tagFrequency: {}
    };
    
    // Process each book
    books.forEach((book, index) => {
        const tags = extractTags(book.tags);
        
        if (tags.length > 0) {
            tagStats.booksWithTags++;
            
            tags.forEach(tag => {
                // Add to tag map
                if (!tagMap.has(tag)) {
                    tagMap.set(tag, []);
                }
                
                // Check if book has a cover
                const bookFilename = `${book.author_full_name}_${book.title}_${book.isbn_asin || 'noISBN'}`
                    .replace(/[^a-zA-Z0-9.-]/g, '_')
                    .replace(/_+/g, '_')
                    .substring(0, 100) + '.jpg';
                
                const hasLocalCover = coverLookup.has(bookFilename);
                
                tagMap.get(tag).push({
                    id: book.id || index,
                    title: book.title,
                    author: book.author_full_name,
                    year: book.publication_year,
                    publisher: book.publisher,
                    isbn: book.isbn_asin,
                    hasImage: book.image_url && book.image_url !== 'NULL' && book.image_url !== '',
                    hasLocalCover: hasLocalCover
                });
                
                // Update frequency
                tagStats.tagFrequency[tag] = (tagStats.tagFrequency[tag] || 0) + 1;
            });
        } else {
            tagStats.booksWithoutTags++;
        }
    });
    
    tagStats.totalUniqueTags = tagMap.size;
    
    // Sort tags by frequency
    const sortedTags = Object.entries(tagStats.tagFrequency)
        .sort((a, b) => b[1] - a[1]);
    
    // Display results
    console.log('📊 Tag Statistics:');
    console.log(`   Books with tags: ${tagStats.booksWithTags} (${(tagStats.booksWithTags / tagStats.totalBooks * 100).toFixed(1)}%)`);
    console.log(`   Books without tags: ${tagStats.booksWithoutTags} (${(tagStats.booksWithoutTags / tagStats.totalBooks * 100).toFixed(1)}%)`);
    console.log(`   Total unique tags: ${tagStats.totalUniqueTags}\n`);
    
    console.log('🏷️  Top 30 Most Common Tags:');
    sortedTags.slice(0, 30).forEach(([tag, count]) => {
        const percentage = (count / tagStats.totalBooks * 100).toFixed(1);
        console.log(`   ${count.toString().padStart(4)} books (${percentage.padStart(5)}%) - ${tag}`);
    });
    
    // Analyze tag coverage
    console.log('\n📸 Cover Analysis by Tag:');
    const tagCoverStats = [];
    sortedTags.slice(0, 20).forEach(([tag, count]) => {
        const books = tagMap.get(tag);
        const withCovers = books.filter(b => b.hasLocalCover).length;
        const coveragePercent = (withCovers / books.length * 100).toFixed(1);
        tagCoverStats.push({ tag, total: count, withCovers, coveragePercent });
        console.log(`   ${tag}: ${withCovers}/${count} books have covers (${coveragePercent}%)`);
    });
    
    // Save results
    saveResults(tagMap, tagStats, sortedTags, tagCoverStats);
    
    // Create tag summary report
    createTagReport(tagMap, sortedTags, tagCoverStats);
}

// Function to save results
function saveResults(tagMap, tagStats, sortedTags, tagCoverStats) {
    // Save statistics
    const statsPath = path.join(OUTPUT_DIR, 'tag-statistics.json');
    fs.writeFileSync(statsPath, JSON.stringify(tagStats, null, 2));
    console.log(`\n✅ Statistics saved to: ${statsPath}`);
    
    // Save tag list with counts
    const tagListPath = path.join(OUTPUT_DIR, 'tag-list.json');
    const tagList = sortedTags.map(([tag, count]) => ({
        tag,
        count,
        percentage: (count / tagStats.totalBooks * 100).toFixed(2)
    }));
    fs.writeFileSync(tagListPath, JSON.stringify(tagList, null, 2));
    
    // Save complete tag-to-books mapping
    const mappingPath = path.join(OUTPUT_DIR, 'tag-book-mapping.json');
    const mapping = {};
    tagMap.forEach((books, tag) => {
        mapping[tag] = books;
    });
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    
    // Save cover stats by tag
    const coverStatsPath = path.join(OUTPUT_DIR, 'tag-cover-statistics.json');
    fs.writeFileSync(coverStatsPath, JSON.stringify(tagCoverStats, null, 2));
}

// Function to create a summary report
function createTagReport(tagMap, sortedTags, tagCoverStats) {
    const reportPath = path.join(OUTPUT_DIR, 'TAG-REPORT.md');
    
    let report = `# Hudson Street Library - Tag Analysis Report

Generated: ${new Date().toLocaleDateString()}

## Overview

- **Total Books**: ${tagMap.size > 0 ? Array.from(tagMap.values()).flat().length : 0}
- **Total Unique Tags**: ${tagMap.size}
- **Books with Tags**: ${Array.from(tagMap.values()).flat().length}

## Top Tags by Frequency

| Tag | Count | Coverage |
|-----|-------|----------|
${tagCoverStats.map(stat => 
    `| ${stat.tag} | ${stat.total} | ${stat.withCovers}/${stat.total} (${stat.coveragePercent}%) |`
).join('\n')}

## Tag Categories

Based on the tags found, the collection appears to focus on:

`;

    // Categorize tags
    const categories = {
        'Photography': [],
        'Art': [],
        'Location': [],
        'Time Period': [],
        'Other': []
    };
    
    sortedTags.forEach(([tag, count]) => {
        const lowerTag = tag.toLowerCase();
        if (lowerTag.includes('photo') || lowerTag.includes('camera')) {
            categories['Photography'].push({ tag, count });
        } else if (lowerTag.includes('art') || lowerTag.includes('paint') || lowerTag.includes('sculpture')) {
            categories['Art'].push({ tag, count });
        } else if (lowerTag.includes('nyc') || lowerTag.includes('new york') || lowerTag.includes('city')) {
            categories['Location'].push({ tag, count });
        } else if (/\d{4}/.test(tag) || lowerTag.includes('century')) {
            categories['Time Period'].push({ tag, count });
        } else {
            categories['Other'].push({ tag, count });
        }
    });
    
    Object.entries(categories).forEach(([category, tags]) => {
        if (tags.length > 0) {
            report += `\n### ${category}\n`;
            tags.slice(0, 10).forEach(({ tag, count }) => {
                report += `- ${tag} (${count} books)\n`;
            });
        }
    });
    
    report += `\n## Recommendations

1. **Improve Tagging**: ${((tagMap.size > 0 ? Array.from(tagMap.values()).flat().length : 0) / 1333 * 100).toFixed(1)}% of books have tags. Consider adding tags to improve discoverability.

2. **Standardize Tags**: Some tags appear to be descriptions rather than categories. Consider standardizing to:
   - Medium (Photography, Painting, Sculpture)
   - Subject (Portrait, Landscape, Abstract)
   - Period (1960s, Contemporary)
   - Location (NYC, Paris)
   - Movement (Conceptual, Documentary)

3. **Priority for Cover Acquisition**: Focus on acquiring covers for the most popular tags first.
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`\n✅ Tag report saved to: ${reportPath}`);
}

// Function to find books without tags but with covers
function findUntaggedBooksWithCovers(books) {
    const existingCovers = fs.readdirSync('./src/assets/images/books')
        .filter(f => f.endsWith('.jpg'));
    const coverLookup = new Set(existingCovers);
    
    const untaggedWithCovers = books.filter(book => {
        const tags = extractTags(book.tags);
        if (tags.length > 0) return false;
        
        const bookFilename = `${book.author_full_name}_${book.title}_${book.isbn_asin || 'noISBN'}`
            .replace(/[^a-zA-Z0-9.-]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 100) + '.jpg';
        
        return coverLookup.has(bookFilename);
    });
    
    console.log(`\n📚 Found ${untaggedWithCovers.length} books with covers but no tags`);
    
    // Save list
    const listPath = path.join(OUTPUT_DIR, 'untagged-books-with-covers.json');
    fs.writeFileSync(listPath, JSON.stringify(untaggedWithCovers.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author_full_name,
        publisher: b.publisher,
        year: b.publication_year
    })), null, 2));
}

// Run the aggregation
(async () => {
    try {
        await aggregateByTags();
        
        // Also find books that have covers but no tags
        const books = await CSVHandler.read(CSV_PATH);
        findUntaggedBooksWithCovers(books);
        
        console.log('\n✨ Tag aggregation complete!');
        console.log(`📁 Results saved in: ${OUTPUT_DIR}/`);
    } catch (error) {
        console.error('Error:', error.message);
    }
})();