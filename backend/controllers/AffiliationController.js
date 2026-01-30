/**
 * Affiliation Controller
 * Single Responsibility: CRUD operations for affiliations
 */

const { v4: uuidv4 } = require('uuid');

class AffiliationController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/affiliations (public)
  list = async (req, res) => {
    try {
      const { active_only } = req.query;
      const query = active_only === 'true' ? { is_active: true } : {};

      const affiliations = await this.collections.affiliations
        .find(query, { projection: { _id: 0 } })
        .sort({ display_order: 1 })
        .toArray();

      res.json({
        success: true,
        affiliations
      });
    } catch (error) {
      console.error('List affiliations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list affiliations'
      });
    }
  };

  // GET /api/affiliations/:id (public)
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const affiliation = await this.collections.affiliations.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!affiliation) {
        return res.status(404).json({
          success: false,
          message: 'Affiliation not found'
        });
      }

      res.json({
        success: true,
        affiliation
      });
    } catch (error) {
      console.error('Get affiliation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get affiliation'
      });
    }
  };

  // POST /api/admin/affiliations (admin)
  create = async (req, res) => {
    try {
      const { name, logo_url, website_url, display_order, is_active } = req.body;

      if (!name || !logo_url) {
        return res.status(400).json({
          success: false,
          message: 'Name and logo URL are required'
        });
      }

      const affiliation = {
        id: uuidv4(),
        name,
        logo_url,
        website_url: website_url || '',
        display_order: display_order || 0,
        is_active: is_active !== false,
        created_at: new Date().toISOString()
      };

      await this.collections.affiliations.insertOne(affiliation);

      console.log(`✅ Created affiliation: ${name}`);

      res.status(201).json({
        success: true,
        affiliation
      });
    } catch (error) {
      console.error('Create affiliation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create affiliation'
      });
    }
  };

  // PUT /api/admin/affiliations/:id (admin)
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = ['name', 'logo_url', 'website_url', 'display_order', 'is_active'];

      const affiliation = await this.collections.affiliations.findOne({ id });

      if (!affiliation) {
        return res.status(404).json({
          success: false,
          message: 'Affiliation not found'
        });
      }

      const updateData = {};
      for (const field of updateFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      if (Object.keys(updateData).length > 0) {
        await this.collections.affiliations.updateOne(
          { id },
          { $set: updateData }
        );
      }

      const updated = await this.collections.affiliations.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      res.json({
        success: true,
        affiliation: updated
      });
    } catch (error) {
      console.error('Update affiliation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update affiliation'
      });
    }
  };

  // DELETE /api/admin/affiliations/:id (admin)
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      const affiliation = await this.collections.affiliations.findOne({ id });

      if (!affiliation) {
        return res.status(404).json({
          success: false,
          message: 'Affiliation not found'
        });
      }

      await this.collections.affiliations.deleteOne({ id });

      console.log(`✅ Deleted affiliation: ${id}`);

      res.json({
        success: true,
        message: 'Affiliation deleted'
      });
    } catch (error) {
      console.error('Delete affiliation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete affiliation'
      });
    }
  };
}

module.exports = AffiliationController;
