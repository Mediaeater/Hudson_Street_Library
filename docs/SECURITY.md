# Security Documentation

> **Hudson Street Library - Security Policy and Best Practices**
> Last Updated: October 19, 2025
> Status: Active

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Security Model](#security-model)
3. [Authentication & Authorization](#authentication--authorization)
4. [API Security](#api-security)
5. [Data Protection](#data-protection)
6. [Input Validation & Sanitization](#input-validation--sanitization)
7. [XSS Prevention](#xss-prevention)
8. [Database Security](#database-security)
9. [File Upload Security](#file-upload-security)
10. [Dependency Security](#dependency-security)
11. [GitHub Pages & Static Site Security](#github-pages--static-site-security)
12. [Environment Variables & Secrets](#environment-variables--secrets)
13. [Security Best Practices](#security-best-practices)
14. [Security Checklist](#security-checklist)
15. [Reporting Security Issues](#reporting-security-issues)

---

## Security Overview

Hudson Street Library is a **static site** built with Eleventy and deployed to GitHub Pages. This architecture provides inherent security advantages but also has unique considerations.

### Current Security Posture

- **Static Site Generation**: No server-side code execution at runtime
- **Read-Only Deployment**: GitHub Pages serves static files only
- **No User Authentication**: Currently a public catalog (no login system)
- **Build-Time Processing**: All data processing happens during build
- **External API Integration**: Uses Google Books API and Open Library
- **Plain-Text Data Store**: `src/_data/books.csv` plus a handful of JSON files; no runtime database

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal permissions for all operations
3. **Secure by Default**: Safe defaults in all configurations
4. **Input Validation**: Validate and sanitize all external data
5. **Transparency**: Clear security documentation and practices

---

## Security Model

### Static Site Security Model

As a static site deployed to GitHub Pages, the security model is fundamentally different from traditional web applications:

**What We DON'T Need to Secure:**
- Server-side authentication/authorization (no server)
- Database connections at runtime (database used only at build time)
- API endpoints (no backend API serving users)
- User sessions (no user login)

**What We DO Need to Secure:**
- Build-time processes (Eleventy build, database operations)
- API keys for external services (Google Books, Open Library)
- Data integrity during CSV/database imports
- XSS prevention in templates
- Supply chain security (npm dependencies)
- Admin interface (if/when implemented)

### Threat Model

**Primary Threats:**
1. **Compromised API Keys**: Leaked keys in repository or logs
2. **XSS via User-Generated Content**: Malicious content in book descriptions
3. **Dependency Vulnerabilities**: Vulnerable npm packages
4. **Build Process Compromise**: Malicious code injected during build
5. **Data Integrity**: Corrupted or malicious CSV imports

**Secondary Threats:**
1. File upload vulnerabilities (admin interface)
2. GitHub Actions secret exposure
3. Misconfigured CORS (if API added later)

---

## Authentication & Authorization

### Current State: No Authentication

The site is currently **fully public** with no user authentication system.

**Public Features:**
- Browse book catalog
- View book details
- Search functionality
- Filter by tags/categories

### Future Considerations: Admin Interface

The `src/admin/` directory contains HTML for a future admin interface. When implementing:

**Required Security Controls:**

1. **Authentication Layer**
   ```javascript
   // Example: Add authentication middleware
   // DO NOT implement without proper security review

   // Option 1: GitHub OAuth (recommended for GitHub Pages)
   // Option 2: Netlify Identity (if migrating to Netlify)
   // Option 3: Auth0 or similar service
   ```

2. **Authorization Checks**
   - Role-based access control (RBAC)
   - Separate roles: viewer, editor, admin
   - Audit logging for all admin actions

3. **Session Management**
   - Secure session tokens
   - HTTPOnly cookies
   - CSRF protection

4. **Rate Limiting**
   - Prevent brute force attacks
   - API rate limits

**⚠️ IMPORTANT**: The admin interface at `src/admin/` is currently **EXCLUDED** from builds via `.eleventy.js` configuration:

```javascript
// Line 125 in .eleventy.js
eleventyConfig.ignores.add("src/admin/**");
```

This is a security measure. Do not enable admin routes without implementing authentication.

---

## API Security

### External API Integration

The project integrates with external APIs for book data and cover images.

#### Supported APIs

1. **Google Books API** (Primary)
   - API Key required
   - Rate limits: 1,000 requests/day (free tier)
   - Documentation: https://developers.google.com/books/docs/v1/using

2. **Open Library** (Secondary)
   - No API key required
   - Rate limits: 100 requests/minute
   - Documentation: https://openlibrary.org/developers/api

3. **DPLA** (Optional)
   - API Key required (free)
   - Documentation: https://dp.la/developers

4. **Europeana** (Optional)
   - API Key required (free)
   - Documentation: https://pro.europeana.eu/page/apis

#### API Key Management

**✅ DO:**
- Store API keys in `.env` file (never commit)
- Use `.env.example` for template
- Rotate keys periodically
- Use separate keys for dev/prod if possible
- Monitor API usage dashboards

**❌ DON'T:**
- Commit API keys to repository
- Log API keys in console/logs
- Share keys via email/Slack
- Use production keys in development
- Hardcode keys in source files

#### API Request Security

```javascript
// Example: Secure API request with caching
const axios = require('axios');

async function fetchBookData(isbn) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_BOOKS_API_KEY not configured');
  }

  try {
    // Check cache first (database-based caching)
    const cached = database.getCachedApiResponse(`google-books-${isbn}`);
    if (cached) return cached;

    // Make request with timeout
    const response = await axios.get(
      `https://www.googleapis.com/books/v1/volumes`,
      {
        params: { q: `isbn:${isbn}`, key: apiKey },
        timeout: 10000, // 10 second timeout
        validateStatus: status => status < 500 // Don't throw on 4xx
      }
    );

    // Cache successful responses
    if (response.status === 200) {
      database.cacheApiResponse(
        `google-books-${isbn}`,
        'google_books',
        'isbn',
        isbn,
        response.data,
        200,
        24 // expires in 24 hours
      );
    }

    return response.data;
  } catch (error) {
    console.error('API request failed:', error.message);
    // Don't expose API key in error messages
    throw new Error('Failed to fetch book data');
  }
}
```

#### Rate Limiting

Implement rate limiting to avoid API quota exhaustion:

```javascript
// Example: Simple rate limiter
class RateLimiter {
  constructor(maxRequests, perMilliseconds) {
    this.maxRequests = maxRequests;
    this.perMilliseconds = perMilliseconds;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(
      time => now - time < this.perMilliseconds
    );

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.perMilliseconds - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.requests.push(Date.now());
  }
}

// Google Books: 1000 requests/day = ~0.7 requests/minute
const googleBooksLimiter = new RateLimiter(1, 90000); // 1 request per 90 seconds
```

---

## Data Protection

### CSV Data Handling

The project uses CSV files for data import and export. This introduces security considerations.

#### CSV Security Best Practices

**1. Input Validation**

```javascript
// Located in: scripts/utils/csv-handler.js
class CSVHandler {
  static validateAndCleanRecord(record, rowIndex) {
    const warnings = [];
    let corrected = false;

    // Validate required fields
    if (!record.title && !record.isbn_asin) {
      throw new Error('Either title or ISBN is required');
    }

    // Sanitize dangerous characters
    const cleaned = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        // Remove potential CSV injection patterns
        cleaned[key] = value
          .replace(/^[=+\-@]/, '') // Remove formula prefixes
          .trim();

        if (cleaned[key] !== value) {
          warnings.push(`Sanitized field: ${key}`);
          corrected = true;
        }
      } else {
        cleaned[key] = value;
      }
    }

    return { record: cleaned, corrected, warnings };
  }
}
```

**2. CSV Injection Prevention**

CSV injection occurs when spreadsheet applications interpret cell values as formulas:

```csv
# DANGEROUS - DO NOT ALLOW
Title,Description
"My Book","=2+2"
"Another Book","@SUM(A1:A10)"
"+cmd|'/c calc'!A1","Malicious"
```

**Protection implemented in CSVHandler:**
- Strip leading `=`, `+`, `-`, `@` characters
- Validate all fields before processing
- Log all sanitization actions

**3. File Upload Validation**

When accepting CSV uploads (admin interface):

```javascript
// Example: CSV upload validation
function validateCSVUpload(file) {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedMimeTypes = ['text/csv', 'text/plain'];

  // Check file size
  if (file.size > maxSize) {
    throw new Error('File too large (max 10MB)');
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error('Invalid file type (CSV only)');
  }

  // Check file extension
  if (!file.name.endsWith('.csv')) {
    throw new Error('File must have .csv extension');
  }

  return true;
}
```

### Data Store Security

The project has no runtime database. Authoritative data is `src/_data/books.csv`
plus a small set of JSON files; the build reads these and emits static HTML.

CSV write paths (`npm run add`, manual edits) go through
`scripts/utils/csv-handler.js`, which trims, normalizes, and validates fields
before persisting. Backups are written under `src/_data/books_backup_<timestamp>.csv`
on every write. See `docs/BACKUP-SYSTEM.md` for the rolling-backup policy.

There is no SQL surface area on disk or in production. A local-only Datasette
catalog (SQLite, derivative from the CSV) is supported for ad-hoc analysis;
see `docs/DATASETTE-CATALOG-GUIDE.md`. That catalog is not deployed.

---

## Input Validation & Sanitization

### Validation Layers

Input validation occurs at multiple layers:

1. **Client-Side Validation** (UX only, not security)
2. **CSV Import Validation** (CSVHandler)
3. **Database Layer Validation** (LibraryDatabase)
4. **Template Output Sanitization** (Nunjucks escape filter)

### CSVHandler Validation

```javascript
// scripts/utils/csv-handler.js
static validateAndCleanRecord(record, rowIndex) {
  // 1. Required field validation
  // 2. Type validation
  // 3. Format validation
  // 4. Sanitization
  // 5. Warning collection
}
```

### CSV Write Validation

`scripts/utils/csv-handler.js` validates and normalizes every row appended
to `src/_data/books.csv` (via `npm run add` or any script that uses the
handler):

```javascript
// scripts/utils/csv-handler.js
appendBook(bookData) {
  // Basic validation
  if (!bookData.title && !bookData.isbn_asin) {
    return { success: false, error: 'Either title or ISBN is required' };
  }

  // Type coercion with null handling
  const year   = bookData.publication_year ? Number(bookData.publication_year) : null;
  const height = bookData.height_cm        ? Number(bookData.height_cm)        : null;

  // Boolean normalization
  const signed = bookData.is_signed_inscribed ? 'true' : 'false';
}
```

`npm run test:csv` (entry: `scripts/validate-csv-robust.js`) runs the full
validation suite over `books.csv` before each `npm test` invocation and in CI.

### Data Type Validation

```javascript
// Example: Comprehensive validation function
function validateBookData(data) {
  const errors = [];

  // Required fields
  if (!data.title && !data.isbn_asin) {
    errors.push('Title or ISBN required');
  }

  // String length limits
  if (data.title && data.title.length > 500) {
    errors.push('Title too long (max 500 characters)');
  }

  // Numeric ranges
  if (data.publication_year) {
    const year = Number(data.publication_year);
    if (isNaN(year) || year < 1800 || year > 2030) {
      errors.push('Invalid publication year (1800-2030)');
    }
  }

  // URL validation
  if (data.image_url) {
    try {
      new URL(data.image_url);
    } catch {
      errors.push('Invalid image URL');
    }
  }

  // ISBN format validation
  if (data.isbn_asin) {
    const isbn = data.isbn_asin.replace(/[-\s]/g, '');
    if (!/^(\d{10}|\d{13})$/.test(isbn)) {
      errors.push('Invalid ISBN format (must be 10 or 13 digits)');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

## XSS Prevention

Cross-Site Scripting (XSS) is a critical concern when displaying user-generated content.

### Nunjucks Template Security

Nunjucks provides **automatic HTML escaping by default**, but the `| safe` filter disables it.

#### Current Implementation

**✅ SAFE: Using escape filter**

```njk
{# src/_includes/components/book-thumbnail.njk #}
<h3>{{ bookTitle | escape }}</h3>
<p>{{ bookAuthor | escape }}</p>
<img alt="Cover of {{ bookTitle | escape }}" />
```

**⚠️ REQUIRES REVIEW: Using safe filter**

```njk
{# src/_includes/layouts/admin.njk:198 #}
{{ content | safe }}

{# src/news.njk:239 #}
const newsData = {{ news | dump | safe }};
```

#### XSS Prevention Rules

**DO:**
1. ✅ Use `| escape` filter for all user input
2. ✅ Validate input before storage
3. ✅ Use Content Security Policy headers
4. ✅ Sanitize HTML if rich text is needed

**DON'T:**
1. ❌ Never use `| safe` on user input
2. ❌ Never trust data from CSV imports
3. ❌ Never insert unescaped data into JavaScript
4. ❌ Never build HTML strings manually

#### Escaping Strategy by Context

```njk
{# 1. HTML Content - Use escape #}
<h1>{{ book.title | escape }}</h1>

{# 2. HTML Attributes - Use escape #}
<div data-title="{{ book.title | escape }}"></div>

{# 3. JavaScript Context - Use JSON encoding #}
<script>
  // ✅ SAFE: JSON-encoded
  const bookData = {{ book | dump | safe }};

  // ❌ UNSAFE: Direct interpolation
  const title = "{{ book.title }}";
</script>

{# 4. URL Context - Use urlencode #}
<a href="/search?q={{ query | urlencode }}">Search</a>

{# 5. CSS Context - Avoid dynamic CSS, use classes #}
```

#### Content Security Policy (CSP)

While GitHub Pages doesn't support custom headers, document the recommended CSP:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://www.googleapis.com https://openlibrary.org;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

**⚠️ Note**: GitHub Pages does not allow custom HTTP headers. CSP would need to be implemented via:
- `<meta>` tag in HTML (limited functionality)
- Custom domain with Cloudflare (recommended for production)
- Migration to Netlify/Vercel (supports custom headers)

#### HTML Sanitization

If you need to allow rich text (HTML) in descriptions:

```javascript
// Use DOMPurify for HTML sanitization
const DOMPurify = require('isomorphic-dompurify');

function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
    ALLOW_DATA_ATTR: false
  });
}

// Usage in Eleventy filter
eleventyConfig.addFilter("sanitizeHTML", sanitizeHTML);
```

```njk
{# Template usage #}
<div class="description">
  {{ book.description | sanitizeHTML | safe }}
</div>
```

---

## File Upload Security

The admin interface includes file upload functionality for book covers.

### Current State

File upload code exists in templates but is not currently functional (admin interface disabled).

**Location:** `src/_includes/components/book-form.njk` (lines 298-335)

### File Upload Security Controls

When implementing file uploads, enforce these controls:

#### 1. File Type Validation

```javascript
function validateFileUpload(file) {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

  // Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only images allowed.');
  }

  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    throw new Error('Invalid file extension.');
  }

  // Verify file signature (magic bytes)
  const fileSignature = file.buffer.slice(0, 4).toString('hex');
  const validSignatures = {
    'ffd8ffe0': 'image/jpeg', // JPEG
    'ffd8ffe1': 'image/jpeg', // JPEG EXIF
    '89504e47': 'image/png',  // PNG
    '47494638': 'image/gif'   // GIF
  };

  if (!validSignatures[fileSignature]) {
    throw new Error('File signature validation failed.');
  }

  return true;
}
```

#### 2. File Size Limits

```javascript
const maxFileSize = 10 * 1024 * 1024; // 10MB

function checkFileSize(file) {
  if (file.size > maxFileSize) {
    throw new Error(`File too large. Maximum size: ${maxFileSize / 1024 / 1024}MB`);
  }
}
```

#### 3. Filename Sanitization

```javascript
const path = require('path');
const crypto = require('crypto');

function sanitizeFilename(originalFilename) {
  // Generate random filename to prevent:
  // - Path traversal attacks
  // - Filename collisions
  // - Information disclosure

  const ext = path.extname(originalFilename).toLowerCase();
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();

  return `${timestamp}-${hash}${ext}`;
}

// Usage
const safeFilename = sanitizeFilename(uploadedFile.originalname);
const uploadPath = path.join(__dirname, 'uploads', safeFilename);
```

#### 4. Storage Location

```javascript
// NEVER store uploads in web-accessible directory during processing
const UPLOAD_DIR = path.join(__dirname, '../../temp-processing');
const PUBLIC_DIR = path.join(__dirname, '../../src/assets/images/covers');

// Process pipeline:
// 1. Upload to temp directory (not web-accessible)
// 2. Validate and process image
// 3. Move to public directory with sanitized name
// 4. Delete temp file
```

#### 5. Image Processing

```javascript
// Use sharp for image processing and validation
const sharp = require('sharp');

async function processUploadedImage(tempPath, outputPath) {
  try {
    const metadata = await sharp(tempPath).metadata();

    // Validate image dimensions
    if (metadata.width > 5000 || metadata.height > 5000) {
      throw new Error('Image dimensions too large');
    }

    // Re-encode image (removes potential exploits in EXIF data)
    await sharp(tempPath)
      .resize(800, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toFile(outputPath);

    // Delete temp file
    fs.unlinkSync(tempPath);

    return true;
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw error;
  }
}
```

#### 6. Complete Upload Example

```javascript
const multer = require('multer');
const path = require('path');

// Configure multer with security controls
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'temp-processing/');
    },
    filename: (req, file, cb) => {
      const safeFilename = sanitizeFilename(file.originalname);
      cb(null, safeFilename);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Only one file per request
  },
  fileFilter: (req, file, cb) => {
    try {
      validateFileUpload(file);
      cb(null, true);
    } catch (error) {
      cb(error, false);
    }
  }
});

// Route handler
app.post('/admin/upload-cover', upload.single('cover_image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const tempPath = req.file.path;
    const outputFilename = sanitizeFilename(req.file.originalname);
    const outputPath = path.join('src/assets/images/covers', outputFilename);

    // Process and validate image
    await processUploadedImage(tempPath, outputPath);

    res.json({
      success: true,
      url: `/assets/images/covers/${outputFilename}`
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});
```

---

## Dependency Security

### npm Audit

Regular security audits of dependencies are critical.

#### Automated Scanning

```bash
# Run npm audit
npm audit

# View detailed report
npm audit --json

# Fix vulnerabilities automatically (test first!)
npm audit fix

# Fix including breaking changes (use with caution)
npm audit fix --force
```

#### GitHub Dependabot

Enable Dependabot for automated dependency updates:

**`.github/dependabot.yml`** (create if doesn't exist):

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "Mediaeater"
    labels:
      - "dependencies"
      - "security"
    commit-message:
      prefix: "chore"
      include: "scope"
```

#### Dependency Review

**Critical Dependencies:**

```json
{
  "dependencies": {
    "better-sqlite3": "^12.4.1"  // Test fixtures only - no production use
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0",     // Build tool - Medium Impact
    "@11ty/eleventy-img": "^6.0.4", // Image processing - Medium Impact
    "axios": "^1.9.0",               // HTTP client - High Impact
    "csv-parse": "^5.6.0",           // CSV parsing - Medium Impact
    "dotenv": "^17.2.0"              // Env vars - Low Impact
  }
}
```

**Review Schedule:**
- **Critical dependencies**: Monthly review
- **All dependencies**: Quarterly review
- **Security advisories**: Immediate review

#### Vulnerability Response Process

1. **Detection**: npm audit, Dependabot alert, or security advisory
2. **Assessment**: Evaluate severity and exploitability
3. **Prioritization**:
   - **Critical**: Fix immediately (within 24 hours)
   - **High**: Fix within 1 week
   - **Medium**: Fix within 1 month
   - **Low**: Fix in next regular update cycle
4. **Testing**: Test fixes in development before deploying
5. **Deployment**: Deploy fix and document in CHANGELOG

#### Package Lock Integrity

```bash
# Verify package-lock.json integrity
npm ci # Uses package-lock.json exactly

# DO NOT use npm install in CI/CD
# npm install updates package-lock.json
```

#### Supply Chain Security

**Best Practices:**
1. ✅ Review dependencies before adding
2. ✅ Check package popularity and maintenance
3. ✅ Use `npm ci` in CI/CD (not `npm install`)
4. ✅ Commit `package-lock.json` to repository
5. ✅ Use `--save-exact` for critical dependencies
6. ❌ Never run `npm install` as root/sudo
7. ❌ Don't trust unknown packages

---

## GitHub Pages & Static Site Security

### GitHub Pages Security Model

GitHub Pages provides a secure hosting environment with limitations:

**Built-in Security Features:**
- ✅ Free HTTPS via Let's Encrypt
- ✅ DDoS protection via GitHub's infrastructure
- ✅ Automatic security headers (some)
- ✅ CDN distribution via GitHub's CDN

**Limitations:**
- ❌ No custom HTTP headers
- ❌ No server-side code execution
- ❌ No .htaccess or server configuration
- ❌ Limited CORS control

### CORS Configuration

GitHub Pages serves static files with permissive CORS by default:

```http
Access-Control-Allow-Origin: *
```

**Implications:**
- Any website can fetch your static JSON data
- Book catalog data is fully public (expected behavior)
- No sensitive data should be exposed

**Mitigation:**
- Don't store sensitive data in static files
- Use authentication for any admin APIs (external service)
- Consider Cloudflare for advanced CORS control

### Custom Domain Security

If using a custom domain:

**DNS Configuration:**
```
# A Records (IP addresses may change, check GitHub docs)
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153

# Or CNAME (preferred)
CNAME -> yourusername.github.io
```

**HTTPS Enforcement:**
1. ✅ Enable "Enforce HTTPS" in repository settings
2. ✅ Wait for HTTPS certificate provisioning (5-10 minutes)
3. ✅ Redirect HTTP to HTTPS automatically (GitHub handles this)

**HSTS (HTTP Strict Transport Security):**

GitHub Pages doesn't send HSTS headers. Workaround:

```html
<!-- In base template -->
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

### Static Site Security Headers

GitHub Pages default headers (as of 2025):

```http
x-github-request-id: [request-id]
content-type: text/html; charset=utf-8
last-modified: [timestamp]
etag: [etag]
access-control-allow-origin: *
x-served-by: cache-[location]
x-cache: HIT
x-cache-hits: 1
```

**Missing security headers** (consider Cloudflare for custom domain):
- `Content-Security-Policy`
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

### Cloudflare Integration (Recommended)

For enhanced security with custom domain:

```javascript
// Cloudflare Workers script for security headers
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const response = await fetch(request)
  const newHeaders = new Headers(response.headers)

  // Security headers
  newHeaders.set('X-Frame-Options', 'DENY')
  newHeaders.set('X-Content-Type-Options', 'nosniff')
  newHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  newHeaders.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  newHeaders.set('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
  )

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  })
}
```

---

## Environment Variables & Secrets

### Environment Variable Management

**Location:** `.env` file (root directory, gitignored)

**Template:** `.env.example` (committed to repository)

#### Current Environment Variables

```bash
# .env.example
GOOGLE_BOOKS_API_KEY=your-google-books-api-key
DPLA_API_KEY=your-dpla-api-key
EUROPEANA_API_KEY=your-europeana-api-key
LIBRARY_THING_API_KEY=your-library-thing-api-key
```

#### Security Rules

**✅ DO:**
1. Use `.env` for all secrets (never commit)
2. Provide `.env.example` template
3. Load environment variables at startup:
   ```javascript
   require('dotenv').config();
   ```
4. Validate required variables:
   ```javascript
   function validateEnv() {
     const required = ['GOOGLE_BOOKS_API_KEY'];
     for (const key of required) {
       if (!process.env[key]) {
         throw new Error(`Missing required environment variable: ${key}`);
       }
     }
   }
   ```
5. Use separate environments for dev/prod

**❌ DON'T:**
1. Never commit `.env` to git
2. Never log environment variables
3. Never expose in client-side code
4. Never share via email/Slack
5. Never hardcode secrets

#### .gitignore Configuration

Current `.gitignore` includes:

```gitignore
# Environment variables (lines 33-38)
.env
.env.local
.env.production.local
.env.development.local
.env.test.local

# Credentials and secrets (lines 40-48)
credentials.json
*credentials*.json
!*credentials.example.json
*secret*
*key*
!*example*key*
*token*
!*example*token*
```

**✅ Comprehensive and secure configuration**

#### GitHub Actions Secrets

For CI/CD, use GitHub Actions secrets (not environment variables):

**Settings → Secrets and variables → Actions**

```yaml
# .github/workflows/build-and-deploy.yml
jobs:
  build:
    steps:
      - name: Build with API keys
        env:
          GOOGLE_BOOKS_API_KEY: ${{ secrets.GOOGLE_BOOKS_API_KEY }}
        run: npm run build
```

**Current status:** GitHub Actions workflow does NOT expose API keys (secure).

#### Secret Rotation

**Rotation Schedule:**
- API keys: Every 6 months (or immediately if compromised)
- Access tokens: Every 3 months
- Passwords: Every 3 months

**Rotation Process:**
1. Generate new API key in provider dashboard
2. Update `.env` file locally
3. Update GitHub Actions secrets
4. Test with new key
5. Revoke old key
6. Document rotation in changelog

---

## Security Best Practices

### General Security Practices

#### 1. Principle of Least Privilege

- Grant minimum permissions necessary
- Use read-only API keys where possible
- Restrict file permissions (600 for secrets)
- Use separate accounts for dev/prod

#### 2. Defense in Depth

- Multiple layers of validation
- Client-side + server-side + database validation
- Input validation + output sanitization
- Authentication + authorization + audit logging

#### 3. Secure Defaults

```javascript
// ✅ GOOD: Secure by default
const options = {
  secure: true,
  httpOnly: true,
  sameSite: 'strict',
  ...userOptions // User can override if needed
};

// ❌ BAD: Insecure by default
const options = {
  secure: userOptions.secure || false,
  httpOnly: userOptions.httpOnly || false
};
```

#### 4. Fail Securely

```javascript
// ✅ GOOD: Fail closed (deny by default)
function checkPermission(user, resource) {
  try {
    return user.permissions.includes(resource);
  } catch (error) {
    console.error('Permission check failed:', error);
    return false; // Deny on error
  }
}

// ❌ BAD: Fail open (allow on error)
function checkPermission(user, resource) {
  try {
    return user.permissions.includes(resource);
  } catch (error) {
    return true; // Dangerous!
  }
}
```

#### 5. Security Logging

```javascript
// Log security-relevant events
const securityLogger = {
  logAuth: (user, action, success) => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'auth',
      user: user.id,
      action,
      success,
      ip: req.ip
    }));
  },

  logAccess: (user, resource) => {
    // Log resource access
  },

  logError: (error, context) => {
    // Log errors (sanitize sensitive data)
    const sanitized = { ...context };
    delete sanitized.password;
    delete sanitized.apiKey;
    console.error(JSON.stringify({ error: error.message, ...sanitized }));
  }
};
```

### Code Security Practices

#### 1. Input Validation Everywhere

```javascript
// Validate all external input
function processBookData(data) {
  // 1. Type validation
  if (typeof data !== 'object') {
    throw new TypeError('Invalid data type');
  }

  // 2. Required fields
  if (!data.title && !data.isbn) {
    throw new Error('Title or ISBN required');
  }

  // 3. Format validation
  if (data.isbn && !isValidISBN(data.isbn)) {
    throw new Error('Invalid ISBN format');
  }

  // 4. Range validation
  if (data.year && (data.year < 1800 || data.year > 2030)) {
    throw new Error('Invalid year');
  }

  return sanitizeBookData(data);
}
```

#### 2. Output Sanitization

```javascript
// Sanitize all output
function renderBookTemplate(book) {
  return `
    <h1>${escapeHTML(book.title)}</h1>
    <p>${escapeHTML(book.description)}</p>
    <img src="${escapeAttribute(book.imageUrl)}" alt="${escapeAttribute(book.title)}">
  `;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

#### 3. Error Handling

```javascript
// Don't expose internal details in errors
try {
  const result = await database.query(userInput);
} catch (error) {
  // ✅ GOOD: Generic error message
  console.error('Database error:', error); // Log full error
  res.status(500).json({ error: 'Database operation failed' }); // Generic message

  // ❌ BAD: Exposes internal details
  res.status(500).json({ error: error.message, stack: error.stack });
}
```

#### 4. Dependency Management

```javascript
// Pin critical dependencies to exact versions
{
  "dependencies": {
    "better-sqlite3": "12.4.1", // Exact version
    "axios": "^1.9.0" // Allow patches
  }
}
```

### Deployment Security

#### 1. Build Process Security

```yaml
# .github/workflows/build-and-deploy.yml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      # Use specific version tags, not 'latest'
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      # Use npm ci instead of npm install (integrity check)
      - run: npm ci

      # Don't expose secrets in logs
      - run: npm run build
        env:
          GOOGLE_BOOKS_API_KEY: ${{ secrets.GOOGLE_BOOKS_API_KEY }}
```

#### 2. Deployment Checklist

Before each deployment:

- [ ] Run security audit: `npm audit`
- [ ] Check for secrets in code: `git secrets --scan`
- [ ] Review changes for security issues
- [ ] Update dependencies if needed
- [ ] Test in staging environment
- [ ] Review deployment logs for errors
- [ ] Verify HTTPS is working
- [ ] Check no sensitive data exposed

---

## Security Checklist

### Pre-Deployment Security Checklist

#### Code Security
- [ ] No hardcoded secrets or API keys
- [ ] All user input validated and sanitized
- [ ] SQL queries use prepared statements
- [ ] XSS protection: escape filters used in templates
- [ ] No `| safe` filter on user-generated content
- [ ] Error messages don't expose internal details
- [ ] Logging doesn't include sensitive data

#### Dependencies
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] All dependencies up to date (or documented exceptions)
- [ ] `package-lock.json` committed to repository
- [ ] Dependabot enabled for automated updates
- [ ] No deprecated packages in use

#### Environment & Configuration
- [ ] `.env` file not committed to git
- [ ] `.gitignore` includes all secret patterns
- [ ] GitHub Actions secrets configured correctly
- [ ] No secrets in repository history
- [ ] API keys have appropriate rate limits

#### Database
- [ ] Database files have restricted permissions (600)
- [ ] Backup system working and tested
- [ ] Foreign key constraints enabled
- [ ] All queries use prepared statements
- [ ] No sensitive data in database (or encrypted)

#### Build & Deployment
- [ ] Build process doesn't expose secrets
- [ ] GitHub Actions uses `npm ci` not `npm install`
- [ ] HTTPS enabled on custom domain (if applicable)
- [ ] Admin interface disabled in production build
- [ ] Deployment logs reviewed for errors

#### File Uploads (if implemented)
- [ ] File type validation (MIME + extension + signature)
- [ ] File size limits enforced
- [ ] Filenames sanitized
- [ ] Images re-encoded to remove exploits
- [ ] Upload directory not web-accessible during processing

### Monthly Security Checklist

- [ ] Review dependency updates from Dependabot
- [ ] Run full `npm audit` and address issues
- [ ] Review GitHub Security Advisories
- [ ] Check for new CVEs affecting stack
- [ ] Review access logs for anomalies (if logging enabled)
- [ ] Verify backups are working
- [ ] Test restore from backup
- [ ] Review and update documentation

### Quarterly Security Checklist

- [ ] Full security audit of codebase
- [ ] Review all API key usage and rotate if needed
- [ ] Update security documentation
- [ ] Review user permissions (if authentication added)
- [ ] Test disaster recovery procedures
- [ ] Review and update security policies
- [ ] Security training for team members
- [ ] Penetration testing (if budget allows)

---

## Reporting Security Issues

### Security Vulnerability Disclosure

If you discover a security vulnerability in Hudson Street Library, please report it responsibly.

#### Reporting Process

**DO NOT** open a public GitHub issue for security vulnerabilities.

**Instead, report privately:**

1. **GitHub Security Advisories** (Recommended)
   - Navigate to: `github.com/Mediaeater/Hudson_Street_Library/security/advisories`
   - Click "Report a vulnerability"
   - Provide detailed information

2. **Email** (Alternative)
   - Send to: [project maintainer email]
   - Subject: "Security Vulnerability Report - Hudson Street Library"
   - Include:
     - Vulnerability description
     - Steps to reproduce
     - Potential impact
     - Suggested fix (if any)

#### What to Include

**Helpful Information:**
- Detailed description of the vulnerability
- Steps to reproduce
- Proof of concept (if applicable)
- Affected versions
- Potential impact assessment
- Suggested remediation (optional)

**Please DON'T:**
- Exploit the vulnerability
- Disclose publicly before fix is available
- Demand compensation (this is a free/open-source project)

#### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Fix Development**: Based on severity
  - Critical: 24-48 hours
  - High: 7 days
  - Medium: 30 days
  - Low: Next release cycle
- **Public Disclosure**: After fix is deployed

#### Security Acknowledgments

We appreciate security researchers who responsibly disclose vulnerabilities. Contributors will be acknowledged in:
- Security advisory
- CHANGELOG.md
- This security documentation (if desired)

---

## Appendix

### Security Resources

#### External Resources

**OWASP (Open Web Application Security Project):**
- OWASP Top 10: https://owasp.org/www-project-top-ten/
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

**Node.js Security:**
- Node.js Security Best Practices: https://nodejs.org/en/docs/guides/security/
- npm Security Advisories: https://www.npmjs.com/advisories

**Static Site Security:**
- GitHub Pages Security: https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https
- Cloudflare Security: https://www.cloudflare.com/learning/security/

#### Internal Documentation

- [Development Workflow](DEVELOPMENT-WORKFLOW.md)
- [Testing Patterns](TESTING-PATTERNS.md)
- [Deployment Guide](DEPLOYMENT.md)

### Security Tools

#### Recommended Tools

```bash
# Security audit
npm audit

# Dependency scanning
npm install -g snyk
snyk test

# Secret detection
npm install -g git-secrets
git secrets --install
git secrets --scan

# Code linting
npm install -g eslint eslint-plugin-security
eslint --plugin security --rule 'security/detect-object-injection: error' .
```

### Security Contacts

**Project Maintainers:**
- GitHub: @Mediaeater
- Repository: https://github.com/Mediaeater/Hudson_Street_Library

**Security Team:**
- (To be established for production deployment)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-19 | Claude Code | Initial comprehensive security documentation |

---

**Last Review:** October 19, 2025
**Next Review:** January 19, 2026 (Quarterly)

---
