# White Dove Wellness - PRD

## Project Overview
Reflexology business website for White Dove Wellness - Holistic Therapies. Single page application with full content management system.

## Architecture
- **Frontend**: React 18 with Tailwind CSS, Framer Motion animations
- **Backend**: Node.js Express (SOLID architecture) proxied through Python FastAPI
- **Database**: MongoDB
- **Auth**: JWT with 20 minute access token, 5 hour refresh window
- **Image Uploads**: Multer → `/backend/uploads/` → served via `/api/uploads/`

## User Personas
1. **Public Visitor**: Browse therapies, view prices, submit contact form
2. **Business Owner (Admin)**: Manage all content, view contacts, track clients

## Core Requirements (Static)
- Single page public website with smooth scroll navigation
- Content managed therapies, prices, affiliations, policies
- Contact form with email notification (GoDaddy SMTP / Microsoft Graph)
- Client management with notes for admin
- Secure admin panel with JWT authentication
- **Image uploads** directly from admin panel (no URL entry required)

## What's Been Implemented

### Jan 30, 2026 - Image Upload Fix (P0 RESOLVED)
- [x] **Fixed image upload display issue** - Images now served via `/api/uploads/` path
- [x] Images stored in `/backend/uploads/` directory
- [x] Works with `npm start` (proxy) and nginx (production)
- [x] No rebuild required when images are uploaded

### Public Website
- [x] Sticky header with navigation links
- [x] Hero section with White Dove Wellness logo (400x300)
- [x] Hero section content management (title, subtitle, details, benefits)
- [x] Three images on desktop, one on mobile
- [x] Therapies section with "View Details" modal
- [x] Prices section grouped by therapy
- [x] Contact form (stores in DB + email notification)
- [x] Affiliations section (carousel with 4+ items, static with fewer)
- [x] Footer with policies and social links (Facebook, Instagram)

### Admin Panel
- [x] Login with JWT authentication
- [x] Dashboard with stats overview
- [x] Therapies CRUD management
- [x] Prices CRUD management (linked to therapies)
- [x] Contact submissions view
- [x] Client management with notes
- [x] **Affiliations CRUD with image upload**
- [x] Policies CRUD management
- [x] Admin users management
- [x] Site settings (social links, business info, hero content)

### Backend (SOLID Architecture)
- [x] Separate controllers for each resource
- [x] Auth service with JWT (20 min access, 5 hr refresh)
- [x] Email service (GoDaddy SMTP + Microsoft Graph toggle)
- [x] MongoDB with proper indexes
- [x] **Image upload via Multer**

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Image upload display issue resolved

### P1 (Important)
- [ ] User verification of hero section content management
- [ ] Image upload for therapies (similar to affiliations)
- [ ] Booking/appointment system integration
- [ ] Email provider configuration (GoDaddy/Microsoft)

### P2 (Nice to Have)
- [ ] Replace placeholder affiliation logos with real ones
- [ ] Client appointment history
- [ ] Analytics dashboard
- [ ] Newsletter subscription
- [ ] Gift voucher system

## Local Development Instructions

**IMPORTANT**: Use `npm start` for local development, NOT `serve -s build`

```bash
# Terminal 1 - Backend
cd backend
npm start   # or node server.js

# Terminal 2 - Frontend  
cd frontend
npm start   # Uses proxy to forward /api/ to backend
```

The `proxy` in `package.json` forwards `/api/` requests to your backend, which is required for image uploads to work.

## Default Admin Credentials
- Username: `admin`
- Password: `admin123`
- ⚠️ CHANGE PASSWORD AFTER FIRST LOGIN
