import express from 'express';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentCalls,
  getAgentPerformance
} from '../controllers/agentController.js';
import { protect, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getAgents);
router.post('/create', protect, checkSubscription(), createAgent);
router.get('/:id', protect, getAgentById);
router.patch('/:id', protect, updateAgent);
router.delete('/:id', protect, deleteAgent);
router.get('/:id/calls', protect, getAgentCalls);
router.get('/:id/performance', protect, getAgentPerformance);

export default router;
