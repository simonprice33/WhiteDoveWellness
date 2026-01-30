/**
 * Admin Routes
 * Routes requiring authentication
 */

const express = require('express');

function createAdminRoutes(dependencies) {
  const router = express.Router();
  const { collections, authMiddleware, emailConfig } = dependencies;

  // Import controllers
  const AuthController = require('../controllers/AuthController');
  const AdminUserController = require('../controllers/AdminUserController');
  const TherapyController = require('../controllers/TherapyController');
  const PriceController = require('../controllers/PriceController');
  const ContactController = require('../controllers/ContactController');
  const AffiliationController = require('../controllers/AffiliationController');
  const PolicyController = require('../controllers/PolicyController');
  const SettingsController = require('../controllers/SettingsController');
  const ClientController = require('../controllers/ClientController');
  const UploadController = require('../controllers/UploadController');

  // Initialize controllers
  const authController = new AuthController(collections, authMiddleware);
  const adminUserController = new AdminUserController(collections);
  const therapyController = new TherapyController(collections);
  const priceController = new PriceController(collections);
  const contactController = new ContactController(collections, emailConfig);
  const affiliationController = new AffiliationController(collections);
  const policyController = new PolicyController(collections);
  const settingsController = new SettingsController(collections);
  const clientController = new ClientController(collections);
  const uploadController = new UploadController();

  // Auth routes (no auth required)
  router.post('/auth/login', authController.login);
  router.post('/auth/refresh', authController.refresh);

  // Protected routes (auth required)
  router.use(authMiddleware.authenticate);

  // Current user
  router.get('/auth/me', authController.getCurrentUser);

  // Image Upload
  router.post('/upload', uploadController.upload.single('image'), uploadController.uploadImage);
  router.delete('/upload/:filename', uploadController.deleteImage);

  // Admin Users
  router.get('/users', adminUserController.list);
  router.get('/users/:id', adminUserController.get);
  router.post('/users', adminUserController.create);
  router.put('/users/:id', adminUserController.update);
  router.delete('/users/:id', adminUserController.delete);

  // Therapies (admin)
  router.post('/therapies', therapyController.create);
  router.put('/therapies/:id', therapyController.update);
  router.delete('/therapies/:id', therapyController.delete);

  // Prices (admin)
  router.post('/prices', priceController.create);
  router.put('/prices/:id', priceController.update);
  router.delete('/prices/:id', priceController.delete);

  // Contacts (admin)
  router.get('/contacts', contactController.list);
  router.get('/contacts/:id', contactController.get);
  router.put('/contacts/:id/read', contactController.markAsRead);
  router.put('/contacts/:id/notes', contactController.updateNotes);
  router.delete('/contacts/:id', contactController.delete);

  // Affiliations (admin)
  router.post('/affiliations', affiliationController.create);
  router.put('/affiliations/:id', affiliationController.update);
  router.delete('/affiliations/:id', affiliationController.delete);

  // Policies (admin)
  router.post('/policies', policyController.create);
  router.put('/policies/:id', policyController.update);
  router.delete('/policies/:id', policyController.delete);

  // Settings (admin)
  router.put('/settings', settingsController.update);

  // Clients (admin)
  router.get('/clients', clientController.list);
  router.get('/clients/:id', clientController.get);
  router.post('/clients', clientController.create);
  router.put('/clients/:id', clientController.update);
  router.delete('/clients/:id', clientController.delete);

  // Client Notes (admin)
  router.get('/clients/:id/notes', clientController.listNotes);
  router.post('/clients/:id/notes', clientController.createNote);
  router.put('/clients/:id/notes/:noteId', clientController.updateNote);
  router.delete('/clients/:id/notes/:noteId', clientController.deleteNote);

  return router;
}

module.exports = createAdminRoutes;
