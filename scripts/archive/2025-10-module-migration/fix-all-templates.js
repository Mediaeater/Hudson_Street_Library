#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix template literals with a more aggressive approach
function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;

  // Replace all problematic template literals with concatenation
  // This is a more aggressive fix for persistent issues

  // Find all console.log statements with template literals
  content = content.replace(/console\.(log|error|warn|info)\(`([^`]*)\$\{([^}]+)\}([^`]*)`\)/g,
    (match, method, before, variable, after) => {
      fixed = true;
      // Convert template literal to string concatenation
      const beforeStr = before ? `'${before}' + ` : '';
      const afterStr = after ? ` + '${after}'` : '';
      return `console.${method}(${beforeStr}${variable}${afterStr})`;
    });

  // Fix throw new Error with template literals
  content = content.replace(/throw new Error\(`([^`]*)\$\{([^}]+)\}([^`]*)`\)/g,
    (match, before, variable, after) => {
      fixed = true;
      const beforeStr = before ? `'${before}' + ` : '';
      const afterStr = after ? ` + '${after}'` : '';
      return `throw new Error(${beforeStr}${variable}${afterStr})`;
    });

  // Fix other template literal patterns
  content = content.replace(/(`[^`]*)\$\{([^}]+)\}([^`]*`)/g,
    (match, before, variable, after) => {
      // Only fix if it looks problematic (has newlines or special chars)
      if (before.includes('\\n') || after.includes('\\n') ||
          before.includes('[') || after.includes(']')) {
        fixed = true;
        const beforeStr = before.replace('`', "'").replace(/\\n/g, '\\n');
        const afterStr = after.replace('`', "'").replace(/\\n/g, '\\n');
        return `${beforeStr}' + ${variable} + '${afterStr}`;
      }
      return match;
    });

  if (fixed || content !== fs.readFileSync(filePath, 'utf8')) {
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