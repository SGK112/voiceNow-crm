import twilio from 'twilio';
import CallLog from '../models/CallLog.js';
import VoiceAgent from '../models/VoiceAgent.js';
import Campaign from '../models/Campaign.js';
import TwilioService from '../services/twilioService.js';
import ElevenLabsService from '../services/elevenLabsService.js';
import callMonitorService from '../services/callMonitorService.js';
import callRoutingService from '../services/callRoutingService.js';

const twilioService = new TwilioService();
const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);

// Handle incoming Twilio voice calls with multi-agent routing
export const handleTwilioVoice = async (req, res) => {
  try {
    const { From, To, CallSid, Digits } = req.body;

    console.log(`📞 Incoming call from ${From} to ${To} (CallSid: ${CallSid})`);

    // Find all agents associated with this phone number
    const agents = await VoiceAgent.find({
      phoneNumber: To,
      enabled: true,
      status: 'active'
    }).sort({ priority: -1 });

    if (agents.length === 0) {
      console.log(`❌ No agents found for number ${To}`);

      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say({
        voice: 'alice'
      }, 'Sorry, this number is not configured. Please contact support.');
      response.hangup();

      res.type('text/xml');
      return res.send(response.toString());
    }

    // If multiple agents exist for this number, show IVR menu or route intelligently
    let agent;

    if (agents.length > 1) {
      // Check if this is a routing callback (after IVR selection)
      if (Digits) {
        // Route based on IVR selection
        agent = await callRoutingService.routeCall(To, From, {
          userInput: Digits,
          routingStrategy: 'ivr'
        });
      } else {
        // Check if any agents have IVR routing configured
        const hasIVRAgents = agents.some(a => a.routingConfig?.ivrOption);

        if (hasIVRAgents) {
          // Generate IVR menu
          const ivrMenu = callRoutingService.generateIVRMenu(To, agents);
          res.type('text/xml');
          return res.send(ivrMenu);
        } else {
          // Use intelligent routing (time-based, caller-based, or load-based)
          agent = await callRoutingService.routeCall(To, From, {
            time: new Date(),
            routingStrategy: 'caller' // Default to caller-based routing
          });
        }
      }
    } else {
      // Single agent, use it directly
      agent = agents[0];
    }

    if (!agent) {
      console.log(`❌ No suitable agent found after routing`);
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say({
        voice: 'alice'
      }, 'Sorry, no agent is available at this time. Please try again later.');
      response.hangup();

      res.type('text/xml');
      return res.send(response.toString());
    }

    // Check if agent is within availability hours
    if (agent.availability && agent.availability.enabled) {
      const now = new Date();
      const day = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][now.getDay()];
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM

      const dayAvailability = agent.availability.hours[day];

      if (!dayAvailability || !dayAvailability.enabled) {
        console.log(`❌ Agent not available on ${day}`);

        const VoiceResponse = twilio.twiml.VoiceResponse;
        const response = new VoiceResponse();
        response.say({
          voice: 'alice'
        }, 'Thank you for calling. We are currently closed. Please call back during business hours.');
        response.hangup();

        res.type('text/xml');
        return res.send(response.toString());
      }

      if (currentTime < dayAvailability.start || currentTime > dayAvailability.end) {
        console.log(`❌ Call outside business hours (${currentTime})`);

        const VoiceResponse = twilio.twiml.VoiceResponse;
        const response = new VoiceResponse();
        response.say({
          voice: 'alice'
        }, `Thank you for calling. Our business hours are ${dayAvailability.start} to ${dayAvailability.end}. Please call back during these hours.`);
        response.hangup();

        res.type('text/xml');
        return res.send(response.toString());
      }
    }

    // Generate TwiML to connect to ElevenLabs
    const twiml = twilioService.generateElevenLabsTwiML(agent.elevenLabsAgentId);

    // Create call log
    await CallLog.create({
      userId: agent.userId,
      agentId: agent._id,
      callerPhone: From,
      direction: 'inbound',
      status: 'in-progress',
      elevenLabsCallId: CallSid,
      metadata: {
        twilioCallSid: CallSid,
        toNumber: To
      }
    });

    console.log(`✅ Connected call to ElevenLabs agent ${agent.elevenLabsAgentId}`);

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error handling Twilio voice webhook:', error);

    // Return error TwiML
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say({
      voice: 'alice'
    }, 'We are experiencing technical difficulties. Please try again later.');
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  }
};

// Handle Twilio call status updates
export const handleTwilioStatus = async (req, res) => {
  try {
    const {
      CallSid,
      CallStatus,
      CallDuration,
      From,
      To
    } = req.body;

    console.log(`📊 Call status update: ${CallSid} - ${CallStatus} (${CallDuration}s)`);

    // Find and update call log
    const callLog = await CallLog.findOne({
      $or: [
        { elevenLabsCallId: CallSid },
        { 'metadata.twilioCallSid': CallSid }
      ]
    });

    if (callLog) {
      // Map Twilio status to our status
      const statusMap = {
        'completed': 'completed',
        'busy': 'busy',
        'no-answer': 'no-answer',
        'failed': 'failed',
        'canceled': 'canceled'
      };

      callLog.status = statusMap[CallStatus] || callLog.status;

      if (CallDuration) {
        callLog.duration = parseInt(CallDuration);
        callLog.durationMinutes = Math.ceil(callLog.duration / 60);

        // Calculate cost
        const costPerMinute = callLog.cost?.costPerMinute || 0.10;
        callLog.cost.totalCost = callLog.durationMinutes * costPerMinute;
      }

      await callLog.save();

      // Update campaign stats if this is a campaign call
      if (callLog.metadata?.campaignId) {
        const campaign = await Campaign.findById(callLog.metadata.campaignId);
        if (campaign) {
          campaign.updateStats(callLog);
          await campaign.save();
        }
      }

      console.log(`✅ Updated call log for ${CallSid}`);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling Twilio status webhook:', error);
    res.sendStatus(500);
  }
};

// Handle TwiML for forwarding inbound calls to ElevenLabs
export const handleElevenLabsForward = async (req, res) => {
  try {
    const { agentId } = req.query;

    if (!agentId) {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say({
        voice: 'alice'
      }, 'Configuration error. Please contact support.');
      response.hangup();

      res.type('text/xml');
      return res.send(response.toString());
    }

    const twiml = twilioService.generateElevenLabsTwiML(agentId);

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error generating ElevenLabs forward TwiML:', error);
    res.sendStatus(500);
  }
};

// Handle TwiML for outbound calls with ElevenLabs
export const handleElevenLabsOutbound = async (req, res) => {
  try {
    const { agentId, customerName, customerEmail } = req.query;
    const { CallSid, From, To } = req.body;

    console.log(`📞 Outbound call ${CallSid} from ${From} to ${To}`);

    if (!agentId) {
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say({
        voice: 'alice'
      }, 'Configuration error.');
      response.hangup();

      res.type('text/xml');
      return res.send(response.toString());
    }

    // Prepare dynamic variables for ElevenLabs agent personalization
    const dynamicVariables = {
      customer_name: customerName || 'there',
      customer_phone: To,
      customer_email: customerEmail || null,
      call_source: 'marketing_demo'
    };

    const twiml = twilioService.generateElevenLabsTwiML(agentId, null, dynamicVariables);

    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Error generating outbound ElevenLabs TwiML:', error);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say({
      voice: 'alice'
    }, 'Technical error. Call ended.');
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  }
};

// Handle incoming SMS/MMS messages with AI
export const handleTwilioSms = async (req, res) => {
  try {
    const { From, To, Body, MessageSid, NumMedia } = req.body;
    const numMedia = parseInt(NumMedia) || 0;

    console.log(`📱 Incoming ${numMedia > 0 ? 'MMS' : 'SMS'} from ${From} to ${To}`);
    console.log(`   Message: "${Body}"`);
    console.log(`   SID: ${MessageSid}`);

    // Log media attachments if present
    if (numMedia > 0) {
      console.log(`   📎 Media attachments: ${numMedia}`);
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = req.body[`MediaUrl${i}`];
        const mediaType = req.body[`MediaContentType${i}`];
        console.log(`      ${i + 1}. ${mediaType}: ${mediaUrl}`);
      }
    }

    // Parse the message for required responses (STOP/START)
    const lowerBody = Body.toLowerCase().trim();

    const MessagingResponse = twilio.twiml.MessagingResponse;
    const response = new MessagingResponse();

    // Handle required STOP/START (compliance)
    if (lowerBody.includes('stop') || lowerBody.includes('unsubscribe')) {
      console.log('   User requested to stop messages');
      response.message('You have been unsubscribed. Reply START to resubscribe.');
      res.type('text/xml');
      res.send(response.toString());
      return;
    }
    else if (lowerBody.includes('start') || lowerBody.includes('subscribe')) {
      console.log('   User requested to start messages');
      response.message('Welcome back! You will now receive messages from VoiceNow CRM.');
      res.type('text/xml');
      res.send(response.toString());
      return;
    }

    // Check if customer wants a call
    const wantsCall = lowerBody.match(/call me|call back|speak to someone|talk to|voice|phone call|schedule.*call|get.*call|have.*call/i);

    if (wantsCall) {
      console.log('   🎯 Customer requested a call - initiating voice demo');

      // Trigger ElevenLabs voice call (use SMS-specific agent)
      try {
        const demoAgentId = process.env.ELEVENLABS_SMS_AGENT_ID || 'agent_8101ka4wyweke1s9np3je7npewrr';
        const agentPhoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
        const webhookUrl = process.env.WEBHOOK_URL || 'https://f66af302a875.ngrok-free.app';

        if (!agentPhoneNumberId) {
          console.log('   ⚠️ No ElevenLabs phone number configured');
          response.message('I\'d love to call you! For now, you can chat with our AI agent at remodely.ai or text me questions here.');
          res.type('text/xml');
          res.send(response.toString());
          return;
        }

        console.log(`📞 Initiating ElevenLabs voice call to ${From}`);

        const dynamicVariables = {
          customer_phone: From,
          trigger_source: 'sms_demo'
        };

        // Call ElevenLabs API - use agent's default configuration
        const callData = await elevenLabsService.initiateCall(
          demoAgentId,
          From,
          agentPhoneNumberId,
          `${webhookUrl}/api/webhooks/elevenlabs/conversation-event`,
          dynamicVariables,
          null,  // Use agent's default prompt (configured at agent level)
          null   // Use agent's default first message
        );

        if (callData) {
          const callId = callData.id || callData.call_id;
          console.log(`✅ Voice call initiated: ${callId || 'ID pending'}`);

          // Register call for automatic post-call email monitoring
          if (callId) {
            callMonitorService.registerCall(callId, From, {
              customer_phone: From,
              trigger_source: 'sms_demo'
            });
            console.log(`✅ Call registered for automatic email follow-up`);
          }

          response.message('Perfect! My AI voice agent is calling you right now to discuss VoiceNow CRM. Answer and chat! 📞');
        } else {
          console.error(`❌ Failed to initiate call`);
          response.message('I\'d love to call you! Text "DEMO" and I\'ll get you connected, or visit remodely.ai/signup to start your free trial!');
        }

        res.type('text/xml');
        res.send(response.toString());
        return;

      } catch (callError) {
        console.error('❌ Error initiating voice call:', callError);
        response.message('I\'d love to call you! For now, try our AI chat at remodely.ai or text me questions here.');
        res.type('text/xml');
        res.send(response.toString());
        return;
      }
    }

    // Use AI for all other responses
    console.log('   Generating AI response...');

    const { default: AIService } = await import('../services/aiService.js');
    const aiService = new AIService();

    let aiMessage;

    // If MMS with images, analyze the image
    if (numMedia > 0) {
      const imageUrl = req.body[`MediaUrl0`];
      const mediaType = req.body[`MediaContentType0`];

      // Check if it's an image
      if (mediaType && mediaType.startsWith('image/')) {
        console.log('   Analyzing image with AI vision...');

        const visionPrompt = `You are analyzing an image sent to VoiceNow CRM (AI voice agent platform for contractors).

The customer sent this image along with the message: "${Body || '(no text)'}"

Analyze the image and provide a helpful, brief response (under 160 characters) that:
1. Acknowledges what you see in the image
2. Relates it to VoiceNow CRM services if relevant
3. Offers helpful next steps or directs them to signup

Keep it conversational, text-friendly, and brief.`;

        try {
          aiMessage = await aiService.analyzeImage(imageUrl, visionPrompt, {
            temperature: 0.7,
            maxTokens: 200
          });

          console.log(`   AI Vision Response: "${aiMessage}"`);
        } catch (visionError) {
          console.error('   Vision analysis failed:', visionError.message);
          aiMessage = `Thanks for the image! I'd love to help. VoiceNow CRM provides AI voice agents for contractors. Try free: remodely.ai/signup`;
        }
      } else {
        // Non-image media (video, audio, etc.)
        aiMessage = `Thanks for sharing! For best results, text or call us. Learn more about VoiceNow CRM: remodely.ai/signup`;
      }
    } else {
      // Regular text-only SMS
      const systemPrompt = `You are a helpful SMS assistant for VoiceNow CRM, an AI voice agent platform for contractors.

Your job is to respond to customer text messages professionally and helpfully.

Key info about VoiceNow CRM:
- AI voice agents that answer calls 24/7 for contractors
- FREE 14-day trial (no credit card required)
- $299/month after trial
- Signup at: remodely.ai/signup
- Handles: appointment booking, lead qualification, missed calls
- **IMPORTANT:** You can trigger a LIVE voice call! If customer wants to talk, tell them to text "call me"

Response rules:
- Keep responses SHORT (under 160 characters when possible)
- Be friendly and conversational
- If they ask about features, briefly explain and point to signup
- If they have questions, answer helpfully
- If they seem interested, suggest either:
  1. Signup link (remodely.ai/signup)
  2. OR offer them a voice call (say "Want me to call you? Just text 'call me'")
- Always stay in character as VoiceNow CRM assistant
- Use text-friendly language (contractions, casual tone)
- Don't use emojis unless the customer uses them first
- If conversation is getting long, offer to call them for a voice demo

Examples:
- "What's this about?" → "VoiceNow CRM helps contractors never miss a call! AI answers 24/7, books appointments. Want me to call you?"
- "How much?" → "$299/mo after a FREE 14-day trial (no card needed). Want a quick call to see how it works?"
- "Tell me more" → "AI voice agent handles your calls when you're busy. Books appointments, qualifies leads. I can call you right now to explain!"
- "Sounds interesting" → "Awesome! Want to try it free at remodely.ai/signup OR I can call you right now to walk you through it?"

User message: ${Body}`;

      const aiResponse = await aiService.chat(systemPrompt, {
        temperature: 0.7,
        maxTokens: 150
      });

      aiMessage = aiResponse.trim();
      console.log(`   AI Response: "${aiMessage}"`);
    }

    response.message(aiMessage);

    res.type('text/xml');
    res.send(response.toString());

    console.log('✅ AI SMS response sent');

  } catch (error) {
    console.error('❌ Error handling SMS:', error);

    const MessagingResponse = twilio.twiml.MessagingResponse;
    const response = new MessagingResponse();
    response.message('Thanks for your message! Visit remodely.ai/signup to try VoiceNow CRM free for 14 days!');

    res.type('text/xml');
    res.send(response.toString());
  }
};

// Handle SMS fallback
export const handleTwilioSmsFallback = async (req, res) => {
  try {
    const { From, To, ErrorCode } = req.body;

    console.log(`❌ SMS Fallback triggered`);
    console.log(`   From: ${From}, To: ${To}`);
    console.log(`   Error Code: ${ErrorCode}`);

    const MessagingResponse = twilio.twiml.MessagingResponse;
    const response = new MessagingResponse();
    response.message('We apologize for the inconvenience. Please contact support@remodely.ai for assistance.');

    res.type('text/xml');
    res.send(response.toString());

  } catch (error) {
    console.error('❌ Error in SMS fallback:', error);

    const MessagingResponse = twilio.twiml.MessagingResponse;
    const response = new MessagingResponse();

    res.type('text/xml');
    res.send(response.toString());
  }
};

// Handle outbound agent calls (NEW - for our local agents using Twilio + ElevenLabs TTS)
export const handleAgentCall = async (req, res) => {
  try {
    const { agentId } = req.query;
    const { CallSid, From, To, CallStatus } = req.body;

    console.log(`\n📞 [AGENT CALL] Webhook triggered`);
    console.log(`   Agent ID: ${agentId}`);
    console.log(`   Call SID: ${CallSid}`);
    console.log(`   From: ${From} → To: ${To}`);
    console.log(`   Status: ${CallStatus}`);

    if (!agentId) {
      console.error('❌ [AGENT CALL] No agent ID provided');
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say({ voice: 'alice' }, 'Configuration error.');
      response.hangup();
      res.type('text/xml');
      return res.send(response.toString());
    }

    // Get the agent from database
    const agent = await VoiceAgent.findById(agentId);

    if (!agent) {
      console.error(`❌ [AGENT CALL] Agent not found: ${agentId}`);
      const VoiceResponse = twilio.twiml.VoiceResponse;
      const response = new VoiceResponse();
      response.say({ voice: 'alice' }, 'Agent not found.');
      response.hangup();
      res.type('text/xml');
      return res.send(response.toString());
    }

    console.log(`✅ [AGENT CALL] Found agent: ${agent.name}`);
    console.log(`   Voice: ${agent.voiceName} (${agent.voiceId})`);
    console.log(`   Script length: ${(agent.script || '').length} chars`);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();

    // Get the message to speak
    const firstMessage = agent.firstMessage || agent.configuration?.first_message || 'Hello! Thank you for connecting.';

    console.log(`🎙️  [AGENT CALL] Generating ElevenLabs audio for: "${firstMessage.substring(0, 50)}..."`);

    // Generate audio with ElevenLabs TTS and save it
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const { dirname } = path.default;

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);

      // Generate audio with ElevenLabs
      const audioBuffer = await elevenLabsService.textToSpeech(
        firstMessage,
        agent.voiceId,
        {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        }
      );

      // Save to public directory
      const publicDir = path.default.join(__dirname, '../../public/audio');
      if (!fs.default.existsSync(publicDir)) {
        fs.default.mkdirSync(publicDir, { recursive: true });
      }

      const audioFileName = `agent_${agent._id}_${Date.now()}.mp3`;
      const audioPath = path.default.join(publicDir, audioFileName);

      fs.default.writeFileSync(audioPath, audioBuffer);

      // Serve the audio via public URL
      const baseUrl = process.env.WEBHOOK_URL || process.env.API_URL || 'http://localhost:5000';
      const audioUrl = `${baseUrl}/audio/${audioFileName}`;

      console.log(`✅ [AGENT CALL] ElevenLabs audio saved: ${audioUrl}`);

      // Play the ElevenLabs-generated audio
      response.play(audioUrl);

      response.pause({ length: 1 });

      response.say({
        voice: 'Polly.Joanna'
      }, `You just heard the ${agent.voiceName} voice from ElevenLabs! This is your VoiceFlow agent in action.`);

    } catch (error) {
      console.error(`❌ [AGENT CALL] Error generating ElevenLabs audio:`, error.message);

      // Fallback to Polly voice
      response.say({
        voice: 'Polly.Joanna',
        language: agent.configuration?.language || 'en-US'
      }, firstMessage);

      response.pause({ length: 1 });

      response.say({
        voice: 'Polly.Joanna'
      }, 'There was an error generating the ElevenLabs voice. Using fallback voice instead.');
    }

    response.hangup();

    console.log(`✅ [AGENT CALL] Sending TwiML response`);
    res.type('text/xml');
    res.send(response.toString());

  } catch (error) {
    console.error('❌ [AGENT CALL] Error:', error);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const response = new VoiceResponse();
    response.say({ voice: 'alice' }, 'Technical error. Call ended.');
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  }
};
