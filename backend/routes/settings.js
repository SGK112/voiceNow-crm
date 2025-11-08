import express from 'express';
import {
  getSettings,
  updateSettings,
  updateApiKeys,
  getApiKeys,
  addPhoneNumber,
  removePhoneNumber,
  addTeamMember,
  removeTeamMember
} from '../controllers/settingsController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getSettings);
router.patch('/', protect, updateSettings);
router.get('/api-keys', protect, getApiKeys);
router.patch('/api-keys', protect, updateApiKeys);
router.post('/phone-numbers', protect, addPhoneNumber);
router.delete('/phone-numbers/:numberId', protect, removePhoneNumber);
router.post('/team-members', protect, addTeamMember);
router.delete('/team-members/:memberId', protect, removeTeamMember);

export default router;
