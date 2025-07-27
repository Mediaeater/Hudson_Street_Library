#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const IMAGES_DIR = './src/assets/images/books';
const CSV_PATH = './src/_data/books.csv';
const BATCH_SIZE = 10;

// ANSI color codes
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
};

// Read CSV to get book details
function getBookDetails() {
    const csv = fs.readFileSync(CSV_PATH, 'utf8');
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));
    
    const titleIndex = headers.indexOf('title');
    const authorIndex = headers.indexOf('author_full_name');
    const publisherIndex = headers.indexOf('publisher');
    const yearIndex = headers.indexOf('publication_year');
    const isbnIndex = headers.indexOf('isbn_asin');
    
    const books = {};
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        const cols = line.split(',');
        const author = (cols[authorIndex] || '').replace(/"/g, '').trim();
        const title = (cols[titleIndex] || '').replace(/"/g, '').trim();
        const isbn = (cols[isbnIndex] || '').replace(/"/g, '').trim();
        
        const filename = `${author.replace(/[^a-zA-Z0-9.-]/g, '_')}_${title.replace(/[^a-zA-Z0-9.-]/g, '_')}_${isbn || 'noISBN'}.jpg`.substring(0, 200);
        
        books[filename] = {
            title: title,
            author: author,
            publisher: (cols[publisherIndex] || '').replace(/"/g, '').trim(),
            year: (cols[yearIndex] || '').replace(/"/g, '').trim(),
            isbn: isbn
        };
    }
    
    return books;
}

// Get all cover images
function getCoverImages() {
    const files = fs.readdirSync(IMAGES_DIR)
        .filter(f => f.endsWith('.jpg'))
        .sort();
    return files;
}

// Display book info
function displayBook(filename, bookDetails, index, total) {
    console.clear();
    console.log(`${colors.bold}${colors.cyan}Book Cover Verification Tool${colors.reset}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    console.log(`${colors.blue}Progress:${colors.reset} ${index + 1} / ${total}`);
    console.log(`${colors.blue}File:${colors.reset} ${filename}`);
    console.log(`${colors.blue}Size:${colors.reset} ${fs.statSync(path.join(IMAGES_DIR, filename)).size} bytes\n`);
    
    const book = bookDetails[filename];
    if (book) {
        console.log(`${colors.green}Book Details:${colors.reset}`);
        console.log(`  ${colors.bold}Title:${colors.reset} ${book.title}`);
        console.log(`  ${colors.bold}Author:${colors.reset} ${book.author}`);
        console.log(`  ${colors.bold}Publisher:${colors.reset} ${book.publisher || 'Unknown'}`);
        console.log(`  ${colors.bold}Year:${colors.reset} ${book.year || 'Unknown'}`);
        console.log(`  ${colors.bold}ISBN:${colors.reset} ${book.isbn || 'No ISBN'}`);
    } else {
        console.log(`${colors.red}⚠️  No matching book found in CSV${colors.reset}`);
    }
    
    console.log(`\n${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.bold}View the image at:${colors.reset}`);
    console.log(`${colors.cyan}file://${path.resolve(IMAGES_DIR, filename)}${colors.reset}`);
    console.log(`\n${colors.bold}Is this cover correct?${colors.reset}`);
    console.log(`  ${colors.green}[y]${colors.reset} Yes - Keep it`);
    console.log(`  ${colors.red}[n]${colors.reset} No - Mark for deletion`);
    console.log(`  ${colors.yellow}[s]${colors.reset} Skip - Not sure`);
    console.log(`  ${colors.magenta}[q]${colors.reset} Quit`);
}

// Main verification process
async function verifyCovers() {
    const bookDetails = getBookDetails();
    const coverImages = getCoverImages();
    
    console.log(`${colors.bold}${colors.cyan}Found ${coverImages.length} cover images to verify${colors.reset}\n`);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const toDelete = [];
    const verified = [];
    const skipped = [];
    
    // Process in batches
    for (let i = 0; i < coverImages.length; i += BATCH_SIZE) {
        const batch = coverImages.slice(i, Math.min(i + BATCH_SIZE, coverImages.length));
        
        for (let j = 0; j < batch.length; j++) {
            const filename = batch[j];
            const globalIndex = i + j;
            
            displayBook(filename, bookDetails, globalIndex, coverImages.length);
            
            const answer = await new Promise(resolve => {
                rl.question('\nYour choice: ', resolve);
            });
            
            switch (answer.toLowerCase()) {
                case 'y':
                    verified.push(filename);
                    console.log(`${colors.green}✓ Marked as correct${colors.reset}`);
                    break;
                case 'n':
                    toDelete.push(filename);
                    console.log(`${colors.red}✗ Marked for deletion${colors.reset}`);
                    break;
                case 's':
                    skipped.push(filename);
                    console.log(`${colors.yellow}⚠ Skipped${colors.reset}`);
                    break;
                case 'q':
                    console.log('\nQuitting...');
                    rl.close();
                    showSummary(verified, toDelete, skipped);
                    return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // After each batch, ask if user wants to continue
        console.clear();
        console.log(`${colors.bold}Batch complete!${colors.reset}`);
        console.log(`Processed ${Math.min(i + BATCH_SIZE, coverImages.length)} of ${coverImages.length} images\n`);
        console.log(`Continue with next batch? (y/n)`);
        
        const continueAnswer = await new Promise(resolve => {
            rl.question('', resolve);
        });
        
        if (continueAnswer.toLowerCase() !== 'y') {
            break;
        }
    }
    
    rl.close();
    showSummary(verified, toDelete, skipped);
}

// Show summary and handle deletions
function showSummary(verified, toDelete, skipped) {
    console.clear();
    console.log(`${colors.bold}${colors.cyan}Verification Summary${colors.reset}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    console.log(`${colors.green}✓ Verified correct:${colors.reset} ${verified.length}`);
    console.log(`${colors.red}✗ Marked for deletion:${colors.reset} ${toDelete.length}`);
    console.log(`${colors.yellow}⚠ Skipped:${colors.reset} ${skipped.length}\n`);
    
    if (toDelete.length > 0) {
        console.log(`${colors.bold}Files marked for deletion:${colors.reset}`);
        toDelete.forEach(f => console.log(`  ${colors.red}- ${f}${colors.reset}`));
        
        console.log(`\n${colors.bold}Delete these ${toDelete.length} files? (y/n)${colors.reset}`);
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('', (answer) => {
            if (answer.toLowerCase() === 'y') {
                toDelete.forEach(filename => {
                    fs.unlinkSync(path.join(IMAGES_DIR, filename));
                });
                console.log(`${colors.green}✓ Deleted ${toDelete.length} files${colors.reset}`);
            } else {
                console.log(`${colors.yellow}No files deleted${colors.reset}`);
            }
            rl.close();
        });
    }
}

// Run the tool
console.log(`${colors.bold}${colors.cyan}Hudson Street Library - Book Cover Verification Tool${colors.reset}`);
console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
console.log('This tool will help you manually verify book covers.');
console.log('You can view each image and decide if it matches the book.\n');
console.log('Press Enter to start...');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('', () => {
    rl.close();
    verifyCovers();
});