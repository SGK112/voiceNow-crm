import express from 'express';
import {
  getPlans,
  createSubscription,
  cancelSubscription,
  updateSubscription,
  getInvoices
} from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/plans', getPlans);
router.post('/create', protect, createSubscription);
router.post('/cancel', protect, cancelSubscription);
router.patch('/update', protect, updateSubscription);
router.get('/invoices', protect, getInvoices);

export default router;
