/**
 * Hudson Street Library - Configuration
 * Central configuration for all CMS connections
 */

const config = {
  // CMS Configuration
  cms: {
    // For local development
    development: {
      apiUrl: 'http://localhost:8055',
      assetsUrl: 'http://localhost:8055/assets',
      // Add these temporarily until permissions are fixed
      email: 'admin@hudsonstreetlibrary.org',
      password: 'HudsonLibrary123!'
    },
    // For production (update when Directus is deployed)
    production: {
      apiUrl: 'https://cms.hudsonstreetlibrary.com', // Update with actual production URL
      assetsUrl: 'https://cms.hudsonstreetlibrary.com/assets'
    }
  },
  
  // Current environment
  environment: window.location.hostname === 'localhost' ? 'development' : 'production',
  
  // Get current API URL based on environment
  get apiUrl() {
    return this.cms[this.environment].apiUrl;
  },
  
  get assetsUrl() {
    return this.cms[this.environment].assetsUrl;
  },
  
  // Get credentials for development
  get credentials() {
    if (this.environment === 'development') {
      return {
        email: this.cms.development.email,
        password: this.cms.development.password
      };
    }
    return null;
  }
};

// Export for use in other scripts
window.HSL_CONFIG = config;