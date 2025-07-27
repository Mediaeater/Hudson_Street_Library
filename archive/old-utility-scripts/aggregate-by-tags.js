const fs = require('fs');
const path = require('path');

// Configuration
const CSV_PATH = './src/_data/books.csv';
const OUTPUT_DIR = './tag-analysis';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Function to parse CSV manually to handle complex data
function parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    const books = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Simple split - may need refinement for complex data
        const columns = line.split(',');
        
        const book = {};
        headers.forEach((header, index) => {
            book[header] = columns[index]?.replace(/"/g, '').trim() || '';
        });
        
        books.push(book);
    }
    
    return books;
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
        .filter(tag => tag.length > 0)
        .map(tag => {
            // Normalize capitalization
            return tag.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        });
}

// Main aggregation function
function aggregateByTags() {
    console.log('📚 Aggregating Hudson Street Library books by tags...\n');
    
    // Read CSV
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const books = parseCSV(csvContent);
    
    console.log(`Total books: ${books.length}\n`);
    
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
                tagMap.get(tag).push({
                    id: book.id || index,
                    title: book.title,
                    author: book.author_full_name,
                    year: book.publication_year,
                    publisher: book.publisher,
                    hasImage: book.image_url && book.image_url !== 'NULL' && book.image_url !== ''
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
    
    console.log('🏷️  Top 20 Most Common Tags:');
    sortedTags.slice(0, 20).forEach(([tag, count]) => {
        const percentage = (count / tagStats.totalBooks * 100).toFixed(1);
        console.log(`   ${count.toString().padStart(4)} books (${percentage.padStart(5)}%) - ${tag}`);
    });
    
    // Save detailed results
    saveResults(tagMap, tagStats, sortedTags);
    
    // Create tag pages
    createTagPages(tagMap, sortedTags);
}

// Function to save results
function saveResults(tagMap, tagStats, sortedTags) {
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
    console.log(`✅ Tag list saved to: ${tagListPath}`);
    
    // Save complete tag-to-books mapping
    const mappingPath = path.join(OUTPUT_DIR, 'tag-book-mapping.json');
    const mapping = {};
    tagMap.forEach((books, tag) => {
        mapping[tag] = books;
    });
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    console.log(`✅ Complete mapping saved to: ${mappingPath}`);
}

// Function to create individual tag pages
function createTagPages(tagMap, sortedTags) {
    const tagPagesDir = path.join(OUTPUT_DIR, 'tag-pages');
    if (!fs.existsSync(tagPagesDir)) {
        fs.mkdirSync(tagPagesDir, { recursive: true });
    }
    
    // Create index page
    const indexContent = `# Hudson Street Library - Tags Index

Total Tags: ${tagMap.size}

## All Tags by Frequency

${sortedTags.map(([tag, count]) => `- [${tag}](./tag-pages/${tag.replace(/[^a-zA-Z0-9]/g, '_')}.md) (${count} books)`).join('\n')}
`;
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'tags-index.md'), indexContent);
    
    // Create individual tag pages (top 50 only to avoid too many files)
    console.log('\n📄 Creating tag pages...');
    const topTags = sortedTags.slice(0, 50);
    
    topTags.forEach(([tag, count]) => {
        const books = tagMap.get(tag);
        // Limit filename length and ensure it's valid
        let safeTag = tag.replace(/[^a-zA-Z0-9]/g, '_');
        if (safeTag.length > 50) {
            safeTag = safeTag.substring(0, 50) + '_' + tag.length;
        }
        const filename = `${safeTag}.md`;
        
        const content = `# Tag: ${tag}

**Total Books**: ${count}

## Books

${books.map(book => `### ${book.title}
- **Author**: ${book.author}
- **Year**: ${book.year}
- **Publisher**: ${book.publisher}
- **Has Cover**: ${book.hasImage ? '✅' : '❌'}
`).join('\n')}
`;
        
        fs.writeFileSync(path.join(tagPagesDir, filename), content);
    });
    
    console.log(`✅ Created ${topTags.length} tag pages in: ${tagPagesDir}`);
}

// Function to find related tags (tags that often appear together)
function findRelatedTags(books) {
    console.log('\n🔗 Finding related tags...');
    
    const tagPairs = new Map();
    
    books.forEach(book => {
        const tags = extractTags(book.tags);
        
        // Create pairs for all combinations
        for (let i = 0; i < tags.length; i++) {
            for (let j = i + 1; j < tags.length; j++) {
                const pair = [tags[i], tags[j]].sort().join(' + ');
                tagPairs.set(pair, (tagPairs.get(pair) || 0) + 1);
            }
        }
    });
    
    // Sort pairs by frequency
    const sortedPairs = Array.from(tagPairs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
    
    console.log('\n🤝 Top 20 Tag Combinations:');
    sortedPairs.forEach(([pair, count]) => {
        console.log(`   ${count.toString().padStart(3)} books - ${pair}`);
    });
    
    // Save related tags
    const relatedPath = path.join(OUTPUT_DIR, 'related-tags.json');
    fs.writeFileSync(relatedPath, JSON.stringify(sortedPairs, null, 2));
}

// Run the aggregation
const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const books = parseCSV(csvContent);

aggregateByTags();
findRelatedTags(books);

console.log('\n✨ Tag aggregation complete!');
console.log(`📁 Results saved in: ${OUTPUT_DIR}/`);