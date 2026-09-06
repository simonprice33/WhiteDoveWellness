/**
 * Google Calendar Controller
 * Handles OAuth configuration and connection for Google Calendar integration
 */

const GoogleCalendarService = require('../services/GoogleCalendarService');

class GoogleCalendarController {
  constructor(collections) {
    this.collections = collections;
    this.calendarService = new GoogleCalendarService(collections);
  }

  // GET /api/admin/google-calendar/status
  // Get current configuration and connection status
  getStatus = async (req, res) => {
    try {
      const status = await this.calendarService.getStatus();
      res.json({
        success: true,
        ...status
      });
    } catch (error) {
      console.error('Get Google Calendar status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get calendar status'
      });
    }
  };

  // GET /api/admin/google-calendar/config
  // Get configuration (masked secret)
  getConfig = async (req, res) => {
    try {
      const config = await this.calendarService.getFullConfig();
      res.json({
        success: true,
        config
      });
    } catch (error) {
      console.error('Get Google Calendar config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get calendar config'
      });
    }
  };

  // POST /api/admin/google-calendar/config
  // Save OAuth credentials configuration
  saveConfig = async (req, res) => {
    try {
      const { client_id, client_secret, redirect_uri, calendar_id } = req.body;

      if (!client_id) {
        return res.status(400).json({
          success: false,
          message: 'Client ID is required'
        });
      }

      // If no new secret provided and one exists, keep the old one
      let finalSecret = client_secret;
      if (!client_secret || client_secret === '••••••••') {
        const existingConfig = await this.calendarService.getConfig();
        finalSecret = existingConfig?.client_secret || '';
      }

      if (!finalSecret) {
        return res.status(400).json({
          success: false,
          message: 'Client Secret is required'
        });
      }

      await this.calendarService.saveConfig({
        client_id,
        client_secret: finalSecret,
        redirect_uri: redirect_uri || '',
        calendar_id: calendar_id || 'primary'
      });

      const config = await this.calendarService.getFullConfig();

      console.log('✅ Google Calendar config saved');

      res.json({
        success: true,
        message: 'Configuration saved successfully',
        config
      });
    } catch (error) {
      console.error('Save Google Calendar config error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to save calendar config'
      });
    }
  };

  // GET /api/admin/google-calendar/auth-url
  // Generate OAuth authorization URL
  getAuthUrl = async (req, res) => {
    try {
      const authUrl = await this.calendarService.getAuthUrl();
      res.json({
        success: true,
        auth_url: authUrl
      });
    } catch (error) {
      console.error('Get auth URL error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to generate auth URL'
      });
    }
  };

  // GET /api/oauth/google/callback (public - redirect from Google)
  // Handle OAuth callback
  handleCallback = async (req, res) => {
    try {
      const { code, error } = req.query;

      if (error) {
        console.error('Google OAuth error:', error);
        return res.redirect('/admin/settings?calendar_error=' + encodeURIComponent(error));
      }

      if (!code) {
        return res.redirect('/admin/settings?calendar_error=no_code');
      }

      const result = await this.calendarService.handleCallback(code);

      console.log(`✅ Google Calendar connected: ${result.email}`);

      res.redirect('/admin/settings?calendar_connected=true');
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/admin/settings?calendar_error=' + encodeURIComponent(error.message));
    }
  };

  // POST /api/admin/google-calendar/disconnect
  // Disconnect Google Calendar
  disconnect = async (req, res) => {
    try {
      await this.calendarService.disconnect();

      res.json({
        success: true,
        message: 'Google Calendar disconnected'
      });
    } catch (error) {
      console.error('Disconnect error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disconnect calendar'
      });
    }
  };

  // POST /api/admin/google-calendar/test
  // Test connection by fetching today's events
  testConnection = async (req, res) => {
    try {
      const calendar = await this.calendarService.getCalendarClient();
      
      if (!calendar) {
        return res.status(400).json({
          success: false,
          message: 'Calendar not connected'
        });
      }

      const today = new Date().toISOString().split('T')[0];
      const busyTimes = await this.calendarService.getBusyTimes(today);

      res.json({
        success: true,
        message: 'Connection successful',
        busy_slots_today: busyTimes.length
      });
    } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Connection test failed'
      });
    }
  };
}

module.exports = GoogleCalendarController;
