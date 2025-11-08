import express from 'express';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  exportLeads
} from '../controllers/leadController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getLeads);
router.post('/', protect, createLead);
router.get('/export', protect, exportLeads);
router.get('/:id', protect, getLeadById);
router.patch('/:id', protect, updateLead);
router.delete('/:id', protect, deleteLead);

export default router;
