import express from 'express';
import {
  getAIAgents,
  getAIAgent,
  createAIAgent,
  updateAIAgent,
  deleteAIAgent,
  chatWithAgent,
  deployAIAgent,
  pauseAIAgent,
  getAvailableModels,
  getAIAgentTemplates,
  testAIAgent
} from '../controllers/aiAgentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// AI Agent CRUD
router.get('/', protect, getAIAgents);
router.get('/helpers/models', protect, getAvailableModels);
router.get('/helpers/templates', protect, getAIAgentTemplates);
router.get('/:id', protect, getAIAgent);
router.post('/create', protect, createAIAgent);
router.patch('/:id', protect, updateAIAgent);
router.delete('/:id', protect, deleteAIAgent);

// AI Agent Operations
router.post('/:id/chat', protect, chatWithAgent);
router.post('/:id/deploy', protect, deployAIAgent);
router.post('/:id/pause', protect, pauseAIAgent);
router.post('/:id/test', protect, testAIAgent);

export default router;
