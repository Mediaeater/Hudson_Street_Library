#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const CSVHandler = require('./scripts/utils/csv-handler');
const ImageProcessor = require('./scripts/utils/image-processor');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/*
 * Consolidated Book Cover Utilities
 * 
 * Commands:
 *   analyze     - Analyze cover status and opportunities
 *   verify      - Verify cover integrity 
 *   check       - Check cover status
 *   visual      - Visual verification of covers
 *   fix-names   - Fix cover filenames
 *   delete      - Delete specific covers
 *   map         - Map covers to books
 * 
 * Usage:
 *   ./cover-utils.js <command> [options]
 * 
 * Examples:
 *   ./cover-utils.js analyze
 *   ./cover-utils.js verify --visual
 *   ./cover-utils.js check --artist "Tillmans"
 *   ./cover-utils.js fix-names --dry-run
 */

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const options = {
    dryRun: args.includes('--dry-run'),
    visual: args.includes('--visual'),
    artist: null,
    limit: null,
    help: args.includes('--help') || args.includes('-h')
};

// Parse options
for (let i = 1; i < args.length; i++) {
    if (args[i] === '--artist' && args[i + 1]) {
        options.artist = args[++i];
    } else if (args[i] === '--limit' && args[i + 1]) {
        options.limit = parseInt(args[++i]);
    }
}

// Configuration
const CSV_PATH = './src/_data/books.csv';
const IMAGES_DIR = './src/assets/images/books';
const THUMBNAIL_DIR = './thumbnails';

// Show help
function showHelp() {
    console.log(`
Book Cover Utilities - Consolidated Tool

Commands:
  analyze              Analyze cover status and identify opportunities
  verify               Verify cover file integrity
  check                Check current cover status
  visual               Open visual verification interface
  fix-names            Fix cover filenames to match convention
  delete <pattern>     Delete covers matching pattern
  map                  Generate cover-to-book mapping

Options:
  --artist <name>      Filter by artist name
  --limit <n>          Limit number of items to process
  --dry-run            Preview changes without applying them
  --visual             Use visual mode (for verify command)
  --help, -h           Show this help message

Examples:
  # Analyze all covers
  ./cover-utils.js analyze

  # Verify covers with visual inspection
  ./cover-utils.js verify --visual

  # Check status for specific artist
  ./cover-utils.js check --artist "Kruger"

  # Fix filenames (preview mode)
  ./cover-utils.js fix-names --dry-run

  # Delete specific covers
  ./cover-utils.js delete "Unknown_"
`);
}

// Helper function to read CSV data
async function readBooksData() {
    return await CSVHandler.read(CSV_PATH);
}

// Helper function to get all cover files
function getCoverFiles() {
    if (!fs.existsSync(IMAGES_DIR)) {
        return [];
    }
    return fs.readdirSync(IMAGES_DIR)
        .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
        .map(file => ({
            filename: file,
            filepath: path.join(IMAGES_DIR, file),
            stats: fs.statSync(path.join(IMAGES_DIR, file))
        }));
}

// ANALYZE command
async function analyzeCovers() {
    console.log('📊 Analyzing Book Cover Status...\n');
    
    const books = await readBooksData();
    const covers = getCoverFiles();
    const coverMap = new Map(covers.map(c => [c.filename.toLowerCase(), c]));
    
    // Statistics
    const stats = {
        totalBooks: books.length,
        booksWithISBN: 0,
        booksWithCovers: 0,
        booksWithoutCovers: 0,
        coversOnDisk: covers.length,
        unmatchedCovers: 0,
        smallCovers: 0,
        largeCovers: 0,
        byAuthor: new Map(),
        byYear: new Map(),
        byPublisher: new Map()
    };
    
    // Analyze books
    for (const book of books) {
        // Apply artist filter if specified
        if (options.artist) {
            const author = `${book.author_first || ''} ${book.author_last || ''}`.toLowerCase();
            if (!author.includes(options.artist.toLowerCase())) continue;
        }
        
        if (book.isbn_asin && book.isbn_asin.trim()) {
            stats.booksWithISBN++;
        }
        
        if (book.image_url && book.image_url.trim() && book.image_url.trim() !== 'NULL') {
            stats.booksWithCovers++;
        } else {
            stats.booksWithoutCovers++;
            
            // Track by author
            const author = book.author_full_name || book.author_last || 'Unknown';
            stats.byAuthor.set(author, (stats.byAuthor.get(author) || 0) + 1);
            
            // Track by year
            const year = book.publication_year || 'Unknown';
            stats.byYear.set(year, (stats.byYear.get(year) || 0) + 1);
            
            // Track by publisher
            const publisher = book.publisher || 'Unknown';
            stats.byPublisher.set(publisher, (stats.byPublisher.get(publisher) || 0) + 1);
        }
    }
    
    // Analyze cover files
    for (const cover of covers) {
        if (cover.stats.size < 5000) stats.smallCovers++;
        if (cover.stats.size > 500000) stats.largeCovers++;
        
        // Check if cover matches any book
        let matched = false;
        for (const book of books) {
            const expectedFilename = `${book.author_last || 'Unknown'}_${book.title || 'Unknown'}_${book.isbn_asin || ''}`.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_') + '.jpg';
            if (cover.filename.toLowerCase() === expectedFilename.toLowerCase()) {
                matched = true;
                break;
            }
        }
        if (!matched) stats.unmatchedCovers++;
    }
    
    // Display results
    console.log('📚 Book Statistics:');
    console.log(`  Total books: ${stats.totalBooks}`);
    console.log(`  Books with ISBN: ${stats.booksWithISBN}`);
    console.log(`  Books with covers: ${stats.booksWithCovers}`);
    console.log(`  Books without covers: ${stats.booksWithoutCovers}`);
    console.log('');
    
    console.log('🖼️  Cover File Statistics:');
    console.log(`  Total cover files: ${stats.coversOnDisk}`);
    console.log(`  Small covers (<5KB): ${stats.smallCovers}`);
    console.log(`  Large covers (>500KB): ${stats.largeCovers}`);
    console.log(`  Unmatched covers: ${stats.unmatchedCovers}`);
    console.log('');
    
    // Top missing covers by author
    console.log('👤 Top Authors with Missing Covers:');
    const topAuthors = Array.from(stats.byAuthor.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    for (const [author, count] of topAuthors) {
        console.log(`  ${author}: ${count} books`);
    }
    console.log('');
    
    // Missing covers by year
    console.log('📅 Missing Covers by Year:');
    const years = Array.from(stats.byYear.entries())
        .sort((a, b) => {
            if (a[0] === 'Unknown') return 1;
            if (b[0] === 'Unknown') return -1;
            return b[0] - a[0];
        })
        .slice(0, 10);
    for (const [year, count] of years) {
        console.log(`  ${year}: ${count} books`);
    }
}

// VERIFY command
async function verifyCovers() {
    console.log('🔍 Verifying Book Covers...\n');
    
    const covers = getCoverFiles();
    const issues = [];
    
    for (const cover of covers) {
        const problems = [];
        
        // Check file size
        if (cover.stats.size < 1000) {
            problems.push(`Very small file (${cover.stats.size} bytes)`);
        }
        
        // Check filename format
        if (!cover.filename.match(/^[A-Za-z]+_.*_\d+\.jpg$/)) {
            problems.push('Non-standard filename format');
        }
        
        // Check for common error patterns
        if (cover.filename.includes('Unknown_Unknown')) {
            problems.push('Missing author/title information');
        }
        
        if (problems.length > 0) {
            issues.push({
                file: cover.filename,
                size: cover.stats.size,
                problems: problems
            });
        }
    }
    
    if (issues.length === 0) {
        console.log('✅ All covers passed verification!');
    } else {
        console.log(`❌ Found ${issues.length} covers with issues:\n`);
        for (const issue of issues.slice(0, options.limit || issues.length)) {
            console.log(`  ${issue.file} (${issue.size} bytes)`);
            for (const problem of issue.problems) {
                console.log(`    - ${problem}`);
            }
        }
    }
    
    if (options.visual) {
        console.log('\n🖼️  Launching visual verification...');
        // Could launch a web server or open a browser here
    }
}

// CHECK command
async function checkStatus() {
    console.log('📋 Checking Cover Status...\n');
    
    const books = await readBooksData();
    const covers = getCoverFiles();
    
    let checkedCount = 0;
    const missing = [];
    const present = [];
    
    for (const book of books) {
        // Apply filters
        if (options.artist) {
            const author = `${book.author_first || ''} ${book.author_last || ''}`.toLowerCase();
            if (!author.includes(options.artist.toLowerCase())) continue;
        }
        
        if (options.limit && checkedCount >= options.limit) break;
        
        if (book.isbn_asin && book.isbn_asin.trim()) {
            checkedCount++;
            const expectedFilename = `${book.author_last || 'Unknown'}_${book.title || 'Unknown'}_${book.isbn_asin}`.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_') + '.jpg';
            const coverExists = covers.some(c => c.filename.toLowerCase() === expectedFilename.toLowerCase());
            
            if (coverExists) {
                present.push({ book, filename: expectedFilename });
            } else if (!book.image_url || book.image_url.trim() === '' || book.image_url.trim() === 'NULL') {
                missing.push({ book, filename: expectedFilename });
            }
        }
    }
    
    console.log(`✅ Covers present: ${present.length}`);
    console.log(`❌ Covers missing: ${missing.length}`);
    console.log(`📊 Total checked: ${checkedCount}\n`);
    
    if (missing.length > 0) {
        console.log('Missing covers:');
        for (const item of missing.slice(0, 10)) {
            console.log(`  - ${item.book.title} by ${item.book.author_full_name || item.book.author_last}`);
            console.log(`    ISBN: ${item.book.isbn_asin}`);
        }
        if (missing.length > 10) {
            console.log(`  ... and ${missing.length - 10} more`);
        }
    }
}

// FIX-NAMES command
async function fixFilenames() {
    console.log('🔧 Fixing Cover Filenames...\n');
    
    const books = await readBooksData();
    const covers = getCoverFiles();
    const bookMap = new Map();
    
    // Create ISBN to book mapping
    for (const book of books) {
        if (book.isbn_asin && book.isbn_asin.trim()) {
            bookMap.set(book.isbn_asin.trim(), book);
        }
    }
    
    let fixCount = 0;
    const fixes = [];
    
    for (const cover of covers) {
        // Try to extract ISBN from filename
        const isbnMatch = cover.filename.match(/(\d{10,13})/);
        if (isbnMatch) {
            const isbn = isbnMatch[1];
            const book = bookMap.get(isbn);
            
            if (book) {
                const newFilename = `${book.author_last || 'Unknown'}_${book.title || 'Unknown'}_${isbn}`.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/_+/g, '_') + '.jpg';
                
                if (newFilename !== cover.filename) {
                    fixes.push({
                        oldName: cover.filename,
                        newName: newFilename,
                        oldPath: cover.filepath,
                        newPath: path.join(IMAGES_DIR, newFilename)
                    });
                    fixCount++;
                }
            }
        }
    }
    
    if (fixes.length === 0) {
        console.log('✅ All filenames are correct!');
        return;
    }
    
    console.log(`Found ${fixes.length} filenames to fix:\n`);
    
    for (const fix of fixes.slice(0, 10)) {
        console.log(`  ${fix.oldName}`);
        console.log(`  → ${fix.newName}\n`);
    }
    
    if (fixes.length > 10) {
        console.log(`... and ${fixes.length - 10} more\n`);
    }
    
    if (!options.dryRun) {
        console.log('Applying fixes...');
        for (const fix of fixes) {
            try {
                fs.renameSync(fix.oldPath, fix.newPath);
                console.log(`✅ Renamed: ${fix.oldName} → ${fix.newName}`);
            } catch (error) {
                console.log(`❌ Failed to rename ${fix.oldName}: ${error.message}`);
            }
        }
    } else {
        console.log('🏃 DRY RUN - No changes made. Remove --dry-run to apply changes.');
    }
}

// DELETE command
async function deleteCovers(pattern) {
    if (!pattern) {
        console.log('❌ Please specify a pattern to match covers for deletion');
        console.log('   Example: ./cover-utils.js delete "Unknown_"');
        return;
    }
    
    console.log(`🗑️  Deleting covers matching pattern: "${pattern}"\n`);
    
    const covers = getCoverFiles();
    const toDelete = covers.filter(c => c.filename.includes(pattern));
    
    if (toDelete.length === 0) {
        console.log('No covers match the pattern.');
        return;
    }
    
    console.log(`Found ${toDelete.length} covers to delete:`);
    for (const cover of toDelete.slice(0, 10)) {
        console.log(`  - ${cover.filename} (${cover.stats.size} bytes)`);
    }
    if (toDelete.length > 10) {
        console.log(`  ... and ${toDelete.length - 10} more`);
    }
    
    if (!options.dryRun) {
        console.log('\n⚠️  This will permanently delete these files!');
        // In a real implementation, you might want to add a confirmation prompt here
        
        let deleted = 0;
        for (const cover of toDelete) {
            try {
                fs.unlinkSync(cover.filepath);
                deleted++;
            } catch (error) {
                console.log(`❌ Failed to delete ${cover.filename}: ${error.message}`);
            }
        }
        console.log(`\n✅ Deleted ${deleted} files`);
    } else {
        console.log('\n🏃 DRY RUN - No files deleted. Remove --dry-run to delete files.');
    }
}

// MAP command
async function mapCovers() {
    console.log('🗺️  Generating Cover-to-Book Mapping...\n');
    
    const books = await readBooksData();
    const covers = getCoverFiles();
    const mapping = [];
    
    // Create mapping
    for (const cover of covers) {
        const isbnMatch = cover.filename.match(/(\d{10,13})/);
        if (isbnMatch) {
            const isbn = isbnMatch[1];
            const book = books.find(b => b.isbn_asin === isbn);
            
            if (book) {
                mapping.push({
                    coverFile: cover.filename,
                    bookTitle: book.title,
                    author: book.author_full_name || `${book.author_first || ''} ${book.author_last || ''}`.trim(),
                    isbn: isbn,
                    year: book.publication_year,
                    publisher: book.publisher
                });
            } else {
                mapping.push({
                    coverFile: cover.filename,
                    bookTitle: 'NOT FOUND IN DATABASE',
                    author: 'Unknown',
                    isbn: isbn,
                    year: '',
                    publisher: ''
                });
            }
        }
    }
    
    // Display mapping
    console.log(`Found ${mapping.length} cover-to-book mappings:\n`);
    
    const limit = options.limit || 20;
    for (const item of mapping.slice(0, limit)) {
        console.log(`📖 ${item.bookTitle}`);
        console.log(`   Author: ${item.author}`);
        console.log(`   File: ${item.coverFile}`);
        console.log(`   ISBN: ${item.isbn}`);
        if (item.year) console.log(`   Year: ${item.year}`);
        console.log('');
    }
    
    if (mapping.length > limit) {
        console.log(`... and ${mapping.length - limit} more\n`);
    }
    
    // Save mapping to file
    const mappingPath = './cover-mapping.json';
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    console.log(`📄 Full mapping saved to: ${mappingPath}`);
}

// Main execution
async function main() {
    if (!command || options.help) {
        showHelp();
        return;
    }
    
    try {
        switch (command.toLowerCase()) {
            case 'analyze':
                await analyzeCovers();
                break;
            case 'verify':
                await verifyCovers();
                break;
            case 'check':
                await checkStatus();
                break;
            case 'visual':
                console.log('🖼️  Visual mode not yet implemented');
                break;
            case 'fix-names':
                await fixFilenames();
                break;
            case 'delete':
                await deleteCovers(args[1]);
                break;
            case 'map':
                await mapCovers();
                break;
            default:
                console.log(`❌ Unknown command: ${command}`);
                showHelp();
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the tool
main();