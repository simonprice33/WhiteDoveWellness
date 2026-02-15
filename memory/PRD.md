# White Dove Wellness - PRD

## Project Overview
Reflexology business website for White Dove Wellness - Holistic Therapies. Single page application with full content management system.

## Architecture
- **Frontend**: React 19 with Tailwind CSS, Framer Motion animations
- **Backend**: Node.js Express (SOLID architecture) proxied through Python FastAPI
- **Database**: MongoDB
- **Auth**: JWT with 20 minute access token, 5 hour refresh window

## User Personas
1. **Public Visitor**: Browse therapies, view prices, submit contact form
2. **Business Owner (Admin)**: Manage all content, view contacts, track clients

## Core Requirements (Static)
- Single page public website with smooth scroll navigation
- Content managed therapies, prices, affiliations, policies
- Contact form with email notification (GoDaddy SMTP / Microsoft Graph)
- Client management with notes for admin
- Secure admin panel with JWT authentication

## What's Been Implemented (Feb 15, 2026)

### Public Website
- [x] Sticky header with navigation links
- [x] Hero section with dynamic content management (title, subtitle, details, benefits)
- [x] Three images on desktop, one on mobile
- [x] Therapies section with 6 sample therapies
- [x] Therapy Details Modal - view full description and pricing on click
- [x] Prices section grouped by therapy
- [x] Contact form (stores in DB + email notification)
- [x] Affiliations section (auto-scrolling marquee if 4+, centered static if <4)
- [x] Footer with policies and social links (Facebook, Instagram)

### Admin Panel
- [x] Login with JWT authentication
- [x] Dashboard with stats overview
- [x] Therapies CRUD management
- [x] Prices CRUD management (linked to therapies)
- [x] Contact submissions view
- [x] Client management with accordion-style UI (Feb 15, 2026)
  - Click client to view details (hides list)
  - Styled "Close" button to return to list
- [x] Client notes management
- [x] Affiliations CRUD management
- [x] Policies CRUD management
- [x] Admin users management
- [x] Site settings (social links, business info, hero content)
- [x] Image upload system (stores in backend/public/uploads, served statically)

### Backend (SOLID Architecture)
- [x] Separate controllers for each resource
- [x] Auth service with JWT (20 min access, 5 hr refresh)
- [x] Email service (GoDaddy SMTP + Microsoft Graph toggle)
- [x] MongoDB with proper indexes
- [x] Image upload with Multer (stored in backend/public/uploads)
- [x] Static file serving via Express for uploaded images

### Build System (Feb 2026)
- [x] Frontend uses @craco/craco for webpack configuration
- [x] Compatible with Node.js v24+ environments
- [x] Webpack alias for '@/' to 'src/' directory

## Prioritized Backlog

### P0 (Critical) - DONE
- All core functionality implemented

### P1 (Important)
- [ ] Image upload for therapies
- [ ] Booking/appointment system integration
- [ ] Email provider configuration (GoDaddy/Microsoft)

### P2 (Nice to Have)
- [ ] Client appointment history
- [ ] Analytics dashboard
- [ ] Newsletter subscription
- [ ] Gift voucher system

## Next Tasks
1. Configure email provider in .env (SMTP or Microsoft Graph)
2. Replace placeholder affiliation logos with real ones
3. Add actual business contact details in Settings
4. Consider booking integration (Calendly, Acuity, etc.)

## Default Admin Credentials
- Username: `admin`
- Password: `admin123`
- ⚠️ CHANGE PASSWORD AFTER FIRST LOGIN
