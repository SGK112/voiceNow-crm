import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getCurrentUsage,
  getUsageHistory,
  getPlanDetails,
  getUpcomingInvoice,
  getInvoiceHistory
} from '../controllers/billingController.js';

const router = express.Router();

// All billing routes require authentication
router.use(protect);

// Usage and overage endpoints
router.get('/usage/current', getCurrentUsage);
router.get('/usage/history', getUsageHistory);

// Plan information
router.get('/plan', getPlanDetails);

// Invoice endpoints
router.get('/invoice/upcoming', getUpcomingInvoice);
router.get('/invoice/history', getInvoiceHistory);

export default router;
