/**
 * Settings Controller
 * Single Responsibility: Manage site settings including social links and images
 */

// Default consultation form options
const DEFAULT_CONTRA_INDICATIONS = [
  'Thrombosis', 'Heart disease/disorders', 'High/low blood pressure', 'Skin disorders',
  'Stroke', 'Allergies', 'Undiagnosed lumps', 'Pregnancy', 'Chemotherapy', 'Radiotherapy',
  'Fractures/sprains', 'Skeletal disorders', 'Epilepsy', 'Diabetes', 'Muscular conditions',
  'Nervous conditions', 'Digestive conditions', 'Endocrine conditions', 'Respiratory conditions (e.g. asthma)',
  'Renal conditions', 'Reproductive conditions', 'HIV', 'Disorders of hand/feet/nails',
  'Fever', 'Infectious disorders', 'Scar tissue', 'Cuts and abrasions', 'Recent operations',
  'Sunburn', 'Inflammation', 'Arthritis', 'Bruises', 'Varicose veins',
  'Under care of medical practitioner'
];

const DEFAULT_LIFESTYLE_QUESTIONS = [
  { id: 'energy_levels', label: 'Energy Levels', type: 'select', options: ['High', 'Average', 'Low'] },
  { id: 'stress_levels', label: 'Stress Levels', type: 'select', options: ['High', 'Average', 'Low'] },
  { id: 'ability_to_relax', label: 'Ability to Relax', type: 'select', options: ['High', 'Average', 'Low'] },
  { id: 'sleep_pattern', label: 'Sleep Pattern', type: 'select', options: ['Good', 'Broken', 'Poor'] },
  { id: 'dietary_intake', label: 'Dietary Intake', type: 'text' },
  { id: 'fluid_intake', label: 'Fluid Intake', type: 'text' },
  { id: 'alcohol_units', label: 'Alcohol (units/week)', type: 'text' },
  { id: 'smoker', label: 'Smoker', type: 'select', options: ['Non-smoker', 'Smoker', 'Ex-smoker'] },
  { id: 'exercise', label: 'Exercise', type: 'select', options: ['Daily', 'Weekly', 'Occasionally', 'Never'] },
  { id: 'hobbies', label: 'Types of Hobbies', type: 'text' }
];

const DEFAULT_TREATMENT_OBJECTIVES = [
  'Relaxation', 'Balancing', 'Stimulating', 'Uplifting', 'Stress relief', 
  'Pain management', 'Improved circulation', 'Better sleep', 'Anxiety relief'
];

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
        settings = this.getDefaultSettings();
      }

      // Ensure all required fields exist with defaults
      settings = this.ensureDefaults(settings);

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

  getDefaultSettings() {
    return {
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
      },
      images: {
        logo_url: '/images/logo.png',
        hero_images: [
          '/images/hero-1.jpg',
          '/images/hero-2.jpg',
          '/images/hero-3.jpg'
        ],
        contact_image_url: '/images/contact-dove.jpg'
      },
      hero_content: {
        title: 'Welcome to White Dove Wellness Holistic Therapies',
        subtitle: 'Experience the healing power of holistic therapies in a serene and nurturing environment.',
        button_text: 'Book Your Session'
      },
      consultation_options: {
        contra_indications: DEFAULT_CONTRA_INDICATIONS,
        lifestyle_questions: DEFAULT_LIFESTYLE_QUESTIONS,
        treatment_objectives: DEFAULT_TREATMENT_OBJECTIVES
      }
    };
  }

  ensureDefaults(settings) {
    // Ensure images object exists with defaults
    if (!settings.images) {
      settings.images = {
        logo_url: '/images/logo.png',
        hero_images: ['/images/hero-1.jpg', '/images/hero-2.jpg', '/images/hero-3.jpg'],
        contact_image_url: '/images/contact-dove.jpg'
      };
    }

    // Ensure hero_content exists with defaults
    if (!settings.hero_content) {
      settings.hero_content = {
        title: 'Welcome to White Dove Wellness Holistic Therapies',
        subtitle: 'Experience the healing power of holistic therapies in a serene and nurturing environment.',
        button_text: 'Book Your Session'
      };
    }

    // Ensure consultation_options exist with defaults
    if (!settings.consultation_options) {
      settings.consultation_options = {
        contra_indications: DEFAULT_CONTRA_INDICATIONS,
        lifestyle_questions: DEFAULT_LIFESTYLE_QUESTIONS,
        treatment_objectives: DEFAULT_TREATMENT_OBJECTIVES
      };
    }

    return settings;
  }

  // PUT /api/admin/settings (admin)
  update = async (req, res) => {
    try {
      const updateFields = ['business_name', 'tagline', 'email', 'phone', 'address', 'social_links', 'images', 'hero_content', 'consultation_options'];

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
