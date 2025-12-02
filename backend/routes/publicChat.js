import express from 'express';
import { marketingChat, getElevenLabsToken, contactSales, requestVoiceDemo, scheduleMeeting, handleBookingRequest } from '../controllers/publicChatController.js';

const router = express.Router();

// Public marketing chat endpoint (no authentication required)
router.post('/marketing-chat', marketingChat);

// Get ElevenLabs authentication token for ConvAI widget
router.get('/elevenlabs-token', getElevenLabsToken);

// Contact sales form submission (no authentication required)
router.post('/contact-sales', contactSales);

// Request voice demo call via ElevenLabs batch calling (no authentication required)
router.post('/voice-demo', requestVoiceDemo);

// Schedule a meeting/demo (no authentication required)
router.post('/schedule-meeting', scheduleMeeting);

// Booking request from book.html page (no authentication required)
router.post('/booking-request', handleBookingRequest);

export default router;
