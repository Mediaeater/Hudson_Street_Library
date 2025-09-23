#!/usr/bin/env node

/**
 * Main Test Runner for Hudson Street Library
 * Runs all test suites and provides comprehensive reporting
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Test suite imports
const { runImageCoreTests } = require('./test-image-core');
const { runBookAPIClientTests } = require('./test-book-api-client');
const { runLoggerTests } = require('./test-logger');
const { runCSVHandlerTests } = require('./test-csv-handler');

class MainTestRunner {
    constructor(options = {}) {
        this.options = {
            verbose: options.verbose || process.env.VERBOSE || false,
            parallel: options.parallel !== false,
            reportFormat: options.reportFormat || 'console', // console, json, html
            outputDir: options.outputDir || path.join(__dirname, '../test-output'),
            failFast: options.failFast || false,
            includePerformance: options.includePerformance !== false,
            ...options
        };

        this.suites = [
            { name: 'Image Core Utilities', runner: runImageCoreTests, category: 'core' },
            { name: 'Book API Client', runner: runBookAPIClientTests, category: 'api' },
            { name: 'Logger System', runner: runLoggerTests, category: 'core' },
            { name: 'CSV Handler', runner: runCSVHandlerTests, category: 'data' }
        ];

        this.results = {
            startTime: null,
            endTime: null,
            duration: 0,
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            suiteResults: [],
            summary: {},
            environment: this.getEnvironmentInfo()
        };
    }

    getEnvironmentInfo() {
        return {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString(),
            cwd: process.cwd()
        };
    }

    async ensureOutputDirectory() {
        try {
            await fs.mkdir(this.options.outputDir, { recursive: true });
        } catch (error) {
            console.warn(`Warning: Could not create output directory: ${error.message}`);
        }
    }

    async runSuite(suite) {
        const startTime = performance.now();

        console.log(`\n🏃 Starting ${suite.name} tests...`);

        try {
            const result = await suite.runner();
            const endTime = performance.now();

            const suiteResult = {
                name: suite.name,
                category: suite.category,
                passed: result.passed,
                failed: result.failed,
                total: result.passed + result.failed,
                duration: endTime - startTime,
                success: result.failed === 0,
                startTime: new Date(Date.now() - (endTime - startTime)).toISOString(),
                endTime: new Date().toISOString()
            };

            this.results.suiteResults.push(suiteResult);
            this.results.totalPassed += result.passed;
            this.results.totalFailed += result.failed;
            this.results.totalTests += suiteResult.total;

            if (suiteResult.success) {
                console.log(`✅ ${suite.name}: All ${suiteResult.total} tests passed (${Math.round(suiteResult.duration)}ms)`);
            } else {
                console.log(`❌ ${suite.name}: ${suiteResult.failed}/${suiteResult.total} tests failed (${Math.round(suiteResult.duration)}ms)`);
            }

            return suiteResult;
        } catch (error) {
            const endTime = performance.now();

            const suiteResult = {
                name: suite.name,
                category: suite.category,
                passed: 0,
                failed: 1,
                total: 1,
                duration: endTime - startTime,
                success: false,
                error: error.message,
                startTime: new Date(Date.now() - (endTime - startTime)).toISOString(),
                endTime: new Date().toISOString()
            };

            this.results.suiteResults.push(suiteResult);
            this.results.totalFailed += 1;
            this.results.totalTests += 1;

            console.log(`💥 ${suite.name}: Test suite crashed - ${error.message}`);

            if (this.options.verbose) {
                console.log(`   Stack: ${error.stack}`);
            }

            return suiteResult;
        }
    }

    async runAllSuites() {
        this.results.startTime = new Date().toISOString();
        const startTime = performance.now();

        console.log('🚀 Hudson Street Library Test Suite');
        console.log('=' .repeat(60));
        console.log(`Running ${this.suites.length} test suites...`);
        console.log(`Environment: Node.js ${process.version} on ${process.platform}`);
        console.log(`Parallel execution: ${this.options.parallel ? 'enabled' : 'disabled'}`);

        try {
            if (this.options.parallel) {
                // Run suites in parallel
                const promises = this.suites.map(suite => this.runSuite(suite));
                await Promise.all(promises);
            } else {
                // Run suites sequentially
                for (const suite of this.suites) {
                    await this.runSuite(suite);

                    // Fail fast if enabled and we have failures
                    if (this.options.failFast && this.results.totalFailed > 0) {
                        console.log('\n⏩ Fail-fast enabled, stopping execution due to failures');
                        break;
                    }
                }
            }
        } catch (error) {
            console.error(`\n💥 Test execution failed: ${error.message}`);
            if (this.options.verbose) {
                console.error(`Stack: ${error.stack}`);
            }
        }

        const endTime = performance.now();
        this.results.endTime = new Date().toISOString();
        this.results.duration = endTime - startTime;

        this.generateSummary();
    }

    generateSummary() {
        const { totalTests, totalPassed, totalFailed, duration, suiteResults } = this.results;
        const successRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;

        this.results.summary = {
            overall: totalFailed === 0 ? 'PASS' : 'FAIL',
            successRate: parseFloat(successRate),
            totalSuites: this.suites.length,
            passedSuites: suiteResults.filter(s => s.success).length,
            failedSuites: suiteResults.filter(s => !s.success).length,
            averageSuiteDuration: suiteResults.length > 0
                ? suiteResults.reduce((sum, s) => sum + s.duration, 0) / suiteResults.length
                : 0,
            categorySummary: this.generateCategorySummary()
        };

        console.log('\n📊 Test Summary');
        console.log('=' .repeat(60));
        console.log(`Overall Result: ${this.results.summary.overall === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Total Tests: ${totalTests} (${totalPassed} passed, ${totalFailed} failed)`);
        console.log(`Success Rate: ${successRate}%`);
        console.log(`Total Duration: ${Math.round(duration)}ms`);
        console.log(`Suites: ${this.results.summary.passedSuites}/${this.suites.length} passed`);

        if (suiteResults.length > 0) {
            console.log('\n📋 Suite Details:');
            suiteResults.forEach(suite => {
                const status = suite.success ? '✅' : '❌';
                const duration = Math.round(suite.duration);
                console.log(`  ${status} ${suite.name}: ${suite.passed}/${suite.total} (${duration}ms)`);
            });
        }

        if (this.results.summary.categorySummary) {
            console.log('\n🏷️  By Category:');
            Object.entries(this.results.summary.categorySummary).forEach(([category, stats]) => {
                console.log(`  ${category}: ${stats.passed}/${stats.total} tests (${stats.suites} suites)`);
            });
        }

        // Performance insights
        if (this.options.includePerformance && suiteResults.length > 0) {
            console.log('\n⚡ Performance:');
            const sortedSuites = [...suiteResults].sort((a, b) => b.duration - a.duration);
            const slowest = sortedSuites[0];
            const fastest = sortedSuites[sortedSuites.length - 1];

            console.log(`  Slowest suite: ${slowest.name} (${Math.round(slowest.duration)}ms)`);
            console.log(`  Fastest suite: ${fastest.name} (${Math.round(fastest.duration)}ms)`);
            console.log(`  Average duration: ${Math.round(this.results.summary.averageSuiteDuration)}ms`);
        }

        // Recommendations
        if (totalFailed > 0) {
            console.log('\n💡 Recommendations:');
            console.log('  • Review failed tests and fix underlying issues');
            console.log('  • Run individual test suites with --verbose for detailed error information');
            console.log('  • Check that all dependencies are properly installed');
        }
    }

    generateCategorySummary() {
        const categories = {};

        this.results.suiteResults.forEach(suite => {
            const category = suite.category || 'other';
            if (!categories[category]) {
                categories[category] = { passed: 0, total: 0, suites: 0 };
            }
            categories[category].passed += suite.passed;
            categories[category].total += suite.total;
            categories[category].suites += 1;
        });

        return categories;
    }

    async generateReports() {
        await this.ensureOutputDirectory();

        // Always generate JSON report
        await this.generateJSONReport();

        // Generate additional reports based on format
        if (this.options.reportFormat === 'html' || this.options.reportFormat === 'all') {
            await this.generateHTMLReport();
        }

        if (this.options.reportFormat === 'junit' || this.options.reportFormat === 'all') {
            await this.generateJUnitReport();
        }
    }

    async generateJSONReport() {
        const reportPath = path.join(this.options.outputDir, 'test-results.json');

        try {
            const jsonReport = JSON.stringify(this.results, null, 2);
            await fs.writeFile(reportPath, jsonReport);
            console.log(`📄 JSON report saved: ${reportPath}`);
        } catch (error) {
            console.warn(`Warning: Could not write JSON report: ${error.message}`);
        }
    }

    async generateHTMLReport() {
        const reportPath = path.join(this.options.outputDir, 'test-results.html');

        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hudson Street Library - Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 6px; text-align: center; }
        .metric.success { background: #d4edda; color: #155724; }
        .metric.failure { background: #f8d7da; color: #721c24; }
        .suite { margin-bottom: 20px; border: 1px solid #dee2e6; border-radius: 6px; overflow: hidden; }
        .suite-header { background: #f8f9fa; padding: 15px; font-weight: bold; }
        .suite-header.success { background: #d4edda; }
        .suite-header.failure { background: #f8d7da; }
        .suite-details { padding: 15px; }
        .environment { background: #e7f3ff; padding: 15px; border-radius: 6px; margin-top: 20px; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Hudson Street Library Test Results</h1>
            <p class="timestamp">Generated on ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
            <div class="metric ${this.results.summary.overall === 'PASS' ? 'success' : 'failure'}">
                <h3>Overall Result</h3>
                <p>${this.results.summary.overall === 'PASS' ? '✅ PASS' : '❌ FAIL'}</p>
            </div>
            <div class="metric">
                <h3>Total Tests</h3>
                <p>${this.results.totalTests}</p>
            </div>
            <div class="metric success">
                <h3>Passed</h3>
                <p>${this.results.totalPassed}</p>
            </div>
            <div class="metric ${this.results.totalFailed > 0 ? 'failure' : ''}">
                <h3>Failed</h3>
                <p>${this.results.totalFailed}</p>
            </div>
            <div class="metric">
                <h3>Success Rate</h3>
                <p>${this.results.summary.successRate}%</p>
            </div>
            <div class="metric">
                <h3>Duration</h3>
                <p>${Math.round(this.results.duration)}ms</p>
            </div>
        </div>

        <h2>📋 Test Suites</h2>
        ${this.results.suiteResults.map(suite => `
            <div class="suite">
                <div class="suite-header ${suite.success ? 'success' : 'failure'}">
                    ${suite.success ? '✅' : '❌'} ${suite.name}
                </div>
                <div class="suite-details">
                    <p><strong>Category:</strong> ${suite.category}</p>
                    <p><strong>Tests:</strong> ${suite.total} total, ${suite.passed} passed, ${suite.failed} failed</p>
                    <p><strong>Duration:</strong> ${Math.round(suite.duration)}ms</p>
                    <p><strong>Started:</strong> ${new Date(suite.startTime).toLocaleString()}</p>
                    ${suite.error ? `<p><strong>Error:</strong> <code>${suite.error}</code></p>` : ''}
                </div>
            </div>
        `).join('')}

        <div class="environment">
            <h3>🖥️ Environment Information</h3>
            <p><strong>Node.js:</strong> ${this.results.environment.node}</p>
            <p><strong>Platform:</strong> ${this.results.environment.platform} (${this.results.environment.arch})</p>
            <p><strong>Working Directory:</strong> ${this.results.environment.cwd}</p>
            <p><strong>Memory Usage:</strong> ${Math.round(this.results.environment.memory.heapUsed / 1024 / 1024)}MB heap used</p>
        </div>
    </div>
</body>
</html>`;

        try {
            await fs.writeFile(reportPath, html);
            console.log(`📄 HTML report saved: ${reportPath}`);
        } catch (error) {
            console.warn(`Warning: Could not write HTML report: ${error.message}`);
        }
    }

    async generateJUnitReport() {
        const reportPath = path.join(this.options.outputDir, 'junit.xml');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="Hudson Street Library" tests="${this.results.totalTests}" failures="${this.results.totalFailed}" time="${(this.results.duration / 1000).toFixed(3)}">
${this.results.suiteResults.map(suite => `
    <testsuite name="${suite.name}" tests="${suite.total}" failures="${suite.failed}" time="${(suite.duration / 1000).toFixed(3)}">
        ${suite.success ?
            `<testcase name="${suite.name}" time="${(suite.duration / 1000).toFixed(3)}"/>` :
            `<testcase name="${suite.name}" time="${(suite.duration / 1000).toFixed(3)}">
                <failure message="${suite.error || 'Test failures occurred'}">${suite.error || 'See detailed logs for failure information'}</failure>
            </testcase>`
        }
    </testsuite>`).join('')}
</testsuites>`;

        try {
            await fs.writeFile(reportPath, xml);
            console.log(`📄 JUnit report saved: ${reportPath}`);
        } catch (error) {
            console.warn(`Warning: Could not write JUnit report: ${error.message}`);
        }
    }

    async run() {
        try {
            await this.runAllSuites();
            await this.generateReports();

            console.log(`\n🏁 Test execution completed in ${Math.round(this.results.duration)}ms`);

            // Exit with appropriate code
            const exitCode = this.results.totalFailed > 0 ? 1 : 0;
            return exitCode;
        } catch (error) {
            console.error(`\n💥 Test runner failed: ${error.message}`);
            if (this.options.verbose) {
                console.error(`Stack: ${error.stack}`);
            }
            return 1;
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const options = {};

    // Parse command line arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--verbose':
            case '-v':
                options.verbose = true;
                break;
            case '--sequential':
                options.parallel = false;
                break;
            case '--fail-fast':
                options.failFast = true;
                break;
            case '--report':
                options.reportFormat = args[i + 1] || 'console';
                i++;
                break;
            case '--output':
            case '-o':
                options.outputDir = args[i + 1];
                i++;
                break;
            case '--help':
            case '-h':
                console.log(`
Hudson Street Library Test Runner

Usage: node test-runner.js [options]

Options:
  --verbose, -v         Enable verbose output
  --sequential          Run tests sequentially (default: parallel)
  --fail-fast           Stop on first failure
  --report <format>     Report format: console, json, html, junit, all
  --output, -o <dir>    Output directory for reports
  --help, -h            Show this help message

Examples:
  node test-runner.js --verbose
  node test-runner.js --report html --output ./reports
  node test-runner.js --sequential --fail-fast
`);
                return 0;
        }
    }

    const runner = new MainTestRunner(options);
    return await runner.run();
}

// Export for programmatic use
module.exports = { MainTestRunner };

// Run if this file is executed directly
if (require.main === module) {
    main()
        .then(exitCode => {
            process.exit(exitCode);
        })
        .catch(error => {
            console.error('Test runner crashed:', error);
            process.exit(1);
        });
}