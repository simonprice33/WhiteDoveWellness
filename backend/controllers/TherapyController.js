/**
 * Therapy Controller
 * Single Responsibility: CRUD operations for therapies
 */

const { v4: uuidv4 } = require('uuid');

class TherapyController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/therapies (public)
  list = async (req, res) => {
    try {
      const { active_only } = req.query;
      const query = active_only === 'true' ? { is_active: true } : {};

      const therapies = await this.collections.therapies
        .find(query, { projection: { _id: 0 } })
        .sort({ display_order: 1 })
        .toArray();

      res.json({
        success: true,
        therapies
      });
    } catch (error) {
      console.error('List therapies error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list therapies'
      });
    }
  };

  // GET /api/therapies/:id (public)
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const therapy = await this.collections.therapies.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!therapy) {
        return res.status(404).json({
          success: false,
          message: 'Therapy not found'
        });
      }

      res.json({
        success: true,
        therapy
      });
    } catch (error) {
      console.error('Get therapy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get therapy'
      });
    }
  };

  // POST /api/admin/therapies (admin)
  create = async (req, res) => {
    try {
      const {
        name,
        short_description,
        full_description,
        image_url,
        icon,
        display_order,
        is_active,
        coming_soon
      } = req.body;

      if (!name || !short_description) {
        return res.status(400).json({
          success: false,
          message: 'Name and short description are required'
        });
      }

      const therapy = {
        id: uuidv4(),
        name,
        short_description,
        full_description: full_description || '',
        image_url: image_url || '',
        icon: icon || 'Sparkles',
        display_order: display_order || 0,
        is_active: is_active !== false,
        coming_soon: coming_soon === true,
        created_at: new Date().toISOString()
      };

      await this.collections.therapies.insertOne(therapy);

      console.log(`✅ Created therapy: ${name}`);

      res.status(201).json({
        success: true,
        therapy
      });
    } catch (error) {
      console.error('Create therapy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create therapy'
      });
    }
  };

  // PUT /api/admin/therapies/:id (admin)
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = ['name', 'short_description', 'full_description', 'image_url', 'icon', 'display_order', 'is_active', 'coming_soon'];

      const therapy = await this.collections.therapies.findOne({ id });

      if (!therapy) {
        return res.status(404).json({
          success: false,
          message: 'Therapy not found'
        });
      }

      const updateData = {};
      for (const field of updateFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length > 0) {
        await this.collections.therapies.updateOne(
          { id },
          { $set: updateData }
        );
      }

      const updated = await this.collections.therapies.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      res.json({
        success: true,
        therapy: updated
      });
    } catch (error) {
      console.error('Update therapy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update therapy'
      });
    }
  };

  // DELETE /api/admin/therapies/:id (admin)
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      const therapy = await this.collections.therapies.findOne({ id });

      if (!therapy) {
        return res.status(404).json({
          success: false,
          message: 'Therapy not found'
        });
      }

      // Also delete associated prices
      await this.collections.prices.deleteMany({ therapy_id: id });
      await this.collections.therapies.deleteOne({ id });

      console.log(`✅ Deleted therapy: ${id}`);

      res.json({
        success: true,
        message: 'Therapy and associated prices deleted'
      });
    } catch (error) {
      console.error('Delete therapy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete therapy'
      });
    }
  };
}

module.exports = TherapyController;
