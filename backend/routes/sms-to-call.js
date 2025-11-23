import express from 'express';
import twilio from 'twilio';
import ElevenLabsService from '../services/elevenLabsService.js';
import callMonitorService from '../services/callMonitorService.js';
import AIService from '../services/aiService.js';

const router = express.Router();
const aiService = new AIService();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

// SMS agent configuration (uses dedicated SMS agent or falls back to demo agent)
const SMS_AGENT_ID = process.env.ELEVENLABS_SMS_AGENT_ID || process.env.ELEVENLABS_DEMO_AGENT_ID || 'agent_8101ka4wyweke1s9np3je7npewrr';
const DEMO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Handle incoming SMS with AI responses and voice call capability
 * - AI responds to any message via text
 * - Triggers voice call when user says "call me" or similar
 */
router.post('/trigger-demo-call', async (req, res) => {
  try {
    const { From, Body } = req.body;

    if (!From || !Body) {
      console.error('❌ Missing From or Body in request:', req.body);
      return res.status(400).json({ error: 'Missing From or Body parameter' });
    }

    const message = Body?.trim();
    const messageLower = message.toLowerCase();

    console.log(`📱 SMS received from ${From}: "${Body}"`);

    // Check for specific keywords first (signup, pricing, demo)
    const signupTriggers = ['signup', 'sign up', 'register', 'get started', 'join'];
    const pricingTriggers = ['pricing', 'price', 'cost', 'how much', 'plans', 'subscription'];
    const demoTriggers = ['demo', 'schedule', 'book', 'appointment', 'meeting'];

    const wantsSignup = signupTriggers.some(trigger => messageLower.includes(trigger));
    const wantsPricing = pricingTriggers.some(trigger => messageLower.includes(trigger));
    const wantsDemo = demoTriggers.some(trigger => messageLower.includes(trigger));

    // Handle signup request
    if (wantsSignup) {
      console.log(`📝 Signup request detected from ${From}`);

      await twilioClient.messages.create({
        from: DEMO_PHONE_NUMBER,
        to: From,
        body: '🚀 Welcome to Remodely.ai!\n\nGet started here: https://remodely.ai/signup\n\n✨ Features included:\n• 24/7 AI Voice Agents\n• Visual Workflow Builder\n• Full CRM System\n• Multi-channel Communication\n\nNeed help? Text "call me" to speak with our AI assistant!'
      });

      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
      return;
    }

    // Handle pricing request
    if (wantsPricing) {
      console.log(`💰 Pricing request detected from ${From}`);

      await twilioClient.messages.create({
        from: DEMO_PHONE_NUMBER,
        to: From,
        body: '💎 Remodely.ai Pricing Plans:\n\n📦 Starter: $99/mo\n• 1 AI Voice Agent\n• 500 calls/month\n• Basic CRM\n\n🚀 Professional: $299/mo\n• 5 AI Agents\n• Unlimited calls\n• Advanced workflows\n\n🏢 Enterprise: Custom\n• Unlimited everything\n• Dedicated support\n\nView details: https://remodely.ai/pricing\n\nText "call me" to discuss your needs!'
      });

      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
      return;
    }

    // Handle demo request
    if (wantsDemo) {
      console.log(`🎬 Demo request detected from ${From}`);

      await twilioClient.messages.create({
        from: DEMO_PHONE_NUMBER,
        to: From,
        body: '🎙️ Experience Remodely.ai live!\n\nText "call me" right now for an instant AI voice demo, or schedule a personalized demo:\n\n📅 Book a demo: https://remodely.ai/demo\n\nOur AI assistant David can:\n• Answer questions 24/7\n• Qualify leads automatically\n• Schedule appointments\n• Send follow-up SMS/emails\n• And much more!\n\nReady? Text "call me"!'
      });

      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
      return;
    }

    // Check if user wants a voice call
    const callTriggers = ['call me', 'call', 'phone call', 'speak', 'talk', 'voice', 'demo call'];
    const wantsCall = callTriggers.some(trigger => messageLower.includes(trigger));

    if (wantsCall) {
      console.log(`📞 Voice call request detected! Initiating call to ${From}...`);

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
            SMS_AGENT_ID,
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

          const callId = callData.id || callData.call_id;
          console.log(`📞 Demo call initiated: ${callId || 'ID pending'}`);

          // Register call for monitoring (automatic post-call emails)
          if (callId) {
            callMonitorService.registerCall(callId, From, {
              customer_phone: From,
              customer_name: 'there',
              trigger_source: 'sms_demo'
            });
            console.log(`✅ Call registered for automatic email follow-up`);
          }

          // Log the interaction
          console.log({
            type: 'demo_call_triggered',
            phone: From,
            callId: callId,
            agentId: SMS_AGENT_ID,
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

    } else {
      // AI-powered text response for any other message
      console.log(`🤖 Generating AI response for: "${Body}"`);

      try {
        const aiResponse = await aiService.chat([
          {
            role: 'system',
            content: `You are an AI assistant for Remodely.ai, a Voice Workflow CRM platform.

Your role:
- Answer questions about Remodely.ai features (AI voice agents, workflow automation, CRM, etc.)
- Be friendly, helpful, and concise (SMS responses should be under 160 characters when possible)
- If asked about pricing, features, or demos, provide helpful info
- Suggest they text "call me" if they want to speak with our AI voice agent
- Keep responses professional but conversational

Key features to mention when relevant:
- 24/7 AI voice agents (powered by ElevenLabs)
- Visual workflow automation (like n8n)
- Full CRM with lead & deal management
- Integrations with Google, Slack, Stripe, etc.
- No coding required

If unsure about something specific, suggest they visit remodely.ai or text "call me" for a voice demo.`
          },
          {
            role: 'user',
            content: message
          }
        ], {
          model: 'gpt-4o-mini',
          temperature: 0.7,
          maxTokens: 150
        });

        const responseText = aiResponse.trim();

        // Send AI response via SMS
        await twilioClient.messages.create({
          from: DEMO_PHONE_NUMBER,
          to: From,
          body: responseText
        });

        console.log(`✅ AI response sent: "${responseText.substring(0, 50)}..."`);

      } catch (aiError) {
        console.error('❌ AI response failed:', aiError);

        // Fallback response if AI fails
        await twilioClient.messages.create({
          from: DEMO_PHONE_NUMBER,
          to: From,
          body: '👋 Thanks for reaching out! Text "call me" for a live AI voice demo, or visit remodely.ai to learn more about our Voice Workflow CRM!'
        });
      }

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
    const { to, from, message, callSid, agentId } = req.body;

    // Use provided 'from' number or fall back to default
    const fromNumber = from || DEMO_PHONE_NUMBER;

    console.log(`📤 Agent SMS request:`, { to, from, agentId, callSid });
    console.log(`📤 Message body: "${message}"`);
    console.log(`📤 From number (provided): ${from || 'not provided'}`);
    console.log(`📤 From number (using): ${fromNumber}`);
    console.log(`📤 To number: ${to}`);

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    // Validate Twilio configuration
    if (!fromNumber) {
      console.error('❌ No from number provided and TWILIO_PHONE_NUMBER is not configured');
      return res.status(500).json({ error: 'Twilio phone number not configured' });
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ Twilio credentials are not configured');
      return res.status(500).json({ error: 'Twilio credentials not configured' });
    }

    // Send SMS via Twilio
    const sms = await twilioClient.messages.create({
      from: fromNumber,
      to: to,
      body: message
    });

    console.log(`✅ SMS sent successfully!`);
    console.log(`   Message SID: ${sms.sid}`);
    console.log(`   Status: ${sms.status}`);
    console.log(`   From: ${sms.from}`);
    console.log(`   To: ${sms.to}`);
    console.log(`   Date Created: ${sms.dateCreated}`);
    console.log(`   Error Code: ${sms.errorCode || 'None'}`);
    console.log(`   Error Message: ${sms.errorMessage || 'None'}`);
    console.log(`   Full Response:`, JSON.stringify(sms, null, 2));

    res.json({
      success: true,
      messageSid: sms.sid,
      status: sms.status,
      from: sms.from,
      to: sms.to,
      dateCreated: sms.dateCreated,
      errorCode: sms.errorCode,
      errorMessage: sms.errorMessage
    });

  } catch (error) {
    console.error('❌ Error sending SMS from agent:', error);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo
    });
    res.status(500).json({
      error: error.message,
      code: error.code,
      status: error.status,
      moreInfo: error.moreInfo
    });
  }
});

/**
 * Webhook for sending MMS (with media) from agent
 */
router.post('/send-mms-from-agent', async (req, res) => {
  try {
    const { to, from, message, mediaUrl, callSid, agentId } = req.body;

    // Use provided 'from' number or fall back to default
    const fromNumber = from || DEMO_PHONE_NUMBER;

    console.log(`📤 Agent MMS request:`, { to, from: fromNumber, agentId, callSid, mediaUrl });

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    if (!fromNumber) {
      console.error('❌ No from number provided and TWILIO_PHONE_NUMBER is not configured');
      return res.status(500).json({ error: 'Twilio phone number not configured' });
    }

    // Send MMS via Twilio
    const mmsData = {
      from: fromNumber,
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
