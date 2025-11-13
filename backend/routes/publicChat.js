import express from 'express';
import { marketingChat, getElevenLabsToken, contactSales } from '../controllers/publicChatController.js';

const router = express.Router();

// Public marketing chat endpoint (no authentication required)
router.post('/marketing-chat', marketingChat);

// Get ElevenLabs authentication token for ConvAI widget
router.get('/elevenlabs-token', getElevenLabsToken);

// Contact sales form submission (no authentication required)
router.post('/contact-sales', contactSales);

export default router;
