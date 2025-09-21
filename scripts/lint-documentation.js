#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Load documentation policy
const policyPath = path.join(__dirname, '..', '.documentation-policy.json');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));

async function lintDocumentation() {
  const errors = [];
  const warnings = [];

  // Find all markdown files
  const markdownFiles = await glob('**/*.md', {
    ignore: [
      '**/node_modules/**',
      '**/_site/**',
      '**/temp-processing/**'
    ],
    cwd: path.join(__dirname, '..')
  });

  // Check each markdown file against policy
  for (const file of markdownFiles) {
    const isAllowed = policy.rules.consolidatedDocumentationHub.allowedPaths.some(pattern => {
      // Convert glob pattern to regex more accurately
      const regexPattern = pattern
        .replace(/\./g, '\\.')  // Escape dots
        .replace(/\*\*/g, '___DOUBLE_STAR___')  // Temporarily replace ** to avoid conflicts
        .replace(/\*/g, '[^/]*')  // Replace single * with non-slash characters
        .replace(/___DOUBLE_STAR___/g, '.*')  // Replace ** with any characters
        .replace(/\?/g, '.');  // Replace ? with single character
      const regex = new RegExp('^' + regexPattern + '$');
      return regex.test(file);
    });

    if (!isAllowed) {
      const error = {
        file,
        rule: 'consolidatedDocumentationHub',
        message: `Documentation file "${file}" is not in an allowed location. Please move it to the docs/ directory.`,
        suggestion: suggestNewPath(file)
      };
      errors.push(error);
    }

    // Check specific rules
    if (file.startsWith('src/') && !policy.rules.noSourceMarkdown.exceptions.includes(file)) {
      warnings.push({
        file,
        rule: 'noSourceMarkdown',
        message: `Documentation in source directory: "${file}". Consider moving to docs/`
      });
    }

    if (!file.includes('/') && !policy.rules.noRootMarkdown.exceptions.includes(file)) {
      errors.push({
        file,
        rule: 'noRootMarkdown',
        message: `Root-level documentation file: "${file}". Should be moved to docs/`
      });
    }
  }

  // Report results
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ Documentation structure is compliant with policy');
    return 0;
  }

  if (warnings.length > 0) {
    console.log('\n⚠️  Documentation Warnings:');
    warnings.forEach(w => {
      console.log(`  - ${w.file}: ${w.message}`);
    });
  }

  if (errors.length > 0) {
    console.log('\n❌ Documentation Errors:');
    errors.forEach(e => {
      console.log(`  - ${e.file}: ${e.message}`);
      if (e.suggestion) {
        console.log(`    Suggested location: ${e.suggestion}`);
      }
    });
    console.log('\n📝 To fix these issues, move documentation files to the docs/ directory');
    return 1;
  }

  return 0;
}

function suggestNewPath(file) {
  const parts = file.split('/');
  const filename = parts[parts.length - 1];
  
  // Suggest appropriate subdirectory based on content
  if (file.includes('api') || file.includes('API')) {
    return `docs/api/${filename}`;
  } else if (file.includes('guide') || file.includes('GUIDE')) {
    return `docs/${filename}`;
  } else if (file.includes('architecture') || file.includes('ARCHITECTURE')) {
    return `docs/architecture/${filename}`;
  } else if (parts[0] === 'src' || parts[0] === 'scripts') {
    return `docs/technical/${filename}`;
  } else {
    return `docs/${filename}`;
  }
}

// Run the linter
if (require.main === module) {
  lintDocumentation().then(exitCode => {
    process.exit(exitCode);
  }).catch(err => {
    console.error('Error running documentation linter:', err);
    process.exit(1);
  });
}

module.exports = { lintDocumentation };