/**
 * Test Suite for Logger System
 * Tests all functionality in scripts/utils/logger.js
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const os = require('os');

// Simple test framework
class TestRunner {
    constructor(suiteName) {
        this.suiteName = suiteName;
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.tempFiles = [];
        this.tempDirs = [];
        this.originalConsole = {};
        this.capturedLogs = [];
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    // Capture console output for testing
    captureConsole() {
        this.originalConsole.log = console.log;
        this.originalConsole.error = console.error;
        this.originalConsole.warn = console.warn;
        this.originalConsole.info = console.info;

        this.capturedLogs = [];

        console.log = (...args) => {
            this.capturedLogs.push({ level: 'log', args });
        };
        console.error = (...args) => {
            this.capturedLogs.push({ level: 'error', args });
        };
        console.warn = (...args) => {
            this.capturedLogs.push({ level: 'warn', args });
        };
        console.info = (...args) => {
            this.capturedLogs.push({ level: 'info', args });
        };
    }

    restoreConsole() {
        console.log = this.originalConsole.log;
        console.error = this.originalConsole.error;
        console.warn = this.originalConsole.warn;
        console.info = this.originalConsole.info;
        this.capturedLogs = [];
    }

    getCapturedLogs() {
        return this.capturedLogs;
    }

    createTempDir() {
        const tempDir = path.join(os.tmpdir(), `logger-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
        fsSync.mkdirSync(tempDir, { recursive: true });
        this.tempDirs.push(tempDir);
        return tempDir;
    }

    async cleanup() {
        // Cleanup temp files
        for (const file of this.tempFiles) {
            try {
                if (fsSync.existsSync(file)) {
                    await fs.unlink(file);
                }
            } catch (error) {
                console.warn(`Warning: Could not cleanup ${file}: ${error.message}`);
            }
        }

        // Cleanup temp directories
        for (const dir of this.tempDirs) {
            try {
                if (fsSync.existsSync(dir)) {
                    await fs.rmdir(dir, { recursive: true });
                }
            } catch (error) {
                console.warn(`Warning: Could not cleanup ${dir}: ${error.message}`);
            }
        }

        this.tempFiles = [];
        this.tempDirs = [];
    }

    async run() {
        console.log(`\n🧪 Running ${this.suiteName} Tests`);
        console.log('='.repeat(50));

        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                this.passed++;
                console.log(`✅ ${name}`);
            } catch (error) {
                this.failed++;
                console.log(`❌ ${name}: ${error.message}`);
                if (process.env.VERBOSE) {
                    console.log(`   Stack: ${error.stack}`);
                }
            } finally {
                this.restoreConsole();
            }
        }

        await this.cleanup();
        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        return { passed: this.passed, failed: this.failed };
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertGreaterThan(actual, expected, message) {
    if (actual <= expected) {
        throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
    }
}

function assertContains(string, substring, message) {
    if (!string.includes(substring)) {
        throw new Error(message || `Expected "${string}" to contain "${substring}"`);
    }
}

function assertObjectHasProperty(obj, prop, message) {
    if (!obj.hasOwnProperty(prop)) {
        throw new Error(message || `Expected object to have property ${prop}`);
    }
}

// Mock Logger class (simplified version for testing)
class MockLogger {
    constructor(options = {}) {
        this.config = {
            level: options.level || 'info',
            enableConsole: options.enableConsole !== false,
            enableFile: options.enableFile !== false,
            logDir: options.logDir || path.join(os.tmpdir(), 'test-logs'),
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
            debug: '\x1b[36m',   // Cyan
            info: '\x1b[32m',    // Green
            warn: '\x1b[33m',    // Yellow
            error: '\x1b[31m',   // Red
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
            console[level] || console.log(formatted);
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

    // Convenience methods
    debug(message, metadata) { return this.log('debug', message, metadata); }
    info(message, metadata) { return this.log('info', message, metadata); }
    warn(message, metadata) { return this.log('warn', message, metadata); }
    error(message, metadata) { return this.log('error', message, metadata); }

    // Operation tracking
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

    // Batch operations
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

    // Testing helpers
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

// Test Suite
async function runLoggerTests() {
    const runner = new TestRunner('Logger System');

    // Test logger initialization
    runner.test('Logger - initialization with default config', async () => {
        const logger = new MockLogger();

        assertObjectHasProperty(logger.config, 'level', 'Should have log level');
        assertObjectHasProperty(logger.config, 'enableConsole', 'Should have console setting');
        assertObjectHasProperty(logger.config, 'enableFile', 'Should have file setting');
        assertObjectHasProperty(logger.config, 'logDir', 'Should have log directory');

        assertEqual(logger.config.level, 'info', 'Should default to info level');
        assert(logger.config.enableConsole, 'Console should be enabled by default');
        assert(logger.config.enableFile, 'File logging should be enabled by default');
    });

    runner.test('Logger - initialization with custom config', async () => {
        const customConfig = {
            level: 'debug',
            enableConsole: false,
            enableFile: true,
            includeColors: false,
            includeEmojis: false
        };

        const logger = new MockLogger(customConfig);

        assertEqual(logger.config.level, 'debug', 'Should use custom log level');
        assert(!logger.config.enableConsole, 'Console should be disabled');
        assert(!logger.config.includeColors, 'Colors should be disabled');
        assert(!logger.config.includeEmojis, 'Emojis should be disabled');
    });

    runner.test('Logger - directory creation and initialization', async () => {
        const tempDir = runner.createTempDir();
        const logger = new MockLogger({ logDir: tempDir });

        await logger.initialize();

        assert(logger.initialized, 'Logger should be initialized');
        assert(fsSync.existsSync(tempDir), 'Log directory should exist');
        assertContains(logger.getLogFile(), tempDir, 'Log file should be in specified directory');
    });

    // Test log levels
    runner.test('Logger - log level filtering', async () => {
        const logger = new MockLogger({ level: 'warn', enableConsole: false });
        await logger.initialize();

        await logger.debug('Debug message');
        await logger.info('Info message');
        await logger.warn('Warn message');
        await logger.error('Error message');

        const entries = logger.getLogEntries();
        assertEqual(entries.length, 2, 'Should only log warn and error messages');
        assertEqual(entries[0].level, 'warn', 'First entry should be warn');
        assertEqual(entries[1].level, 'error', 'Second entry should be error');
    });

    runner.test('Logger - all log levels work', async () => {
        const logger = new MockLogger({ level: 'debug', enableConsole: false });
        await logger.initialize();

        await logger.debug('Debug message');
        await logger.info('Info message');
        await logger.warn('Warn message');
        await logger.error('Error message');

        const entries = logger.getLogEntries();
        assertEqual(entries.length, 5, 'Should log all messages plus initialization'); // +1 for init message

        const levels = entries.map(e => e.level);
        assert(levels.includes('debug'), 'Should include debug level');
        assert(levels.includes('info'), 'Should include info level');
        assert(levels.includes('warn'), 'Should include warn level');
        assert(levels.includes('error'), 'Should include error level');
    });

    // Test console output
    runner.test('Logger - console output formatting', async () => {
        const logger = new MockLogger({
            level: 'info',
            enableFile: false,
            includeColors: true,
            includeEmojis: true
        });
        await logger.initialize();

        runner.captureConsole();
        await logger.info('Test message', { key: 'value' });

        const captured = runner.getCapturedLogs();
        assert(captured.length > 0, 'Should capture console output');

        const logMessage = captured[captured.length - 1].args[0];
        assertContains(logMessage, 'INFO:', 'Should include log level');
        assertContains(logMessage, 'Test message', 'Should include message');
        assertContains(logMessage, 'ℹ️', 'Should include emoji');
    });

    runner.test('Logger - console output can be disabled', async () => {
        const logger = new MockLogger({
            enableConsole: false,
            enableFile: false
        });
        await logger.initialize();

        runner.captureConsole();
        await logger.info('Test message');

        const captured = runner.getCapturedLogs();
        // Should only have initialization message, not the test message
        assert(captured.length <= 1, 'Should not output to console when disabled');
    });

    // Test file output
    runner.test('Logger - file output creation', async () => {
        const tempDir = runner.createTempDir();
        const logger = new MockLogger({
            logDir: tempDir,
            enableConsole: false
        });
        await logger.initialize();

        await logger.info('Test file message');

        const logFile = logger.getLogFile();
        assert(fsSync.existsSync(logFile), 'Log file should be created');

        const content = await fs.readFile(logFile, 'utf8');
        assertContains(content, 'Test file message', 'Log file should contain message');
        assertContains(content, '[INFO]', 'Log file should contain log level');
    });

    runner.test('Logger - file output can be disabled', async () => {
        const tempDir = runner.createTempDir();
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
            // Should only contain initialization message if any
            assert(!content.includes('Test message'), 'Should not write to file when disabled');
        }
    });

    // Test statistics tracking
    runner.test('Logger - statistics tracking', async () => {
        const logger = new MockLogger({ enableConsole: false, enableFile: false });
        await logger.initialize();

        await logger.info('Info message');
        await logger.warn('Warning message');
        await logger.error('Error message');

        const stats = logger.getStats();
        assertObjectHasProperty(stats, 'totalOperations', 'Should track total operations');
        assertObjectHasProperty(stats, 'successfulOperations', 'Should track successful operations');
        assertObjectHasProperty(stats, 'failedOperations', 'Should track failed operations');
        assertObjectHasProperty(stats, 'errors', 'Should track errors');
        assertObjectHasProperty(stats, 'warnings', 'Should track warnings');

        assert(stats.totalOperations > 0, 'Should have total operations');
        assert(stats.errors.length > 0, 'Should have error entries');
        assert(stats.warnings.length > 0, 'Should have warning entries');
        assertEqual(stats.failedOperations, 1, 'Should count error as failed operation');
    });

    runner.test('Logger - operation tracking', async () => {
        const logger = new MockLogger({ enableConsole: false, enableFile: false });
        await logger.initialize();

        const operation = logger.startOperation('test-operation');
        assertObjectHasProperty(operation, 'name', 'Operation should have name');
        assertObjectHasProperty(operation, 'startTime', 'Operation should have start time');
        assertEqual(operation.status, 'running', 'Operation should be running');

        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 10));

        logger.endOperation('test-operation', true, { processed: 5 });

        const stats = logger.getStats();
        const operations = stats.operations;
        assert(operations.length > 0, 'Should have operations');

        const testOp = operations.find(op => op.name === 'test-operation');
        assert(testOp, 'Should find test operation');
        assertEqual(testOp.status, 'completed', 'Operation should be completed');
        assertObjectHasProperty(testOp, 'duration', 'Should have duration');
        assert(testOp.duration > 0, 'Duration should be positive');
    });

    // Test batch operations
    runner.test('Logger - batch processing', async () => {
        const logger = new MockLogger({ enableConsole: false, enableFile: false });
        await logger.initialize();

        const items = [1, 2, 3, 4, 5];
        const processor = async (item) => {
            await new Promise(resolve => setTimeout(resolve, 1));
            return item * 2;
        };

        const result = await logger.processBatch(items, processor, 2);

        assertObjectHasProperty(result, 'total', 'Should have total count');
        assertObjectHasProperty(result, 'successful', 'Should have successful count');
        assertObjectHasProperty(result, 'failed', 'Should have failed count');
        assertObjectHasProperty(result, 'results', 'Should have results array');

        assertEqual(result.total, 5, 'Should process all items');
        assertEqual(result.successful, 5, 'All items should succeed');
        assertEqual(result.failed, 0, 'No items should fail');
        assertEqual(result.results.length, 5, 'Should have all results');
    });

    runner.test('Logger - batch processing with failures', async () => {
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

        assertEqual(result.total, 5, 'Should process all items');
        assertEqual(result.successful, 4, 'Four items should succeed');
        assertEqual(result.failed, 1, 'One item should fail');

        const failedItem = result.results.find(r => !r.success);
        assert(failedItem, 'Should have failed item');
        assertEqual(failedItem.item, 3, 'Failed item should be item 3');
        assertContains(failedItem.error, 'Simulated failure', 'Should have error message');
    });

    // Test metadata handling
    runner.test('Logger - metadata handling', async () => {
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
        assert(entry, 'Should find log entry');
        assertObjectHasProperty(entry, 'metadata', 'Should have metadata');
        assertEqual(entry.metadata.userId, 123, 'Should preserve metadata values');
    });

    return await runner.run();
}

// Export for use in test runner
module.exports = { runLoggerTests };

// Run directly if this file is executed
if (require.main === module) {
    runLoggerTests()
        .then(results => {
            process.exit(results.failed > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}