/**
 * Public Routes
 * Routes accessible without authentication
 */

const express = require('express');

function createPublicRoutes(dependencies) {
  const router = express.Router();
  const { collections, emailConfig } = dependencies;

  // Import controllers
  const TherapyController = require('../controllers/TherapyController');
  const PriceController = require('../controllers/PriceController');
  const ContactController = require('../controllers/ContactController');
  const AffiliationController = require('../controllers/AffiliationController');
  const PolicyController = require('../controllers/PolicyController');
  const SettingsController = require('../controllers/SettingsController');
  const BookingController = require('../controllers/BookingController');

  // Initialize controllers
  const therapyController = new TherapyController(collections);
  const priceController = new PriceController(collections);
  const contactController = new ContactController(collections, emailConfig);
  const affiliationController = new AffiliationController(collections);
  const policyController = new PolicyController(collections);
  const settingsController = new SettingsController(collections);
  const bookingController = new BookingController(collections);

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'White Dove Wellness API is running',
      timestamp: new Date().toISOString()
    });
  });

  // Therapies (public)
  router.get('/therapies', therapyController.list);
  router.get('/therapies/:id', therapyController.get);

  // Prices (public)
  router.get('/prices', priceController.list);
  router.get('/prices/:id', priceController.get);

  // Contact (public)
  router.post('/contact', contactController.submit);

  // Affiliations (public)
  router.get('/affiliations', affiliationController.list);
  router.get('/affiliations/:id', affiliationController.get);

  // Policies (public)
  router.get('/policies', policyController.list);
  router.get('/policies/slug/:slug', policyController.getBySlug);
  router.get('/policies/:id', policyController.get);

  // Settings (public)
  router.get('/settings', settingsController.get);

  // Bookings (public)
  router.get('/bookings/settings', bookingController.getBookingSettings);
  router.get('/bookings/availability', bookingController.getAvailability);
  router.post('/bookings/create', bookingController.create);
  router.post('/bookings/:id/confirm', bookingController.confirmPayment);
  router.post('/bookings/:id/cancel', bookingController.cancelBooking);

  return router;
}

module.exports = createPublicRoutes;
