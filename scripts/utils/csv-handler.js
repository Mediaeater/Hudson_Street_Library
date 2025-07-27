const fs = require('fs');
const { parse } = require('csv-parse');
const { stringify } = require('csv-stringify');

/**
 * Unified CSV handler for the Hudson Street Library
 * Consolidates all CSV operations in one place
 */

class CSVHandler {
    /**
     * Read and parse CSV file
     * @param {string} filePath - Path to CSV file
     * @param {Object} options - CSV parse options
     * @returns {Promise<Array>} Parsed data
     */
    static async read(filePath, options = {}) {
        const defaultOptions = {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            ...options
        };

        return new Promise((resolve, reject) => {
            const records = [];
            fs.createReadStream(filePath)
                .pipe(parse(defaultOptions))
                .on('data', (record) => records.push(record))
                .on('end', () => resolve(records))
                .on('error', reject);
        });
    }

    /**
     * Write data to CSV file
     * @param {string} filePath - Output file path
     * @param {Array} data - Data to write
     * @param {Object} options - CSV stringify options
     */
    static async write(filePath, data, options = {}) {
        const defaultOptions = {
            header: true,
            ...options
        };

        return new Promise((resolve, reject) => {
            stringify(data, defaultOptions, (err, output) => {
                if (err) reject(err);
                else {
                    fs.writeFile(filePath, output, (writeErr) => {
                        if (writeErr) reject(writeErr);
                        else resolve();
                    });
                }
            });
        });
    }

    /**
     * Stream process large CSV files
     * @param {string} filePath - Path to CSV file
     * @param {Function} processRow - Function to process each row
     * @param {Object} options - CSV parse options
     */
    static async stream(filePath, processRow, options = {}) {
        const defaultOptions = {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            ...options
        };

        return new Promise((resolve, reject) => {
            let rowCount = 0;
            fs.createReadStream(filePath)
                .pipe(parse(defaultOptions))
                .on('data', async (record) => {
                    rowCount++;
                    await processRow(record, rowCount);
                })
                .on('end', () => resolve(rowCount))
                .on('error', reject);
        });
    }

    /**
     * Get CSV stats without loading entire file
     * @param {string} filePath - Path to CSV file
     */
    static async getStats(filePath) {
        let rowCount = 0;
        let columns = [];

        await this.stream(filePath, (record, index) => {
            if (index === 1) {
                columns = Object.keys(record);
            }
            rowCount++;
        });

        return {
            rowCount,
            columns,
            fileSize: fs.statSync(filePath).size
        };
    }

    /**
     * Filter CSV based on criteria
     * @param {string} inputPath - Input CSV path
     * @param {string} outputPath - Output CSV path
     * @param {Function} filterFn - Filter function
     */
    static async filter(inputPath, outputPath, filterFn) {
        const data = await this.read(inputPath);
        const filtered = data.filter(filterFn);
        await this.write(outputPath, filtered);
        return filtered.length;
    }

    /**
     * Merge multiple CSV files
     * @param {Array<string>} filePaths - Array of CSV file paths
     * @param {string} outputPath - Output file path
     * @param {boolean} removeDuplicates - Remove duplicate rows
     */
    static async merge(filePaths, outputPath, removeDuplicates = false) {
        const allData = [];
        const seen = new Set();

        for (const filePath of filePaths) {
            const data = await this.read(filePath);
            for (const row of data) {
                const key = JSON.stringify(row);
                if (!removeDuplicates || !seen.has(key)) {
                    seen.add(key);
                    allData.push(row);
                }
            }
        }

        await this.write(outputPath, allData);
        return allData.length;
    }
}

module.exports = CSVHandler;