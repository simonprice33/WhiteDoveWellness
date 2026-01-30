#!/usr/bin/env node

/**
 * White Dove Wellness Backend Server
 * Built using SOLID principles for maintainability and scalability
 */

require('dotenv').config();

// Import configuration modules
const EnvironmentConfig = require('./config/environment');
const DatabaseConfig = require('./config/database');
const EmailConfig = require('./config/email');

// Import middleware
const AuthMiddleware = require('./middleware/auth');
const ErrorHandler = require('./middleware/errorHandler');

// Express setup
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

async function startServer() {
  try {
    // 1. Validate Environment
    const envConfig = new EnvironmentConfig();
    envConfig.validate();
    const config = envConfig.getConfig();

    // 2. Initialize Express App
    const app = express();

    // Trust proxy for production
    if (config.nodeEnv === 'production') {
      app.set('trust proxy', 1);
      console.log('✅ Trust proxy enabled for production');
    }

    // Security middleware
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false
    }));

    // CORS configuration
    const corsOptions = {
      origin: function (origin, callback) {
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Allow all for now in development
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    };

    app.use(cors(corsOptions));
    app.options('*', cors(corsOptions));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        success: false,
        message: 'Too many requests, please try again later.'
      },
      skip: (req) => req.path === '/api/health'
    });

    if (config.nodeEnv === 'production') {
      app.use('/api/', limiter);
    }

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Serve uploaded files
    app.use('/api/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

    // 3. Initialize Database
    const dbConfig = new DatabaseConfig(config);
    const { db, collections } = await dbConfig.connect();
    await dbConfig.initializeAdminUser();
    await dbConfig.initializeSampleData();

    // 4. Initialize Email Service
    const emailConfig = new EmailConfig(config);
    emailConfig.initialize();

    // 5. Initialize Authentication Middleware
    const authMiddleware = new AuthMiddleware(
      config.jwtSecret,
      config.jwtAccessExpiry,
      config.jwtRefreshExpiry
    );

    // 6. Route dependencies
    const routeDependencies = {
      db,
      collections,
      emailConfig,
      authMiddleware,
      config
    };

    // 7. Load Routes
    const createPublicRoutes = require('./routes/public');
    const createAdminRoutes = require('./routes/admin');

    // Public routes
    app.use('/api', createPublicRoutes(routeDependencies));

    // Admin routes
    app.use('/api/admin', createAdminRoutes(routeDependencies));

    // 8. Error Handling
    app.use(ErrorHandler.notFound);
    app.use(ErrorHandler.handle);

    // 9. Start Server on internal port (proxied by Python)
    const serverPort = process.env.NODE_PORT || 3001;
    app.listen(serverPort, '127.0.0.1', () => {
      console.log('='.repeat(60));
      console.log(`🕊️  White Dove Wellness Backend running on port ${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`📧 Email: ${emailConfig.getStatus().configured ? `Configured (${emailConfig.getStatus().provider})` : 'Disabled'}`);
      console.log(`💾 Database: Connected to ${config.dbName}`);
      console.log(`🔐 JWT Access Token: ${config.jwtAccessExpiry} minutes`);
      console.log(`🔐 JWT Refresh Token: ${config.jwtRefreshExpiry} minutes`);
      console.log('='.repeat(60));
      console.log('✅ Server is ready to accept requests');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();
