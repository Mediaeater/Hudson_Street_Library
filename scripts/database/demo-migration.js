#!/usr/bin/env node

const path = require('path');
const { runMigration } = require('./db-migration');

/**
 * Demo script to run CSV to SQLite migration
 * This script demonstrates migrating the actual books.csv to SQLite
 */

async function runDemo() {
    console.log('🚀 Hudson Street Library Database Migration Demo\n');

    const options = {
        csvPath: path.join(__dirname, '../../src/_data/books.csv'),
        dbPath: path.join(__dirname, '../../data/demo_library.db'),
        verbose: true,
        dryRun: false, // Set to true for a test run
        backupCsv: true,
        batchSize: 50 // Process in smaller batches
    };

    try {
        console.log('📋 Migration Configuration:');
        console.log(`  CSV File: ${options.csvPath}`);
        console.log(`  Database: ${options.dbPath}`);
        console.log(`  Dry Run: ${options.dryRun}`);
        console.log(`  Batch Size: ${options.batchSize}\n`);

        const report = await runMigration(options);

        console.log('\n✅ Migration completed successfully!');
        console.log(`📊 Migration Results:`);
        console.log(`  Total Records: ${report.statistics.total}`);
        console.log(`  Successful: ${report.statistics.successful}`);
        console.log(`  Failed: ${report.statistics.failed}`);
        console.log(`  Skipped: ${report.statistics.skipped}`);
        console.log(`  Duration: ${report.duration.formatted}`);

        if (report.statistics.errors.length > 0) {
            console.log(`\n⚠️  Errors encountered:`);
            report.statistics.errors.slice(0, 5).forEach(error => {
                console.log(`  - ${error}`);
            });
            if (report.statistics.errors.length > 5) {
                console.log(`  ... and ${report.statistics.errors.length - 5} more`);
            }
        }

        console.log(`\n📄 Full report saved to the data directory`);

    } catch (error) {
        console.error(`❌ Migration failed: ${error.message}`);
        process.exit(1);
    }
}

// Run demo if called directly
if (require.main === module) {
    runDemo()
        .then(() => {
            console.log('\n🎉 Demo completed successfully!');
            process.exit(0);
        })
        .catch(error => {
            console.error(`\n💥 Demo failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { runDemo };