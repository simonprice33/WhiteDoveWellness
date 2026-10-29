/**
 * Google Calendar Service
 * Handles OAuth flow and calendar operations
 * Configuration stored in database for easy management
 */

const { google } = require('googleapis');

class GoogleCalendarService {
  constructor(collections) {
    this.collections = collections;
    this.oauth2Client = null;
    this.cachedConfig = null;
  }

  // Get configuration from database
  async getConfig() {
    const settings = await this.collections.siteSettings.findOne({ id: 'site_settings' });
    return settings?.google_calendar_config || null;
  }

  // Initialize OAuth client with credentials from database
  async initialize() {
    const config = await this.getConfig();
    
    if (!config?.client_id || !config?.client_secret) {
      console.log('⚠️ Google Calendar: Not configured (set up in Admin → Settings)');
      this.oauth2Client = null;
      this.cachedConfig = null;
      return false;
    }

    const redirectUri = config.redirect_uri || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/oauth/google/callback`;

    this.oauth2Client = new google.auth.OAuth2(
      config.client_id,
      config.client_secret,
      redirectUri
    );
    
    this.cachedConfig = config;
    console.log('✅ Google Calendar: OAuth client initialized from database config');
    return true;
  }

  // Re-initialize if config changed
  async ensureInitialized() {
    const config = await this.getConfig();
    
    if (!this.cachedConfig || 
        this.cachedConfig.client_id !== config?.client_id ||
        this.cachedConfig.client_secret !== config?.client_secret) {
      await this.initialize();
    }
    
    return this.isConfigured();
  }

  isConfigured() {
    return this.oauth2Client !== null;
  }

  // Save configuration to database
  async saveConfig(config) {
    await this.collections.siteSettings.updateOne(
      { id: 'site_settings' },
      {
        $set: {
          'google_calendar_config': {
            client_id: config.client_id,
            client_secret: config.client_secret,
            redirect_uri: config.redirect_uri || '',
            calendar_id: config.calendar_id || 'primary',
            updated_at: new Date().toISOString()
          }
        }
      },
      { upsert: true }
    );

    await this.initialize();
    console.log('✅ Google Calendar config saved to database');
    return true;
  }

  // Generate OAuth URL for admin to connect their calendar
  async getAuthUrl() {
    await this.ensureInitialized();
    
    if (!this.isConfigured()) {
      throw new Error('Google Calendar not configured. Please add credentials in Settings first.');
    }

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes
    });
  }

  // Exchange authorization code for tokens
  async handleCallback(code) {
    await this.ensureInitialized();
    
    if (!this.isConfigured()) {
      throw new Error('Google Calendar not configured');
    }

    const { tokens } = await this.oauth2Client.getToken(code);
    
    this.oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const config = await this.getConfig();

    await this.collections.siteSettings.updateOne(
      { id: 'site_settings' },
      {
        $set: {
          'google_calendar': {
            connected: true,
            email: userInfo.data.email,
            tokens: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expiry_date: tokens.expiry_date
            },
            calendar_id: config?.calendar_id || 'primary',
            connected_at: new Date().toISOString()
          }
        }
      },
      { upsert: true }
    );

    console.log(`✅ Google Calendar connected for: ${userInfo.data.email}`);
    return { email: userInfo.data.email };
  }

  // Get authenticated calendar client
  async getCalendarClient() {
    await this.ensureInitialized();
    
    if (!this.isConfigured()) {
      return null;
    }

    const settings = await this.collections.siteSettings.findOne({ id: 'site_settings' });
    const googleCal = settings?.google_calendar;

    if (!googleCal?.connected || !googleCal?.tokens) {
      return null;
    }

    this.oauth2Client.setCredentials({
      access_token: googleCal.tokens.access_token,
      refresh_token: googleCal.tokens.refresh_token,
      expiry_date: googleCal.tokens.expiry_date
    });

    this.oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token || tokens.access_token) {
        await this.collections.siteSettings.updateOne(
          { id: 'site_settings' },
          {
            $set: {
              'google_calendar.tokens.access_token': tokens.access_token,
              ...(tokens.refresh_token && { 'google_calendar.tokens.refresh_token': tokens.refresh_token }),
              'google_calendar.tokens.expiry_date': tokens.expiry_date
            }
          }
        );
        console.log('✅ Google Calendar tokens refreshed');
      }
    });

    return google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  // Get calendar ID from settings
  async getCalendarId() {
    const settings = await this.collections.siteSettings.findOne({ id: 'site_settings' });
    return settings?.google_calendar?.calendar_id || settings?.google_calendar_config?.calendar_id || 'primary';
  }

  // Create a calendar event for a booking
  async createBookingEvent(booking) {
    const calendar = await this.getCalendarClient();
    if (!calendar) {
      console.log('⚠️ Google Calendar not connected - skipping event creation');
      return null;
    }

    try {
      const calendarId = await this.getCalendarId();
      
      const [year, month, day] = booking.booking_date.split('-').map(Number);
      const [hours, minutes] = booking.booking_time.split(':').map(Number);
      
      const startTime = new Date(year, month - 1, day, hours, minutes);
      const endTime = new Date(startTime.getTime() + booking.duration_minutes * 60000);

      const event = {
        summary: `${booking.therapy_name} - ${booking.client_name}`,
        description: [
          `Client: ${booking.client_name}`,
          `Email: ${booking.client_email}`,
          `Phone: ${booking.client_phone}`,
          `Therapy: ${booking.therapy_name}`,
          `Duration: ${booking.duration_minutes} minutes`,
          `Price: £${booking.price_amount}`,
          booking.is_home_visit ? `Location: ${booking.client_address} (Home Visit)` : 'Location: Clinic',
          booking.notes ? `Notes: ${booking.notes}` : ''
        ].filter(Boolean).join('\n'),
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Europe/London'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Europe/London'
        },
        location: booking.is_home_visit ? booking.client_address : undefined,
        colorId: '9',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 15 }
          ]
        }
      };

      const response = await calendar.events.insert({
        calendarId,
        resource: event
      });

      console.log(`✅ Google Calendar event created: ${response.data.id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to create Google Calendar event:', error.message);
      return null;
    }
  }

  // Get busy times from Google Calendar for availability checking
  async getBusyTimes(dateStr) {
    const calendar = await this.getCalendarClient();
    if (!calendar) {
      return [];
    }

    try {
      const calendarId = await this.getCalendarId();
      
      const [year, month, day] = dateStr.split('-').map(Number);
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0);
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59);

      const response = await calendar.freebusy.query({
        resource: {
          timeMin: startOfDay.toISOString(),
          timeMax: endOfDay.toISOString(),
          timeZone: 'Europe/London',
          items: [{ id: calendarId }]
        }
      });

      const busy = response.data.calendars[calendarId]?.busy || [];
      
      const busyRanges = busy.map(period => {
        const start = new Date(period.start);
        const end = new Date(period.end);
        return {
          start: start.getHours() * 60 + start.getMinutes(),
          end: end.getHours() * 60 + end.getMinutes()
        };
      });

      return busyRanges;
    } catch (error) {
      console.error('❌ Failed to get Google Calendar busy times:', error.message);
      return [];
    }
  }

  // Disconnect Google Calendar
  async disconnect() {
    await this.collections.siteSettings.updateOne(
      { id: 'site_settings' },
      {
        $set: {
          'google_calendar': {
            connected: false,
            email: null,
            tokens: null,
            calendar_id: null,
            connected_at: null
          }
        }
      }
    );

    console.log('✅ Google Calendar disconnected');
    return true;
  }

  // Get connection status
  async getStatus() {
    await this.ensureInitialized();
    
    const settings = await this.collections.siteSettings.findOne({ id: 'site_settings' });
    const googleCal = settings?.google_calendar;
    const config = settings?.google_calendar_config;

    return {
      configured: this.isConfigured(),
      connected: googleCal?.connected || false,
      email: googleCal?.email || null,
      calendar_id: googleCal?.calendar_id || config?.calendar_id || 'primary',
      connected_at: googleCal?.connected_at || null,
      config: {
        has_client_id: !!config?.client_id,
        has_client_secret: !!config?.client_secret,
        redirect_uri: config?.redirect_uri || '',
        calendar_id: config?.calendar_id || 'primary',
        updated_at: config?.updated_at || null
      }
    };
  }

  // Get full config (for admin)
  async getFullConfig() {
    const settings = await this.collections.siteSettings.findOne({ id: 'site_settings' });
    const config = settings?.google_calendar_config || {};
    
    return {
      client_id: config.client_id || '',
      client_secret: config.client_secret ? '••••••••' : '',
      client_secret_set: !!config.client_secret,
      redirect_uri: config.redirect_uri || '',
      calendar_id: config.calendar_id || 'primary',
      updated_at: config.updated_at || null
    };
  }
}

module.exports = GoogleCalendarService;
