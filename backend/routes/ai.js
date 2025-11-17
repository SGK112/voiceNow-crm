import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  checkAIAvailability,
  improveScript,
  getScriptSuggestions,
  generateScript,
  generateWorkflow,
  configureNode,
  analyzeAgentPerformance,
  getCallInsights,
  aiChat
} from '../controllers/aiController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Check if AI service is available
router.get('/availability', checkAIAvailability);

// AI Chat for conversational agent building
router.post('/chat', aiChat);

// Script improvement and generation
router.post('/improve-script', improveScript);
router.post('/suggestions', getScriptSuggestions);
router.post('/generate-script', generateScript);

// Workflow generation
router.post('/generate-workflow', generateWorkflow);

// Node configuration assistance
router.post('/configure-node', configureNode);

// Analytics and insights
router.get('/agent/:agentId/analyze', analyzeAgentPerformance);
router.get('/insights', getCallInsights);

export default router;
