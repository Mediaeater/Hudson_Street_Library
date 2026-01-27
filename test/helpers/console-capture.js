/**
 * Console Capture Helper for Testing
 * Allows capturing and restoring console output during tests
 */

class ConsoleCapture {
  constructor() {
    this.originalConsole = {};
    this.capturedLogs = [];
    this.isCapturing = false;
  }

  /**
   * Start capturing console output
   */
  start() {
    if (this.isCapturing) {
      return;
    }

    this.originalConsole.log = console.log;
    this.originalConsole.error = console.error;
    this.originalConsole.warn = console.warn;
    this.originalConsole.info = console.info;

    this.capturedLogs = [];
    this.isCapturing = true;

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

  /**
   * Stop capturing and restore original console
   */
  stop() {
    if (!this.isCapturing) {
      return;
    }

    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;

    this.isCapturing = false;
  }

  /**
   * Get captured logs
   */
  getLogs() {
    return this.capturedLogs;
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level) {
    return this.capturedLogs.filter(log => log.level === level);
  }

  /**
   * Clear captured logs
   */
  clear() {
    this.capturedLogs = [];
  }

  /**
   * Get last log entry
   */
  getLastLog() {
    return this.capturedLogs[this.capturedLogs.length - 1];
  }
}

/**
 * Create a new console capture instance
 */
function createConsoleCapture() {
  return new ConsoleCapture();
}

module.exports = {
  ConsoleCapture,
  createConsoleCapture
};
