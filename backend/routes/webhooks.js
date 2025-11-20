import express from 'express';
import { handleElevenLabsWebhook, handleN8nWebhook } from '../controllers/webhookController.js';
import { handleStripeWebhook } from '../controllers/subscriptionController.js';
import { handleCallCompletion, handleCallEvent } from '../controllers/callWebhookController.js';
import {
  handleTwilioVoice,
  handleTwilioStatus,
  handleElevenLabsForward,
  handleElevenLabsOutbound,
  handleTwilioSms,
  handleTwilioSmsFallback,
  handleAgentCall
} from '../controllers/twilioWebhookController.js';
import {
  sendSignupLinkAction,
  handlePostCallFollowUp,
  handleConversationEvent,
  testWebhook,
  handleCallComplete
} from '../controllers/elevenLabsWebhookController.js';
import { webhookLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ElevenLabs webhooks
router.post('/elevenlabs', webhookLimiter, handleElevenLabsWebhook);
router.post('/elevenlabs/call-completed', webhookLimiter, handleCallCompletion);
router.post('/elevenlabs/call-event', webhookLimiter, handleCallEvent);

// ElevenLabs CRM auto-population webhook (per-agent)
router.post('/elevenlabs/:agentId', webhookLimiter, handleCallComplete);

// ElevenLabs real-time action webhooks
router.post('/elevenlabs/send-signup-link', sendSignupLinkAction);
router.post('/elevenlabs/post-call-followup', handlePostCallFollowUp);
router.post('/elevenlabs/conversation-event', handleConversationEvent);
router.get('/elevenlabs/test', testWebhook);
router.post('/elevenlabs/test', testWebhook);

// Twilio webhooks
router.post('/twilio/voice', handleTwilioVoice);
router.post('/twilio/status', handleTwilioStatus);
router.post('/twilio/agent-call', handleAgentCall); // NEW: Handle outbound agent calls
router.post('/twilio/call-status', handleTwilioStatus); // Alias for call status updates
router.post('/twilio/elevenlabs-forward', handleElevenLabsForward);
router.post('/twilio/elevenlabs-outbound', handleElevenLabsOutbound);
router.post('/twilio/sms', handleTwilioSms);
router.post('/twilio/sms-fallback', handleTwilioSmsFallback);

// N8N webhooks
router.post('/n8n', webhookLimiter, handleN8nWebhook);

// Stripe webhooks
router.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

export default router;
