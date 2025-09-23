#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix all escaped backticks in JavaScript files
function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Replace all \` with ` and \$ with $
  const fixed = content
    .replace(/\\`/g, '`')
    .replace(/\\\$/g, '$')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');

  if (content !== fixed) {
    fs.writeFileSync(filePath, fixed);
    console.log(`Fixed: ${path.basename(filePath)}`);
    return true;
  }
  return false;
}

// Process all JavaScript files in the migrate directory
const migrateDir = __dirname;
const files = fs.readdirSync(migrateDir);

let fixedCount = 0;
for (const file of files) {
  if (file.endsWith('.js') && file !== 'fix-template-literals.js') {
    const filePath = path.join(migrateDir, file);
    if (fixFile(filePath)) {
      fixedCount++;
    }
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);