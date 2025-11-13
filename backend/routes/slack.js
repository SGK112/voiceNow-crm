import express from 'express';
import {
  testWebhook,
  saveWebhook,
  getSettings,
  getChannels,
  disableNotifications
} from '../controllers/slackController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Webhook management
router.post('/webhook/test', testWebhook);
router.post('/webhook/save', saveWebhook);
router.get('/settings', getSettings);
router.post('/disable', disableNotifications);

// OAuth channel management
router.get('/channels', getChannels);

export default router;
