# White Dove Wellness - PRD

## Project Overview
Reflexology business website for White Dove Wellness - Holistic Therapies. Single page application with full content management system and integrated booking system.

## Architecture
- **Frontend**: React 19 with Tailwind CSS, Framer Motion animations, Shadcn/UI components
- **Backend**: Node.js Express (SOLID architecture) proxied through Python FastAPI
- **Database**: MongoDB
- **Auth**: JWT with 20 minute access token, 5 hour refresh window
- **Payments**: SumUp Hosted Checkout integration (ready for API keys)

## User Personas
1. **Public Visitor**: Browse therapies, view prices, book appointments, submit contact form
2. **Business Owner (Admin)**: Manage all content, view contacts, track clients, manage bookings

## Core Requirements (Static)
- Single page public website with smooth scroll navigation
- Content managed therapies, prices, affiliations, policies
- Contact form with email notification (GoDaddy SMTP / Microsoft Graph)
- Client management with notes and consultations for admin
- Secure admin panel with JWT authentication
- Online booking system with payment integration

## What's Been Implemented

### Public Website
- [x] Sticky header with navigation links and "Book Now" button (when enabled)
- [x] Hero section with dynamic content management (title, subtitle, details, benefits)
- [x] Three images on desktop, one on mobile
- [x] Therapies section with 6 sample therapies + "Coming Soon" badge support
- [x] Therapy Details Modal - view full description and pricing on click
- [x] Prices section grouped by therapy with "Book Your Treatment" CTA
- [x] **Booking Modal** - Multi-step booking flow (therapy → price → date → time → details → payment)
- [x] Contact form (stores in DB + email notification)
- [x] About Me section (configurable in admin)
- [x] Affiliations section (auto-scrolling marquee if 4+, centered static if <4)
- [x] Footer with policies and social links (Facebook, Instagram)

### Booking System (NEW - Aug 30, 2026)
- [x] **Public Booking Flow**:
  - Step 1: Select therapy
  - Step 2: Select duration & price
  - Step 3: Choose date from calendar (respects working hours)
  - Step 4: Select available time slot
  - Step 5: Enter client details (name, email, phone, address for home visits)
  - Step 6: Proceed to payment (SumUp integration ready)
- [x] **Availability Management**:
  - Configurable working hours per day (Mon-Sun)
  - Configurable gap between appointments (travel time)
  - Advance booking window (how far ahead clients can book)
  - Date picker disables unavailable days
  - Time slots calculated based on therapy duration + gap
- [x] **Location Options**:
  - Fixed location only
  - Home visits only  
  - Both options (client chooses)
- [x] **Booking Status Flow**:
  - pending_payment → confirmed → completed
  - pending_payment → cancelled
  - confirmed → no_show / cancelled
- [x] **Admin Bookings Management**:
  - List view with status filters
  - Calendar view (monthly)
  - Booking detail modal with client info
  - Status update buttons (Confirm, Complete, No Show, Cancel)

### Admin Panel
- [x] Login with JWT authentication
- [x] Dashboard with stats overview
- [x] Therapies CRUD management
- [x] Prices CRUD management (linked to therapies)
- [x] **Bookings management** (list view, calendar view, status updates)
- [x] Contact submissions view
- [x] Client management with toggle-style UI
- [x] Client consultations (multi-section form with signature pad)
- [x] Client notes management
- [x] Affiliations CRUD management
- [x] Policies CRUD management
- [x] Admin users management
- [x] Site settings:
  - Business info, social links
  - Hero content
  - About Me section
  - Consultation form options
  - **Booking settings** (working hours, gap, advance days, location type)
- [x] Image upload system (logo, hero, contact, about me, affiliations)

### Backend (SOLID Architecture)
- [x] Separate controllers for each resource
- [x] **BookingController** with availability calculation
- [x] Auth service with JWT (20 min access, 5 hr refresh)
- [x] Email service (GoDaddy SMTP + Microsoft Graph toggle)
- [x] MongoDB with proper indexes
- [x] Image upload with Multer (stored in backend/uploads, served via /api/uploads/)
- [x] getImageUrl helper for consistent image URL handling

## Key API Endpoints

### Public
- `GET /api/bookings/settings` - Get booking configuration
- `GET /api/bookings/availability?date=YYYY-MM-DD&price_id=xxx` - Get available time slots
- `POST /api/bookings/create` - Create a booking (pending payment)
- `POST /api/bookings/:id/confirm` - Confirm payment (webhook/callback)
- `POST /api/bookings/:id/cancel` - Cancel pending booking

### Admin
- `GET /api/admin/bookings` - List all bookings (with filters)
- `GET /api/admin/bookings/calendar?month=X&year=YYYY` - Get calendar data
- `GET /api/admin/bookings/:id` - Get booking details
- `PUT /api/admin/bookings/:id` - Update booking
- `PUT /api/admin/bookings/:id/status` - Update booking status
- `DELETE /api/admin/bookings/:id` - Delete booking

## Database Schema

### Bookings Collection
```javascript
{
  id: String (UUID),
  price_id: String,
  therapy_id: String,
  therapy_name: String,
  price_name: String,
  price_amount: Number,
  duration_minutes: Number,
  booking_date: String (YYYY-MM-DD),
  booking_time: String (HH:MM),
  start_minutes: Number,
  end_minutes: Number,
  client_name: String,
  client_email: String,
  client_phone: String,
  client_address: String,
  is_home_visit: Boolean,
  notes: String,
  status: String (pending_payment|confirmed|completed|cancelled|no_show),
  payment_status: String (pending|paid),
  payment_id: String,
  payment_provider: String,
  created_at: ISODate,
  updated_at: ISODate,
  confirmed_at: ISODate,
  completed_at: ISODate,
  cancelled_at: ISODate
}
```

### booking_settings (in site_settings)
```javascript
{
  enabled: Boolean,
  gap_between_appointments: Number (minutes),
  advance_booking_days: Number,
  working_hours: {
    monday: { enabled: Boolean, start: "HH:MM", end: "HH:MM" },
    // ... for each day
  },
  location_type: String (fixed|mobile|both),
  fixed_location_address: String,
  email_notifications_enabled: Boolean
}
```

## Prioritized Backlog

### P0 (Critical) - DONE
- All core functionality implemented
- Booking system with availability management

### P1 (Important) - PENDING
- [ ] **SumUp Payment Integration** - Requires API keys from user
- [ ] Email notifications for booking confirmations
- [ ] User verification of all image uploads (logo, hero, about me)
- [ ] User verification of consultation form

### P2 (Nice to Have)
- [ ] Google Calendar sync
- [ ] SMS notifications (Twilio)
- [ ] Client appointment history in client management
- [ ] Analytics dashboard
- [ ] Newsletter subscription
- [ ] Gift voucher system

## SumUp Integration (Ready for Keys)

When you have your SumUp API credentials, provide:
- `SUMUP_API_KEY` - Your SumUp secret API key
- `SUMUP_MERCHANT_CODE` - Your merchant code

The integration uses **Hosted Checkout** which redirects customers to SumUp's payment page. After payment:
1. Customer is redirected back to your site
2. SumUp webhook confirms payment status
3. Booking automatically moves from `pending_payment` to `confirmed`

## Default Admin Credentials
- **URL**: `/admin/login`
- **Username**: `admin`
- **Password**: `admin123`
- ⚠️ CHANGE PASSWORD AFTER FIRST LOGIN
