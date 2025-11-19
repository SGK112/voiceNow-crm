import express from 'express';
import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  deleteWorkflow,
  getPrebuiltTemplates,
  getWorkflowWebhookUrl
} from '../controllers/workflowController.js';
import { protect, checkSubscription } from '../middleware/auth.js';
import { requirePlan } from '../middleware/subscriptionGate.js';

const router = express.Router();

router.get('/', protect, getWorkflows);
// Workflow creation available for all users
router.post('/', protect, createWorkflow);
router.get('/templates', protect, getPrebuiltTemplates);
router.get('/:id', protect, getWorkflowById);
router.get('/:workflowId/webhook-url', protect, getWorkflowWebhookUrl);
router.patch('/:id', protect, updateWorkflow);
router.post('/:id/activate', protect, activateWorkflow);
router.post('/:id/deactivate', protect, deactivateWorkflow);
router.delete('/:id', protect, deleteWorkflow);

export default router;
