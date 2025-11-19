import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getCreditBalance,
  purchaseCredits,
  confirmPayment,
  getTransactions,
  getUsageSummary,
  updateAutoRecharge
} from '../controllers/usageCreditsController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get credit balance
router.get('/', getCreditBalance);

// Purchase credits
router.post('/purchase', purchaseCredits);

// Confirm payment (after Stripe confirmation)
router.post('/confirm-payment', confirmPayment);

// Get transaction history
router.get('/transactions', getTransactions);

// Get usage summary
router.get('/summary', getUsageSummary);

// Update auto-recharge settings
router.patch('/auto-recharge', updateAutoRecharge);

export default router;
