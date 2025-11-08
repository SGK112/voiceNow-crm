import express from 'express';
import {
  getWorkflows,
  getWorkflowById,
  createWorkflow,
  updateWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  deleteWorkflow,
  getPrebuiltTemplates
} from '../controllers/workflowController.js';
import { protect, checkSubscription } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getWorkflows);
router.post('/', protect, createWorkflow);
router.get('/templates', protect, getPrebuiltTemplates);
router.get('/:id', protect, getWorkflowById);
router.patch('/:id', protect, updateWorkflow);
router.post('/:id/activate', protect, activateWorkflow);
router.post('/:id/deactivate', protect, deactivateWorkflow);
router.delete('/:id', protect, deleteWorkflow);

export default router;
