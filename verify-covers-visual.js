#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');

// Configuration
const IMAGES_DIR = './src/assets/images/books';
const CSV_PATH = './src/_data/books.csv';
const PROGRESS_FILE = './cover-verification-progress.json';
const BATCH_SIZE = 5; // Reduced for easier management

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

// Load progress from file
function loadProgress() {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
        }
    } catch (e) {
        console.log(`${colors.yellow}Could not load previous progress${colors.reset}`);
    }
    return {
        verified: [],
        toDelete: [],
        skipped: [],
        reviewed: [] // All files that have been looked at
    };
}

// Save progress to file
function saveProgress(progress) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

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
function getCoverImages(excludeReviewed = true) {
    let files = fs.readdirSync(IMAGES_DIR)
        .filter(f => f.endsWith('.jpg'))
        .sort();
    
    if (excludeReviewed) {
        const progress = loadProgress();
        const reviewedSet = new Set(progress.reviewed);
        const unreviewedFiles = files.filter(f => !reviewedSet.has(f));
        
        if (unreviewedFiles.length < files.length) {
            console.log(`${colors.cyan}Skipping ${files.length - unreviewedFiles.length} already reviewed covers${colors.reset}`);
        }
        
        return unreviewedFiles;
    }
    
    return files;
}

// Open image in default viewer
function openImage(filepath) {
    exec(`open "${filepath}"`, (error) => {
        if (error) {
            console.log(`${colors.red}Could not open image: ${error.message}${colors.reset}`);
        }
    });
}

// Display book info
function displayBook(filename, bookDetails, index, total) {
    console.log(`\n${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.blue}Progress:${colors.reset} ${index + 1} / ${total} (unreviewed)`);
    console.log(`${colors.blue}File:${colors.reset} ${filename}`);
    console.log(`${colors.blue}Size:${colors.reset} ${fs.statSync(path.join(IMAGES_DIR, filename)).size} bytes\n`);
    
    const book = bookDetails[filename];
    if (book) {
        console.log(`${colors.green}Expected Book:${colors.reset}`);
        console.log(`  ${colors.bold}Title:${colors.reset} ${book.title}`);
        console.log(`  ${colors.bold}Author:${colors.reset} ${book.author}`);
        console.log(`  ${colors.bold}Publisher:${colors.reset} ${book.publisher || 'Unknown'}`);
        console.log(`  ${colors.bold}Year:${colors.reset} ${book.year || 'Unknown'}`);
        console.log(`  ${colors.bold}ISBN:${colors.reset} ${book.isbn || 'No ISBN'}`);
    } else {
        console.log(`${colors.red}⚠️  No matching book found in CSV${colors.reset}`);
    }
    
    console.log(`\n${colors.bold}Is this the correct cover for the book above?${colors.reset}`);
    console.log(`  ${colors.green}[y]${colors.reset} Yes - Keep it`);
    console.log(`  ${colors.red}[n]${colors.reset} No - Mark for deletion`);
    console.log(`  ${colors.yellow}[s]${colors.reset} Skip - Not sure`);
    console.log(`  ${colors.magenta}[q]${colors.reset} Quit`);
}

// Main verification process
async function verifyCovers() {
    const bookDetails = getBookDetails();
    const coverImages = getCoverImages(true); // Skip already reviewed
    
    if (coverImages.length === 0) {
        console.log(`${colors.green}All covers have been reviewed!${colors.reset}`);
        const progress = loadProgress();
        showSummary(progress.verified, progress.toDelete, progress.skipped);
        return;
    }
    
    console.log(`${colors.bold}${colors.cyan}Found ${coverImages.length} unreviewed cover images${colors.reset}\n`);
    console.log(`${colors.yellow}Images will open automatically in your default image viewer.${colors.reset}`);
    console.log(`${colors.yellow}Compare the opened image with the book details shown here.${colors.reset}\n`);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    // Load existing progress
    const progress = loadProgress();
    let { verified, toDelete, skipped, reviewed } = progress;
    
    // Convert arrays to Sets for faster lookup
    const verifiedSet = new Set(verified);
    const toDeleteSet = new Set(toDelete);
    const skippedSet = new Set(skipped);
    const reviewedSet = new Set(reviewed);
    
    // Process images
    for (let i = 0; i < coverImages.length; i++) {
        const filename = coverImages[i];
        
        // Open the image
        const imagePath = path.join(IMAGES_DIR, filename);
        openImage(imagePath);
        
        // Display book info
        displayBook(filename, bookDetails, i, coverImages.length);
        
        const answer = await new Promise(resolve => {
            rl.question('\nYour choice: ', resolve);
        });
        
        // Mark as reviewed
        reviewedSet.add(filename);
        
        switch (answer.toLowerCase()) {
            case 'y':
                verifiedSet.add(filename);
                toDeleteSet.delete(filename);
                skippedSet.delete(filename);
                console.log(`${colors.green}✓ Marked as correct${colors.reset}`);
                break;
            case 'n':
                toDeleteSet.add(filename);
                verifiedSet.delete(filename);
                skippedSet.delete(filename);
                console.log(`${colors.red}✗ Marked for deletion${colors.reset}`);
                break;
            case 's':
                skippedSet.add(filename);
                verifiedSet.delete(filename);
                toDeleteSet.delete(filename);
                console.log(`${colors.yellow}⚠ Skipped${colors.reset}`);
                break;
            case 'q':
                console.log('\nSaving progress and quitting...');
                // Convert Sets back to arrays and save
                saveProgress({
                    verified: Array.from(verifiedSet),
                    toDelete: Array.from(toDeleteSet),
                    skipped: Array.from(skippedSet),
                    reviewed: Array.from(reviewedSet)
                });
                rl.close();
                showSummary(Array.from(verifiedSet), Array.from(toDeleteSet), Array.from(skippedSet));
                return;
        }
        
        // Save progress periodically (every 5 images)
        if ((i + 1) % 5 === 0) {
            saveProgress({
                verified: Array.from(verifiedSet),
                toDelete: Array.from(toDeleteSet),
                skipped: Array.from(skippedSet),
                reviewed: Array.from(reviewedSet)
            });
            console.log(`${colors.cyan}Progress saved${colors.reset}`);
        }
        
        // Every 10 images, ask if user wants to continue
        if ((i + 1) % 10 === 0 && i < coverImages.length - 1) {
            console.log(`\n${colors.bold}Processed ${i + 1} images.${colors.reset}`);
            const cont = await new Promise(resolve => {
                rl.question('Continue? (y/n) [y]: ', (answer) => {
                    resolve(answer.toLowerCase() !== 'n');
                });
            });
            if (!cont) {
                saveProgress({
                    verified: Array.from(verifiedSet),
                    toDelete: Array.from(toDeleteSet),
                    skipped: Array.from(skippedSet),
                    reviewed: Array.from(reviewedSet)
                });
                rl.close();
                showSummary(Array.from(verifiedSet), Array.from(toDeleteSet), Array.from(skippedSet));
                return;
            }
        }
    }
    
    // Save final progress
    saveProgress({
        verified: Array.from(verifiedSet),
        toDelete: Array.from(toDeleteSet),
        skipped: Array.from(skippedSet),
        reviewed: Array.from(reviewedSet)
    });
    
    rl.close();
    showSummary(Array.from(verifiedSet), Array.from(toDeleteSet), Array.from(skippedSet));
}

// Show summary and handle deletions
function showSummary(verified, toDelete, skipped) {
    console.log(`\n${colors.bold}${colors.cyan}Verification Summary${colors.reset}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    console.log(`${colors.green}✓ Verified correct:${colors.reset} ${verified.length}`);
    console.log(`${colors.red}✗ Marked for deletion:${colors.reset} ${toDelete.length}`);
    console.log(`${colors.yellow}⚠ Skipped:${colors.reset} ${skipped.length}\n`);
    
    if (toDelete.length > 0) {
        console.log(`${colors.bold}Files marked for deletion:${colors.reset}`);
        toDelete.slice(0, 10).forEach(f => console.log(`  ${colors.red}- ${f}${colors.reset}`));
        if (toDelete.length > 10) {
            console.log(`  ${colors.red}... and ${toDelete.length - 10} more${colors.reset}`);
        }
        
        console.log(`\n${colors.bold}Delete these ${toDelete.length} files? (y/n)${colors.reset}`);
        
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        rl.question('', (answer) => {
            if (answer.toLowerCase() === 'y') {
                let deleted = 0;
                toDelete.forEach(filename => {
                    try {
                        fs.unlinkSync(path.join(IMAGES_DIR, filename));
                        deleted++;
                    } catch (e) {
                        console.log(`${colors.red}Could not delete ${filename}: ${e.message}${colors.reset}`);
                    }
                });
                console.log(`${colors.green}✓ Deleted ${deleted} files${colors.reset}`);
                
                // Clear the toDelete list from progress after deletion
                const progress = loadProgress();
                progress.toDelete = [];
                saveProgress(progress);
            } else {
                console.log(`${colors.yellow}No files deleted${colors.reset}`);
                
                // Save list for later
                const deleteListPath = './covers-to-delete.txt';
                fs.writeFileSync(deleteListPath, toDelete.join('\n'));
                console.log(`${colors.cyan}List saved to ${deleteListPath}${colors.reset}`);
            }
            rl.close();
        });
    }
}

// Main menu
async function main() {
    console.log(`${colors.bold}${colors.cyan}Hudson Street Library - Visual Book Cover Verification${colors.reset}`);
    console.log(`${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    const progress = loadProgress();
    const totalCovers = fs.readdirSync(IMAGES_DIR).filter(f => f.endsWith('.jpg')).length;
    const reviewedCount = progress.reviewed.length;
    
    console.log(`Total covers: ${totalCovers}`);
    console.log(`Already reviewed: ${reviewedCount}`);
    console.log(`Remaining: ${totalCovers - reviewedCount}\n`);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    console.log('Options:');
    console.log(`  ${colors.green}[1]${colors.reset} Continue verification (skip reviewed)`);
    console.log(`  ${colors.yellow}[2]${colors.reset} Start over (review all)`);
    console.log(`  ${colors.cyan}[3]${colors.reset} Show current progress`);
    console.log(`  ${colors.red}[4]${colors.reset} Delete marked files`);
    console.log(`  ${colors.magenta}[q]${colors.reset} Quit\n`);
    
    rl.question('Your choice: ', async (answer) => {
        rl.close();
        
        switch (answer) {
            case '1':
                verifyCovers();
                break;
            case '2':
                // Clear progress and start over
                fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
                    verified: [],
                    toDelete: [],
                    skipped: [],
                    reviewed: []
                }));
                console.log(`${colors.yellow}Progress cleared${colors.reset}\n`);
                verifyCovers();
                break;
            case '3':
                showSummary(progress.verified, progress.toDelete, progress.skipped);
                break;
            case '4':
                if (progress.toDelete.length > 0) {
                    showSummary([], progress.toDelete, []);
                } else {
                    console.log(`${colors.yellow}No files marked for deletion${colors.reset}`);
                }
                break;
            case 'q':
                console.log('Goodbye!');
                break;
            default:
                console.log(`${colors.red}Invalid choice${colors.reset}`);
        }
    });
}

// Run the tool
main();