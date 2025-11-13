import express from 'express';
import { marketingChat } from '../controllers/publicChatController.js';

const router = express.Router();

// Public marketing chat endpoint (no authentication required)
router.post('/marketing-chat', marketingChat);

export default router;
