import express from 'express';
import { marketingChat, getElevenLabsToken, contactSales, requestVoiceDemo, getVoiceDemoTwiML } from '../controllers/publicChatController.js';

const router = express.Router();

// Public marketing chat endpoint (no authentication required)
router.post('/marketing-chat', marketingChat);

// Get ElevenLabs authentication token for ConvAI widget
router.get('/elevenlabs-token', getElevenLabsToken);

// Contact sales form submission (no authentication required)
router.post('/contact-sales', contactSales);

// Request voice demo call (no authentication required)
router.post('/voice-demo', requestVoiceDemo);

// TwiML endpoint for voice demo calls
router.post('/voice-demo-twiml', getVoiceDemoTwiML);

export default router;
