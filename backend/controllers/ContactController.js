/**
 * Contact Controller
 * Single Responsibility: Handle contact form submissions
 */

const { v4: uuidv4 } = require('uuid');

class ContactController {
  constructor(collections, emailConfig) {
    this.collections = collections;
    this.emailConfig = emailConfig;
  }

  // POST /api/contact (public)
  submit = async (req, res) => {
    try {
      const { name, email, phone, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({
          success: false,
          message: 'Name, email, and message are required'
        });
      }

      const contact = {
        id: uuidv4(),
        name,
        email,
        phone: phone || '',
        message,
        is_read: false,
        notes: '',
        created_at: new Date().toISOString()
      };

      await this.collections.contactSubmissions.insertOne(contact);

      console.log(`✅ New contact submission from: ${email}`);

      // Send email notification (async, don't wait)
      this.emailConfig.sendContactNotification(name, email, phone || '', message)
        .catch(err => console.error('Email notification failed:', err.message));

      res.status(201).json({
        success: true,
        message: 'Thank you for your message. We will get back to you soon.',
        contact
      });
    } catch (error) {
      console.error('Submit contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit contact form'
      });
    }
  };

  // GET /api/admin/contacts (admin)
  list = async (req, res) => {
    try {
      const { unread_only } = req.query;
      const query = unread_only === 'true' ? { is_read: false } : {};

      const contacts = await this.collections.contactSubmissions
        .find(query, { projection: { _id: 0 } })
        .sort({ created_at: -1 })
        .toArray();

      res.json({
        success: true,
        contacts
      });
    } catch (error) {
      console.error('List contacts error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list contacts'
      });
    }
  };

  // GET /api/admin/contacts/:id (admin)
  get = async (req, res) => {
    try {
      const { id } = req.params;

      const contact = await this.collections.contactSubmissions.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      res.json({
        success: true,
        contact
      });
    } catch (error) {
      console.error('Get contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get contact'
      });
    }
  };

  // PUT /api/admin/contacts/:id/read (admin)
  markAsRead = async (req, res) => {
    try {
      const { id } = req.params;

      const contact = await this.collections.contactSubmissions.findOne({ id });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      await this.collections.contactSubmissions.updateOne(
        { id },
        { $set: { is_read: true } }
      );

      res.json({
        success: true,
        message: 'Marked as read'
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark as read'
      });
    }
  };

  // PUT /api/admin/contacts/:id/notes (admin)
  updateNotes = async (req, res) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const contact = await this.collections.contactSubmissions.findOne({ id });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      await this.collections.contactSubmissions.updateOne(
        { id },
        { $set: { notes: notes || '' } }
      );

      const updated = await this.collections.contactSubmissions.findOne(
        { id },
        { projection: { _id: 0 } }
      );

      res.json({
        success: true,
        contact: updated
      });
    } catch (error) {
      console.error('Update notes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update notes'
      });
    }
  };

  // DELETE /api/admin/contacts/:id (admin)
  delete = async (req, res) => {
    try {
      const { id } = req.params;

      const contact = await this.collections.contactSubmissions.findOne({ id });

      if (!contact) {
        return res.status(404).json({
          success: false,
          message: 'Contact not found'
        });
      }

      await this.collections.contactSubmissions.deleteOne({ id });

      console.log(`✅ Deleted contact: ${id}`);

      res.json({
        success: true,
        message: 'Contact deleted'
      });
    } catch (error) {
      console.error('Delete contact error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete contact'
      });
    }
  };
}

module.exports = ContactController;
