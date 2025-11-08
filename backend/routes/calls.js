import express from 'express';
import { getCalls, getCallById, deleteCall } from '../controllers/callController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getCalls);
router.get('/:id', protect, getCallById);
router.delete('/:id', protect, deleteCall);

export default router;
