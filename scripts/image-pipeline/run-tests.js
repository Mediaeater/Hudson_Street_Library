#!/usr/bin/env node

/**
 * CLI Test Runner for Image Pipeline Modules
 *
 * Usage:
 *   node run-tests.js                    # Run all tests
 *   node run-tests.js --module optimizer # Run tests for specific module
 *   node run-tests.js --config-only      # Run configuration tests only
 *   node run-tests.js --no-integration   # Skip integration tests
 *   node run-tests.js --no-performance   # Skip performance tests
 */

const path = require('path');
const TestRunner = require('./modules/test-runner');
const config = require('./pipeline-config');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  module: null,
  skipConfig: false,
  skipIndividual: false,
  skipIntegration: false,
  skipPerformance: false,
  configOnly: false,
  verbose: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--module':
      options.module = args[++i];
      break;
    case '--config-only':
      options.configOnly = true;
      break;
    case '--no-config':
      options.skipConfig = true;
      break;
    case '--no-individual':
      options.skipIndividual = true;
      break;
    case '--no-integration':
      options.skipIntegration = true;
      break;
    case '--no-performance':
      options.skipPerformance = true;
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--help':
    case '-h':
      printHelp();
      process.exit(0);
      break;
    default:
      console.error(`Unknown option: ${arg}`);
      printHelp();
      process.exit(1);
  }
}

function printHelp() {
  console.log(`
🧪 Image Pipeline Test Runner

Usage: node run-tests.js [options]

Options:
  --module <name>     Run tests for specific module only (optimizer, categorizer, metadata, uploader, finder)
  --config-only       Run configuration validation tests only
  --no-config         Skip configuration tests
  --no-individual     Skip individual module tests
  --no-integration    Skip integration tests
  --no-performance    Skip performance tests
  --verbose           Enable verbose logging
  --help, -h          Show this help message

Examples:
  node run-tests.js                     # Run all tests
  node run-tests.js --module optimizer  # Test optimizer module only
  node run-tests.js --config-only       # Configuration tests only
  node run-tests.js --no-performance    # Skip performance tests
`);
}

async function main() {
  console.log('🧪 Starting Image Pipeline Tests...\n');

  try {
    // Initialize test runner
    const testRunner = new TestRunner(config);

    let results;

    if (options.module) {
      // Run tests for specific module
      results = await testRunner.runModuleTest(options.module);
      console.log(`\n✅ ${options.module} module tests completed`);
      console.log(`   Passed: ${results.passed}, Failed: ${results.failed}`);
    } else if (options.configOnly) {
      // Run configuration tests only
      const configResults = await testRunner.runConfigurationTests();
      results = { configuration: configResults };
      console.log(`\n✅ Configuration tests completed`);
      console.log(`   Passed: ${configResults.passed}, Failed: ${configResults.failed}`);
    } else {
      // Run comprehensive test suite
      results = await testRunner.runAllTests({
        skipConfig: options.skipConfig,
        skipIndividual: options.skipIndividual,
        skipIntegration: options.skipIntegration,
        skipPerformance: options.skipPerformance
      });

      // Print summary
      testRunner.printTestSummary(results.report);

      // Print recommendations
      if (results.report.recommendations.length > 0) {
        console.log('💡 Recommendations:');
        results.report.recommendations.forEach((rec, index) => {
          const priority = rec.priority === 'high' ? '🔴' :
                          rec.priority === 'medium' ? '🟡' :
                          rec.priority === 'low' ? '🟠' : '🔵';
          console.log(`   ${priority} ${rec.message}`);
          if (options.verbose) {
            console.log(`      Action: ${rec.action}`);
          }
        });
        console.log('');
      }
    }

    // Cleanup
    await testRunner.cleanup();

    // Exit with appropriate code
    const hasFailures = results.success === false ||
                       (results.report && results.report.summary.failed > 0) ||
                       (results.failed && results.failed > 0);

    if (hasFailures) {
      console.log('❌ Some tests failed. Please review the results above.');
      process.exit(1);
    } else {
      console.log('✅ All tests passed successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Test execution failed:');
    console.error(error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the tests
main();