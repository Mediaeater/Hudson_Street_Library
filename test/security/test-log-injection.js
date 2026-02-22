/**
 * Security tests for log injection prevention in logger.js
 *
 * Covers:
 *   - CWE-117: Improper Output Neutralization for Logs (log forging)
 *   - CWE-532: Insertion of Sensitive Information into Log File
 *   - OWASP Logging Cheat Sheet recommendations
 */

const assert = require('assert');
const {
  Logger,
  createLogger,
  sanitizeMessage,
  sanitizeMetadata,
  SENSITIVE_KEYS
} = require('../../scripts/utils/logger');

// Build a logger with console and file output disabled so tests don't
// produce side-effect output or require a writable log directory.
function silentLogger(overrides = {}) {
  return new Logger({
    enableConsole: false,
    enableFile: false,
    level: 'debug',
    ...overrides
  });
}

// ---------------------------------------------------------------
// sanitizeMessage
// ---------------------------------------------------------------
describe('sanitizeMessage', () => {

  it('should strip newline characters that enable log forging', () => {
    const forged = 'legit message\n[INFO] forged entry\r\n[ERROR] also forged';
    const result = sanitizeMessage(forged);
    assert.ok(!result.includes('\n'), 'output must not contain \\n');
    assert.ok(!result.includes('\r'), 'output must not contain \\r');
    // The newlines should become spaces so the original words are still present
    assert.ok(result.includes('legit message'));
    assert.ok(result.includes('forged entry'));
  });

  it('should remove ASCII control characters', () => {
    // \x1B is ESC (used in ANSI escape sequences for terminal injection)
    // \x00 is NULL, \x07 is BEL
    const malicious = 'normal\x1B[31mRED\x1B[0m\x00null\x07bell';
    const result = sanitizeMessage(malicious);
    assert.ok(!result.includes('\x1B'), 'ESC must be stripped');
    assert.ok(!result.includes('\x00'), 'NULL must be stripped');
    assert.ok(!result.includes('\x07'), 'BEL must be stripped');
    assert.ok(result.includes('normal'));
    assert.ok(result.includes('RED'));
  });

  it('should truncate messages longer than 5000 characters', () => {
    const huge = 'A'.repeat(10000);
    const result = sanitizeMessage(huge);
    assert.strictEqual(result.length, 5000);
  });

  it('should leave normal messages unchanged', () => {
    const normal = 'Processing image book-cover.jpg (1200x800)';
    assert.strictEqual(sanitizeMessage(normal), normal);
  });

  it('should coerce non-string input to string', () => {
    assert.strictEqual(sanitizeMessage(42), '42');
    assert.strictEqual(sanitizeMessage(null), 'null');
    assert.strictEqual(sanitizeMessage(undefined), 'undefined');
    assert.strictEqual(sanitizeMessage(true), 'true');
  });

  it('should handle an empty string', () => {
    assert.strictEqual(sanitizeMessage(''), '');
  });
});

// ---------------------------------------------------------------
// sanitizeMetadata
// ---------------------------------------------------------------
describe('sanitizeMetadata', () => {

  it('should redact values for known sensitive keys', () => {
    const meta = {
      username: 'alice',
      password: 's3cret',
      apiKey: 'abc-123',
      token: 'jwt-xyz',
      authorization: 'Bearer foo',
      cookie: 'sid=abc',
      session: 'sess-1',
      credential: 'cred-val',
      secretPath: '/vault/key',
      auth: 'basic'
    };

    const result = sanitizeMetadata(meta);

    // Non-sensitive key passes through
    assert.strictEqual(result.username, 'alice');

    // Every sensitive key is redacted
    assert.strictEqual(result.password, '[REDACTED]');
    assert.strictEqual(result.apiKey, '[REDACTED]');
    assert.strictEqual(result.token, '[REDACTED]');
    assert.strictEqual(result.authorization, '[REDACTED]');
    assert.strictEqual(result.cookie, '[REDACTED]');
    assert.strictEqual(result.session, '[REDACTED]');
    assert.strictEqual(result.credential, '[REDACTED]');
    assert.strictEqual(result.secretPath, '[REDACTED]');
    assert.strictEqual(result.auth, '[REDACTED]');
  });

  it('should redact sensitive keys case-insensitively', () => {
    const meta = {
      PASSWORD: 'oops',
      ApiKey: 'oops',
      'X-Auth-Token': 'oops'
    };
    const result = sanitizeMetadata(meta);
    assert.strictEqual(result.PASSWORD, '[REDACTED]');
    assert.strictEqual(result.ApiKey, '[REDACTED]');
    assert.strictEqual(result['X-Auth-Token'], '[REDACTED]');
  });

  it('should recursively redact nested sensitive keys', () => {
    const meta = {
      request: {
        headers: {
          authorization: 'Bearer secret-jwt'
        },
        url: 'https://api.example.com'
      }
    };
    const result = sanitizeMetadata(meta);
    assert.strictEqual(result.request.headers.authorization, '[REDACTED]');
    assert.strictEqual(result.request.url, 'https://api.example.com');
  });

  it('should cap recursion at depth 3 and return placeholder', () => {
    const deep = {
      level1: {
        level2: {
          level3: {
            level4: {
              tooDeep: 'value'
            }
          }
        }
      }
    };
    const result = sanitizeMetadata(deep);
    // depth 0 -> level1, depth 1 -> level2, depth 2 -> level3,
    // depth 3 -> level4 triggers the > 3 check
    assert.strictEqual(result.level1.level2.level3.level4, '[Max Depth]');
  });

  it('should handle arrays in metadata', () => {
    const meta = {
      items: [
        { name: 'a', token: 'secret' },
        { name: 'b', password: 'secret' }
      ]
    };
    const result = sanitizeMetadata(meta);
    assert.strictEqual(result.items[0].name, 'a');
    assert.strictEqual(result.items[0].token, '[REDACTED]');
    assert.strictEqual(result.items[1].password, '[REDACTED]');
  });

  it('should pass through null and undefined unchanged', () => {
    assert.strictEqual(sanitizeMetadata(null), null);
    assert.strictEqual(sanitizeMetadata(undefined), undefined);
  });

  it('should pass through primitive values unchanged', () => {
    assert.strictEqual(sanitizeMetadata(42), 42);
    assert.strictEqual(sanitizeMetadata('hello'), 'hello');
    assert.strictEqual(sanitizeMetadata(true), true);
  });

  it('should sanitize string values inside metadata (strip control chars)', () => {
    const meta = {
      description: 'valid\x00with\x1Bcontrol'
    };
    const result = sanitizeMetadata(meta);
    assert.ok(!result.description.includes('\x00'));
    assert.ok(!result.description.includes('\x1B'));
  });
});

// ---------------------------------------------------------------
// SENSITIVE_KEYS constant
// ---------------------------------------------------------------
describe('SENSITIVE_KEYS', () => {
  it('should include the expected sensitive key patterns', () => {
    const expected = [
      'password', 'token', 'apikey', 'secret', 'authorization',
      'cookie', 'session', 'credential', 'key', 'auth'
    ];
    for (const k of expected) {
      assert.ok(SENSITIVE_KEYS.includes(k), `missing sensitive key: ${k}`);
    }
  });
});

// ---------------------------------------------------------------
// Logger integration: formatConsoleMessage
// ---------------------------------------------------------------
describe('Logger.formatConsoleMessage', () => {
  let logger;

  before(() => {
    logger = silentLogger({
      includeTimestamp: false,
      includeColors: false,
      includeEmojis: false
    });
  });

  it('should neutralize newline injection in console output', () => {
    const result = logger.formatConsoleMessage(
      'info',
      'safe\n[ERROR] injected line\ranother'
    );
    assert.ok(!result.includes('\n'));
    assert.ok(!result.includes('\r'));
    assert.ok(result.includes('[INFO]'));
    assert.ok(result.includes('safe'));
  });

  it('should strip ANSI escape sequences from user-supplied messages', () => {
    const result = logger.formatConsoleMessage(
      'info',
      'text\x1B[31mRED\x1B[0mnormal'
    );
    assert.ok(!result.includes('\x1B'));
  });
});

// ---------------------------------------------------------------
// Logger integration: formatFileMessage
// ---------------------------------------------------------------
describe('Logger.formatFileMessage', () => {
  let logger;

  before(() => {
    logger = silentLogger({
      includeTimestamp: false,
      includeColors: false,
      includeEmojis: false
    });
  });

  it('should sanitize message in JSON file output', () => {
    const raw = logger.formatFileMessage('info', 'ok\ninjected', {});
    const parsed = JSON.parse(raw);
    assert.ok(!parsed.message.includes('\n'));
  });

  it('should redact sensitive metadata in JSON file output', () => {
    const raw = logger.formatFileMessage('info', 'test', {
      apiKey: 'secret-value',
      path: '/some/path'
    });
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.metadata.apiKey, '[REDACTED]');
    assert.strictEqual(parsed.metadata.path, '/some/path');
  });
});

// ---------------------------------------------------------------
// Logger integration: log methods store sanitized data in stats
// ---------------------------------------------------------------
describe('Logger stat storage sanitization', () => {
  let logger;

  beforeEach(() => {
    logger = silentLogger({ level: 'debug' });
  });

  it('warn() should store sanitized message in stats.warnings', () => {
    logger.warn('warning\nforged line', { token: 'secret' });
    const warning = logger.stats.warnings[0];
    assert.ok(!warning.message.includes('\n'));
    assert.strictEqual(warning.metadata.token, '[REDACTED]');
  });

  it('error() should store sanitized message in stats.errors', () => {
    logger.error('error\nforged', new Error('test'), { password: 'oops' });
    const err = logger.stats.errors[0];
    assert.ok(!err.message.includes('\n'));
    assert.strictEqual(err.metadata.password, '[REDACTED]');
  });
});
