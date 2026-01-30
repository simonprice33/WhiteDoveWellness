/**
 * Authentication Middleware
 * Single Responsibility: JWT token verification and user authentication
 */

const jwt = require('jsonwebtoken');

class AuthMiddleware {
  constructor(jwtSecret, accessExpiry = 20, refreshExpiry = 300) {
    this.jwtSecret = jwtSecret;
    this.accessExpiry = accessExpiry; // minutes
    this.refreshExpiry = refreshExpiry; // minutes
  }

  // Middleware function to authenticate requests
  authenticate = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const token = authHeader.split(' ')[1];
      const decoded = this.verifyToken(token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      if (decoded.type !== 'access') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type'
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.sub,
        username: decoded.username
      };

      next();
    } catch (error) {
      console.error('Auth error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  };

  // Create access token (20 minute life)
  createAccessToken(userId, username) {
    return jwt.sign(
      {
        sub: userId,
        username: username,
        type: 'access'
      },
      this.jwtSecret,
      { expiresIn: `${this.accessExpiry}m` }
    );
  }

  // Create refresh token (5 hour window)
  createRefreshToken(userId, username) {
    return jwt.sign(
      {
        sub: userId,
        username: username,
        type: 'refresh'
      },
      this.jwtSecret,
      { expiresIn: `${this.refreshExpiry}m` }
    );
  }

  // Create both tokens
  createTokens(userId, username) {
    return {
      access_token: this.createAccessToken(userId, username),
      refresh_token: this.createRefreshToken(userId, username),
      token_type: 'bearer',
      expires_in: this.accessExpiry * 60 // in seconds
    };
  }

  // Verify token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }
}

module.exports = AuthMiddleware;
