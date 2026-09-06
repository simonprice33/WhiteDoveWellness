# How to Connect SumUp Bookings with Google Calendar

Since SumUp Bookings does not have a public API for direct integration, you can use **Google Calendar as the central hub** for two-way synchronization with your White Dove Wellness website.

## Overview

```
┌─────────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  SumUp Bookings     │────▶│  Google Calendar │◀────│  White Dove Website │
│  (Native Sync)      │     │  (Central Hub)   │     │  (API Integration)  │
└─────────────────────┘     └──────────────────┘     └─────────────────────┘
```

**How it works:**
1. SumUp Bookings has a native integration that syncs directly to Google Calendar
2. White Dove Wellness reads from Google Calendar to check availability
3. White Dove Wellness writes to Google Calendar when new bookings are made
4. Both systems see a unified view of your availability

---

## Step 1: Connect SumUp Bookings to Google Calendar

### In SumUp (Takes 2 minutes)

1. **Open SumUp Dashboard**
   - Go to [sumup.com](https://sumup.com) and log in
   - Navigate to **Bookings** section

2. **Access Integration Settings**
   - Click **Settings** (gear icon)
   - Select **Integrations** or **Calendar Sync**

3. **Connect Google Calendar**
   - Click **Connect Google Calendar**
   - Sign in with the Google account you want to use
   - Grant the requested permissions
   - Select which calendar to sync with (e.g., "Work Calendar" or create a new "Bookings" calendar)

4. **Configure Sync Settings**
   - Enable **Two-way sync** if available
   - Set **Busy time blocking** so your SumUp appointments block time on Google Calendar
   - Save settings

✅ **Result:** All SumUp bookings now appear on your Google Calendar automatically.

---

## Step 2: Connect White Dove Website to Google Calendar

### Create Google Cloud Credentials (One-time setup)

1. **Go to Google Cloud Console**
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select an existing one

2. **Enable Google Calendar API**
   - Go to **APIs & Services** → **Library**
   - Search for "Google Calendar API"
   - Click **Enable**

3. **Create OAuth Credentials**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Select **Web application**
   - Add these Authorized Redirect URIs:
     - `https://your-domain.com/api/oauth/google/callback`
     - `http://localhost:3001/api/oauth/google/callback` (for development)
   - Click **Create**
   - **Copy the Client ID and Client Secret** (you'll need these)

4. **Configure OAuth Consent Screen**
   - Go to **OAuth consent screen**
   - Select **External** (or Internal for Google Workspace)
   - Fill in App name: "White Dove Wellness"
   - Add your email as support email
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
   - Save

### Configure in White Dove Admin Panel

1. **Log into Admin Panel**
   - Go to `/admin/login`
   - Enter your admin credentials

2. **Navigate to Settings**
   - Click **Settings** in the sidebar

3. **Find Google Calendar Section**
   - Scroll to the "Google Calendar Sync" section

4. **Enter Your Credentials**
   - **Client ID:** Paste the Client ID from Google Cloud
   - **Client Secret:** Paste the Client Secret from Google Cloud
   - **Redirect URI:** Leave as default or enter your production URL
   - **Calendar ID:** Use `primary` or enter a specific calendar ID
   - Click **Save Configuration**

5. **Connect Your Account**
   - Click **Connect Google Calendar**
   - You'll be redirected to Google
   - Sign in with the **same Google account** you connected to SumUp
   - Grant permissions
   - You'll be redirected back to the admin panel

✅ **Result:** White Dove Website now reads and writes to the same Google Calendar as SumUp.

---

## Step 3: How It Works After Setup

### When a Customer Books via SumUp:
1. SumUp creates the appointment
2. SumUp syncs it to Google Calendar
3. White Dove Website sees the busy time and blocks that slot

### When a Customer Books via White Dove Website:
1. Website creates the booking
2. Website adds event to Google Calendar
3. SumUp sees the busy time and blocks that slot

### Unified Availability:
- Both systems respect each other's bookings
- No double-bookings possible
- You see all appointments in one Google Calendar

---

## Troubleshooting

### "Calendar not connected" error
- Ensure you've saved the OAuth credentials first
- Click "Connect Google Calendar" and complete the authorization

### Bookings not syncing
- Check that SumUp is syncing to the same Google Calendar
- Verify the Calendar ID in admin settings matches your calendar
- Wait a few minutes - sync may have a small delay

### "Token expired" or auth errors
- Click "Disconnect" and then "Connect" again
- This refreshes the OAuth tokens

---

## Security Notes

- Your Google credentials are stored securely in the database
- Tokens are encrypted and refreshed automatically
- The website only has access to the specific calendar you authorize
- You can revoke access anytime from Google Account Settings

---

## Support

If you need help with the setup:
1. Check the [Google Calendar API documentation](https://developers.google.com/calendar)
2. Check the [SumUp Help Center](https://help.sumup.com) for their calendar integration
3. Contact your website administrator

---

*Last updated: December 2025*
