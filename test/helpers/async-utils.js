/**
 * Async Test Utilities
 * Polling and waiting patterns from datasette-enrichments
 */

/**
 * Wait for a condition to become true with polling
 * Similar to datasette-enrichments test_enrichments.py:112-124
 *
 * @param {Function} condition - Function that returns true when condition is met
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>}
 */
async function waitFor(condition, options = {}) {
  const {
    timeout = 5000,
    interval = 100,
    message = 'Condition not met within timeout'
  } = options;

  const startTime = Date.now();
  let attempts = 0;

  while (Date.now() - startTime < timeout) {
    attempts++;

    try {
      const result = await condition();
      if (result) {
        return true;
      }
    } catch (error) {
      // Condition threw an error, keep waiting
    }

    await sleep(interval);
  }

  throw new Error(`${message} (${attempts} attempts over ${timeout}ms)`);
}

/**
 * Sleep for a specified duration
 *
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Poll a function until it returns a non-null/undefined value
 *
 * @param {Function} fn - Function to poll
 * @param {Object} options - Configuration options
 * @returns {Promise<any>}
 */
async function poll(fn, options = {}) {
  const {
    timeout = 5000,
    interval = 100,
    message = 'Polling timed out'
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await fn();
    if (result !== null && result !== undefined) {
      return result;
    }
    await sleep(interval);
  }

  throw new Error(message);
}

/**
 * Retry a function with exponential backoff
 *
 * @param {Function} fn - Function to retry
 * @param {Object} options - Configuration options
 * @returns {Promise<any>}
 */
async function retry(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 100,
    maxDelay = 5000,
    factor = 2,
    onRetry = null
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(error, attempt, delay);
        }

        await sleep(delay);
        delay = Math.min(delay * factor, maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Wait for a file to exist
 *
 * @param {string} filePath - Path to file
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>}
 */
async function waitForFile(filePath, options = {}) {
  const fs = require('fs');

  return waitFor(
    () => fs.existsSync(filePath),
    {
      message: `File ${filePath} not found within timeout`,
      ...options
    }
  );
}

/**
 * Wait for a file to contain specific content
 *
 * @param {string} filePath - Path to file
 * @param {string|RegExp} content - Content to search for
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>}
 */
async function waitForFileContent(filePath, content, options = {}) {
  const fs = require('fs');

  return waitFor(
    () => {
      if (!fs.existsSync(filePath)) {
        return false;
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');

      if (content instanceof RegExp) {
        return content.test(fileContent);
      }

      return fileContent.includes(content);
    },
    {
      message: `File ${filePath} did not contain expected content within timeout`,
      ...options
    }
  );
}

module.exports = {
  waitFor,
  sleep,
  poll,
  retry,
  waitForFile,
  waitForFileContent
};
