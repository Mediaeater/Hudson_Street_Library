/**
 * Test Suite for Logger System
 * Migrated from scripts/tests/test-logger.js to Mocha
 */

const { describe, it, beforeEach, afterEach } = require('mocha');
const assert = require('assert');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { createFixtures } = require('../helpers/fixtures');
const { createConsoleCapture } = require('../helpers/console-capture');
const { sleep } = require('../helpers/async-utils');

// Mock Logger class for testing (copied from original test)
class MockLogger {
  constructor(options = {}) {
    this.config = {
      level: options.level || 'info',
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile !== false,
      logDir: options.logDir || path.join(require('os').tmpdir(), 'test-logs'),
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024,
      maxFiles: options.maxFiles || 5,
      includeTimestamp: options.includeTimestamp !== false,
      includeColors: options.includeColors !== false,
      includeEmojis: options.includeEmojis !== false,
      ...options
    };

    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    this.colors = {
      debug: '\x1b[36m',
      info: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };

    this.emojis = {
      debug: '🔍',
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅',
      processing: '⚡',
      optimization: '🔧',
      upload: '📤',
      download: '📥',
      folder: '📁',
      file: '📄',
      image: '🖼️',
      stats: '📊',
      cleanup: '🧹'
    };

    this.stats = {
      operations: new Map(),
      errors: [],
      warnings: [],
      startTime: Date.now(),
      totalOperations: 0,
      failedOperations: 0,
      successfulOperations: 0
    };

    this.logEntries = [];
    this.currentLogFile = null;
    this.initialized = false;
  }

  async initialize() {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });
      this.currentLogFile = this.generateLogFileName();
      this.initialized = true;
      this.info('Logger initialized successfully');
    } catch (error) {
      console.error('Failed to initialize logger:', error.message);
    }
  }

  generateLogFileName(type = 'main') {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.config.logDir, `${type}-${date}.log`);
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.config.level];
  }

  formatMessage(level, message, metadata = {}) {
    const timestamp = this.config.includeTimestamp
      ? new Date().toISOString()
      : '';

    const emoji = this.config.includeEmojis
      ? this.emojis[level] || this.emojis.info
      : '';

    const color = this.config.includeColors
      ? this.colors[level] || this.colors.info
      : '';

    const reset = this.config.includeColors
      ? this.colors.reset
      : '';

    let formatted = '';
    if (timestamp) formatted += `[${timestamp}] `;
    if (emoji) formatted += `${emoji} `;
    if (color) formatted += color;
    formatted += `${level.toUpperCase()}: ${message}`;
    if (reset) formatted += reset;

    if (Object.keys(metadata).length > 0) {
      formatted += ` ${JSON.stringify(metadata)}`;
    }

    return formatted;
  }

  async log(level, message, metadata = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      metadata
    };

    this.logEntries.push(logEntry);

    const formatted = this.formatMessage(level, message, metadata);

    // Console output
    if (this.config.enableConsole) {
      (console[level] || console.log)(formatted);
    }

    // File output
    if (this.config.enableFile && this.initialized) {
      try {
        const fileContent = `${logEntry.timestamp} [${level.toUpperCase()}] ${message} ${JSON.stringify(metadata)}\n`;
        await fs.appendFile(this.currentLogFile, fileContent);
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }

    // Update statistics
    this.updateStats(level, message, metadata);
  }

  updateStats(level, message, metadata) {
    if (level === 'error') {
      this.stats.errors.push({ message, metadata, timestamp: Date.now() });
      this.stats.failedOperations++;
    } else if (level === 'warn') {
      this.stats.warnings.push({ message, metadata, timestamp: Date.now() });
    } else {
      this.stats.successfulOperations++;
    }
    this.stats.totalOperations++;
  }

  debug(message, metadata) { return this.log('debug', message, metadata); }
  info(message, metadata) { return this.log('info', message, metadata); }
  warn(message, metadata) { return this.log('warn', message, metadata); }
  error(message, metadata) { return this.log('error', message, metadata); }

  startOperation(name) {
    const operation = {
      name,
      startTime: Date.now(),
      status: 'running'
    };
    this.stats.operations.set(name, operation);
    this.info(`Started operation: ${name}`);
    return operation;
  }

  endOperation(name, success = true, metadata = {}) {
    const operation = this.stats.operations.get(name);
    if (operation) {
      operation.endTime = Date.now();
      operation.duration = operation.endTime - operation.startTime;
      operation.status = success ? 'completed' : 'failed';
      operation.metadata = metadata;

      this.info(`${success ? 'Completed' : 'Failed'} operation: ${name} (${operation.duration}ms)`, metadata);
    }
  }

  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.stats.startTime,
      operations: Array.from(this.stats.operations.values())
    };
  }

  async processBatch(items, processor, batchSize = 10) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    const results = [];
    let processed = 0;

    this.info(`Processing ${items.length} items in ${batches.length} batches`);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      this.info(`Processing batch ${i + 1}/${batches.length} (${batch.length} items)`);

      const batchResults = await Promise.all(
        batch.map(async item => {
          try {
            const result = await processor(item);
            processed++;
            if (processed % 50 === 0) {
              this.info(`Progress: ${processed}/${items.length} items processed`);
            }
            return { success: true, item, result };
          } catch (error) {
            this.error(`Failed to process item: ${error.message}`, { item });
            return { success: false, item, error: error.message };
          }
        })
      );

      results.push(...batchResults);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.info(`Batch processing completed: ${successful} successful, ${failed} failed`);

    return {
      total: items.length,
      successful,
      failed,
      results
    };
  }

  getLogEntries() {
    return this.logEntries;
  }

  clearLogs() {
    this.logEntries = [];
  }

  getLogFile() {
    return this.currentLogFile;
  }
}

describe('Logger System', function() {
  let fixtures;
  let consoleCapture;

  beforeEach(function() {
    fixtures = createFixtures();
    consoleCapture = createConsoleCapture();
  });

  afterEach(function() {
    if (consoleCapture) {
      consoleCapture.stop();
    }
    if (fixtures) {
      fixtures.cleanup();
    }
  });

  describe('Initialization', function() {
    it('should initialize with default config', function() {
      const logger = new MockLogger();

      assert.ok(logger.config.level, 'Should have log level');
      assert.ok('enableConsole' in logger.config, 'Should have console setting');
      assert.ok('enableFile' in logger.config, 'Should have file setting');
      assert.ok(logger.config.logDir, 'Should have log directory');

      assert.strictEqual(logger.config.level, 'info');
      assert.strictEqual(logger.config.enableConsole, true);
      assert.strictEqual(logger.config.enableFile, true);
    });

    it('should initialize with custom config', function() {
      const logger = new MockLogger({
        level: 'debug',
        enableConsole: false,
        enableFile: true,
        includeColors: false,
        includeEmojis: false
      });

      assert.strictEqual(logger.config.level, 'debug');
      assert.strictEqual(logger.config.enableConsole, false);
      assert.strictEqual(logger.config.includeColors, false);
      assert.strictEqual(logger.config.includeEmojis, false);
    });

    it('should create directory and initialize', async function() {
      const tempDir = fixtures.createTempDir();
      const logger = new MockLogger({ logDir: tempDir });

      await logger.initialize();

      assert.ok(logger.initialized);
      assert.ok(fsSync.existsSync(tempDir));
      assert.ok(logger.getLogFile().includes(tempDir));
    });
  });

  describe('Log Level Filtering', function() {
    it('should filter logs by level', async function() {
      const logger = new MockLogger({ level: 'warn', enableConsole: false });
      await logger.initialize();

      await logger.debug('Debug message');
      await logger.info('Info message');
      await logger.warn('Warn message');
      await logger.error('Error message');

      const entries = logger.getLogEntries();
      assert.strictEqual(entries.length, 2, 'Should only log warn and error');
      assert.strictEqual(entries[0].level, 'warn');
      assert.strictEqual(entries[1].level, 'error');
    });

    it('should log all levels when set to debug', async function() {
      const logger = new MockLogger({ level: 'debug', enableConsole: false });
      await logger.initialize();

      await logger.debug('Debug message');
      await logger.info('Info message');
      await logger.warn('Warn message');
      await logger.error('Error message');

      const entries = logger.getLogEntries();
      assert.strictEqual(entries.length, 5); // +1 for init message

      const levels = entries.map(e => e.level);
      assert.ok(levels.includes('debug'));
      assert.ok(levels.includes('info'));
      assert.ok(levels.includes('warn'));
      assert.ok(levels.includes('error'));
    });
  });

  describe('Console Output', function() {
    it('should format console output correctly', async function() {
      const logger = new MockLogger({
        level: 'info',
        enableFile: false,
        includeColors: true,
        includeEmojis: true
      });
      await logger.initialize();

      consoleCapture.start();
      await logger.info('Test message', { key: 'value' });
      consoleCapture.stop();

      const captured = consoleCapture.getLogs();
      assert.ok(captured.length > 0);

      const logMessage = captured[captured.length - 1].args[0];
      assert.ok(logMessage.includes('INFO:'));
      assert.ok(logMessage.includes('Test message'));
      assert.ok(logMessage.includes('ℹ️'));
    });

    it('should allow console output to be disabled', async function() {
      const logger = new MockLogger({
        enableConsole: false,
        enableFile: false
      });
      await logger.initialize();

      consoleCapture.start();
      await logger.info('Test message');
      consoleCapture.stop();

      const captured = consoleCapture.getLogs();
      assert.ok(captured.length <= 1, 'Should not output when disabled');
    });
  });

  describe('File Output', function() {
    it('should create log file and write content', async function() {
      const tempDir = fixtures.createTempDir();
      const logger = new MockLogger({
        logDir: tempDir,
        enableConsole: false
      });
      await logger.initialize();

      await logger.info('Test file message');

      const logFile = logger.getLogFile();
      assert.ok(fsSync.existsSync(logFile));

      const content = await fs.readFile(logFile, 'utf8');
      assert.ok(content.includes('Test file message'));
      assert.ok(content.includes('[INFO]'));
    });

    it('should not write to file when disabled', async function() {
      const tempDir = fixtures.createTempDir();
      const logger = new MockLogger({
        logDir: tempDir,
        enableFile: false,
        enableConsole: false
      });
      await logger.initialize();

      await logger.info('Test message');

      const logFile = logger.getLogFile();
      if (fsSync.existsSync(logFile)) {
        const content = await fs.readFile(logFile, 'utf8');
        assert.ok(!content.includes('Test message'));
      }
    });
  });

  describe('Statistics Tracking', function() {
    it('should track statistics correctly', async function() {
      const logger = new MockLogger({ enableConsole: false, enableFile: false });
      await logger.initialize();

      await logger.info('Info message');
      await logger.warn('Warning message');
      await logger.error('Error message');

      const stats = logger.getStats();
      assert.ok('totalOperations' in stats);
      assert.ok('successfulOperations' in stats);
      assert.ok('failedOperations' in stats);
      assert.ok('errors' in stats);
      assert.ok('warnings' in stats);

      assert.ok(stats.totalOperations > 0);
      assert.ok(stats.errors.length > 0);
      assert.ok(stats.warnings.length > 0);
      assert.strictEqual(stats.failedOperations, 1);
    });

    it('should track operations', async function() {
      const logger = new MockLogger({ enableConsole: false, enableFile: false });
      await logger.initialize();

      const operation = logger.startOperation('test-operation');
      assert.ok(operation.name);
      assert.ok(operation.startTime);
      assert.strictEqual(operation.status, 'running');

      await sleep(10);

      logger.endOperation('test-operation', true, { processed: 5 });

      const stats = logger.getStats();
      const operations = stats.operations;
      assert.ok(operations.length > 0);

      const testOp = operations.find(op => op.name === 'test-operation');
      assert.ok(testOp);
      assert.strictEqual(testOp.status, 'completed');
      assert.ok(testOp.duration);
      assert.ok(testOp.duration > 0);
    });
  });

  describe('Batch Processing', function() {
    it('should process batch successfully', async function() {
      const logger = new MockLogger({ enableConsole: false, enableFile: false });
      await logger.initialize();

      const items = [1, 2, 3, 4, 5];
      const processor = async (item) => {
        await sleep(1);
        return item * 2;
      };

      const result = await logger.processBatch(items, processor, 2);

      assert.ok('total' in result);
      assert.ok('successful' in result);
      assert.ok('failed' in result);
      assert.ok('results' in result);

      assert.strictEqual(result.total, 5);
      assert.strictEqual(result.successful, 5);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.results.length, 5);
    });

    it('should handle batch processing failures', async function() {
      const logger = new MockLogger({ enableConsole: false, enableFile: false });
      await logger.initialize();

      const items = [1, 2, 3, 4, 5];
      const processor = async (item) => {
        if (item === 3) {
          throw new Error('Simulated failure');
        }
        return item * 2;
      };

      const result = await logger.processBatch(items, processor, 2);

      assert.strictEqual(result.total, 5);
      assert.strictEqual(result.successful, 4);
      assert.strictEqual(result.failed, 1);

      const failedItem = result.results.find(r => !r.success);
      assert.ok(failedItem);
      assert.strictEqual(failedItem.item, 3);
      assert.ok(failedItem.error.includes('Simulated failure'));
    });
  });

  describe('Metadata Handling', function() {
    it('should handle metadata correctly', async function() {
      const logger = new MockLogger({ enableConsole: false, enableFile: false });
      await logger.initialize();

      const metadata = {
        userId: 123,
        action: 'test',
        timestamp: Date.now()
      };

      await logger.info('Test with metadata', metadata);

      const entries = logger.getLogEntries();
      const entry = entries.find(e => e.message === 'Test with metadata');
      assert.ok(entry);
      assert.ok(entry.metadata);
      assert.strictEqual(entry.metadata.userId, 123);
    });
  });
});
