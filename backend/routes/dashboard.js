import express from 'express';
import { getMetrics, getCallsToday, getLeadsThisMonth } from '../controllers/dashboardController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/metrics', protect, getMetrics);
router.get('/calls-today', protect, getCallsToday);
router.get('/leads-this-month', protect, getLeadsThisMonth);

export default router;
