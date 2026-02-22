/**
 * Unified Logging System for Hudson Street Library
 * Provides consistent logging across all image processing modules
 * Supports file logging, console output with colors/emojis, and operation statistics
 */

const fs = require('fs').promises;
const path = require('path');
const util = require('util');

// SECURITY: Keys whose values must be redacted from log metadata (CWE-532)
const SENSITIVE_KEYS = [
  'password', 'token', 'apikey', 'secret', 'authorization',
  'cookie', 'session', 'credential', 'key', 'auth'
];

/**
 * Sanitize a log message string to prevent log injection / log forging.
 * Strips newlines (which forge extra log lines), control characters
 * (which can manipulate terminal emulators), and enforces a length cap.
 * Ref: OWASP Logging Cheat Sheet, CWE-117.
 */
function sanitizeMessage(message) {
  return String(message)
    .replace(/[\n\r]/g, ' ')              // Newlines enable log forging
    .replace(/[\x00-\x1F\x7F]/g, '')      // Control chars can exploit terminals
    .slice(0, 5000);                       // Prevent log-based DoS via huge messages
}

/**
 * Recursively walk a metadata object and redact values for sensitive keys.
 * Caps recursion depth to prevent stack overflow from circular or deeply
 * nested structures.
 * Ref: OWASP Logging Cheat Sheet, CWE-532.
 */
function sanitizeMetadata(obj, depth = 0) {
  if (depth > 3) return '[Max Depth]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeMetadata(item, depth + 1));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    const keyLower = key.toLowerCase();

    if (SENSITIVE_KEYS.some(sensitive => keyLower.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value, depth + 1);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeMessage(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

class Logger {
  constructor(options = {}) {
    this.config = {
      level: options.level || 'info',
      enableConsole: options.enableConsole !== false,
      enableFile: options.enableFile !== false,
      logDir: options.logDir || path.join(__dirname, '../logs'),
      maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
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
      cleanup: '🧹',
      security: '🔒',
      network: '🌐',
      database: '🗄️'
    };

    // Operation statistics
    this.stats = {
      operations: new Map(),
      errors: [],
      warnings: [],
      startTime: Date.now(),
      totalOperations: 0,
      failedOperations: 0,
      successfulOperations: 0
    };

    // Initialize logging
    this.initialize();
  }

  async initialize() {
    try {
      // Create logs directory if it doesn't exist
      await fs.mkdir(this.config.logDir, { recursive: true });

      // Initialize daily log file
      this.currentLogFile = this.generateLogFileName();

      // Clean up old log files
      await this.rotateLogs();

      this.info('Logger initialized successfully', {
        logDir: this.config.logDir,
        level: this.config.level,
        logFile: this.currentLogFile
      });
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

  formatConsoleMessage(level, message, emoji = null) {
    let formatted = '';

    if (this.config.includeTimestamp) {
      formatted += `[${new Date().toISOString()}] `;
    }

    // SECURITY: Sanitize message to prevent log injection (CWE-117)
    const sanitizedMessage = sanitizeMessage(message);

    if (this.config.includeColors) {
      formatted += this.colors[level];
    }

    if (this.config.includeEmojis && emoji) {
      formatted += `${emoji} `;
    }

    formatted += `[${level.toUpperCase()}] ${sanitizedMessage}`;

    if (this.config.includeColors) {
      formatted += this.colors.reset;
    }

    return formatted;
  }

  formatFileMessage(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message: sanitizeMessage(message),
      metadata: sanitizeMetadata(metadata),
      pid: process.pid
    };

    return JSON.stringify(logEntry) + '\n';
  }

  async writeToFile(content, filename = null) {
    if (!this.config.enableFile) return;

    try {
      const logFile = filename || this.currentLogFile;
      await fs.appendFile(logFile, content);
    } catch (error) {
      console.error('Failed to write to log file:', error.message);
    }
  }

  async rotateLogs() {
    try {
      const files = await fs.readdir(this.config.logDir);
      const logFiles = files
        .filter(file => file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(this.config.logDir, file),
          stat: null
        }));

      // Get file stats
      for (const file of logFiles) {
        try {
          file.stat = await fs.stat(file.path);
        } catch (error) {
          // File might have been deleted, skip
        }
      }

      // Remove old files if we exceed maxFiles
      const validFiles = logFiles.filter(f => f.stat);
      if (validFiles.length > this.config.maxFiles) {
        const sortedFiles = validFiles.sort((a, b) => a.stat.mtime - b.stat.mtime);
        const filesToDelete = sortedFiles.slice(0, validFiles.length - this.config.maxFiles);

        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
      }

      // Check current log file size
      try {
        const currentFileStat = await fs.stat(this.currentLogFile);
        if (currentFileStat.size > this.config.maxFileSize) {
          // Archive current file and start new one
          const archivedName = this.currentLogFile.replace('.log', `-${Date.now()}.log`);
          await fs.rename(this.currentLogFile, archivedName);
          this.currentLogFile = this.generateLogFileName();
        }
      } catch (error) {
        // File doesn't exist yet, which is fine
      }
    } catch (error) {
      console.error('Failed to rotate logs:', error.message);
    }
  }

  trackOperation(operationName, status = 'started', metadata = {}) {
    const operation = {
      name: operationName,
      status,
      startTime: Date.now(),
      metadata,
      id: `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    this.stats.operations.set(operation.id, operation);
    this.stats.totalOperations++;

    if (status === 'failed') {
      this.stats.failedOperations++;
    } else if (status === 'completed') {
      this.stats.successfulOperations++;
    }

    return operation.id;
  }

  updateOperation(operationId, status, metadata = {}) {
    const operation = this.stats.operations.get(operationId);
    if (operation) {
      operation.status = status;
      operation.endTime = Date.now();
      operation.duration = operation.endTime - operation.startTime;
      operation.metadata = { ...operation.metadata, ...metadata };

      if (status === 'failed') {
        this.stats.failedOperations++;
      } else if (status === 'completed') {
        this.stats.successfulOperations++;
      }
    }
  }

  // Core logging methods
  debug(message, metadata = {}) {
    if (!this.shouldLog('debug')) return;

    const safeMetadata = sanitizeMetadata(metadata);

    if (this.config.enableConsole) {
      console.log(this.formatConsoleMessage('debug', message, this.emojis.debug));
      if (Object.keys(safeMetadata).length > 0) {
        console.log(util.inspect(safeMetadata, { colors: this.config.includeColors, depth: 2 }));
      }
    }

    this.writeToFile(this.formatFileMessage('debug', message, safeMetadata));
  }

  info(message, metadata = {}) {
    if (!this.shouldLog('info')) return;

    const safeMetadata = sanitizeMetadata(metadata);

    if (this.config.enableConsole) {
      console.log(this.formatConsoleMessage('info', message, this.emojis.info));
      if (Object.keys(safeMetadata).length > 0) {
        console.log(util.inspect(safeMetadata, { colors: this.config.includeColors, depth: 2 }));
      }
    }

    this.writeToFile(this.formatFileMessage('info', message, safeMetadata));
  }

  warn(message, metadata = {}) {
    if (!this.shouldLog('warn')) return;

    const safeMetadata = sanitizeMetadata(metadata);

    this.stats.warnings.push({
      message: sanitizeMessage(message),
      metadata: safeMetadata,
      timestamp: new Date().toISOString()
    });

    if (this.config.enableConsole) {
      console.warn(this.formatConsoleMessage('warn', message, this.emojis.warn));
      if (Object.keys(safeMetadata).length > 0) {
        console.warn(util.inspect(safeMetadata, { colors: this.config.includeColors, depth: 2 }));
      }
    }

    this.writeToFile(this.formatFileMessage('warn', message, safeMetadata));
  }

  error(message, error = null, metadata = {}) {
    if (!this.shouldLog('error')) return;

    const safeMetadata = sanitizeMetadata(metadata);

    const errorData = {
      message: sanitizeMessage(message),
      metadata: safeMetadata,
      timestamp: new Date().toISOString(),
      stack: error?.stack || new Error().stack
    };

    this.stats.errors.push(errorData);

    if (this.config.enableConsole) {
      console.error(this.formatConsoleMessage('error', message, this.emojis.error));
      if (error) {
        console.error(error);
      }
      if (Object.keys(safeMetadata).length > 0) {
        console.error(util.inspect(safeMetadata, { colors: this.config.includeColors, depth: 2 }));
      }
    }

    // Write errors to separate error log
    const errorLogFile = this.generateLogFileName('error');
    this.writeToFile(this.formatFileMessage('error', message, { ...safeMetadata, error: error?.message, stack: error?.stack }), errorLogFile);
  }

  // Specialized logging methods with emojis
  success(message, metadata = {}) {
    const safeMetadata = sanitizeMetadata(metadata);

    if (this.config.enableConsole) {
      console.log(this.formatConsoleMessage('info', message, this.emojis.success));
      if (Object.keys(safeMetadata).length > 0) {
        console.log(util.inspect(safeMetadata, { colors: this.config.includeColors, depth: 2 }));
      }
    }
    this.writeToFile(this.formatFileMessage('info', message, safeMetadata));
  }

  processing(message, metadata = {}) {
    this.info(message, metadata);
    if (this.config.enableConsole && this.config.includeEmojis) {
      // Override the info emoji with processing emoji for console
      const formatted = this.formatConsoleMessage('info', message, this.emojis.processing);
      console.log(formatted);
    }
  }

  optimization(message, metadata = {}) {
    this.info(message, metadata);
  }

  // Batch operation logging
  startBatch(batchName, itemCount) {
    const operationId = this.trackOperation(`batch-${batchName}`, 'started', { itemCount });
    this.processing(`Starting batch: ${batchName} (${itemCount} items)`, { batchName, itemCount });
    return operationId;
  }

  endBatch(operationId, results = {}) {
    this.updateOperation(operationId, 'completed', results);
    const operation = this.stats.operations.get(operationId);
    if (operation) {
      this.success(`Batch completed: ${operation.name} in ${operation.duration}ms`, {
        duration: operation.duration,
        ...results
      });
    }
  }

  // Statistics and reporting
  getStats() {
    const uptime = Date.now() - this.stats.startTime;
    const operationsArray = Array.from(this.stats.operations.values());

    return {
      uptime,
      totalOperations: this.stats.totalOperations,
      successfulOperations: this.stats.successfulOperations,
      failedOperations: this.stats.failedOperations,
      successRate: this.stats.totalOperations > 0 ?
        (this.stats.successfulOperations / this.stats.totalOperations * 100).toFixed(2) + '%' : '0%',
      errorCount: this.stats.errors.length,
      warningCount: this.stats.warnings.length,
      activeOperations: operationsArray.filter(op => op.status === 'started').length,
      completedOperations: operationsArray.filter(op => op.status === 'completed').length,
      averageOperationTime: this.calculateAverageOperationTime(operationsArray),
      recentErrors: this.stats.errors.slice(-5),
      recentWarnings: this.stats.warnings.slice(-5)
    };
  }

  calculateAverageOperationTime(operations) {
    const completedOps = operations.filter(op => op.duration);
    if (completedOps.length === 0) return 0;

    const totalTime = completedOps.reduce((sum, op) => sum + op.duration, 0);
    return Math.round(totalTime / completedOps.length);
  }

  async generateReport(includeDetails = false) {
    const stats = this.getStats();
    const report = {
      generated: new Date().toISOString(),
      summary: {
        uptime: `${Math.round(stats.uptime / 1000)}s`,
        totalOperations: stats.totalOperations,
        successRate: stats.successRate,
        errors: stats.errorCount,
        warnings: stats.warningCount
      },
      performance: {
        averageOperationTime: `${stats.averageOperationTime}ms`,
        activeOperations: stats.activeOperations,
        completedOperations: stats.completedOperations
      }
    };

    if (includeDetails) {
      report.details = {
        recentErrors: stats.recentErrors,
        recentWarnings: stats.recentWarnings,
        operations: Array.from(this.stats.operations.values()).slice(-10)
      };
    }

    // Write report to file
    const reportFile = path.join(this.config.logDir, `report-${Date.now()}.json`);
    await this.writeToFile(JSON.stringify(report, null, 2), reportFile);

    return report;
  }

  printStats() {
    const stats = this.getStats();
    console.log('\n📊 Logger Statistics:');
    console.log(`   Uptime: ${Math.round(stats.uptime / 1000)}s`);
    console.log(`   Total Operations: ${stats.totalOperations}`);
    console.log(`   Success Rate: ${stats.successRate}`);
    console.log(`   Errors: ${stats.errorCount}`);
    console.log(`   Warnings: ${stats.warningCount}`);
    console.log(`   Average Operation Time: ${stats.averageOperationTime}ms`);
    console.log(`   Active Operations: ${stats.activeOperations}`);
  }

  // Utility methods for common patterns
  logImageProcess(imagePath, action, metadata = {}) {
    this.processing(`${this.emojis.image} ${action}: ${path.basename(imagePath)}`, {
      imagePath,
      action,
      ...metadata
    });
  }

  logOptimization(inputPath, outputPaths, stats = {}) {
    this.success(`${this.emojis.optimization} Optimized: ${path.basename(inputPath)}`, {
      inputPath,
      outputCount: Array.isArray(outputPaths) ? outputPaths.length : 1,
      outputPaths,
      stats
    });
  }

  logFileOperation(operation, filePath, metadata = {}) {
    const emoji = this.emojis[operation] || this.emojis.file;
    this.info(`${emoji} ${operation}: ${path.basename(filePath)}`, {
      operation,
      filePath,
      ...metadata
    });
  }

  // Clean up resources
  async cleanup() {
    this.info('Logger shutting down', {
      totalOperations: this.stats.totalOperations,
      uptime: Date.now() - this.stats.startTime
    });

    // Generate final report
    await this.generateReport(true);
  }
}

// Singleton instance for global use
let globalLogger = null;

function createLogger(options = {}) {
  return new Logger(options);
}

function getGlobalLogger(options = {}) {
  if (!globalLogger) {
    globalLogger = new Logger(options);
  }
  return globalLogger;
}

// Export both class and convenience functions
module.exports = {
  Logger,
  createLogger,
  getGlobalLogger,
  sanitizeMessage,
  sanitizeMetadata,
  SENSITIVE_KEYS
};