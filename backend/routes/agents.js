import express from 'express';
import {
  getAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentCalls,
  getAgentPerformance,
  getVoices,
  getAgentTemplates
} from '../controllers/agentController.js';
import { protect, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

// Agent CRUD
router.get('/', protect, getAgents);
// Temporarily removed subscription check for testing
router.post('/create', protect, createAgent);
router.get('/:id', protect, getAgentById);
router.patch('/:id', protect, updateAgent);
router.delete('/:id', protect, deleteAgent);

// Agent performance and calls
router.get('/:id/calls', protect, getAgentCalls);
router.get('/:id/performance', protect, getAgentPerformance);

// Agent creation helpers
router.get('/helpers/voices', protect, getVoices);
router.get('/helpers/templates', protect, getAgentTemplates);

export default router;
