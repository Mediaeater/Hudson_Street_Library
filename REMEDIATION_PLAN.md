# SECURITY REMEDIATION PLAN
**Hudson Street Library - Step-by-Step Fix Guide**

---

## WEEK 1: CRITICAL FIXES (P0)

### Day 1: Path Security

#### Fix 1.1: Path Traversal in csv-handler.js
**File:** `scripts/utils/csv-handler.js`
**Lines:** 442-446

```bash
# Create feature branch
git checkout -b security/path-traversal-fix
```

**Replace `createBackup` method:**
```javascript
static createBackup(filePath) {
    const path = require('path');

    // Validate filePath is within expected directory
    const resolvedPath = path.resolve(filePath);
    const baseDir = path.resolve(__dirname, '../../src/_data');

    if (!resolvedPath.startsWith(baseDir)) {
        throw new Error(`Security: Invalid file path outside allowed directory`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupPath = filePath.replace(/\.csv$/, `_backup_${timestamp}.csv`);

    // Validate backup path
    const resolvedBackup = path.resolve(backupPath);
    if (!resolvedBackup.startsWith(baseDir)) {
        throw new Error(`Security: Invalid backup path generated`);
    }

    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}
```

**Test:**
```bash
# Create test file
cat > test/security/test-path-traversal.js << 'EOF'
const assert = require('assert');
const CSVHandler = require('../../scripts/utils/csv-handler');
const path = require('path');

describe('Path Traversal Protection', () => {
    it('should reject paths outside base directory', () => {
        const maliciousPath = path.join(__dirname, '../../../../etc/passwd.csv');
        assert.throws(
            () => CSVHandler.createBackup(maliciousPath),
            /Invalid file path/
        );
    });

    it('should reject paths with .. sequences', () => {
        const maliciousPath = 'src/_data/../../secret.csv';
        assert.throws(
            () => CSVHandler.createBackup(maliciousPath),
            /Invalid file path/
        );
    });

    it('should allow valid paths', () => {
        const validPath = path.join(__dirname, '../../src/_data/books.csv');
        const backup = CSVHandler.createBackup(validPath);
        assert(backup.includes('_backup_'));
    });
});
EOF

npm test -- test/security/test-path-traversal.js
```

---

#### Fix 1.2: Filename Injection in image-core.js
**File:** `scripts/utils/image-core.js`
**Lines:** 125-135

**Replace `sanitizeFilename`:**
```javascript
function sanitizeFilename(filename) {
    // Remove path components first
    let cleaned = path.basename(filename);

    // Remove all dots at start (prevent hidden files)
    cleaned = cleaned.replace(/^\.+/, '');

    return cleaned
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/\.{2,}/g, '_')  // Replace .. sequences
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}
```

**Test:**
```javascript
// In test/security/test-path-traversal.js
describe('Filename Sanitization', () => {
    const { sanitizeFilename } = require('../../scripts/utils/image-core');

    it('should remove path traversal attempts', () => {
        assert.equal(sanitizeFilename('../../../etc/passwd'), 'etc_passwd');
    });

    it('should remove special characters', () => {
        assert.equal(sanitizeFilename('<script>alert(1)</script>'), '_script_alert_1___script_');
    });

    it('should handle normal filenames', () => {
        assert.equal(sanitizeFilename('book-cover.jpg'), 'book-cover.jpg');
    });
});
```

---

### Day 2: Network Security

#### Fix 2.1: SSRF Protection in book-api-client.js
**File:** `scripts/utils/book-api-client.js`

**Add URL validation function at top of file:**
```javascript
const { URL } = require('url');

const ALLOWED_HOSTS = [
    'www.googleapis.com',
    'openlibrary.org',
    'covers.oclc.org',
    'covers.librarything.com'
];

function validateURL(urlString) {
    const parsed = new URL(urlString);

    // Only allow HTTPS
    if (parsed.protocol !== 'https:') {
        throw new Error('Only HTTPS URLs allowed');
    }

    // Check against whitelist
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
        throw new Error(`Host not allowed: ${parsed.hostname}`);
    }

    // Prevent internal network access
    const ip = parsed.hostname;
    if (ip.startsWith('127.') || ip.startsWith('192.168.') ||
        ip.startsWith('10.') || ip.startsWith('172.16.') ||
        ip === 'localhost' || ip === '0.0.0.0') {
        throw new Error('Internal network access denied');
    }

    return parsed.href;
}
```

**Update `_downloadFile` method (line 744):**
```javascript
_downloadFile(url, filepath) {
    return new Promise((resolve, reject) => {
        // Validate URL first
        try {
            url = validateURL(url);
        } catch (err) {
            return reject(new Error(`Invalid URL: ${err.message}`));
        }

        const file = fs.createWriteStream(filepath);
        const headers = {
            'User-Agent': this.config.request.userAgent
        };

        const options = { headers };

        https.get(url, options, (response) => {
            // Check for redirects
            if (response.statusCode >= 300 && response.statusCode < 400) {
                const redirectURL = response.headers.location;
                try {
                    validateURL(redirectURL);
                    // Follow redirect manually (or reject)
                    reject(new Error('Redirects not allowed for security'));
                } catch (err) {
                    file.close();
                    reject(new Error(`Unsafe redirect: ${err.message}`));
                }
                return;
            }

            if (response.statusCode === 200) {
                response.pipe(file);

                file.on('finish', () => {
                    file.close();

                    const stats = fs.statSync(filepath);
                    if (stats.size < IMAGE_CONFIG.validation.minSize) {
                        reject(new Error(`Image too small (${stats.size} bytes)`));
                    } else {
                        resolve();
                    }
                });

                file.on('error', (err) => {
                    file.close();
                    reject(err);
                });
            } else {
                file.close();
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            file.close();
            reject(err);
        });
    });
}
```

**Test:**
```javascript
// test/security/test-ssrf-protection.js
const assert = require('assert');
const { validateURL } = require('../../scripts/utils/book-api-client');

describe('SSRF Protection', () => {
    it('should reject HTTP URLs', () => {
        assert.throws(
            () => validateURL('http://example.com'),
            /Only HTTPS URLs allowed/
        );
    });

    it('should reject localhost', () => {
        assert.throws(
            () => validateURL('https://localhost:8080/api'),
            /Internal network access denied/
        );
    });

    it('should reject private IPs', () => {
        assert.throws(
            () => validateURL('https://192.168.1.1/'),
            /Internal network access denied/
        );
    });

    it('should reject unlisted hosts', () => {
        assert.throws(
            () => validateURL('https://evil.com/api'),
            /Host not allowed/
        );
    });

    it('should allow whitelisted hosts', () => {
        const url = validateURL('https://www.googleapis.com/books/v1/volumes');
        assert.equal(url, 'https://www.googleapis.com/books/v1/volumes');
    });
});
```

---

### Day 3: Injection Prevention

#### Fix 3.1: CSV Injection
**File:** `scripts/utils/csv-handler.js`

**Add sanitization function:**
```javascript
/**
 * Sanitize CSV field to prevent formula injection
 * @param {string} value - Field value
 * @returns {string} Sanitized value
 */
static sanitizeCSVField(value) {
    if (typeof value !== 'string') return value;

    const dangerous = ['=', '+', '-', '@', '\t', '\r', '\n'];

    // Check if starts with dangerous character
    if (dangerous.some(char => value.startsWith(char))) {
        return "'" + value; // Prefix with single quote
    }

    // Also check for embedded formulas
    if (value.includes('|') || value.includes(';')) {
        return value.replace(/[|;]/g, '');
    }

    return value;
}
```

**Update `validateAndCleanRecord` (line 322):**
```javascript
// Clean string fields
Object.keys(result.record).forEach(key => {
    if (typeof result.record[key] === 'string') {
        const original = result.record[key];
        let cleaned = original.trim();

        // Handle various null representations
        if (cleaned === 'NULL' || cleaned === 'null' || cleaned === 'undefined' || cleaned === '') {
            cleaned = '';
        }

        // Fix common encoding issues
        cleaned = cleaned.replace(/\u00e2\u20ac\u2122/g, "'");
        cleaned = cleaned.replace(/\u00e2\u20ac\u0153/g, '"');
        cleaned = cleaned.replace(/\u00e2\u20ac/g, '"');

        // SECURITY: Prevent CSV injection
        cleaned = this.sanitizeCSVField(cleaned);

        if (original !== cleaned) {
            result.corrected = true;
        }

        result.record[key] = cleaned;
    }
});
```

**Test:**
```javascript
// test/security/test-csv-injection.js
const CSVHandler = require('../../scripts/utils/csv-handler');

describe('CSV Injection Protection', () => {
    it('should prefix formula with quote', () => {
        const result = CSVHandler.sanitizeCSVField('=cmd|calc');
        assert.equal(result, "'=cmd|calc");
    });

    it('should handle + prefix', () => {
        const result = CSVHandler.sanitizeCSVField('+1+1');
        assert.equal(result, "'+1+1");
    });

    it('should not modify safe strings', () => {
        const result = CSVHandler.sanitizeCSVField('Normal Book Title');
        assert.equal(result, 'Normal Book Title');
    });
});
```

---

#### Fix 3.2: Log Injection
**File:** `scripts/utils/logger.js`

**Update `formatConsoleMessage` (line 106):**
```javascript
formatConsoleMessage(level, message, emoji = null) {
    let formatted = '';

    if (this.config.includeTimestamp) {
        formatted += `[${new Date().toISOString()}] `;
    }

    // SECURITY: Sanitize message to prevent log injection
    const sanitizedMessage = String(message)
        .replace(/[\n\r]/g, ' ')  // Replace newlines
        .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control chars
        .slice(0, 5000);  // Limit length

    if (this.config.includeColors) {
        formatted += this.colors[level];
    }

    if (this.config.includeEmojis && emoji) {
        formatted += `${emoji} `;
    }

    formatted += `[${level.toUpperCase()}]: ${sanitizedMessage}`;

    if (this.config.includeColors) {
        formatted += this.colors.reset;
    }

    return formatted;
}
```

**Also add metadata sanitization:**
```javascript
// Add at top of file
const SENSITIVE_KEYS = [
    'password', 'token', 'apiKey', 'secret', 'authorization',
    'cookie', 'session', 'credential', 'key', 'auth'
];

function sanitizeMetadata(obj, depth = 0) {
    if (depth > 3) return '[Max Depth]';  // Prevent deep recursion
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();

        // Redact sensitive keys
        if (SENSITIVE_KEYS.some(sensitive => keyLower.includes(sensitive))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeMetadata(value, depth + 1);
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
```

**Update all log methods to use sanitization:**
```javascript
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

// Do same for debug(), warn(), error()
```

---

### Day 4: Denial of Service Protection

#### Fix 4.1: ReDoS in .eleventy.js
**File:** `.eleventy.js`

**Replace `parseAccessionDate` (line 109):**
```javascript
function parseAccessionDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;

    // Limit length to prevent DoS
    const cleaned = dateStr.trim().slice(0, 50);

    // Only allow safe characters
    if (!/^[0-9\-\/\s,A-Za-z]+$/.test(cleaned)) {
        console.warn(`Invalid date characters: ${cleaned}`);
        return null;
    }

    // Handle YYYY-MM-DD format (most secure)
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
        const [year, month, day] = cleaned.split('-').map(Number);

        // Validate ranges
        if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
            console.warn(`Date out of range: ${cleaned}`);
            return null;
        }

        return new Date(cleaned);
    }

    // Handle year only
    if (/^(19|20)\d{2}$/.test(cleaned)) {
        const year = parseInt(cleaned);
        if (year >= 1900 && year <= 2100) {
            return new Date(`${cleaned}-01-01`);
        }
    }

    // Handle named month formats
    if (/^[A-Za-z]+ \d{1,2}, \d{4}$/.test(cleaned) || /^[A-Za-z]+ \d{4}$/.test(cleaned)) {
        try {
            const parsed = new Date(cleaned);
            const year = parsed.getFullYear();

            if (!isNaN(parsed.getTime()) && year >= 1900 && year <= 2100) {
                return parsed;
            }
        } catch (e) {
            console.warn(`Failed to parse date: ${cleaned}`);
        }
    }

    return null;
}
```

**Test:**
```javascript
// test/security/test-redos.js
const parseAccessionDate = require('../../.eleventy.js').parseAccessionDate;

describe('ReDoS Protection', () => {
    it('should handle excessively long strings', () => {
        const longString = '9'.repeat(100000);
        const start = Date.now();
        const result = parseAccessionDate(longString);
        const duration = Date.now() - start;

        assert.equal(result, null);
        assert(duration < 100, `Took ${duration}ms - should be <100ms`);
    });

    it('should reject malicious patterns', () => {
        const malicious = 'a'.repeat(1000) + '!';
        assert.equal(parseAccessionDate(malicious), null);
    });

    it('should parse valid dates quickly', () => {
        const start = Date.now();
        const result = parseAccessionDate('2025-01-15');
        const duration = Date.now() - start;

        assert(result instanceof Date);
        assert(duration < 10, `Took ${duration}ms`);
    });
});
```

---

#### Fix 4.2: Request Timeout
**File:** `scripts/utils/book-api-client.js`

**Update `_httpRequest` (line 285):**
```javascript
_httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const timeout = options.timeout || this.config.request.timeout;
        let timeoutHandle;
        let readTimeoutHandle;

        const requestOptions = {
            headers: {
                'User-Agent': options.userAgent || this.config.request.userAgent,
                'Accept': 'application/json'
            }
        };

        const req = https.get(url, requestOptions, (res) => {
            clearTimeout(timeoutHandle);

            let data = '';
            let lastDataTime = Date.now();

            // Monitor for slow reads
            readTimeoutHandle = setInterval(() => {
                if (Date.now() - lastDataTime > 10000) {
                    clearInterval(readTimeoutHandle);
                    req.destroy();
                    reject(new Error('Read timeout - no data received for 10s'));
                }
            }, 1000);

            res.on('data', chunk => {
                data += chunk;
                lastDataTime = Date.now();

                // Prevent memory exhaustion
                if (data.length > 10 * 1024 * 1024) { // 10MB limit
                    clearInterval(readTimeoutHandle);
                    req.destroy();
                    reject(new Error('Response too large'));
                }
            });

            res.on('end', () => {
                clearInterval(readTimeoutHandle);

                if (res.statusCode === 200) {
                    try {
                        const parsed = data.trim() ? JSON.parse(data) : data;
                        resolve(parsed);
                    } catch (e) {
                        resolve(data);
                    }
                } else if (res.statusCode === 429) {
                    reject(new Error('Rate limited (HTTP 429)'));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });

            res.on('error', (err) => {
                clearInterval(readTimeoutHandle);
                reject(err);
            });
        });

        // Connection timeout
        timeoutHandle = setTimeout(() => {
            req.destroy();
            reject(new Error('Connection timeout'));
        }, timeout);

        req.on('error', reject);
    });
}
```

---

### Day 5: Testing & Commit

**Run all tests:**
```bash
npm test

# Run specific security tests
npm test -- test/security/

# Check coverage
npm run test:coverage
```

**Commit fixes:**
```bash
git add scripts/utils/csv-handler.js
git add scripts/utils/book-api-client.js
git add scripts/utils/image-core.js
git add scripts/utils/logger.js
git add .eleventy.js
git add test/security/

git commit -m "Security: Fix critical vulnerabilities (P0)

- Fix path traversal in CSV backup creation
- Add SSRF protection to API client
- Prevent CSV formula injection
- Add log injection protection
- Fix ReDoS in date parsing
- Implement request timeouts

Security issues resolved:
- C1.1: Path Traversal
- C2.1: SSRF
- C1.3: CSV Injection
- C4.1: Log Injection
- C5.1: ReDoS
- C2.2: Request Timeout

All fixes include test coverage."

git push origin security/path-traversal-fix
```

**Create PR:**
```bash
# On GitHub, create PR with checklist:
```

**PR Template:**
```markdown
## Security Fixes - Critical (P0)

### Changes
- [x] Path traversal protection in csv-handler.js
- [x] SSRF protection in book-api-client.js
- [x] CSV injection prevention
- [x] Log injection sanitization
- [x] ReDoS protection in date parsing
- [x] Request timeout enforcement

### Testing
- [x] All existing tests pass
- [x] New security tests added (7 tests)
- [x] Manual testing completed
- [ ] Security review by @security-team

### Deployment Notes
- No breaking changes
- No database migrations required
- Update .env with LIBRARY_THING_API_KEY

### Risk Assessment
- **Before:** 7 critical vulnerabilities
- **After:** 0 critical vulnerabilities
- **Residual Risk:** Medium (18 warnings remain)

/cc @security-team @engineering-lead
```

---

## WEEK 2: WARNING FIXES (P1)

### Fix Package Dependencies

**Update package.json:**
```json
{
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0",
    "@11ty/eleventy-img": "^6.0.4",
    "autoprefixer": "^10.4.21",
    "axios": "^1.7.9",  // FIXED: was 1.9.0
    "csv-parse": "^5.6.0",
    "csv-stringify": "^6.4.5",
    "dotenv": "^17.2.0",
    "eleventy-plugin-tailwindcss": "^0.3.0",
    "glob": "^11.0.3",
    "mocha": "^11.7.5",
    "nyc": "^17.1.0",
    "postcss": "^8.5.6",
    "slugify": "^1.6.6",
    "tailwindcss": "^3.4.18",
    "validator": "^13.12.0"  // NEW: Input validation
  },
  "dependencies": {
    "better-sqlite3": "^12.4.1",
    "cheerio": "^1.1.2",
    "csv-parser": "^3.2.0",
    "async-lock": "^1.4.1"  // NEW: Race condition protection
  }
}
```

```bash
npm install
npm audit fix
npm audit
```

---

### Fix ISBN Validation

**File:** `scripts/utils/csv-handler.js`

**Add proper ISBN validation (line 369):**
```javascript
/**
 * Validate ISBN-10 or ISBN-13 with checksum
 * @param {string} isbn - ISBN string
 * @returns {boolean} True if valid
 */
static validateISBN(isbn) {
    const cleaned = isbn.replace(/[-\s]/g, '');

    if (cleaned.length === 10) {
        // ISBN-10 checksum
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            if (!/\d/.test(cleaned[i])) return false;
            sum += parseInt(cleaned[i]) * (10 - i);
        }
        const check = cleaned[9] === 'X' ? 10 : parseInt(cleaned[9]);
        return (sum + check) % 11 === 0;
    } else if (cleaned.length === 13) {
        // ISBN-13 checksum
        if (!/^\d{13}$/.test(cleaned)) return false;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cleaned[i]) * (i % 2 === 0 ? 1 : 3);
        }
        const check = (10 - (sum % 10)) % 10;
        return check === parseInt(cleaned[12]);
    }

    return false;
}
```

**Update validation in `validateAndCleanRecord`:**
```javascript
// Validate ISBN format (line 369)
if (result.record.isbn_asin && result.record.isbn_asin.trim()) {
    const isbn = result.record.isbn_asin.trim();

    // Allow ASIN format (10 alphanumeric)
    const isASIN = /^[A-Z0-9]{10}$/.test(isbn);

    if (!isASIN && !this.validateISBN(isbn)) {
        result.warnings.push(`Invalid ISBN format or checksum: ${isbn}`);
    }
}
```

---

### Fix Race Condition

**File:** `scripts/utils/csv-handler.js`

**Update stream method (line 201):**
```javascript
static async stream(filePath, processRow, options = {}) {
    const defaultOptions = {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        ...options
    };

    return new Promise((resolve, reject) => {
        let rowCount = 0;
        let pendingOperations = 0;
        let streamEnded = false;
        const parser = parse(defaultOptions);
        const stream = fs.createReadStream(filePath);

        const checkComplete = () => {
            if (streamEnded && pendingOperations === 0) {
                resolve(rowCount);
            }
        };

        parser.on('data', async (record) => {
            rowCount++;
            pendingOperations++;
            parser.pause();

            try {
                await processRow(record, rowCount);
            } catch (error) {
                stream.destroy();
                parser.destroy();
                reject(error);
                return;
            } finally {
                // FIXED: Always decrement, even on error
                pendingOperations--;
                parser.resume();
                checkComplete();
            }
        });

        parser.on('end', () => {
            streamEnded = true;
            checkComplete();
        });

        parser.on('error', reject);
        stream.on('error', reject);

        stream.pipe(parser);
    });
}
```

---

### Validate API Keys

**File:** `scripts/utils/book-api-client.js`

**Update LibraryThing search (line 545):**
```javascript
async searchLibraryThing(book) {
    if (!book.isbn || !book.isbn.match(/^\d{10,13}$/)) {
        return { found: false, source: 'LibraryThing', reason: 'No valid ISBN provided' };
    }

    const cacheKey = `librarything_${book.isbn}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
        this.stats.cacheHits++;
        return cached;
    }

    try {
        // Get API key from environment
        const apiKey = process.env.LIBRARY_THING_API_KEY;

        if (!apiKey || apiKey === 'devkey') {
            throw new Error(
                'LIBRARY_THING_API_KEY environment variable required. ' +
                'Get your key at https://www.librarything.com/services/keys.php'
            );
        }

        const coverUrl = this.config.apis.libraryThing
            .replace('devkey', apiKey)
            .replace('{isbn}', book.isbn);

        // ... rest of method
    }
}
```

**Add to .env.example:**
```bash
# Create .env.example
cat > .env.example << 'EOF'
# LibraryThing API Key
# Get your key at: https://www.librarything.com/services/keys.php
LIBRARY_THING_API_KEY=your_key_here

# Optional: Set log level
LOG_LEVEL=info

# Optional: Disable colors in logs
LOG_COLORS=true
EOF
```

---

### Add Cache Sanitization

**File:** `scripts/utils/book-api-client.js`

**Update APICache class (line 159):**
```javascript
set(key, data) {
    if (!this.enabled) return;

    // Sanitize key
    const safeKey = String(key)
        .replace(/[^a-zA-Z0-9:_-]/g, '_')
        .slice(0, 200);

    // Validate data
    if (data === null || data === undefined) {
        console.warn('Attempted to cache null/undefined value');
        return;
    }

    // Prevent cache size explosion
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 100000) {  // 100KB limit per entry
        console.warn(`Cache entry too large: ${dataSize} bytes`);
        return;
    }

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxEntries) {
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
    }

    this.cache.set(safeKey, {
        data,
        timestamp: Date.now(),
        size: dataSize
    });
}
```

---

## DEPLOYMENT CHECKLIST

### Pre-Deploy
- [ ] All tests passing
- [ ] No npm audit vulnerabilities
- [ ] .env configured with LIBRARY_THING_API_KEY
- [ ] Backup production database
- [ ] Review all changes in staging

### Deploy
```bash
# Pull latest
git pull origin main

# Install dependencies
npm ci --production

# Run migrations (if any)
# npm run migrate

# Restart services
pm2 restart all

# Or if using systemd:
# sudo systemctl restart hudson-street-library
```

### Post-Deploy
- [ ] Check application logs
- [ ] Verify CSV operations work
- [ ] Test API integrations
- [ ] Monitor error rates
- [ ] Check security metrics

---

## MONITORING SETUP

### Add to Application

**Create `scripts/utils/security-monitor.js`:**
```javascript
class SecurityMonitor {
    constructor() {
        this.metrics = {
            pathTraversalAttempts: 0,
            invalidURLs: 0,
            logInjections: 0,
            rateLimitViolations: 0,
            lastReset: Date.now()
        };
    }

    recordPathTraversal(path) {
        this.metrics.pathTraversalAttempts++;
        console.error(`SECURITY: Path traversal attempt: ${path}`);
        // Send to monitoring service
    }

    recordInvalidURL(url) {
        this.metrics.invalidURLs++;
        console.warn(`SECURITY: Invalid URL rejected: ${url}`);
    }

    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.lastReset
        };
    }

    reset() {
        this.metrics = {
            pathTraversalAttempts: 0,
            invalidURLs: 0,
            logInjections: 0,
            rateLimitViolations: 0,
            lastReset: Date.now()
        };
    }
}

module.exports = new SecurityMonitor();
```

**Update csv-handler.js to use monitor:**
```javascript
const securityMonitor = require('./security-monitor');

static createBackup(filePath) {
    const resolvedPath = path.resolve(filePath);
    const baseDir = path.resolve(__dirname, '../../src/_data');

    if (!resolvedPath.startsWith(baseDir)) {
        securityMonitor.recordPathTraversal(filePath);
        throw new Error('Invalid file path outside allowed directory');
    }
    // ... rest
}
```

---

## SUCCESS CRITERIA

### Week 1 Complete
- [ ] All 7 critical vulnerabilities fixed
- [ ] 7 new security tests passing
- [ ] No regression in existing tests
- [ ] Code review approved
- [ ] Deployed to staging

### Week 2 Complete
- [ ] Package dependencies updated
- [ ] API key validation implemented
- [ ] Race conditions resolved
- [ ] Monitoring in place
- [ ] Deployed to production

### Final State
- [ ] 0 critical vulnerabilities
- [ ] 0 high vulnerabilities
- [ ] npm audit shows 0 issues
- [ ] Test coverage >85% on security code
- [ ] Security runbook created
- [ ] Team trained on secure coding practices

---

## GETTING HELP

If you encounter issues during implementation:

1. **Check the full audit report:** `SECURITY_AUDIT_REPORT.md`
2. **Run the test suite:** `npm test`
3. **Check logs:** `tail -f logs/error-*.log`
4. **Review git diff:** `git diff main`
5. **Ask for help:** Open an issue with:
   - What you tried
   - Error message
   - Relevant code snippet

---

**Document Version:** 1.0
**Last Updated:** February 22, 2026
**Next Review:** March 22, 2026
