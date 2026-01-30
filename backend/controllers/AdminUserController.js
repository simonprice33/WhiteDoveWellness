/**
 * Admin User Controller
 * Single Responsibility: CRUD operations for admin users
 */

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class AdminUserController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/admin/users
  list = async (req, res) => {
    try {
      const users = await this.collections.adminUsers
        .find({}, { projection: { _id: 0, password_hash: 0 } })
        .toArray();

      res.json({
        success: true,
        users
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list users'
      });
    }
  };

  // GET /api/admin/users/:id
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const user = await this.collections.adminUsers.findOne(
        { id },
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
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  };

  // POST /api/admin/users
  create = async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username, email, and password are required'
        });
      }

      // Check if username or email exists
      const existing = await this.collections.adminUsers.findOne({
        $or: [{ username }, { email }]
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Username or email already exists'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = {
        id: uuidv4(),
        username,
        email,
        password_hash: hashedPassword,
        is_active: true,
        created_at: new Date().toISOString()
      };

      await this.collections.adminUsers.insertOne(user);

      console.log(`✅ Created admin user: ${username}`);

      // Return without password
      const { password_hash, ...userResponse } = user;

      res.status(201).json({
        success: true,
        user: userResponse
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create user'
      });
    }
  };

  // PUT /api/admin/users/:id
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, password, is_active } = req.body;

      const user = await this.collections.adminUsers.findOne({ id });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const updateData = {};

      if (username && username !== user.username) {
        const existing = await this.collections.adminUsers.findOne({
          username,
          id: { $ne: id }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Username already exists'
          });
        }
        updateData.username = username;
      }

      if (email && email !== user.email) {
        const existing = await this.collections.adminUsers.findOne({
          email,
          id: { $ne: id }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
        updateData.email = email;
      }

      if (password) {
        updateData.password_hash = await bcrypt.hash(password, 10);
      }

      if (typeof is_active === 'boolean') {
        // Prevent self-deactivation
        if (id === req.user.id && !is_active) {
          return res.status(400).json({
            success: false,
            message: 'Cannot disable your own account'
          });
        }
        updateData.is_active = is_active;
      }

      if (Object.keys(updateData).length > 0) {
        await this.collections.adminUsers.updateOne(
          { id },
          { $set: updateData }
        );
      }

      const updated = await this.collections.adminUsers.findOne(
        { id },
        { projection: { _id: 0, password_hash: 0 } }
      );

      res.json({
        success: true,
        user: updated
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user'
      });
    }
  };

  // DELETE /api/admin/users/:id
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      // Prevent self-deletion
      if (id === req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      const user = await this.collections.adminUsers.findOne({ id });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await this.collections.adminUsers.deleteOne({ id });

      console.log(`✅ Deleted admin user: ${id}`);

      res.json({
        success: true,
        message: 'User deleted'
      });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user'
      });
    }
  };
}

module.exports = AdminUserController;
