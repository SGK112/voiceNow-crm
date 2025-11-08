import express from 'express';
import { getCalls, getCallById, deleteCall, initiateCall } from '../controllers/callController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getCalls);
router.post('/initiate', protect, initiateCall);
router.get('/:id', protect, getCallById);
router.delete('/:id', protect, deleteCall);

export default router;
