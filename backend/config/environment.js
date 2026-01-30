/**
 * Environment Configuration
 * Single Responsibility: Manages all environment variable validation and access
 */

require('dotenv').config();

class EnvironmentConfig {
  constructor() {
    this.config = null;
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    this.errors = [];
    this.warnings = [];

    console.log('\n' + '='.repeat(60));
    console.log('🔍 Running Configuration Checks...');
    console.log('='.repeat(60) + '\n');

    // Required core variables
    this.checkRequired('MONGO_URL', 'Database connection string');
    this.checkRequired('DB_NAME', 'Database name');

    // JWT Configuration
    const jwtSecret = process.env.JWT_SECRET_KEY;
    if (!jwtSecret) {
      this.warnings.push('JWT_SECRET_KEY not set - using default (NOT SECURE FOR PRODUCTION)');
    } else if (jwtSecret.length < 32) {
      this.warnings.push('JWT_SECRET_KEY is short - recommend at least 32 characters for production');
    } else {
      console.log('✅ JWT_SECRET_KEY: Configured');
    }

    // CORS Configuration
    const corsOrigins = process.env.CORS_ORIGINS;
    if (!corsOrigins) {
      this.warnings.push('CORS_ORIGINS not set - defaulting to * (allow all)');
    } else {
      console.log(`✅ CORS_ORIGINS: ${corsOrigins}`);
    }

    // Email Provider Configuration
    this.validateEmailConfig();

    // Print results
    this.printResults();

    // If there are critical errors, exit
    if (this.errors.length > 0) {
      console.error('\n❌ Configuration validation failed. Please fix the errors above.\n');
      process.exit(1);
    }

    // Build config object
    this.config = {
      // Server
      port: parseInt(process.env.NODE_PORT) || parseInt(process.env.PORT) || 8001,
      nodeEnv: process.env.NODE_ENV || 'development',
      
      // Database
      mongoUrl: process.env.MONGO_URL,
      dbName: process.env.DB_NAME,
      
      // CORS
      corsOrigins: (process.env.CORS_ORIGINS || '*').split(',').map(s => s.trim()),
      
      // JWT
      jwtSecret: process.env.JWT_SECRET_KEY || 'white-dove-wellness-secret-key-change-in-production',
      jwtAccessExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY) || 20, // 20 minutes
      jwtRefreshExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY) || 300, // 5 hours in minutes
      
      // Email Provider: 'godaddy', 'microsoft', or 'none'
      emailProvider: process.env.EMAIL_PROVIDER || 'none',
      
      // GoDaddy SMTP
      smtpHost: process.env.SMTP_HOST || 'smtpout.secureserver.net',
      smtpPort: parseInt(process.env.SMTP_PORT) || 465,
      smtpUser: process.env.SMTP_USER || '',
      smtpPassword: process.env.SMTP_PASSWORD || '',
      smtpFrom: process.env.SMTP_FROM || '',
      
      // Microsoft Graph
      msClientId: process.env.MS_CLIENT_ID || '',
      msClientSecret: process.env.MS_CLIENT_SECRET || '',
      msTenantId: process.env.MS_TENANT_ID || '',
      msUserId: process.env.MS_USER_ID || '',
      
      // Contact recipient
      contactEmail: process.env.CONTACT_EMAIL || '',
      
      // Rate Limiting
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX) || 200
      }
    };

    console.log('\n✅ Configuration validation passed\n');
    return this;
  }

  checkRequired(key, description) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      this.errors.push(`${key} is required - ${description}`);
      console.log(`❌ ${key}: MISSING (${description})`);
    } else {
      console.log(`✅ ${key}: ${this.maskValue(key, value)}`);
    }
  }

  maskValue(key, value) {
    // Mask sensitive values
    const sensitiveKeys = ['PASSWORD', 'SECRET', 'KEY', 'TOKEN'];
    if (sensitiveKeys.some(k => key.toUpperCase().includes(k))) {
      if (value.length <= 4) return '****';
      return value.substring(0, 2) + '****' + value.substring(value.length - 2);
    }
    // Mask connection strings
    if (key.includes('URL') && value.includes('@')) {
      return value.replace(/:([^:@]+)@/, ':****@');
    }
    return value;
  }

  validateEmailConfig() {
    const provider = (process.env.EMAIL_PROVIDER || 'none').toLowerCase();
    
    console.log('\n📧 Email Configuration:');
    console.log(`   Provider: ${provider.toUpperCase()}`);

    if (provider === 'none') {
      this.warnings.push('EMAIL_PROVIDER is "none" - contact form emails will not be sent (submissions still saved to database)');
      return;
    }

    // Check CONTACT_EMAIL for any provider
    if (!process.env.CONTACT_EMAIL || process.env.CONTACT_EMAIL.trim() === '') {
      this.errors.push('CONTACT_EMAIL is required when EMAIL_PROVIDER is set - this is where contact notifications are sent');
    } else {
      console.log(`   Contact Email: ${process.env.CONTACT_EMAIL}`);
    }

    if (provider === 'godaddy') {
      this.validateGoDaddyConfig();
    } else if (provider === 'microsoft') {
      this.validateMicrosoftConfig();
    } else {
      this.errors.push(`Invalid EMAIL_PROVIDER "${provider}" - must be "godaddy", "microsoft", or "none"`);
    }
  }

  validateGoDaddyConfig() {
    console.log('\n   GoDaddy SMTP Settings:');
    
    const required = [
      { key: 'SMTP_HOST', desc: 'SMTP server hostname' },
      { key: 'SMTP_PORT', desc: 'SMTP server port' },
      { key: 'SMTP_USER', desc: 'SMTP username/email' },
      { key: 'SMTP_PASSWORD', desc: 'SMTP password' },
      { key: 'SMTP_FROM', desc: 'From email address' }
    ];

    let allSet = true;
    for (const { key, desc } of required) {
      const value = process.env[key];
      if (!value || value.trim() === '') {
        this.errors.push(`${key} is required for GoDaddy SMTP - ${desc}`);
        console.log(`   ❌ ${key}: MISSING`);
        allSet = false;
      } else {
        console.log(`   ✅ ${key}: ${this.maskValue(key, value)}`);
      }
    }

    if (allSet) {
      console.log('   ✅ GoDaddy SMTP configuration complete');
    }
  }

  validateMicrosoftConfig() {
    console.log('\n   Microsoft Graph Settings:');
    
    const required = [
      { key: 'MS_CLIENT_ID', desc: 'Azure App Client ID' },
      { key: 'MS_CLIENT_SECRET', desc: 'Azure App Client Secret' },
      { key: 'MS_TENANT_ID', desc: 'Azure Tenant ID' },
      { key: 'MS_USER_ID', desc: 'Sending user email address' }
    ];

    let allSet = true;
    for (const { key, desc } of required) {
      const value = process.env[key];
      if (!value || value.trim() === '') {
        this.errors.push(`${key} is required for Microsoft Graph - ${desc}`);
        console.log(`   ❌ ${key}: MISSING`);
        allSet = false;
      } else {
        console.log(`   ✅ ${key}: ${this.maskValue(key, value)}`);
      }
    }

    if (allSet) {
      console.log('   ✅ Microsoft Graph configuration complete');
    }
  }

  printResults() {
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(w => console.log(`   - ${w}`));
    }

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(e => console.log(`   - ${e}`));
    }
  }

  getConfig() {
    if (!this.config) {
      this.validate();
    }
    return this.config;
  }
}

module.exports = EnvironmentConfig;
