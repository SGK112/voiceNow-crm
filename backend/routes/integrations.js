import express from 'express';
import {
  getIntegrations,
  getIntegration,
  deleteIntegration,
  googleAuthStart,
  googleAuthCallback,
  slackAuthStart,
  slackAuthCallback,
  getValidAccessToken,
  testIntegration
} from '../controllers/integrationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Integration management
router.get('/', getIntegrations);
router.get('/:id', getIntegration);
router.delete('/:id', deleteIntegration);
router.get('/:id/test', testIntegration);

// Get valid access token for a service
router.get('/token/:service', getValidAccessToken);

// Google OAuth routes
router.get('/google/auth', googleAuthStart);
router.get('/google/callback', googleAuthCallback);

// Slack OAuth routes
router.get('/slack/auth', slackAuthStart);
router.get('/slack/callback', slackAuthCallback);

export default router;
