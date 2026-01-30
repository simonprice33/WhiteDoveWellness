/**
 * Auth Controller
 * Single Responsibility: Handle authentication operations
 */

const bcrypt = require('bcryptjs');

class AuthController {
  constructor(collections, authMiddleware) {
    this.collections = collections;
    this.authMiddleware = authMiddleware;
  }

  // POST /api/auth/login
  login = async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // Find user
      const user = await this.collections.adminUsers.findOne(
        { username },
        { projection: { _id: 0 } }
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      if (!user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'Account is disabled'
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Create tokens
      const tokens = this.authMiddleware.createTokens(user.id, user.username);

      console.log(`✅ User ${username} logged in`);

      res.json({
        success: true,
        ...tokens
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed'
      });
    }
  };

  // POST /api/auth/refresh
  refresh = async (req, res) => {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      const decoded = this.authMiddleware.verifyToken(refresh_token);

      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type'
        });
      }

      // Verify user still exists and is active
      const user = await this.collections.adminUsers.findOne(
        { id: decoded.sub },
        { projection: { _id: 0 } }
      );

      if (!user || !user.is_active) {
        return res.status(401).json({
          success: false,
          message: 'User not found or disabled'
        });
      }

      // Create new tokens
      const tokens = this.authMiddleware.createTokens(user.id, user.username);

      console.log(`✅ Token refreshed for user ${user.username}`);

      res.json({
        success: true,
        ...tokens
      });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  };

  // GET /api/auth/me
  getCurrentUser = async (req, res) => {
    try {
      const user = await this.collections.adminUsers.findOne(
        { id: req.user.id },
        { projection: { _id: 0, password_hash: 0 } }
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user info'
      });
    }
  };
}

module.exports = AuthController;
