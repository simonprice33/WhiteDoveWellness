/**
 * Environment Configuration
 * Single Responsibility: Manages all environment variable validation and access
 */

require('dotenv').config();

class EnvironmentConfig {
  constructor() {
    this.config = null;
  }

  validate() {
    const required = ['MONGO_URL', 'DB_NAME'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing.join(', '));
      process.exit(1);
    }

    this.config = {
      // Server
      port: parseInt(process.env.PORT) || 8001,
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

    console.log('✅ Environment configuration validated');
    return this;
  }

  getConfig() {
    if (!this.config) {
      this.validate();
    }
    return this.config;
  }
}

module.exports = EnvironmentConfig;
