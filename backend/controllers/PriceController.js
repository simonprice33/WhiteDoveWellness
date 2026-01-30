/**
 * Price Controller
 * Single Responsibility: CRUD operations for prices
 */

const { v4: uuidv4 } = require('uuid');

class PriceController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/prices (public)
  list = async (req, res) => {
    try {
      const { therapy_id, active_only } = req.query;
      const query = {};

      if (therapy_id) {
        query.therapy_id = therapy_id;
      }
      if (active_only === 'true') {
        query.is_active = true;
      }

      const prices = await this.collections.prices
        .find(query, { projection: { _id: 0 } })
        .sort({ display_order: 1 })
        .toArray();

      res.json({
        success: true,
        prices
      });
    } catch (error) {
      console.error('List prices error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list prices'
      });
    }
  };

  // GET /api/prices/:id (public)
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const price = await this.collections.prices.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!price) {
        return res.status(404).json({
          success: false,
          message: 'Price not found'
        });
      }

      res.json({
        success: true,
        price
      });
    } catch (error) {
      console.error('Get price error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get price'
      });
    }
  };

  // POST /api/admin/prices (admin)
  create = async (req, res) => {
    try {
      const {
        therapy_id,
        name,
        duration,
        price,
        description,
        display_order,
        is_active
      } = req.body;

      if (!therapy_id || !name || !duration || price === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Therapy ID, name, duration, and price are required'
        });
      }

      // Verify therapy exists
      const therapy = await this.collections.therapies.findOne({ id: therapy_id });
      if (!therapy) {
        return res.status(400).json({
          success: false,
          message: 'Therapy not found'
        });
      }

      const priceDoc = {
        id: uuidv4(),
        therapy_id,
        name,
        duration,
        price: parseFloat(price),
        description: description || '',
        display_order: display_order || 0,
        is_active: is_active !== false,
        created_at: new Date().toISOString()
      };

      await this.collections.prices.insertOne(priceDoc);

      console.log(`✅ Created price: ${name}`);

      res.status(201).json({
        success: true,
        price: priceDoc
      });
    } catch (error) {
      console.error('Create price error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create price'
      });
    }
  };

  // PUT /api/admin/prices/:id (admin)
  update = async (req, res) => {
    try {
      const { id } = req.params;
      const updateFields = ['therapy_id', 'name', 'duration', 'price', 'description', 'display_order', 'is_active'];

      const priceDoc = await this.collections.prices.findOne({ id });

      if (!priceDoc) {
        return res.status(404).json({
          success: false,
          message: 'Price not found'
        });
      }

      const updateData = {};
      for (const field of updateFields) {
        if (req.body[field] !== undefined) {
          if (field === 'price') {
            updateData[field] = parseFloat(req.body[field]);
          } else if (field === 'therapy_id') {
            // Verify therapy exists
            const therapy = await this.collections.therapies.findOne({ id: req.body[field] });
            if (!therapy) {
              return res.status(400).json({
                success: false,
                message: 'Therapy not found'
              });
            }
            updateData[field] = req.body[field];
          } else {
            updateData[field] = req.body[field];
          }
        }
      }

      if (Object.keys(updateData).length > 0) {
        await this.collections.prices.updateOne(
          { id },
          { $set: updateData }
        );
      }

      const updated = await this.collections.prices.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      res.json({
        success: true,
        price: updated
      });
    } catch (error) {
      console.error('Update price error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update price'
      });
    }
  };

  // DELETE /api/admin/prices/:id (admin)
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      const priceDoc = await this.collections.prices.findOne({ id });

      if (!priceDoc) {
        return res.status(404).json({
          success: false,
          message: 'Price not found'
        });
      }

      await this.collections.prices.deleteOne({ id });

      console.log(`✅ Deleted price: ${id}`);

      res.json({
        success: true,
        message: 'Price deleted'
      });
    } catch (error) {
      console.error('Delete price error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete price'
      });
    }
  };
}

module.exports = PriceController;
