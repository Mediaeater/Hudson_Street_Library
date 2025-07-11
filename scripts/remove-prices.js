const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

async function removePricesFromCSV(filePath) {
    console.log(`Processing ${filePath}...`);
    
    const rows = [];
    const headers = new Set();
    
    // Read the CSV file
    await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row) => {
                // Store all headers except price_usd
                Object.keys(row).forEach(key => {
                    if (key !== 'price_usd') {
                        headers.add(key);
                    }
                });
                
                // Remove price_usd field from row
                delete row.price_usd;
                rows.push(row);
            })
            .on('end', resolve)
            .on('error', reject);
    });
    
    // Write the updated CSV
    const csvWriter = createCsvWriter({
        path: filePath,
        header: Array.from(headers).map(id => ({ id, title: id }))
    });
    
    await csvWriter.writeRecords(rows);
    console.log(`Updated ${filePath} - removed price_usd column`);
}

async function main() {
    const dataDir = path.join(__dirname, '..', 'src', '_data');
    
    // Process all CSV files in the data directory
    const csvFiles = [
        path.join(dataDir, 'books.csv'),
        path.join(dataDir, 'books-backup.csv'),
        path.join(dataDir, 'HSL-CLEAN.csv')
    ];
    
    for (const file of csvFiles) {
        if (fs.existsSync(file)) {
            await removePricesFromCSV(file);
        }
    }
    
    console.log('All CSV files have been updated to remove price columns.');
}

main().catch(console.error);