import express from 'express';
import twilio from 'twilio';
import ElevenLabsService from '../services/elevenLabsService.js';

const router = express.Router();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

// Demo agent configuration (same as marketing page)
const DEMO_AGENT_ID = process.env.ELEVENLABS_DEMO_AGENT_ID || 'agent_9301k802kktwfbhrbe9bam7f1spe';
const DEMO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Handle incoming SMS for short code workflow
 * User texts "DEMO" to trigger a demo call
 */
router.post('/trigger-demo-call', async (req, res) => {
  try {
    const { From, Body } = req.body;
    const message = Body?.trim().toLowerCase();

    console.log(`📱 SMS received from ${From}: "${Body}"`);

    // Check if message is "demo" (case insensitive)
    if (message === 'demo') {
      console.log(`🎯 Demo request detected! Initiating call to ${From}...`);

      // Send confirmation SMS
      await twilioClient.messages.create({
        from: DEMO_PHONE_NUMBER,
        to: From,
        body: '🎙️ Great! Our AI demo agent will call you in just a moment. Get ready for an amazing experience! 🚀'
      });

      // Wait 2 seconds before calling
      setTimeout(async () => {
        try {
          // Initiate ElevenLabs voice call using the service
          const agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
          const webhookUrl = process.env.WEBHOOK_URL || process.env.BASE_URL;

          const callData = await elevenLabsService.initiateCall(
            DEMO_AGENT_ID,
            From,
            agentPhoneNumberId,
            `${webhookUrl}/api/webhooks/elevenlabs/conversation-event`,
            {
              trigger_source: 'sms_demo',
              customer_phone: From,
              customer_name: 'there'
            },
            null,  // Use agent's default prompt (configured at agent level)
            null   // Use agent's default first message
          );

          console.log(`📞 Demo call initiated: ${callData.id || callData.call_id || 'ID pending'}`);

          // Log the interaction
          console.log({
            type: 'demo_call_triggered',
            phone: From,
            callId: callData.id || callData.call_id,
            agentId: DEMO_AGENT_ID,
            timestamp: new Date()
          });

        } catch (callError) {
          console.error(`❌ Failed to initiate call:`, callError);

          // Send error message
          await twilioClient.messages.create({
            from: DEMO_PHONE_NUMBER,
            to: From,
            body: 'Sorry, we encountered an issue starting the call. Please try again or visit remodely.ai for assistance.'
          });
        }
      }, 2000);

      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);

    } else if (message.includes('demo') || message.includes('call me')) {
      // Partial match - provide instructions
      await twilioClient.messages.create({
        from: DEMO_PHONE_NUMBER,
        to: From,
        body: '👋 Want a live demo? Just text "DEMO" and our AI agent will call you instantly!'
      });

      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);

    } else {
      // Default response
      await twilioClient.messages.create({
        from: DEMO_PHONE_NUMBER,
        to: From,
        body: '🎙️ Welcome to Remodely.ai! Text "DEMO" for an instant AI demo call, or visit remodely.ai to get started.'
      });

      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }

  } catch (error) {
    console.error('❌ Error handling SMS trigger:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Call status callback
 */
router.post('/call-status', (req, res) => {
  const { CallSid, CallStatus, From, To } = req.body;

  console.log(`📞 Call status update: ${CallSid} - ${CallStatus}`);
  console.log(`   From: ${From}, To: ${To}`);

  // Log call events for analytics
  const eventData = {
    callSid: CallSid,
    status: CallStatus,
    from: From,
    to: To,
    timestamp: new Date()
  };

  console.log('Call event:', JSON.stringify(eventData, null, 2));

  res.status(200).send('OK');
});

/**
 * Webhook for ElevenLabs agent to send SMS during call
 * This endpoint can be called by the agent during a conversation
 */
router.post('/send-sms-from-agent', async (req, res) => {
  try {
    const { to, message, callSid, agentId } = req.body;

    console.log(`📤 Agent SMS request:`, { to, agentId, callSid });

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    // Send SMS via Twilio
    const sms = await twilioClient.messages.create({
      from: DEMO_PHONE_NUMBER,
      to: to,
      body: message
    });

    console.log(`✅ SMS sent from agent: ${sms.sid}`);

    res.json({
      success: true,
      messageSid: sms.sid,
      status: sms.status
    });

  } catch (error) {
    console.error('❌ Error sending SMS from agent:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Webhook for sending MMS (with media) from agent
 */
router.post('/send-mms-from-agent', async (req, res) => {
  try {
    const { to, message, mediaUrl, callSid, agentId } = req.body;

    console.log(`📤 Agent MMS request:`, { to, agentId, callSid, mediaUrl });

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    // Send MMS via Twilio
    const mmsData = {
      from: DEMO_PHONE_NUMBER,
      to: to,
      body: message
    };

    // Add media URLs if provided
    if (mediaUrl) {
      mmsData.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
    }

    const mms = await twilioClient.messages.create(mmsData);

    console.log(`✅ MMS sent from agent: ${mms.sid}`);

    res.json({
      success: true,
      messageSid: mms.sid,
      status: mms.status,
      mediaCount: mmsData.mediaUrl?.length || 0
    });

  } catch (error) {
    console.error('❌ Error sending MMS from agent:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
