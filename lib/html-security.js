/**
 * HTML Security Utilities for Richard Prince Collection Generator
 * Provides comprehensive security functions for HTML generation and content sanitization
 */

const crypto = require('crypto');
const path = require('path');

/**
 * HTML Entity Map for escaping dangerous characters
 */
const HTML_ENTITY_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} str - The string to escape
 * @returns {string} The escaped string safe for HTML output
 * @example
 * escapeHtml('<script>alert("XSS")</script>');
 * // Returns: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;'
 */
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return '';
  }

  return str.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITY_MAP[char]);
}

/**
 * Validates file paths to prevent directory traversal attacks
 * @param {string} filePath - The file path to validate
 * @param {string} baseDir - The base directory that paths must be within
 * @returns {boolean} True if the path is safe, false otherwise
 * @example
 * validatePath('/var/www/images/photo.jpg', '/var/www');  // Returns: true
 * validatePath('/var/www/../etc/passwd', '/var/www');     // Returns: false
 */
function validatePath(filePath, baseDir) {
  if (!filePath || !baseDir) {
    return false;
  }

  try {
    // Resolve both paths to absolute
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(baseDir);

    // Check if resolved path starts with base directory
    // and doesn't contain null bytes
    return resolvedPath.startsWith(resolvedBase) &&
           !filePath.includes('\0') &&
           !filePath.includes('%00');
  } catch (err) {
    // If path resolution fails, consider it unsafe
    return false;
  }
}

/**
 * Sanitizes image URLs to prevent XSS through dangerous protocols
 * @param {string} url - The URL to sanitize
 * @returns {string} The sanitized URL or empty string if dangerous
 * @example
 * sanitizeImageUrl('https://example.com/image.jpg');      // Returns: 'https://example.com/image.jpg'
 * sanitizeImageUrl('javascript:alert("XSS")');            // Returns: ''
 * sanitizeImageUrl('data:text/html,<script>alert(1)</script>'); // Returns: ''
 */
function sanitizeImageUrl(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }

  // Trim and normalize
  url = url.trim();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
    'blob:',
    'chrome:',
    'chrome-extension:',
    'ms-browser-extension:',
    'moz-extension:'
  ];

  const lowerUrl = url.toLowerCase();
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Allow relative URLs and http(s) URLs
  if (url.startsWith('/') ||
      url.startsWith('./') ||
      url.startsWith('../') ||
      url.startsWith('http://') ||
      url.startsWith('https://')) {
    // Additional check for encoded protocols
    const decodedUrl = decodeURIComponent(url);
    if (decodedUrl !== url) {
      // Re-check decoded URL for dangerous protocols
      return sanitizeImageUrl(decodedUrl);
    }
    return url;
  }

  // Block everything else
  return '';
}

/**
 * Validates year values for reasonable ranges
 * @param {number|string} year - The year to validate
 * @param {number} minYear - Minimum allowed year (default: 1900)
 * @param {number} maxYear - Maximum allowed year (default: current year + 1)
 * @returns {boolean} True if the year is valid, false otherwise
 * @example
 * validateYear(2023);        // Returns: true
 * validateYear(1899);        // Returns: false
 * validateYear('2023');      // Returns: true
 * validateYear('not-a-year'); // Returns: false
 */
function validateYear(year, minYear = 1900, maxYear = null) {
  if (maxYear === null) {
    maxYear = new Date().getFullYear() + 1;
  }

  // Convert to number if string
  const yearNum = typeof year === 'string' ? parseInt(year, 10) : year;

  // Check if it's a valid number
  if (isNaN(yearNum) || !Number.isInteger(yearNum)) {
    return false;
  }

  // Check range
  return yearNum >= minYear && yearNum <= maxYear;
}

/**
 * Strips HTML tags while safely handling script and style content
 * @param {string} html - The HTML string to strip
 * @param {Array<string>} allowedTags - Optional array of allowed tag names
 * @returns {string} The text content with HTML stripped
 * @example
 * stripHtml('<p>Hello <script>alert("XSS")</script>World</p>');
 * // Returns: 'Hello World'
 * stripHtml('<p>Keep <b>this</b> bold</p>', ['b', 'strong']);
 * // Returns: 'Keep <b>this</b> bold'
 */
function stripHtml(html, allowedTags = []) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // First, remove script and style tags completely with their content
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // Remove event handlers
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  if (allowedTags.length > 0) {
    // Create regex for allowed tags
    const allowedTagsRegex = new RegExp(
      `<(?!\/?(?:${allowedTags.join('|')})\\b)[^>]+>`,
      'gi'
    );
    cleaned = cleaned.replace(allowedTagsRegex, '');
  } else {
    // Remove all HTML tags
    cleaned = cleaned.replace(/<[^>]*>/g, '');
  }

  // Clean up whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Generates Content Security Policy meta tag
 * @param {Object} policies - CSP policies configuration
 * @returns {string} HTML meta tag for CSP
 * @example
 * generateCSP({
 *   'default-src': ["'self'"],
 *   'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
 *   'style-src': ["'self'", "'unsafe-inline'"],
 *   'img-src': ["'self'", 'data:', 'https:'],
 *   'font-src': ["'self'", 'data:'],
 *   'connect-src': ["'self'"],
 *   'frame-ancestors': ["'none'"],
 *   'base-uri': ["'self'"],
 *   'form-action': ["'self'"]
 * });
 */
function generateCSP(policies = {}) {
  const defaultPolicies = {
    'default-src': ["'self'"],
    'script-src': ["'self'"],
    'style-src': ["'self'"],
    'img-src': ["'self'", 'https:', 'data:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'upgrade-insecure-requests': []
  };

  // Merge with provided policies
  const finalPolicies = { ...defaultPolicies, ...policies };

  // Build CSP string
  const cspString = Object.entries(finalPolicies)
    .filter(([key, values]) => values !== false) // Allow disabling specific directives
    .map(([key, values]) => {
      if (values.length === 0) {
        return key; // For directives without values like upgrade-insecure-requests
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');

  return `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(cspString)}">`;
}

/**
 * Generates security-related HTTP header meta tags
 * @param {Object} options - Configuration for security headers
 * @returns {string} HTML meta tags for security headers
 * @example
 * generateSecurityHeaders({
 *   frameOptions: 'DENY',
 *   contentTypeOptions: 'nosniff',
 *   xssProtection: '1; mode=block',
 *   referrerPolicy: 'strict-origin-when-cross-origin',
 *   permissionsPolicy: {
 *     'camera': 'none',
 *     'microphone': 'none',
 *     'geolocation': 'none'
 *   }
 * });
 */
function generateSecurityHeaders(options = {}) {
  const defaults = {
    frameOptions: 'SAMEORIGIN',
    contentTypeOptions: 'nosniff',
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
    permissionsPolicy: {
      'camera': 'none',
      'microphone': 'none',
      'geolocation': 'none',
      'payment': 'none',
      'usb': 'none',
      'magnetometer': 'none',
      'gyroscope': 'none',
      'accelerometer': 'none'
    }
  };

  const settings = { ...defaults, ...options };
  const headers = [];

  // X-Frame-Options
  if (settings.frameOptions) {
    headers.push(`<meta http-equiv="X-Frame-Options" content="${escapeHtml(settings.frameOptions)}">`);
  }

  // X-Content-Type-Options
  if (settings.contentTypeOptions) {
    headers.push(`<meta http-equiv="X-Content-Type-Options" content="${escapeHtml(settings.contentTypeOptions)}">`);
  }

  // X-XSS-Protection (deprecated but still useful for older browsers)
  if (settings.xssProtection) {
    headers.push(`<meta http-equiv="X-XSS-Protection" content="${escapeHtml(settings.xssProtection)}">`);
  }

  // Referrer Policy
  if (settings.referrerPolicy) {
    headers.push(`<meta name="referrer" content="${escapeHtml(settings.referrerPolicy)}">`);
  }

  // Permissions Policy
  if (settings.permissionsPolicy) {
    const permissions = Object.entries(settings.permissionsPolicy)
      .map(([feature, value]) => `${feature}=(${value})`)
      .join(', ');
    headers.push(`<meta http-equiv="Permissions-Policy" content="${escapeHtml(permissions)}">`);
  }

  return headers.join('\n');
}

/**
 * Generates SRI (Subresource Integrity) hash for a given resource content
 * @param {string} content - The content to hash
 * @param {string} algorithm - Hash algorithm ('sha256', 'sha384', or 'sha512')
 * @returns {string} The SRI hash string
 * @example
 * const scriptContent = 'console.log("Hello World");';
 * const sriHash = generateSRI(scriptContent, 'sha384');
 * // Returns: 'sha384-[base64hash]'
 */
function generateSRI(content, algorithm = 'sha384') {
  if (!content || typeof content !== 'string') {
    throw new Error('Content must be a non-empty string');
  }

  const validAlgorithms = ['sha256', 'sha384', 'sha512'];
  if (!validAlgorithms.includes(algorithm)) {
    throw new Error(`Algorithm must be one of: ${validAlgorithms.join(', ')}`);
  }

  const hash = crypto
    .createHash(algorithm)
    .update(content, 'utf8')
    .digest('base64');

  return `${algorithm}-${hash}`;
}

/**
 * Adds SRI attributes to CDN resource tags
 * @param {string} html - HTML string containing script/link tags
 * @param {Object} sriHashes - Map of URLs to their SRI hashes
 * @returns {string} HTML with SRI attributes added
 * @example
 * const html = '<script src="https://cdn.example.com/lib.js"></script>';
 * const sriHashes = {
 *   'https://cdn.example.com/lib.js': 'sha384-abc123...'
 * };
 * addSRIToResources(html, sriHashes);
 * // Returns: '<script src="https://cdn.example.com/lib.js" integrity="sha384-abc123..." crossorigin="anonymous"></script>'
 */
function addSRIToResources(html, sriHashes = {}) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let result = html;

  // Add SRI to script tags
  result = result.replace(
    /<script([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi,
    (match, before, url, after) => {
      if (sriHashes[url] && !match.includes('integrity=')) {
        const crossorigin = match.includes('crossorigin=') ? '' : ' crossorigin="anonymous"';
        return `<script${before} src="${url}" integrity="${sriHashes[url]}"${crossorigin}${after}>`;
      }
      return match;
    }
  );

  // Add SRI to link tags (stylesheets)
  result = result.replace(
    /<link([^>]*)\shref=["']([^"']+)["']([^>]*)\srel=["']stylesheet["']([^>]*)>/gi,
    (match, before, url, middle, after) => {
      if (sriHashes[url] && !match.includes('integrity=')) {
        const crossorigin = match.includes('crossorigin=') ? '' : ' crossorigin="anonymous"';
        return `<link${before} href="${url}"${middle} rel="stylesheet" integrity="${sriHashes[url]}"${crossorigin}${after}>`;
      }
      return match;
    }
  );

  return result;
}

/**
 * Common SRI hashes for popular CDN resources (as of January 2025)
 * Update these periodically or fetch dynamically in production
 */
const COMMON_SRI_HASHES = {
  // Bootstrap 5.3.2 CSS
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css':
    'sha384-T3c6CoIi6uLrA9TneNEoa7RxnatzjcDSCmG1MXxSR1GAsXEV/Dwwykc2MPK8M2HN',

  // Bootstrap 5.3.2 JS
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js':
    'sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL',

  // jQuery 3.7.1
  'https://code.jquery.com/jquery-3.7.1.min.js':
    'sha384-1H217gwSVyLSIfaLxHbE7dRb3v4mYCKbpQvzx0cegeju1MVsGrX5xXxAvs/HgeFs',

  // Font Awesome 6.5.1
  'https://use.fontawesome.com/releases/v6.5.1/css/all.css':
    'sha384-snZjdRCYoGqWlP7gPbUfYw3X7r8MFjsz5InGbGtHJDxW2q6eVqVNEPWpHkV1kVb9'
};

module.exports = {
  escapeHtml,
  validatePath,
  sanitizeImageUrl,
  validateYear,
  stripHtml,
  generateCSP,
  generateSecurityHeaders,
  generateSRI,
  addSRIToResources,
  COMMON_SRI_HASHES
};

// Usage Examples
if (require.main === module) {
  console.log('HTML Security Utilities - Usage Examples\n');

  // Example 1: HTML Escaping
  console.log('1. HTML Escaping:');
  const dangerous = '<script>alert("XSS")</script>';
  console.log(`   Input: ${dangerous}`);
  console.log(`   Output: ${escapeHtml(dangerous)}\n`);

  // Example 2: Path Validation
  console.log('2. Path Validation:');
  console.log(`   Safe path: ${validatePath('/var/www/images/photo.jpg', '/var/www')}`);
  console.log(`   Traversal attempt: ${validatePath('/var/www/../etc/passwd', '/var/www')}\n`);

  // Example 3: Image URL Sanitization
  console.log('3. Image URL Sanitization:');
  console.log(`   HTTPS URL: "${sanitizeImageUrl('https://example.com/image.jpg')}"`);
  console.log(`   JavaScript URL: "${sanitizeImageUrl('javascript:alert(1)')}"`);
  console.log(`   Data URL: "${sanitizeImageUrl('data:text/html,<script>alert(1)</script>')}"\n`);

  // Example 4: Year Validation
  console.log('4. Year Validation:');
  console.log(`   Year 2023: ${validateYear(2023)}`);
  console.log(`   Year 1899: ${validateYear(1899)}`);
  console.log(`   Invalid: ${validateYear('not-a-year')}\n`);

  // Example 5: HTML Stripping
  console.log('5. HTML Stripping:');
  const htmlContent = '<p>Hello <script>alert("XSS")</script><b>World</b></p>';
  console.log(`   Input: ${htmlContent}`);
  console.log(`   Stripped: ${stripHtml(htmlContent)}`);
  console.log(`   With allowed tags: ${stripHtml(htmlContent, ['b', 'strong'])}\n`);

  // Example 6: CSP Generation
  console.log('6. CSP Meta Tag:');
  const csp = generateCSP({
    'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    'style-src': ["'self'", "'unsafe-inline'"]
  });
  console.log(`   ${csp}\n`);

  // Example 7: Security Headers
  console.log('7. Security Headers:');
  const headers = generateSecurityHeaders({
    frameOptions: 'DENY',
    referrerPolicy: 'no-referrer'
  });
  console.log(headers.split('\n').map(h => `   ${h}`).join('\n') + '\n');

  // Example 8: SRI Hash Generation
  console.log('8. SRI Hash Generation:');
  const content = 'console.log("Hello World");';
  console.log(`   Content: ${content}`);
  console.log(`   SHA-384 Hash: ${generateSRI(content)}\n`);

  // Example 9: Adding SRI to Resources
  console.log('9. Adding SRI to Resources:');
  const originalHtml = '<script src="https://cdn.example.com/lib.js"></script>';
  const withSRI = addSRIToResources(originalHtml, {
    'https://cdn.example.com/lib.js': 'sha384-abc123xyz'
  });
  console.log(`   Original: ${originalHtml}`);
  console.log(`   With SRI: ${withSRI}`);
}