/**
 * Policy Controller
 * Single Responsibility: CRUD operations for policies
 */

const { v4: uuidv4 } = require('uuid');

class PolicyController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/policies (public)
  list = async (req, res) => {
    try {
      const { active_only } = req.query;
      const query = active_only === 'true' ? { is_active: true } : {};

      const policies = await this.collections.policies
        .find(query, { projection: { _id: 0 } })
        .sort({ display_order: 1 })
        .toArray();

      res.json({
        success: true,
        policies
      });
    } catch (error) {
      console.error('List policies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list policies'
      });
    }
  };

  // GET /api/policies/slug/:slug (public)
  getBySlug = async (req, res) => {
    try {
      const { slug } = req.params;

      const policy = await this.collections.policies.findOne(
        { slug, is_active: true },
        { projection: { _id: 0 } }
      );

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      res.json({
        success: true,
        policy
      });
    } catch (error) {
      console.error('Get policy by slug error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get policy'
      });
    }
  };

  // GET /api/policies/:id (public)
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const policy = await this.collections.policies.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      res.json({
        success: true,
        policy
      });
    } catch (error) {
      console.error('Get policy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get policy'
      });
    }
  };

  // POST /api/admin/policies (admin)
  create = async (req, res) => {
    try {
      const { title, slug, content, display_order, is_active } = req.body;

      if (!title || !slug || !content) {
        return res.status(400).json({
          success: false,
          message: 'Title, slug, and content are required'
        });
      }

      // Check slug uniqueness
      const existing = await this.collections.policies.findOne({ slug });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Slug already exists'
        });
      }

      const now = new Date().toISOString();
      const policy = {
        id: uuidv4(),
        title,
        slug,
        content,
        display_order: display_order || 0,
        is_active: is_active !== false,
        created_at: now,
        updated_at: now
      };

      await this.collections.policies.insertOne(policy);

      console.log(`✅ Created policy: ${title}`);

      res.status(201).json({
        success: true,
        policy
      });
    } catch (error) {
      console.error('Create policy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create policy'
      });
    }
  };

  // PUT /api/admin/policies/:id (admin)
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = ['title', 'slug', 'content', 'display_order', 'is_active'];

      const policy = await this.collections.policies.findOne({ id });

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      // Check slug uniqueness if updating
      if (req.body.slug && req.body.slug !== policy.slug) {
        const existing = await this.collections.policies.findOne({
          slug: req.body.slug,
          id: { $ne: id }
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Slug already exists'
          });
        }
      }

      const updateData = { updated_at: new Date().toISOString() };
      for (const field of updateFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      await this.collections.policies.updateOne(
        { id },
        { $set: updateData }
      );

      const updated = await this.collections.policies.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      res.json({
        success: true,
        policy: updated
      });
    } catch (error) {
      console.error('Update policy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update policy'
      });
    }
  };

  // DELETE /api/admin/policies/:id (admin)
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      const policy = await this.collections.policies.findOne({ id });

      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Policy not found'
        });
      }

      await this.collections.policies.deleteOne({ id });

      console.log(`✅ Deleted policy: ${id}`);

      res.json({
        success: true,
        message: 'Policy deleted'
      });
    } catch (error) {
      console.error('Delete policy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete policy'
      });
    }
  };
}

module.exports = PolicyController;
