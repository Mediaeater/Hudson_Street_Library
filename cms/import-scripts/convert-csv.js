// Convert Hudson Street Library CSV format to import format
const fs = require('fs');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify');

const inputFile = '../data/books.csv';
const outputFile = '../data/books-formatted.csv';

const results = [];
const headers = [
  'Author Last Name',
  'Author First Name', 
  'Title',
  'Publisher',
  'Publication Date',
  'Physical Dimensions',
  'Additional Book Details',
  'Edition Information',
  'ISBN',
  'Contributors/Editors',
  'Summary/Description',
  'Subject Classifications',
  'Location',
  'Price'
];

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (row) => {
    // Skip empty rows and header rows
    if (!row['Title'] || row['Author, Last'] === '#' || row['Title'] === 'Title') {
      return;
    }
    
    const formatted = {
      'Author Last Name': row['Author, Last'] || '',
      'Author First Name': row['Author, First'] || '',
      'Title': row['Title'] || '',
      'Publisher': row['Publisher'] || '',
      'Publication Date': row['Date '] || row['Date'] || '',
      'Physical Dimensions': row['Size'] || '',
      'Additional Book Details': row['Information; Notes ; Condition'] || '',
      'Edition Information': row['Edition/Printrun'] || '',
      'ISBN': row['ISBN'] || '',
      'Contributors/Editors': row['Contributors'] || '',
      'Summary/Description': row['Summary'] || '',
      'Subject Classifications': row['Subject classification, tags'] || '',
      'Location': row['Location'] || 'Hudson Street Library, NYC',
      'Price': row['Price'] ? row['Price'].replace('$', '') : '0'
    };
    
    results.push(formatted);
  })
  .on('end', () => {
    // Write the formatted CSV
    stringify(results, { header: true, columns: headers }, (err, output) => {
      if (err) {
        console.error('Error creating CSV:', err);
        return;
      }
      
      fs.writeFileSync(outputFile, output);
      console.log(`Converted ${results.length} books to ${outputFile}`);
    });
  })
  .on('error', (error) => {
    console.error('Error reading CSV:', error);
  });