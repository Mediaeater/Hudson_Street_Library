/**
 * Comprehensive Test Runner for Image Pipeline Modules
 *
 * This module provides a unified testing interface for all image pipeline modules.
 * It can run individual module tests or comprehensive integration tests.
 *
 * Features:
 * - Individual module testing
 * - Integration testing
 * - Performance benchmarking
 * - Configuration validation
 * - Test report generation
 */

const fs = require('fs').promises;
const path = require('path');
const { getGlobalLogger } = require('../../utils/logger');

// Import all modules to test
const ImageOptimizer = require('./optimizer');
const ImageCategorizer = require('./categorizer');
const MetadataProcessor = require('./metadata');
const ImageUploader = require('./uploader');
const ImageFinder = require('./finder');

class ImagePipelineTestRunner {
  constructor(config) {
    this.config = config;

    // Initialize logger
    this.logger = getGlobalLogger({
      level: 'info',
      logDir: config.logging?.logDirectory || path.join(__dirname, '../logs'),
      includeEmojis: true
    });

    // Test statistics
    this.testStats = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      modules: {},
      startTime: null,
      endTime: null,
      errors: []
    };

    // Initialize modules for testing
    this.modules = {
      optimizer: new ImageOptimizer(config),
      categorizer: new ImageCategorizer(config),
      metadata: new MetadataProcessor(config),
      uploader: new ImageUploader(config),
      finder: new ImageFinder(config)
    };

    this.logger.info('ImagePipelineTestRunner initialized', {
      modulesToTest: Object.keys(this.modules).length
    });
  }

  /**
   * Run all tests
   */
  async runAllTests(options = {}) {
    this.logger.info('Starting comprehensive image pipeline tests...');
    this.testStats.startTime = Date.now();

    const testResults = {
      individual: {},
      integration: {},
      performance: {},
      configuration: {}
    };

    try {
      // 1. Configuration validation tests
      if (!options.skipConfig) {
        this.logger.processing('Running configuration validation tests...');
        testResults.configuration = await this.runConfigurationTests();
      }

      // 2. Individual module tests
      if (!options.skipIndividual) {
        this.logger.processing('Running individual module tests...');
        testResults.individual = await this.runIndividualModuleTests();
      }

      // 3. Integration tests
      if (!options.skipIntegration) {
        this.logger.processing('Running integration tests...');
        testResults.integration = await this.runIntegrationTests();
      }

      // 4. Performance tests
      if (!options.skipPerformance) {
        this.logger.processing('Running performance tests...');
        testResults.performance = await this.runPerformanceTests();
      }

      this.testStats.endTime = Date.now();

      // Generate comprehensive report
      const report = await this.generateTestReport(testResults);

      this.logger.success('All tests completed!', {
        duration: this.testStats.endTime - this.testStats.startTime,
        totalTests: this.testStats.totalTests,
        passed: this.testStats.passed,
        failed: this.testStats.failed
      });

      return {
        success: this.testStats.failed === 0,
        results: testResults,
        report,
        stats: this.testStats
      };

    } catch (error) {
      this.logger.error('Test execution failed', error);
      throw error;
    }
  }

  /**
   * Run configuration validation tests
   */
  async runConfigurationTests() {
    const tests = [];
    const results = { passed: 0, failed: 0, tests: [] };

    // Test 1: Basic configuration structure
    tests.push({
      name: 'Basic configuration structure',
      test: () => {
        const required = ['directories', 'collections', 'supportedTypes'];
        const missing = required.filter(key => !this.config[key]);
        if (missing.length > 0) {
          throw new Error(`Missing configuration keys: ${missing.join(', ')}`);
        }
        return true;
      }
    });

    // Test 2: Directory paths validity
    tests.push({
      name: 'Directory paths validity',
      test: async () => {
        const dirs = this.config.directories;
        for (const [name, dirPath] of Object.entries(dirs)) {
          if (!path.isAbsolute(dirPath)) {
            throw new Error(`Directory path for ${name} is not absolute: ${dirPath}`);
          }
        }
        return true;
      }
    });

    // Test 3: Supported file types format
    tests.push({
      name: 'Supported file types format',
      test: () => {
        const types = this.config.supportedTypes;
        if (!Array.isArray(types) || types.length === 0) {
          throw new Error('supportedTypes must be a non-empty array');
        }
        const invalidTypes = types.filter(type => !type.startsWith('.'));
        if (invalidTypes.length > 0) {
          throw new Error(`File types must start with dot: ${invalidTypes.join(', ')}`);
        }
        return true;
      }
    });

    // Run all configuration tests
    for (const test of tests) {
      try {
        await test.test();
        results.tests.push({ name: test.name, status: 'passed' });
        results.passed++;
      } catch (error) {
        results.tests.push({ name: test.name, status: 'failed', error: error.message });
        results.failed++;
        this.testStats.errors.push({ test: test.name, error: error.message });
      }
    }

    this.updateTestStats(results);
    return results;
  }

  /**
   * Run individual module tests
   */
  async runIndividualModuleTests() {
    const results = {};

    for (const [moduleName, module] of Object.entries(this.modules)) {
      this.logger.processing(`Testing ${moduleName} module...`);

      try {
        if (typeof module.runTests === 'function') {
          results[moduleName] = await module.runTests();
          this.testStats.modules[moduleName] = results[moduleName];
        } else {
          results[moduleName] = {
            passed: 0,
            failed: 1,
            tests: [{ name: 'Module test method', status: 'failed', error: 'runTests method not implemented' }]
          };
        }
      } catch (error) {
        this.logger.error(`Module ${moduleName} test failed`, error);
        results[moduleName] = {
          passed: 0,
          failed: 1,
          tests: [{ name: 'Module test execution', status: 'failed', error: error.message }]
        };
      }

      this.updateTestStats(results[moduleName]);
    }

    return results;
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    const tests = [];
    const results = { passed: 0, failed: 0, tests: [] };

    // Integration Test 1: Module initialization chain
    tests.push({
      name: 'Module initialization chain',
      test: async () => {
        // Test that all modules can be initialized without errors
        for (const [name, module] of Object.entries(this.modules)) {
          if (!module) {
            throw new Error(`Module ${name} failed to initialize`);
          }
        }
        return true;
      }
    });

    // Integration Test 2: Configuration sharing
    tests.push({
      name: 'Configuration sharing',
      test: () => {
        // Test that all modules have access to the configuration
        for (const [name, module] of Object.entries(this.modules)) {
          if (!module.config) {
            throw new Error(`Module ${name} does not have access to configuration`);
          }
        }
        return true;
      }
    });

    // Integration Test 3: Logger integration
    tests.push({
      name: 'Logger integration',
      test: () => {
        // Test that all modules have loggers
        for (const [name, module] of Object.entries(this.modules)) {
          if (!module.logger) {
            throw new Error(`Module ${name} does not have logger integration`);
          }
        }
        return true;
      }
    });

    // Integration Test 4: Method availability
    tests.push({
      name: 'Required methods availability',
      test: () => {
        const requiredMethods = {
          optimizer: ['optimizeImage', 'optimizeBatch'],
          categorizer: ['categorizeImage'],
          metadata: ['extractFromImage'],
          uploader: ['uploadImage'],
          finder: ['findBookImage']
        };

        for (const [moduleName, methods] of Object.entries(requiredMethods)) {
          const module = this.modules[moduleName];
          for (const method of methods) {
            if (typeof module[method] !== 'function') {
              throw new Error(`Module ${moduleName} missing required method: ${method}`);
            }
          }
        }
        return true;
      }
    });

    // Run integration tests
    for (const test of tests) {
      try {
        await test.test();
        results.tests.push({ name: test.name, status: 'passed' });
        results.passed++;
      } catch (error) {
        results.tests.push({ name: test.name, status: 'failed', error: error.message });
        results.failed++;
        this.testStats.errors.push({ test: test.name, error: error.message });
      }
    }

    this.updateTestStats(results);
    return results;
  }

  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    const results = { benchmarks: [], summary: {} };

    // Performance Test 1: Module initialization time
    const initStartTime = Date.now();
    try {
      // Re-initialize modules to test startup time
      const testConfig = { ...this.config };
      new ImageOptimizer(testConfig);
      new ImageCategorizer(testConfig);
      new MetadataProcessor(testConfig);
      new ImageUploader(testConfig);
      new ImageFinder(testConfig);

      const initTime = Date.now() - initStartTime;
      results.benchmarks.push({
        name: 'Module initialization',
        duration: initTime,
        status: initTime < 1000 ? 'passed' : 'warning', // Should initialize in under 1 second
        threshold: 1000
      });
    } catch (error) {
      results.benchmarks.push({
        name: 'Module initialization',
        status: 'failed',
        error: error.message
      });
    }

    // Performance Test 2: Memory usage
    const memBefore = process.memoryUsage();
    // Simulate some operations
    await new Promise(resolve => setTimeout(resolve, 100));
    const memAfter = process.memoryUsage();

    const memoryIncrease = memAfter.heapUsed - memBefore.heapUsed;
    results.benchmarks.push({
      name: 'Memory usage baseline',
      memoryIncrease: Math.round(memoryIncrease / 1024 / 1024 * 100) / 100, // MB
      status: memoryIncrease < 50 * 1024 * 1024 ? 'passed' : 'warning', // Less than 50MB
      threshold: '50MB'
    });

    // Calculate summary
    const passed = results.benchmarks.filter(b => b.status === 'passed').length;
    const warnings = results.benchmarks.filter(b => b.status === 'warning').length;
    const failed = results.benchmarks.filter(b => b.status === 'failed').length;

    results.summary = {
      totalBenchmarks: results.benchmarks.length,
      passed,
      warnings,
      failed,
      status: failed === 0 ? (warnings === 0 ? 'excellent' : 'good') : 'poor'
    };

    return results;
  }

  /**
   * Update test statistics
   */
  updateTestStats(moduleResults) {
    this.testStats.totalTests += moduleResults.tests?.length || moduleResults.passed + moduleResults.failed;
    this.testStats.passed += moduleResults.passed || 0;
    this.testStats.failed += moduleResults.failed || 0;
  }

  /**
   * Generate comprehensive test report
   */
  async generateTestReport(testResults) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: this.testStats.endTime - this.testStats.startTime,
      summary: {
        totalTests: this.testStats.totalTests,
        passed: this.testStats.passed,
        failed: this.testStats.failed,
        successRate: this.testStats.totalTests > 0 ?
          (this.testStats.passed / this.testStats.totalTests * 100).toFixed(2) + '%' : '0%'
      },
      results: testResults,
      errors: this.testStats.errors,
      recommendations: this.generateRecommendations(testResults),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        memory: process.memoryUsage()
      }
    };

    // Save report to file
    const reportPath = path.join(
      this.config.logging?.logDirectory || path.join(__dirname, '../logs'),
      `test-report-${Date.now()}.json`
    );

    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.logger.info(`Test report saved to: ${reportPath}`);
    } catch (error) {
      this.logger.warn('Failed to save test report', { error: error.message });
    }

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(testResults) {
    const recommendations = [];

    // Check configuration issues
    if (testResults.configuration?.failed > 0) {
      recommendations.push({
        type: 'configuration',
        priority: 'high',
        message: 'Fix configuration issues before proceeding with image processing',
        action: 'Review and update pipeline configuration'
      });
    }

    // Check module failures
    const failedModules = Object.entries(testResults.individual || {})
      .filter(([, result]) => result.failed > 0)
      .map(([name]) => name);

    if (failedModules.length > 0) {
      recommendations.push({
        type: 'modules',
        priority: 'high',
        message: `The following modules have test failures: ${failedModules.join(', ')}`,
        action: 'Review module implementations and fix failing tests'
      });
    }

    // Check integration issues
    if (testResults.integration?.failed > 0) {
      recommendations.push({
        type: 'integration',
        priority: 'medium',
        message: 'Integration tests are failing, modules may not work together properly',
        action: 'Review module interfaces and ensure compatibility'
      });
    }

    // Check performance issues
    if (testResults.performance?.summary?.status === 'poor') {
      recommendations.push({
        type: 'performance',
        priority: 'low',
        message: 'Performance benchmarks indicate potential issues',
        action: 'Review and optimize module initialization and memory usage'
      });
    }

    // Overall recommendations
    if (this.testStats.failed === 0) {
      recommendations.push({
        type: 'success',
        priority: 'info',
        message: 'All tests passed! Image pipeline is ready for use',
        action: 'Consider running tests regularly to maintain quality'
      });
    }

    return recommendations;
  }

  /**
   * Print test summary to console
   */
  printTestSummary(testResults) {
    const { summary } = testResults;

    console.log('\n' + '='.repeat(60));
    console.log('🧪 IMAGE PIPELINE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`📊 Success Rate: ${summary.successRate}`);
    console.log(`⏱️  Duration: ${summary.duration}ms`);

    if (this.testStats.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.testStats.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Run specific module tests only
   */
  async runModuleTest(moduleName) {
    if (!this.modules[moduleName]) {
      throw new Error(`Module ${moduleName} not found`);
    }

    this.logger.info(`Running tests for ${moduleName} module only...`);

    const module = this.modules[moduleName];
    if (typeof module.runTests !== 'function') {
      throw new Error(`Module ${moduleName} does not implement runTests method`);
    }

    const results = await module.runTests();
    this.logger.info(`${moduleName} tests completed`, results);

    return results;
  }

  /**
   * Clean up test resources
   */
  async cleanup() {
    this.logger.info('Cleaning up test resources...');

    // Clean up any test files or temporary resources
    for (const module of Object.values(this.modules)) {
      if (typeof module.cleanup === 'function') {
        try {
          await module.cleanup();
        } catch (error) {
          this.logger.warn(`Cleanup failed for module`, { error: error.message });
        }
      }
    }

    this.logger.info('Test cleanup completed');
  }
}

module.exports = ImagePipelineTestRunner;