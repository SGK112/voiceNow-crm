import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  deployWorkflow,
  getDeploymentStatus
} from '../controllers/voiceflowDeploymentController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Deploy a workflow as a live agent
router.post('/deploy/:id', deployWorkflow);

// Get deployment status for a workflow
router.get('/status/:id', getDeploymentStatus);

export default router;
