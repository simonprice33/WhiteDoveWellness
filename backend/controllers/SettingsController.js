/**
 * Settings Controller
 * Single Responsibility: Manage site settings including social links
 */

class SettingsController {
  constructor(collections) {
    this.collections = collections;
  }

  // GET /api/settings (public)
  get = async (req, res) => {
    try {
      let settings = await this.collections.siteSettings.findOne(
        { id: 'site_settings' },
        { projection: { _id: 0 } }
      );

      if (!settings) {
        // Return defaults
        settings = {
          id: 'site_settings',
          business_name: 'White Dove Wellness',
          tagline: 'Holistic Therapies',
          email: '',
          phone: '',
          address: '',
          social_links: {
            facebook_url: '',
            instagram_url: '',
            twitter_url: '',
            linkedin_url: ''
          }
        };
      }

      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get settings'
      });
    }
  };

  // PUT /api/admin/settings (admin)
  update = async (req, res) => {
    try {
      const updateFields = ['business_name', 'tagline', 'email', 'phone', 'address', 'social_links'];

      const updateData = {
        id: 'site_settings',
        updated_at: new Date().toISOString()
      };

      for (const field of updateFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      await this.collections.siteSettings.updateOne(
        { id: 'site_settings' },
        { $set: updateData },
        { upsert: true }
      );

      const settings = await this.collections.siteSettings.findOne(
        { id: 'site_settings' },
        { projection: { _id: 0 } }
      );

      console.log('✅ Site settings updated');

      res.json({
        success: true,
        settings
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update settings'
      });
    }
  };
}

module.exports = SettingsController;
