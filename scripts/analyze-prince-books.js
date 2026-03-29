#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const csvPath = path.join(__dirname, '../src/_data/books.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true
});

// Filter Richard Prince books
const princeBooks = records.filter(r =>
  r.author_last === 'Prince' && r.author_first === 'Richard'
);

console.log(`Total Richard Prince books: ${princeBooks.length}\n`);

// Analyze metadata completeness
const analysis = princeBooks.map(book => {
  const score = {
    id: book.id,
    title: book.title,
    hasISBN: !!(book.isbn_asin && book.isbn_asin.trim()),
    hasPublisher: !!(book.publisher && book.publisher.trim()),
    hasYear: !!(book.publication_year && book.publication_year.trim()),
    hasDescription: !!(book.description && book.description.length > 50),
    hasPages: !!(book.page_count && book.page_count.trim()),
    hasFormat: !!(book.binding && book.binding.trim()),
    hasDimensions: !!(book.width_cm || book.height_cm),
    hasPublisherURL: !!(book.publisher_url && book.publisher_url.trim()),
    currentDescription: book.description || ''
  };

  const completeness = Object.entries(score)
    .filter(([key]) => key.startsWith('has'))
    .filter(([, value]) => value)
    .length;

  return {
    ...score,
    completeness,
    needsResearch: completeness < 5
  };
});

// Sort by completeness (least complete first)
analysis.sort((a, b) => a.completeness - b.completeness);

console.log('Books needing research (sorted by completeness):\n');
console.log('ID   | Title                              | ISBN | Pub | Year | Desc | Pages | Score');
console.log('-----|---------------------------------------|------|-----|------|------|-------|------');

analysis.forEach(book => {
  const isbn = book.hasISBN ? '✓' : '✗';
  const pub = book.hasPublisher ? '✓' : '✗';
  const year = book.hasYear ? '✓' : '✗';
  const desc = book.hasDescription ? '✓' : '✗';
  const pages = book.hasPages ? '✓' : '✗';

  console.log(
    `${book.id.padStart(4)} | ${book.title.substring(0, 37).padEnd(37)} | ${isbn}    | ${pub}   | ${year}    | ${desc}    | ${pages}     | ${book.completeness}/8`
  );
});

// Summary stats
const needsWork = analysis.filter(b => b.needsResearch).length;
const wellDocumented = analysis.filter(b => b.completeness >= 7).length;

console.log('\n=== SUMMARY ===');
console.log(`Needs significant research (< 5 fields): ${needsWork}`);
console.log(`Moderately documented (5-6 fields): ${analysis.length - needsWork - wellDocumented}`);
console.log(`Well documented (7+ fields): ${wellDocumented}`);

// Output priority list for research
const priorityList = analysis
  .filter(b => b.needsResearch)
  .map(b => ({
    id: b.id,
    title: b.title,
    score: b.completeness
  }));

fs.writeFileSync(
  path.join(__dirname, '../research-priority-prince.json'),
  JSON.stringify(priorityList, null, 2)
);

console.log(`\nPriority list written to research-priority-prince.json`);
