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
  getAgentTemplates,
  testCall,
  deployAgent,
  saveTestResult,
  getTestResults,
  getChangelog,
  getVoiceLibrary,
  addVoiceFromLibrary,
  getSavedVoices,
  saveVoiceToLibrary,
  removeVoiceFromLibrary,
  updateSavedVoice,
  testConversation,
  connectWorkflow,
  disconnectWorkflow
} from '../controllers/agentController.js';
import { protect, checkSubscription } from '../middleware/auth.js';
import { requirePlan } from '../middleware/subscriptionGate.js';

const router = express.Router();

// Agent CRUD
router.get('/', protect, getAgents);
// Agent creation - available to all users (removed plan requirement for now)
router.post('/create', protect, createAgent);
router.get('/:id', protect, getAgentById);
router.patch('/:id', protect, updateAgent);
router.delete('/:id', protect, deleteAgent);

// Agent testing
router.post('/test-call', protect, testCall);
router.post('/test-conversation', protect, testConversation);

// Agent lifecycle management
router.post('/:id/deploy', protect, deployAgent);
router.post('/:id/test-results', protect, saveTestResult);
router.get('/:id/test-results', protect, getTestResults);
router.get('/:id/changelog', protect, getChangelog);

// Agent performance and calls
router.get('/:id/calls', protect, getAgentCalls);
router.get('/:id/performance', protect, getAgentPerformance);

// Agent creation helpers
router.get('/helpers/voices', protect, getVoices);
router.get('/helpers/templates', protect, getAgentTemplates);

// Voice Library - Browse & Add from ElevenLabs shared voices
router.get('/helpers/voice-library', protect, getVoiceLibrary);
router.post('/helpers/voice-library/add', protect, addVoiceFromLibrary);

// User Voice Library - Personal saved voices
router.get('/voices/saved', protect, getSavedVoices);
router.post('/voices/saved', protect, saveVoiceToLibrary);
router.delete('/voices/saved/:voiceId', protect, removeVoiceFromLibrary);
router.patch('/voices/saved/:voiceId', protect, updateSavedVoice);

// Agent-Workflow Connection
router.post('/:id/connect-workflow', protect, connectWorkflow);
router.delete('/:id/disconnect-workflow', protect, disconnectWorkflow);

export default router;
