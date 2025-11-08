import express from 'express';
import { handleElevenLabsWebhook, handleN8nWebhook } from '../controllers/webhookController.js';
import { handleStripeWebhook } from '../controllers/subscriptionController.js';
import { handleCallCompletion, handleCallEvent } from '../controllers/callWebhookController.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ElevenLabs webhooks
router.post('/elevenlabs', webhookLimiter, handleElevenLabsWebhook);
router.post('/elevenlabs/call-completed', webhookLimiter, handleCallCompletion);
router.post('/elevenlabs/call-event', webhookLimiter, handleCallEvent);

// N8N webhooks
router.post('/n8n', webhookLimiter, handleN8nWebhook);

// Stripe webhooks
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
