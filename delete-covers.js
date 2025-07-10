const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const IMAGES_DIR = './src/assets/images/books';
const CSV_PATH = './src/_data/books.csv';

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to ask question and get answer
function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

// Function to display image info
function displayImageInfo(filename) {
    console.log('\n' + '='.repeat(60));
    console.log(`📖 File: ${filename}`);
    
    // Try to extract book info from filename
    const parts = filename.replace('.jpg', '').split('_');
    if (parts.length >= 2) {
        console.log(`   Author: ${parts[0].replace(/_/g, ' ')}`);
        console.log(`   Title: ${parts.slice(1, -1).join(' ').replace(/_/g, ' ')}`);
        console.log(`   ISBN/ID: ${parts[parts.length - 1]}`);
    }
    
    const filepath = path.join(IMAGES_DIR, filename);
    const stats = fs.statSync(filepath);
    console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   Modified: ${stats.mtime.toLocaleDateString()}`);
}

// Function to search for covers
async function searchCovers() {
    console.log('🔍 Search for book covers to delete\n');
    console.log('Options:');
    console.log('1. Search by author name');
    console.log('2. Search by book title');
    console.log('3. Search by ISBN');
    console.log('4. List all covers');
    console.log('5. Show covers for books with invalid ISBNs');
    
    const choice = await ask('\nEnter your choice (1-5): ');
    
    const files = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg'));
    let matches = [];
    
    switch(choice) {
        case '1':
            const author = await ask('Enter author name (partial match): ');
            matches = files.filter(f => f.toLowerCase().includes(author.toLowerCase()));
            break;
            
        case '2':
            const title = await ask('Enter book title (partial match): ');
            matches = files.filter(f => f.toLowerCase().includes(title.toLowerCase()));
            break;
            
        case '3':
            const isbn = await ask('Enter ISBN: ');
            matches = files.filter(f => f.includes(isbn));
            break;
            
        case '4':
            matches = files;
            break;
            
        case '5':
            // Show covers for books with problematic ISBNs
            matches = files.filter(f => {
                return f.includes('noISBN') || 
                       f.includes('NULL') || 
                       f.includes('OOP') || 
                       f.includes('First') ||
                       f.includes('500') ||
                       f.includes('72') ||
                       f.includes('Rare') ||
                       f.includes('signed') ||
                       f.includes('color') ||
                       f.includes('bw');
            });
            break;
    }
    
    return matches;
}

// Function to delete covers
async function deleteCovers(files) {
    if (files.length === 0) {
        console.log('\n❌ No matching files found.');
        return;
    }
    
    console.log(`\n📚 Found ${files.length} matching files:\n`);
    
    // Display in batches
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, Math.min(i + batchSize, files.length));
        
        batch.forEach((file, index) => {
            console.log(`${i + index + 1}. ${file}`);
        });
        
        if (i + batchSize < files.length) {
            const cont = await ask('\nPress Enter to see more, or type "done" to stop: ');
            if (cont.toLowerCase() === 'done') break;
        }
    }
    
    console.log('\n🗑️  Delete Options:');
    console.log('1. Delete specific files by number (e.g., "1,3,5" or "1-5")');
    console.log('2. Delete all matching files');
    console.log('3. Review each file individually');
    console.log('4. Cancel');
    
    const deleteChoice = await ask('\nEnter your choice (1-4): ');
    
    let filesToDelete = [];
    
    switch(deleteChoice) {
        case '1':
            const numbers = await ask('Enter file numbers to delete: ');
            const indices = parseNumberRange(numbers);
            filesToDelete = indices.map(i => files[i - 1]).filter(f => f);
            break;
            
        case '2':
            filesToDelete = files;
            break;
            
        case '3':
            // Review each file
            for (let i = 0; i < files.length; i++) {
                displayImageInfo(files[i]);
                const del = await ask('\nDelete this file? (y/n/stop): ');
                if (del.toLowerCase() === 'y') {
                    filesToDelete.push(files[i]);
                } else if (del.toLowerCase() === 'stop') {
                    break;
                }
            }
            break;
            
        case '4':
            console.log('Cancelled.');
            return;
    }
    
    if (filesToDelete.length > 0) {
        console.log(`\n⚠️  About to delete ${filesToDelete.length} files:`);
        filesToDelete.forEach(f => console.log(`   - ${f}`));
        
        const confirm = await ask('\nAre you sure? Type "DELETE" to confirm: ');
        if (confirm === 'DELETE') {
            let deleted = 0;
            filesToDelete.forEach(file => {
                try {
                    fs.unlinkSync(path.join(IMAGES_DIR, file));
                    deleted++;
                } catch (err) {
                    console.error(`❌ Failed to delete ${file}: ${err.message}`);
                }
            });
            console.log(`\n✅ Deleted ${deleted} files.`);
        } else {
            console.log('❌ Deletion cancelled.');
        }
    }
}

// Helper function to parse number ranges
function parseNumberRange(input) {
    const indices = [];
    const parts = input.split(',');
    
    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            for (let i = start; i <= end; i++) {
                indices.push(i);
            }
        } else {
            const num = parseInt(part.trim());
            if (!isNaN(num)) indices.push(num);
        }
    });
    
    return [...new Set(indices)].sort((a, b) => a - b);
}

// Function to show statistics
async function showStats() {
    const files = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg'));
    const totalSize = files.reduce((sum, file) => {
        const stats = fs.statSync(path.join(IMAGES_DIR, file));
        return sum + stats.size;
    }, 0);
    
    // Count books in CSV
    const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    const totalBooks = lines.length - 1; // minus header
    
    console.log('\n📊 Cover Collection Statistics:');
    console.log(`   Total covers: ${files.length}`);
    console.log(`   Total books: ${totalBooks}`);
    console.log(`   Coverage: ${((files.length / totalBooks) * 100).toFixed(1)}%`);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Average size: ${(totalSize / files.length / 1024).toFixed(2)} KB`);
    
    // Find problematic covers
    const problematic = files.filter(f => {
        return f.includes('noISBN') || 
               f.includes('NULL') || 
               f.includes('OOP') || 
               f.includes('First') ||
               f.includes('500') ||
               f.includes('72') ||
               f.includes('Rare') ||
               f.includes('signed') ||
               f.includes('color') ||
               f.includes('bw');
    });
    
    console.log(`   Covers with odd ISBNs: ${problematic.length}`);
}

// Main menu
async function main() {
    console.log('📚 Hudson Street Library - Cover Management Tool\n');
    
    while (true) {
        console.log('\n' + '='.repeat(60));
        console.log('Main Menu:');
        console.log('1. Search and delete covers');
        console.log('2. Show collection statistics');
        console.log('3. List recent additions');
        console.log('4. Exit');
        
        const choice = await ask('\nEnter your choice (1-4): ');
        
        switch(choice) {
            case '1':
                const files = await searchCovers();
                await deleteCovers(files);
                break;
                
            case '2':
                await showStats();
                break;
                
            case '3':
                // Show 20 most recent files
                const allFiles = fs.readdirSync(IMAGES_DIR)
                    .filter(f => f.endsWith('.jpg'))
                    .map(f => ({
                        name: f,
                        time: fs.statSync(path.join(IMAGES_DIR, f)).mtime
                    }))
                    .sort((a, b) => b.time - a.time)
                    .slice(0, 20);
                
                console.log('\n📅 20 Most Recent Additions:');
                allFiles.forEach((file, i) => {
                    console.log(`${i + 1}. ${file.name} (${file.time.toLocaleDateString()})`);
                });
                break;
                
            case '4':
                console.log('\n👋 Goodbye!');
                rl.close();
                return;
                
            default:
                console.log('❌ Invalid choice.');
        }
    }
}

// Run the tool
main().catch(console.error);