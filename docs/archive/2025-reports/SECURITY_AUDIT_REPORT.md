# Security Audit Report: generate-prince-collection.js

**Audit Date:** November 11, 2025
**Auditor:** Security Specialist
**Target Files:**
- `/Users/m/Projects/Hudson_Street_Library/generate-prince-collection.js`
- `/Users/m/Projects/Hudson_Street_Library/src/collections/richard-prince.html` (generated)

## Executive Summary

The security audit identified several critical vulnerabilities in the `generate-prince-collection.js` script that could lead to Cross-Site Scripting (XSS) attacks, path traversal exploits, and HTML injection. The script processes untrusted HTML content without proper sanitization before injecting it into a new HTML page.

**Overall Risk Level:** **HIGH** 🔴

## Critical Vulnerabilities Found

### 1. Cross-Site Scripting (XSS) - CRITICAL
**OWASP Top 10:** A03:2021 - Injection
**CWE:** CWE-79 (Improper Neutralization of Input During Web Page Generation)

#### Vulnerable Code Locations:

**Lines 23-24, 28-29, 31-32, 49-50:** Direct HTML content extraction without sanitization
```javascript
// Extract title - NO SANITIZATION
const titleMatch = html.match(/<h1[^>]*class="book-title[^"]*"[^>]*>(.*?)<\/h1>/s);
let title = titleMatch ? titleMatch[1].trim() : '';

// Extract publisher - ONLY STRIPS HTML TAGS, NO XSS PROTECTION
const publisher = publisherMatch ? publisherMatch[1].replace(/<[^>]+>/g, '').trim() : 'Publisher unknown';
```

**Lines 151-168:** Unsanitized data injection into HTML template
```javascript
${princeBooks.map(book => `
    <h3 class="text-base font-semibold text-gray-800 truncate group-hover:text-teal-600 transition-colors">
        ${book.title}  <!-- XSS VULNERABILITY -->
    </h3>
    <p class="text-sm text-gray-500 mt-1 truncate">${book.publisher}${book.year ? ' • ' + book.year : ''}</p>
`).join('\n')}
```

#### Attack Vector Example:
If a source HTML file contains:
```html
<h1 class="book-title"><script>alert('XSS')</script>Malicious Title</h1>
```
This script tag would be directly injected into the generated collection page.

### 2. Path Traversal Risk - MEDIUM
**OWASP Top 10:** A01:2021 - Broken Access Control
**CWE:** CWE-22 (Path Traversal)

**Lines 9-11:** No validation of directory names
```javascript
const allDirs = fs.readdirSync(booksDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('prince_'))
  .map(dirent => dirent.name);
```

**Line 17:** Unvalidated path construction
```javascript
const htmlPath = path.join(booksDir, dirName, 'index.html');
```

While `path.join()` provides some protection, there's no explicit validation that `dirName` doesn't contain path traversal sequences.

### 3. HTML Injection - HIGH
**CWE:** CWE-80 (Improper Neutralization of Script-Related HTML Tags)

**Lines 156, 162-163:** Alt text and image src attributes not escaped
```javascript
<img src="${book.coverImage}"
     alt="${book.title}"  <!-- UNESCAPED ATTRIBUTE -->
     class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105">
```

Malicious titles containing quotes could break out of attributes:
```javascript
title: 'Book" onload="alert(1)" data-foo="'
```

### 4. Missing Content Security Policy - MEDIUM
**OWASP Top 10:** A05:2021 - Security Misconfiguration

The generated HTML page loads external resources without CSP headers:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
```

No CSP meta tag or headers are configured to restrict script execution or resource loading.

## Security Recommendations

### Immediate Actions Required

#### 1. Implement HTML Sanitization
```javascript
// Add at the top of the file
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// Apply to all extracted values
title = escapeHtml(titleMatch ? titleMatch[1].trim() : '');
publisher = escapeHtml(publisherMatch ? publisherMatch[1].replace(/<[^>]+>/g, '').trim() : 'Publisher unknown');
description = escapeHtml(descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : 'Published date unknown');
```

#### 2. Validate File Paths
```javascript
// Add path validation
function isValidDirectoryName(dirName) {
    // Only allow alphanumeric, underscore, and hyphen
    return /^[a-zA-Z0-9_-]+$/.test(dirName) && !dirName.includes('..');
}

allDirs.forEach(dirName => {
    if (!isValidDirectoryName(dirName)) {
        console.error(`Invalid directory name: ${dirName}`);
        return; // Skip this directory
    }
    // ... rest of processing
});
```

#### 3. Add Content Security Policy
Add to the generated HTML head section:
```html
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com;
    font-src 'self' https://cdnjs.cloudflare.com;
    img-src 'self' data:;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
">
```

#### 4. Use DOMPurify for Complex HTML
For more complex HTML sanitization needs:
```javascript
const DOMPurify = require('isomorphic-dompurify');

// Sanitize HTML content
const cleanTitle = DOMPurify.sanitize(titleMatch[1], {
    ALLOWED_TAGS: [],  // Strip all HTML tags
    KEEP_CONTENT: true
});
```

### Additional Security Enhancements

#### 1. Input Validation
```javascript
// Validate year
const yearMatch = html.match(/<span[^>]*class="field-label"[^>]*>Published<\/span>\s*<span[^>]*class="field-value"[^>]*>(\d{4})/);
const year = yearMatch ? yearMatch[1] : '';
if (year && (parseInt(year) < 1900 || parseInt(year) > new Date().getFullYear() + 1)) {
    console.warn(`Invalid year detected: ${year}`);
    year = '';
}
```

#### 2. Secure File Operations
```javascript
// Use try-catch for all file operations
try {
    const html = fs.readFileSync(htmlPath, 'utf8');
    // Validate that content is actually HTML
    if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
        console.error(`File ${htmlPath} doesn't appear to be valid HTML`);
        return;
    }
} catch (err) {
    console.error(`Error reading file ${htmlPath}:`, err.message);
    return;
}
```

#### 3. Add Security Headers Configuration
Create a `_headers` file for deployment:
```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Vulnerability Severity Matrix

| Vulnerability | Severity | CVSS Score | Exploitability | Impact |
|--------------|----------|------------|----------------|--------|
| XSS in Title/Publisher | CRITICAL | 8.8 | High | High |
| HTML Attribute Injection | HIGH | 7.5 | Medium | High |
| Path Traversal | MEDIUM | 5.3 | Low | Medium |
| Missing CSP | MEDIUM | 4.3 | Low | Medium |
| Unvalidated Input | MEDIUM | 5.0 | Medium | Low |

## Testing Recommendations

### 1. XSS Test Cases
```javascript
// Test these malicious inputs
const testCases = [
    '<script>alert("XSS")</script>',
    '"><script>alert("XSS")</script>',
    'javascript:alert(1)',
    '<img src=x onerror="alert(1)">',
    '${alert(1)}',
    '{{7*7}}'
];
```

### 2. Security Testing Tools
- Run OWASP ZAP or Burp Suite against generated pages
- Use `npm audit` to check dependencies
- Implement Content Security Policy reporting

## Compliance Considerations

### OWASP Top 10 2021 Coverage
- ✅ A01: Broken Access Control - Path validation needed
- ✅ A03: Injection - XSS vulnerabilities present
- ✅ A05: Security Misconfiguration - Missing security headers
- ✅ A06: Vulnerable Components - Check npm dependencies
- ✅ A09: Security Logging - Add security event logging

### Security Standards
- Add Subresource Integrity (SRI) for CDN resources
- Implement proper error handling without information disclosure
- Add rate limiting for generation script execution

## Conclusion

The current implementation has critical security vulnerabilities that must be addressed before production deployment. The primary concern is the lack of input sanitization leading to XSS vulnerabilities. All user-controlled data must be properly escaped before being inserted into HTML contexts.

## Priority Action Items

1. **IMMEDIATE:** Add HTML escaping to all dynamic content (Lines 23-24, 28-29, 49-50, 151-168)
2. **HIGH:** Implement path validation for directory names
3. **HIGH:** Add Content Security Policy meta tag
4. **MEDIUM:** Add security headers for production deployment
5. **MEDIUM:** Implement comprehensive input validation
6. **LOW:** Add security logging and monitoring

## References

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [CWE-79: Cross-site Scripting](https://cwe.mitre.org/data/definitions/79.html)