import express from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  exportLeads,
  importLeads,
  getLeadStats
} from '../controllers/leadController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getLeads);
router.post('/', protect, createLead);
router.post('/import', protect, importLeads);
router.get('/export', protect, exportLeads);
router.get('/stats/summary', protect, getLeadStats);
router.get('/:id', protect, getLeadById);
router.patch('/:id', protect, updateLead);
router.delete('/:id', protect, deleteLead);

export default router;
