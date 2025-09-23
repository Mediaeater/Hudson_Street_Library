#!/usr/bin/env node

/**
 * Production Database Migration Script
 * Safely migrates CSV data to SQLite with validation
 */

const path = require('path');
const { execSync } = require('child_process');
const fs = require('fs');

console.log('🚀 Hudson Street Library - Production Database Migration\n');
console.log('This will migrate 1,307 books from CSV to SQLite database.\n');

const csvPath = path.join(__dirname, '../../src/_data/books.csv');
const dbPath = path.join(__dirname, '../../data/library.db');

// Check if CSV exists
if (!fs.existsSync(csvPath)) {
    console.error('❌ CSV file not found:', csvPath);
    process.exit(1);
}

// Check if database already exists
if (fs.existsSync(dbPath)) {
    console.log('⚠️  Database already exists at:', dbPath);
    console.log('   Would you like to:');
    console.log('   1. Backup existing and create new');
    console.log('   2. Cancel migration');
    console.log('\n   (Backup recommended)\n');

    // For now, create backup
    const backupPath = dbPath + '.backup-' + Date.now();
    fs.copyFileSync(dbPath, backupPath);
    console.log('✅ Backup created:', backupPath);
}

console.log('Step 1: Running dry run to validate data...\n');

try {
    // Run dry run first
    execSync(`node ${__dirname}/db-migration.js --source ${csvPath} --target ${dbPath} --dry-run`, {
        stdio: 'inherit'
    });

    console.log('\n✅ Dry run successful! Data looks good.\n');
    console.log('Step 2: Running actual migration...\n');

    // Run actual migration
    execSync(`node ${__dirname}/db-migration.js --source ${csvPath} --target ${dbPath}`, {
        stdio: 'inherit'
    });

    console.log('\n🎉 Migration Complete!\n');
    console.log('Your production database is ready at:', dbPath);
    console.log('\nNext steps:');
    console.log('1. Test the database: node scripts/database/test-database.js');
    console.log('2. Update your app to use the database instead of CSV');
    console.log('3. Your CSV file remains as backup at:', csvPath);

} catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check the error message above');
    console.log('2. Ensure better-sqlite3 is installed: npm install better-sqlite3');
    console.log('3. Check file permissions in the data/ directory');
    process.exit(1);
}