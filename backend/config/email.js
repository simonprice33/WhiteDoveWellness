/**
 * Email Configuration
 * Single Responsibility: Manages email sending via GoDaddy SMTP or Microsoft Graph
 */

const nodemailer = require('nodemailer');

class EmailConfig {
  constructor(config) {
    this.config = config;
    this.transporter = null;
    this.provider = config.emailProvider;
  }

  initialize() {
    if (this.provider === 'godaddy') {
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: true,
        auth: {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword
        }
      });
      console.log('✅ GoDaddy SMTP email configured');
    } else if (this.provider === 'microsoft') {
      // Microsoft Graph setup - will use API calls
      console.log('✅ Microsoft Graph email configured');
    } else {
      console.log('⚠️ No email provider configured - emails will be logged only');
    }
    
    return this;
  }

  getStatus() {
    return {
      configured: this.provider !== 'none',
      provider: this.provider
    };
  }

  async sendEmail(to, subject, text, html = null) {
    if (this.provider === 'none') {
      console.log('📧 Email (not sent - no provider):', { to, subject });
      return { success: false, reason: 'No email provider configured' };
    }

    try {
      if (this.provider === 'godaddy') {
        return await this.sendViaGoDaddy(to, subject, text, html);
      } else if (this.provider === 'microsoft') {
        return await this.sendViaMicrosoft(to, subject, text, html);
      }
    } catch (error) {
      console.error('❌ Email send error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendViaGoDaddy(to, subject, text, html) {
    const mailOptions = {
      from: this.config.smtpFrom,
      to,
      subject,
      text,
      html: html || text
    };

    const result = await this.transporter.sendMail(mailOptions);
    console.log('✅ Email sent via GoDaddy to:', to);
    return { success: true, messageId: result.messageId };
  }

  async sendViaMicrosoft(to, subject, text, html) {
    // Get access token
    const tokenUrl = `https://login.microsoftonline.com/${this.config.msTenantId}/oauth2/v2.0/token`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.msClientId,
        client_secret: this.config.msClientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials'
      })
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('Failed to get Microsoft access token');
    }

    // Send email via Graph API
    const sendUrl = `https://graph.microsoft.com/v1.0/users/${this.config.msUserId}/sendMail`;
    
    const emailData = {
      message: {
        subject,
        body: {
          contentType: html ? 'HTML' : 'Text',
          content: html || text
        },
        toRecipients: [{ emailAddress: { address: to } }]
      },
      saveToSentItems: 'true'
    };

    const response = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error(`Microsoft Graph error: ${response.status}`);
    }

    console.log('✅ Email sent via Microsoft Graph to:', to);
    return { success: true };
  }

  async sendContactNotification(name, email, phone, message) {
    if (!this.config.contactEmail) {
      console.log('⚠️ No contact email configured');
      return { success: false, reason: 'No contact email configured' };
    }

    const subject = `New Contact Form Submission from ${name}`;
    
    const text = `
New contact form submission:

Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}

Message:
${message}
    `;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Manrope', sans-serif; color: #374151; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #9F87C4 0%, #A7D7C5 100%); padding: 20px; border-radius: 8px 8px 0 0; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: 600; color: #6b7280; font-size: 14px; }
        .value { margin-top: 5px; font-size: 16px; }
        .message { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Contact Form Submission</h1>
        </div>
        <div class="content">
            <div class="field">
                <div class="label">Name</div>
                <div class="value">${name}</div>
            </div>
            <div class="field">
                <div class="label">Email</div>
                <div class="value"><a href="mailto:${email}">${email}</a></div>
            </div>
            <div class="field">
                <div class="label">Phone</div>
                <div class="value">${phone || 'Not provided'}</div>
            </div>
            <div class="field">
                <div class="label">Message</div>
                <div class="message">${message.replace(/\n/g, '<br>')}</div>
            </div>
        </div>
    </div>
</body>
</html>
    `;

    return await this.sendEmail(this.config.contactEmail, subject, text, html);
  }
}

module.exports = EmailConfig;
