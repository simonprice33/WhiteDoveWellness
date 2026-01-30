/**
 * Error Handler Middleware
 * Single Responsibility: Centralized error handling
 */

class ErrorHandler {
  static notFound(req, res, next) {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.path}`
    });
  }

  static handle(err, req, res, next) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);

    // Mongoose/MongoDB errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
      if (err.code === 11000) {
        return res.status(400).json({
          success: false,
          message: 'Duplicate entry found'
        });
      }
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    // Validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    // Default error
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
}

module.exports = ErrorHandler;
