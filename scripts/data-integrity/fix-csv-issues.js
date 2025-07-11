// Fix Data Integrity Issues in books.csv
const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const path = require('path');

class CSVIntegrityFixer {
  constructor() {
    this.csvPath = path.join(__dirname, '../../src/_data/books.csv');
    this.backupPath = path.join(__dirname, '../../src/_data/books-backup.csv');
    this.reportPath = path.join(__dirname, '../logs/csv-integrity-report.json');
    this.issues = {
      emptyTitles: [],
      invalidISBNs: [],
      duplicateRecords: [],
      encodingIssues: [],
      missingAuthors: [],
      malformedData: [],
      fixedCount: 0
    };
  }

  async run() {
    console.log('🔍 Starting CSV integrity check and fix...');
    
    try {
      // Create backup
      await this.createBackup();
      
      // Load and parse CSV
      const records = await this.loadCSV();
      console.log(`📊 Loaded ${records.length} records`);
      
      // Fix issues
      const fixedRecords = await this.fixIssues(records);
      
      // Save cleaned data
      await this.saveCSV(fixedRecords);
      
      // Generate report
      await this.generateReport();
      
      console.log(`✅ Fixed ${this.issues.fixedCount} issues`);
      console.log(`📋 Report saved to: ${this.reportPath}`);
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async createBackup() {
    try {
      const originalData = await fs.readFile(this.csvPath, 'utf8');
      await fs.writeFile(this.backupPath, originalData);
      console.log(`💾 Backup created: ${this.backupPath}`);
    } catch (error) {
      console.error(`⚠️  Could not create backup: ${error.message}`);
    }
  }

  async loadCSV() {
    const content = await fs.readFile(this.csvPath, 'utf8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true
    });
  }

  async fixIssues(records) {
    const fixedRecords = [];
    const seenRecords = new Set();
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const originalRecord = { ...record };
      let isFixed = false;
      
      // Fix 1: Empty or invalid titles
      if (!record.title || record.title.trim() === '') {
        if (record.author_last && record.publisher) {
          record.title = `[Untitled work by ${record.author_last}]`;
          this.issues.emptyTitles.push({ row: i + 2, fixed: record.title });
          isFixed = true;
        }
      }
      
      // Fix 2: Clean up author names
      if (record.author_last) {
        record.author_last = this.cleanAuthorName(record.author_last);
      }
      if (record.author_first) {
        record.author_first = this.cleanAuthorName(record.author_first);
      }
      
      // Fix 3: Standardize ISBN format
      if (record.isbn_asin) {
        const cleanedISBN = this.cleanISBN(record.isbn_asin);
        if (cleanedISBN !== record.isbn_asin) {
          record.isbn_asin = cleanedISBN;
          isFixed = true;
        }
        
        if (!this.isValidISBN(cleanedISBN)) {
          this.issues.invalidISBNs.push({ row: i + 2, isbn: record.isbn_asin });
        }
      }
      
      // Fix 4: Clean up summary text (remove dangerous characters)
      if (record.description) {
        const cleanedSummary = this.cleanSummary(record.description);
        if (cleanedSummary !== record.description) {
          record.description = cleanedSummary;
          isFixed = true;
        }
      }
      
      // Fix 5: Standardize collection grouping
      if (record.collection_grouping) {
        const standardized = this.standardizeCollection(record.collection_grouping);
        if (standardized !== record.collection_grouping) {
          record.collection_grouping = standardized;
          isFixed = true;
        }
      }
      
      // Fix 6: Validate image paths
      if (record.image_url) {
        const cleanedImage = this.cleanImagePath(record.image_url);
        if (cleanedImage !== record.image_url) {
          record.image_url = cleanedImage;
          isFixed = true;
        }
      }
      
      // Check for duplicates (same title + author)
      const recordKey = `${record.title}_${record.author_last}_${record.author_first}`.toLowerCase();
      if (seenRecords.has(recordKey)) {
        this.issues.duplicateRecords.push({
          row: i + 2,
          title: record.title,
          author: `${record.author_first} ${record.author_last}`
        });
        // Skip duplicate, don't add to fixed records
        continue;
      } else {
        seenRecords.add(recordKey);
      }
      
      if (isFixed) {
        this.issues.fixedCount++;
      }
      
      fixedRecords.push(record);
    }
    
    return fixedRecords;
  }

  cleanAuthorName(name) {
    if (!name) return name;
    return name
      .replace(/^\s*["']|["']\s*$/g, '') // Remove quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  cleanISBN(isbn) {
    if (!isbn) return isbn;
    return isbn
      .replace(/[^\d-X]/gi, '') // Keep only digits, hyphens, and X
      .replace(/^ISBN[-:\s]*/i, '') // Remove ISBN prefix
      .trim();
  }

  isValidISBN(isbn) {
    if (!isbn) return false;
    const cleaned = isbn.replace(/[-\s]/g, '');
    return /^\d{10}(\d{3})?$/.test(cleaned) || /^\d{9}[X]$/i.test(cleaned);
  }

  cleanSummary(summary) {
    if (!summary) return summary;
    return summary
      .replace(/\"\"/g, '"') // Fix double quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  standardizeCollection(collection) {
    if (!collection) return collection;
    
    const standardCollections = {
      'art': 'Art',
      'photography': 'Photography',
      'fashion': 'Fashion',
      'music': 'Music',
      'collage': 'Collage',
      'ephemera': 'Ephemera',
      'nyc': 'NYC',
      'posters': 'Posters and Paper',
      'queer': 'Queering the Collection'
    };
    
    const lowerCollection = collection.toLowerCase();
    for (const [key, value] of Object.entries(standardCollections)) {
      if (lowerCollection.includes(key)) {
        return value;
      }
    }
    
    return collection;
  }


  cleanImagePath(imagePath) {
    if (!imagePath) return imagePath;
    return imagePath
      .replace(/\\/g, '/') // Normalize path separators
      .replace(/\/+/g, '/') // Remove duplicate slashes
      .replace(/\s+/g, '') // Remove spaces
      .trim();
  }

  async saveCSV(records) {
    const csvContent = stringify(records, { header: true });
    await fs.writeFile(this.csvPath, csvContent);
    console.log(`💾 Saved ${records.length} cleaned records`);
  }

  async generateReport() {
    // Ensure logs directory exists
    await fs.mkdir(path.dirname(this.reportPath), { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      totalIssuesFixed: this.issues.fixedCount,
      issues: this.issues,
      recommendations: this.generateRecommendations()
    };
    
    await fs.writeFile(this.reportPath, JSON.stringify(report, null, 2));
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.issues.emptyTitles.length > 0) {
      recommendations.push('Consider adding proper titles for books with generated titles');
    }
    
    if (this.issues.invalidISBNs.length > 0) {
      recommendations.push('Validate and correct invalid ISBN numbers');
    }
    
    if (this.issues.duplicateRecords.length > 0) {
      recommendations.push('Review and consolidate duplicate records');
    }
    
    recommendations.push('Implement data validation at entry point to prevent future issues');
    recommendations.push('Regular data integrity checks should be performed');
    
    return recommendations;
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new CSVIntegrityFixer();
  fixer.run().catch(console.error);
}

module.exports = CSVIntegrityFixer;