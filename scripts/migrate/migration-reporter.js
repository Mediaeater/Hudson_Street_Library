/**
 * Migration Reporter
 *
 * Generates comprehensive reports about the migration process
 */

const fs = require('fs').promises;
const path = require('path');

class MigrationReporter {
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
    this.reportData = {
      timestamp: new Date().toISOString(),
      projectRoot: projectRoot,
      analysis: null,
      migrations: [],
      errors: [],
      performance: {},
      summary: {}
    };
  }

  setAnalysis(analysis) {
    this.reportData.analysis = analysis;
  }

  addMigration(migration) {
    this.reportData.migrations.push({
      ...migration,
      timestamp: new Date().toISOString()
    });
  }

  addError(error) {
    this.reportData.errors.push({
      ...error,
      timestamp: new Date().toISOString()
    });
  }

  setPerformance(performance) {
    this.reportData.performance = performance;
  }

  async generateReport(outputPath) {
    // Calculate summary
    this.calculateSummary();

    // Generate different report formats
    const reports = {
      json: await this.generateJsonReport(outputPath),
      markdown: await this.generateMarkdownReport(outputPath),
      html: await this.generateHtmlReport(outputPath)
    };

    console.log('📊 Migration reports generated:');
    Object.entries(reports).forEach(([format, file]) => {
      console.log('   ${format.toUpperCase()}: ' + file);
    });

    return reports;
  }

  calculateSummary() {
    const migrations = this.reportData.migrations;

    this.reportData.summary = {
      totalFiles: migrations.length,
      successfulMigrations: migrations.filter(m => m.migrated).length,
      skippedMigrations: migrations.filter(m => !m.migrated).length,
      errorCount: this.reportData.errors.length,
      totalChanges: migrations.reduce((sum, m) => sum + (m.changes?.length || 0), 0),
      migrationTypes: this.getMigrationTypesSummary(migrations),
      performance: this.reportData.performance
    };
  }

  getMigrationTypesSummary(migrations) {
    const types = {};

    migrations.forEach(migration => {
      if (!types[migration.type]) {
        types[migration.type] = { total: 0, successful: 0, skipped: 0 };
      }

      types[migration.type].total++;
      if (migration.migrated) {
        types[migration.type].successful++;
      } else {
        types[migration.type].skipped++;
      }
    });

    return types;
  }

  async generateJsonReport(outputPath) {
    const jsonPath = path.join(outputPath, 'migration-report.json');
    await fs.writeFile(jsonPath, JSON.stringify(this.reportData, null, 2));
    return jsonPath;
  }

  async generateMarkdownReport(outputPath) {
    const markdownPath = path.join(outputPath, 'migration-report.md');

    const content = `# Hudson Street Library - Unified System Migration Report

Generated: ${new Date().toISOString()}

## Executive Summary

The migration to the unified system has been completed with the following results:

- **Total Files Processed**: ${this.reportData.summary.totalFiles}
- **Successful Migrations**: ${this.reportData.summary.successfulMigrations}
- **Skipped Files**: ${this.reportData.summary.skippedMigrations}
- **Errors**: ${this.reportData.summary.errorCount}
- **Total Changes**: ${this.reportData.summary.totalChanges}

## Migration Types

${Object.entries(this.reportData.summary.migrationTypes).map(([type, stats]) =>
  `### ${type}
- Total: ${stats.total}
- Successful: ${stats.successful}
- Skipped: ${stats.skipped}
`\n).join('\n')}

## Performance Metrics

${this.reportData.performance.duration ? `- **Duration**: ${this.reportData.performance.duration}` : ''}
${this.reportData.performance.filesPerSecond ? `- **Files/Second**: ${this.reportData.performance.filesPerSecond}` : ''}

## Analysis Results

${this.reportData.analysis ? this.formatAnalysisForMarkdown() : 'No analysis data available'}

## Migration Details

${this.reportData.migrations.map(migration =>
  `### ${migration.file}

` +
  `- **Type**: ${migration.type}
` +
  `- **Status**: ${migration.migrated ? '✅ Migrated' : '⏭️ Skipped'}
` +
  `- **Reason**: ${migration.reason || 'N/A'}
` +
  (migration.changes ? `- **Changes**: ${migration.changes.length}
  ${migration.changes.map(c => `  - ${c}`).join('
  ')}
` : '') +
  '
'
).join('')}

${this.reportData.errors.length > 0 ? `## Errors

${this.reportData.errors.map(error =>
  `### ${error.file || 'Unknown'}

` +
  `- **Step**: ${error.step}
` +
  `- **Error**: ${error.error}
` +
  `- **Time**: ${error.timestamp}

`\n).join('')}` : ''}

## Recommendations

${this.generateRecommendations()}

## Next Steps

1. **Test the migrated system** - Run your test suite to ensure everything works correctly
2. **Update documentation** - Update any documentation that references the old patterns
3. **Train the team** - Ensure everyone knows about the new unified modules
4. **Monitor performance** - Watch for any performance impacts from the migration
5. **Clean up** - Remove old, unused files after confirming the migration works

## Rollback Instructions

If you need to rollback the migration:

```bash
cd scripts/migrate/backups/[date]
node restore.js
```
---

*Report generated by Hudson Street Library Migration System*
`;

    await fs.writeFile(markdownPath, content);
    return markdownPath;
  }

  formatAnalysisForMarkdown() {
    const analysis = this.reportData.analysis;

    return '\n### Book API Usage
- Files: ${analysis.summary.bookApiFiles}
- Patterns: Direct API calls to Open Library and Google Books

### Image Processing
- Files: ${analysis.summary.imageProcessingFiles}
- Patterns: Sharp library usage, image optimization

### Configuration
- Files: ${analysis.summary.configFiles}
- Patterns: Hardcoded paths and settings

### Logging Candidates
- Files: ${analysis.summary.loggingCandidates}
- Patterns: Console logging usage

### Caching Candidates
- Files: ' + analysis.summary.cachingCandidates + '
- Patterns: Network requests and expensive operations
';
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.reportData.summary.errorCount > 0) {
      recommendations.push('- **Address Errors**: Review and fix the migration errors listed above');
    }

    if (this.reportData.summary.skippedMigrations > 0) {
      recommendations.push('- **Review Skipped Files**: Check if any skipped files should actually be migrated');
    }

    recommendations.push('- **Performance Testing**: Run performance tests to ensure the new modules perform well');
    recommendations.push('- **Code Review**: Have the team review the migrated code for consistency');
    recommendations.push('- **Documentation**: Update README and documentation to reflect the new architecture');

    return recommendations.join('\n');
  }

  async generateHtmlReport(outputPath) {
    const htmlPath = path.join(outputPath, 'migration-report.html');

    const content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Migration Report - Hudson Street Library</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }

        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .metric {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border-left: 4px solid #667eea;
        }

        .metric h3 {
            margin: 0 0 10px 0;
            color: #667eea;
        }

        .metric .value {
            font-size: 2em;
            font-weight: bold;
            color: #333;
        }

        .section {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .migration-item {
            border-bottom: 1px solid #e9ecef;
            padding: 15px 0;
        }

        .migration-item:last-child {
            border-bottom: none;
        }

        .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.85em;
            font-weight: bold;
        }

        .status.success {
            background: #d4edda;
            color: #155724;
        }

        .status.skipped {
            background: #fff3cd;
            color: #856404;
        }

        .status.error {
            background: #f8d7da;
            color: #721c24;
        }

        .changes {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-size: 0.9em;
        }

        .error-item {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 10px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e9ecef;
        }

        th {
            background: #f8f9fa;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Hudson Street Library</h1>
        <h2>Unified System Migration Report</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>Total Files</h3>
            <div class="value">${this.reportData.summary.totalFiles}</div>
        </div>
        <div class="metric">
            <h3>Successful</h3>
            <div class="value">${this.reportData.summary.successfulMigrations}</div>
        </div>
        <div class="metric">
            <h3>Skipped</h3>
            <div class="value">${this.reportData.summary.skippedMigrations}</div>
        </div>
        <div class="metric">
            <h3>Errors</h3>
            <div class="value">${this.reportData.summary.errorCount}</div>
        </div>
        <div class="metric">
            <h3>Total Changes</h3>
            <div class="value">${this.reportData.summary.totalChanges}</div>
        </div>
    </div>

    <div class="section">
        <h2>Migration Types</h2>
        <table>
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Successful</th>
                    <th>Skipped</th>
                    <th>Success Rate</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(this.reportData.summary.migrationTypes).map(([type, stats]) => {
                  const successRate = stats.total > 0 ? ((stats.successful / stats.total) * 100).toFixed(1) : '0';
                  return `\n                    <tr>
                        <td><strong>${type}</strong></td>
                        <td>${stats.total}</td>
                        <td>${stats.successful}</td>
                        <td>${stats.skipped}</td>
                        <td>${successRate}%</td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
    </div>

    ${this.reportData.analysis ? this.formatAnalysisForHtml() : ''}

    <div class="section">
        <h2>Migration Details</h2>
        ${this.reportData.migrations.map(migration => '\n            <div class="migration-item">
                <h3>${migration.file}</h3>
                <div>
                    <span class="status ${migration.migrated ? 'success' : 'skipped'}">
                        ${migration.migrated ? '✅ Migrated' : '⏭️ Skipped'}
                    </span>
                    <strong>Type:</strong> ${migration.type}
                </div>
                ' + migration.reason ? `<p><strong>Reason:</strong> ${migration.reason + '</p>' : ''}
                ${migration.changes && migration.changes.length > 0 ? '\n                    <div class="changes">
                        <strong>Changes (${migration.changes.length}):</strong>
                        <ul>
                            ' + migration.changes.map(change => `<li>${change + '</li>').join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `).join('')}
    </div>

    ${this.reportData.errors.length > 0 ? `\n    <div class="section">
        <h2>Errors</h2>
        ${this.reportData.errors.map(error => `
            <div class="error-item">
                <h4>${error.file || 'Unknown File'}</h4>
                <p><strong>Step:</strong> ${error.step}</p>
                <p><strong>Error:</strong> ${error.error}</p>
                <p><strong>Time:</strong> ${new Date(error.timestamp).toLocaleString()}</p>
            </div>
        `).join('')}
    </div>
    ` : ''}

    <div class="section">
        <h2>Next Steps</h2>
        <ol>
            <li><strong>Test the migrated system</strong> - Run your test suite to ensure everything works correctly</li>
            <li><strong>Update documentation</strong> - Update any documentation that references the old patterns</li>
            <li><strong>Train the team</strong> - Ensure everyone knows about the new unified modules</li>
            <li><strong>Monitor performance</strong> - Watch for any performance impacts from the migration</li>
            <li><strong>Clean up</strong> - Remove old, unused files after confirming the migration works</li>
        </ol>
    </div>

</body>
</html>`;

    await fs.writeFile(htmlPath, content);
    return htmlPath;
  }

  formatAnalysisForHtml() {
    const analysis = this.reportData.analysis;

    return '\n    <div class="section">
        <h2>Pre-Migration Analysis</h2>
        <div class="summary">
            <div class="metric">
                <h3>Book API Files</h3>
                <div class="value">${analysis.summary.bookApiFiles}</div>
            </div>
            <div class="metric">
                <h3>Image Processing</h3>
                <div class="value">${analysis.summary.imageProcessingFiles}</div>
            </div>
            <div class="metric">
                <h3>Config Files</h3>
                <div class="value">${analysis.summary.configFiles}</div>
            </div>
            <div class="metric">
                <h3>Logging Candidates</h3>
                <div class="value">' + analysis.summary.loggingCandidates + '</div>
            </div>
        </div>
    </div>
    ';
  }

  async generateExecutiveSummary() {
    const summary = {
      projectName: 'Hudson Street Library',
      migrationDate: new Date().toISOString().split('T')[0],
      successRate: this.reportData.summary.totalFiles > 0
        ? ((this.reportData.summary.successfulMigrations / this.reportData.summary.totalFiles) * 100).toFixed(1)
        : '0',
      keyAchievements: [
        `Migrated ${this.reportData.summary.successfulMigrations} files to unified system`,
        `Centralized configuration for better maintainability`,
        `Integrated structured logging across the codebase`,
        `Added caching capabilities for improved performance`
      ],
      risks: this.reportData.summary.errorCount > 0
        ? [`${this.reportData.summary.errorCount} errors occurred during migration`]
        : ['No major risks identified'],
      recommendations: [
        'Run comprehensive tests',
        'Update team documentation',
        'Monitor system performance'
      ]
    };

    return summary;
  }
}

module.exports = MigrationReporter;