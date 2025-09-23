#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;

  // Fix broken console.log statements
  content = content.replace(/console\.(log|error|warn)\('?\n/g, (match, method) => {
    fixed = true;
    return `console.${method}('\\n`;
  });

  // Fix other broken template literals
  content = content.replace(/`\n([^`]*)`/g, (match, inner) => {
    if (inner && !inner.includes('`')) {
      fixed = true;
      return `\`\\n${inner}\``;
    }
    return match;
  });

  // Fix broken string literals at end of line
  content = content.replace(/([`'"])\\\n/g, '$1\\n');

  if (fixed) {
    fs.writeFileSync(filePath, content);
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
  if (file.endsWith('.js') && !file.includes('fix-')) {
    const filePath = path.join(migrateDir, file);
    if (fixFile(filePath)) {
      fixedCount++;
    }
  }
}

console.log(`\n✅ Fixed ${fixedCount} files`);