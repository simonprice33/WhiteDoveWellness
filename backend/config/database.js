/**
 * Database Configuration
 * Single Responsibility: Manages MongoDB connection and initialization
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class DatabaseConfig {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.db = null;
    this.collections = null;
  }

  async connect() {
    try {
      this.client = new MongoClient(this.config.mongoUrl);
      await this.client.connect();
      
      this.db = this.client.db(this.config.dbName);
      
      // Define collections
      this.collections = {
        adminUsers: this.db.collection('admin_users'),
        therapies: this.db.collection('therapies'),
        prices: this.db.collection('prices'),
        contactSubmissions: this.db.collection('contact_submissions'),
        affiliations: this.db.collection('affiliations'),
        policies: this.db.collection('policies'),
        siteSettings: this.db.collection('site_settings'),
        clients: this.db.collection('clients'),
        clientNotes: this.db.collection('client_notes')
      };

      // Create indexes
      await this.createIndexes();
      
      console.log(`✅ Connected to MongoDB database: ${this.config.dbName}`);
      
      return { db: this.db, collections: this.collections };
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      process.exit(1);
    }
  }

  async createIndexes() {
    try {
      await this.collections.adminUsers.createIndex({ username: 1 }, { unique: true });
      await this.collections.adminUsers.createIndex({ email: 1 }, { unique: true });
      await this.collections.therapies.createIndex({ display_order: 1 });
      await this.collections.prices.createIndex({ therapy_id: 1 });
      await this.collections.contactSubmissions.createIndex({ created_at: -1 });
      await this.collections.clients.createIndex({ email: 1 });
      await this.collections.policies.createIndex({ slug: 1 }, { unique: true });
      console.log('✅ Database indexes created');
    } catch (error) {
      console.warn('⚠️ Some indexes may already exist:', error.message);
    }
  }

  async initializeAdminUser() {
    try {
      const existingAdmin = await this.collections.adminUsers.findOne({});
      
      if (!existingAdmin) {
        const defaultPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        const adminUser = {
          id: uuidv4(),
          username: 'admin',
          email: 'admin@whitedovewellness.com',
          password_hash: hashedPassword,
          is_active: true,
          created_at: new Date().toISOString()
        };
        
        await this.collections.adminUsers.insertOne(adminUser);
        console.log('✅ Default admin user created (username: admin, password: admin123)');
        console.log('⚠️  Please change the default password after first login!');
      }
    } catch (error) {
      console.warn('⚠️ Admin user initialization:', error.message);
    }
  }

  async initializeSampleData() {
    try {
      // Check if data already exists
      const existingTherapy = await this.collections.therapies.findOne({});
      if (existingTherapy) return;

      // Sample Therapies
      const therapies = [
        {
          id: uuidv4(),
          name: 'Reflexology',
          short_description: 'Ancient healing technique applying pressure to reflex points on the feet.',
          full_description: 'Reflexology is a therapeutic method of relieving pain by stimulating predefined pressure points on the feet and hands. This controlled pressure alleviates the source of discomfort through a series of relaxation techniques.',
          icon: 'Footprints',
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Indian Head Massage',
          short_description: 'Relaxing massage focusing on head, neck, and shoulders.',
          full_description: 'Indian Head Massage is based on the Ayurvedic system of healing which has been practiced in India for over a thousand years. It provides relief from aches and pains, relieves stress, and promotes relaxation.',
          icon: 'Hand',
          display_order: 2,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Aromatherapy',
          short_description: 'Therapeutic use of essential oils to enhance wellbeing.',
          full_description: 'Aromatherapy uses plant materials and aromatic plant oils, including essential oils, for improving psychological and physical well-being. The oils can be inhaled or used in massage to promote healing.',
          icon: 'Flower2',
          display_order: 3,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Hot Stone Therapy',
          short_description: 'Heated stones placed on the body for deep relaxation.',
          full_description: 'Hot stone therapy is a type of massage therapy that involves the use of smooth, heated stones. The stones are placed on specific parts of the body to warm and loosen tight muscles and balance energy centers.',
          icon: 'Gem',
          display_order: 4,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Reiki Healing',
          short_description: 'Energy healing promoting balance and relaxation.',
          full_description: 'Reiki is a form of alternative therapy commonly referred to as energy healing. It involves the transfer of universal energy from the practitioner\'s palms to the client, promoting emotional and physical healing.',
          icon: 'Sparkles',
          display_order: 5,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Facial Reflexology',
          short_description: 'Gentle pressure techniques applied to facial reflex points.',
          full_description: 'Facial reflexology works on the same principles as foot reflexology but focuses on the face. It can help improve circulation, reduce tension, and promote a sense of relaxation and wellbeing.',
          icon: 'Smile',
          display_order: 6,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];

      await this.collections.therapies.insertMany(therapies);
      console.log('✅ Sample therapies created');

      // Sample Prices linked to therapies
      const prices = [];
      for (const therapy of therapies) {
        prices.push({
          id: uuidv4(),
          therapy_id: therapy.id,
          name: `${therapy.name} - 30 minutes`,
          duration: '30 minutes',
          price: 35.00,
          description: `A shorter ${therapy.name.toLowerCase()} session, perfect for a quick relaxation boost.`,
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString()
        });
        prices.push({
          id: uuidv4(),
          therapy_id: therapy.id,
          name: `${therapy.name} - 60 minutes`,
          duration: '60 minutes',
          price: 55.00,
          description: `Our most popular ${therapy.name.toLowerCase()} treatment, allowing full relaxation.`,
          display_order: 2,
          is_active: true,
          created_at: new Date().toISOString()
        });
      }

      await this.collections.prices.insertMany(prices);
      console.log('✅ Sample prices created');

      // Sample Affiliations
      const affiliations = [
        {
          id: uuidv4(),
          name: 'Association of Reflexologists',
          logo_url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=100&fit=crop',
          website_url: 'https://www.aor.org.uk',
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Federation of Holistic Therapists',
          logo_url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=100&fit=crop',
          website_url: 'https://www.fht.org.uk',
          display_order: 2,
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Complementary & Natural Healthcare Council',
          logo_url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&h=100&fit=crop',
          website_url: 'https://www.cnhc.org.uk',
          display_order: 3,
          is_active: true,
          created_at: new Date().toISOString()
        }
      ];

      await this.collections.affiliations.insertMany(affiliations);
      console.log('✅ Sample affiliations created');

      // Sample Policies
      const policies = [
        {
          id: uuidv4(),
          title: 'Privacy Policy',
          slug: 'privacy-policy',
          content: '# Privacy Policy\n\nYour privacy is important to us. This policy explains how we collect, use, and protect your personal information.\n\n## Information We Collect\n\nWe collect information you provide directly to us, such as when you book an appointment, fill out a form, or contact us.\n\n## How We Use Your Information\n\nWe use the information we collect to provide, maintain, and improve our services.',
          display_order: 1,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: 'Terms of Service',
          slug: 'terms-of-service',
          content: '# Terms of Service\n\nBy using our services, you agree to these terms.\n\n## Appointments\n\nAll appointments must be booked in advance. We require 24 hours notice for cancellations.\n\n## Payment\n\nPayment is due at the time of service unless otherwise arranged.',
          display_order: 2,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: 'Cancellation Policy',
          slug: 'cancellation-policy',
          content: '# Cancellation Policy\n\nWe understand that sometimes plans change.\n\n## Notice Required\n\nWe require at least 24 hours notice for cancellations or rescheduling.\n\n## Late Cancellations\n\nCancellations made with less than 24 hours notice may be subject to a cancellation fee.',
          display_order: 3,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: uuidv4(),
          title: 'Cookie Policy',
          slug: 'cookie-policy',
          content: '# Cookie Policy\n\nThis website uses cookies to enhance your browsing experience.\n\n## What Are Cookies\n\nCookies are small text files stored on your device when you visit our website.\n\n## How We Use Cookies\n\nWe use cookies to remember your preferences and improve our services.',
          display_order: 4,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      await this.collections.policies.insertMany(policies);
      console.log('✅ Sample policies created');

      // Initialize Site Settings
      const siteSettings = {
        id: 'site_settings',
        business_name: 'White Dove Wellness',
        tagline: 'Holistic Therapies',
        email: 'info@whitedovewellness.com',
        phone: '',
        address: '',
        social_links: {
          facebook_url: 'https://www.facebook.com/profile.php?id=61587212937489',
          instagram_url: 'https://www.instagram.com/white_dove_wellness_therapies/',
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
        updated_at: new Date().toISOString()
      };

      await this.collections.siteSettings.updateOne(
        { id: 'site_settings' },
        { $set: siteSettings },
        { upsert: true }
      );
      console.log('✅ Site settings initialized');

    } catch (error) {
      console.warn('⚠️ Sample data initialization:', error.message);
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      console.log('✅ MongoDB connection closed');
    }
  }
}

module.exports = DatabaseConfig;
