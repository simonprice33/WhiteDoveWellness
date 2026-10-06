export const helpSections = [
  {
    id: 'sumup',
    title: 'SumUp Online Payments',
    intro: 'Let customers pay by card when they book. Payments are taken on SumUp\'s secure checkout page and the money goes straight to your SumUp account. The booking is only confirmed once SumUp tells the website the payment succeeded.',
    steps: [
      {
        heading: '1. Create a SumUp API key',
        items: [
          'Log in at sumup.com and open your dashboard.',
          'Go to Settings → For developers → API keys (or visit me.sumup.com/developers).',
          'Click Create API key, give it a name such as "White Dove Website", and create it.',
          'Copy the secret key straight away (it starts with "sup_sk_"). SumUp only shows it once. Do not use the public key.',
          'Note your Merchant code (looks like "MABC1234"). It is shown on the same developer page and on your dashboard profile.'
        ]
      },
      {
        heading: '2. Enter the details in the admin panel',
        items: [
          'Go to Settings and scroll to "SumUp Online Payments".',
          'Paste the secret API key and your merchant code. Leave the currency as GBP unless your SumUp account uses something else.',
          'Click Save SumUp Configuration, then Test connection. A green "Connected" status means everything works.',
          'Tick "Require online payment (SumUp) to confirm booking" in the Booking Settings section and click Save Settings at the bottom of the page.'
        ]
      },
      {
        heading: '3. What customers see',
        items: [
          'After entering their details, the customer sees a "Pay £xx with SumUp" button.',
          'They are taken to SumUp\'s payment page, pay by card, and are returned to the website with a confirmation.',
          'The booking changes from "Pending Payment" to "Confirmed" automatically. You can see it in Bookings and on the dashboard.',
          'If the payment fails or they abandon it, the booking stays as "Pending Payment" and the customer can retry from the return page.'
        ]
      },
      {
        heading: 'Turning online payment off',
        items: [
          'Untick "Require online payment" in Booking Settings. Bookings are then taken as requests and you arrange payment yourself.',
          'Use Disconnect in the SumUp section to remove the stored API key entirely.'
        ]
      }
    ]
  },
  {
    id: 'google-calendar',
    title: 'Google Calendar Sync',
    intro: 'Connect your Google Calendar so the website knows when you are busy. If you also sync SumUp Bookings to the same Google Calendar, both systems share one view of your availability and double-bookings are avoided.',
    steps: [
      {
        heading: '1. Create Google credentials (one-time setup)',
        items: [
          'Visit console.cloud.google.com and create a project (e.g. "White Dove Wellness").',
          'Go to APIs & Services → Library, search for "Google Calendar API" and click Enable.',
          'Go to APIs & Services → OAuth consent screen. Choose External, enter the app name "White Dove Wellness" and your email, and add the scopes for calendar and calendar.events.',
          'Go to APIs & Services → Credentials → Create Credentials → OAuth client ID. Choose Web application.',
          'Under Authorised redirect URIs add: https://YOUR-DOMAIN/api/oauth/google/callback (replace YOUR-DOMAIN with your website address).',
          'Click Create and copy the Client ID and Client Secret.'
        ]
      },
      {
        heading: '2. Connect in the admin panel',
        items: [
          'Go to Settings and scroll to "Google Calendar Sync".',
          'Paste the Client ID and Client Secret. Leave Redirect URI empty unless you need a specific one. Use "primary" as the Calendar ID for your main calendar.',
          'Click Save Calendar Configuration, then Connect Google Calendar.',
          'Sign in with your Google account and allow access. You will be returned to Settings showing "Connected".',
          'Click Test to confirm the website can read your calendar.'
        ]
      },
      {
        heading: '3. Sync SumUp Bookings to the same calendar (optional)',
        items: [
          'In the SumUp dashboard open Bookings → Settings → Integrations / Calendar sync.',
          'Connect the same Google account and calendar you used above, and enable busy-time blocking.',
          'Appointments made in SumUp then appear in Google Calendar and the website treats those times as unavailable.'
        ]
      },
      {
        heading: 'Troubleshooting',
        items: [
          '"Calendar not connected": save the credentials first, then click Connect and complete the Google sign-in.',
          '"redirect_uri_mismatch" from Google: the redirect URI in Google Cloud must exactly match https://YOUR-DOMAIN/api/oauth/google/callback.',
          'Token or auth errors: click Disconnect, then Connect again to refresh access.',
          'Times not syncing: check the Calendar ID matches the calendar SumUp is writing to and allow a few minutes for Google to update.'
        ]
      }
    ]
  }
];
