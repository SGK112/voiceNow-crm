import express from 'express';
import ElevenLabsService from '../services/elevenLabsService.js';
import AIService from '../services/aiService.js';
import twilio from 'twilio';

const router = express.Router();
const elevenLabsService = new ElevenLabsService(process.env.ELEVENLABS_API_KEY);
const aiService = new AIService();

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ElevenLabs Voice ID mappings by language
const VOICE_IDS = {
  // American English Voices
  'en-US': {
    'professional-female': process.env.ELEVENLABS_VOICE_SARAH || 'EXAVITQu4vr4xnSDxMaL',
    'professional-male': process.env.ELEVENLABS_VOICE_ADAM || '21m00Tcm4TlvDq8ikWAM',
    'friendly-female': 'EXAVITQu4vr4xnSDxMaL',
    'friendly-male': '21m00Tcm4TlvDq8ikWAM'
  },
  // Spanish (US) Voices
  'es-US': {
    'professional-female': 'g5CIjZEefAph4nQFvHAz', // Glinda - Spanish
    'professional-male': 'TxGEqnHWrfWFTfGW9XjX', // Josh - Spanish
    'friendly-female': 'g5CIjZEefAph4nQFvHAz',
    'friendly-male': 'TxGEqnHWrfWFTfGW9XjX'
  },
  // British English Voices
  'en-GB': {
    'professional-female': 'ThT5KcBeYPX3keUQqHPh', // Dorothy
    'professional-male': 'yoZ06aMxZJJ28mfd3POQ', // Sam
    'friendly-female': 'ThT5KcBeYPX3keUQqHPh',
    'friendly-male': 'yoZ06aMxZJJ28mfd3POQ'
  },
  // French Voices
  'fr-FR': {
    'professional-female': 'zrHiDhphv9ZnVXBqCLjz', // Mimi
    'professional-male': 'onwK4e9ZLuTAKqWW03F9', // Daniel
    'friendly-female': 'zrHiDhphv9ZnVXBqCLjz',
    'friendly-male': 'onwK4e9ZLuTAKqWW03F9'
  },
  // German Voices
  'de-DE': {
    'professional-female': 'D38z5RcWu1voky8WS1ja', // Serena
    'professional-male': 'ErXwobaYiN019PkySvjV', // Antoni
    'friendly-female': 'D38z5RcWu1voky8WS1ja',
    'friendly-male': 'ErXwobaYiN019PkySvjV'
  }
};

// Store generated agents temporarily (in production, use database)
const generatedAgents = new Map();

/**
 * Generate a voicemail agent based on user configuration
 */
router.post('/generate', async (req, res) => {
  try {
    const {
      businessName,
      businessType,
      notifyPhone,
      features,
      voiceType,
      voiceLanguage
    } = req.body;

    console.log(`🎙️ Generating voicemail agent for ${businessName} in ${voiceLanguage}`);

    // Generate AI prompt for the voicemail agent
    const systemPrompt = await generateVoicemailPrompt(businessName, businessType, features, voiceLanguage);

    // Get voice ID based on language and type
    const language = voiceLanguage || 'en-US';
    const type = voiceType || 'professional-female';
    const voiceId = VOICE_IDS[language]?.[type] || VOICE_IDS['en-US']['professional-female'];

    // Create first message based on language
    const firstMessages = {
      'en-US': `Hi! You've reached ${businessName}. I'm the AI assistant. How can I help you today?`,
      'es-US': `¡Hola! Has llamado a ${businessName}. Soy el asistente virtual. ¿Cómo puedo ayudarte hoy?`,
      'en-GB': `Hello! You've reached ${businessName}. I'm the AI assistant. How may I help you today?`,
      'fr-FR': `Bonjour! Vous avez contacté ${businessName}. Je suis l'assistant AI. Comment puis-je vous aider aujourd'hui?`,
      'de-DE': `Hallo! Sie haben ${businessName} erreicht. Ich bin der KI-Assistent. Wie kann ich Ihnen heute helfen?`
    };

    // Create ElevenLabs agent
    const agentConfig = {
      name: `${businessName} - Voicemail Agent`,
      prompt: systemPrompt,
      voice_id: voiceId,
      first_message: firstMessages[language] || firstMessages['en-US'],
      language: language,
      metadata: {
        businessName,
        businessType,
        notifyPhone,
        voiceLanguage: language,
        features: JSON.stringify(features),
        createdAt: new Date().toISOString()
      }
    };

    // For demo purposes, we'll create a simulated agent
    // In production, call: elevenLabsService.createAgent(agentConfig)
    const agentId = `vm_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store agent configuration
    generatedAgents.set(agentId, {
      ...agentConfig,
      agentId,
      notifyPhone,
      features
    });

    console.log(`✅ Voicemail agent created: ${agentId}`);

    res.json({
      success: true,
      data: {
        agentId,
        name: agentConfig.name,
        prompt: systemPrompt,
        voice: voiceType
      }
    });

  } catch (error) {
    console.error('❌ Voicemail agent generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate voicemail agent',
      error: error.message
    });
  }
});

/**
 * Initiate a test call with the voicemail agent
 */
router.post('/test-call', async (req, res) => {
  try {
    const { agentId, phoneNumber } = req.body;

    if (!agentId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Missing agentId or phoneNumber'
      });
    }

    const agent = generatedAgents.get(agentId);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found. Please generate your agent first.'
      });
    }

    console.log(`📞 Initiating test call to ${phoneNumber} with agent ${agentId}`);

    // In production, use ElevenLabs conversational AI to initiate the call
    // For now, we'll use the existing demo agent
    const demoAgentId = process.env.ELEVENLABS_DEMO_AGENT_ID;
    const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
    const webhookUrl = process.env.WEBHOOK_URL || process.env.BASE_URL;

    if (demoAgentId && phoneNumberId) {
      try {
        // Initiate call using ElevenLabs
        const callData = await elevenLabsService.initiateCall(
          demoAgentId,
          phoneNumber,
          phoneNumberId,
          `${webhookUrl}/api/webhooks/elevenlabs/conversation-event`,
          {
            agent_id: agentId,
            business_name: agent.metadata.businessName,
            notify_phone: agent.notifyPhone,
            trigger_source: 'voicemail_agent_demo'
          },
          agent.prompt, // Use custom prompt
          agent.first_message
        );

        // ElevenLabs Twilio outbound call returns: { success, message, conversation_id, callSid }
        const callId = callData.conversation_id || callData.callSid || callData.id || callData.call_id;
        console.log(`✅ Test call initiated:`, { success: callData.success, callId });

        res.json({
          success: true,
          data: {
            callId: callId,
            message: 'Test call initiated successfully'
          }
        });
      } catch (callError) {
        console.error('❌ ElevenLabs call error:', callError);
        // Fallback to SMS notification
        await sendTestNotification(agent, phoneNumber);
        res.json({
          success: true,
          data: {
            message: 'Demo SMS sent! Check your phone for a preview.'
          }
        });
      }
    } else {
      // Send SMS notification as fallback
      await sendTestNotification(agent, phoneNumber);
      res.json({
        success: true,
        data: {
          message: 'Demo SMS sent! Check your phone for a preview.'
        }
      });
    }

  } catch (error) {
    console.error('❌ Test call error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate test call',
      error: error.message
    });
  }
});

/**
 * Webhook to handle completed voicemail calls and send SMS notifications
 */
router.post('/call-completed', async (req, res) => {
  try {
    const {
      agentId,
      callId,
      callerPhone,
      callerName,
      transcript,
      extractedData
    } = req.body;

    const agent = generatedAgents.get(agentId);

    if (!agent) {
      console.log(`⚠️ Agent not found: ${agentId}`);
      return res.status(200).json({ received: true });
    }

    console.log(`📨 Sending SMS notification for completed call ${callId}`);

    // Build SMS notification message
    const smsMessage = buildSMSNotification(agent, {
      callerPhone,
      callerName,
      extractedData,
      callId
    });

    // Send SMS to business owner using A2P compliant messaging service
    if (agent.notifyPhone) {
      const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
      await twilioClient.messages.create({
        messagingServiceSid: messagingServiceSid,
        to: agent.notifyPhone,
        body: smsMessage
      });

      console.log(`✅ SMS notification sent to ${agent.notifyPhone}`);
    }

    res.json({ success: true, notificationSent: true });

  } catch (error) {
    console.error('❌ Call completion webhook error:', error);
    res.status(200).json({ success: false, error: error.message });
  }
});

// Helper: Generate voicemail prompt using AI
async function generateVoicemailPrompt(businessName, businessType, features, voiceLanguage = 'en-US') {
  const featureInstructions = [];

  if (features.qualifyLeads) {
    featureInstructions.push('- Ask about their needs and budget');
    featureInstructions.push('- Collect their name, phone number, and best time to call back');
  }

  if (features.scheduleCallback) {
    featureInstructions.push('- Offer to schedule a callback at their preferred time');
    featureInstructions.push('- Get their availability (day and time)');
  }

  if (features.answerFaq) {
    featureInstructions.push('- Answer common questions about services, pricing, and availability');
  }

  if (features.emergencyFilter) {
    featureInstructions.push('- Ask if this is an emergency that needs immediate attention');
    featureInstructions.push('- If emergency, collect details and mark as high priority');
  }

  // Language-specific prompts
  const prompts = {
    'en-US': `You are a professional voicemail assistant for ${businessName}, a ${businessType} business.

Your role is to:
- Greet callers warmly and professionally
- Explain that the team is currently unavailable but you can help
${featureInstructions.join('\n')}
- Be empathetic, friendly, and efficient
- Keep responses concise and natural

Important guidelines:
- Don't make promises about when someone will call back
- Don't discuss specific pricing without context
- Always thank them for calling
- End by confirming you'll send their information to the team

Remember: You're representing ${businessName} professionally. Be helpful, courteous, and efficient.`,

    'es-US': `Eres un asistente de buzón de voz profesional para ${businessName}, un negocio de ${businessType}.

Tu función es:
- Saludar a las personas que llaman de manera cálida y profesional
- Explicar que el equipo no está disponible actualmente, pero que puedes ayudar
${featureInstructions.join('\n')}
- Ser empático, amigable y eficiente
- Mantener las respuestas concisas y naturales

Pautas importantes:
- No hagas promesas sobre cuándo alguien llamará de vuelta
- No discutas precios específicos sin contexto
- Siempre agradece la llamada
- Termina confirmando que enviarás su información al equipo

Recuerda: Estás representando a ${businessName} profesionalmente. Sé servicial, cortés y eficiente.`
  };

  return prompts[voiceLanguage] || prompts['en-US'];
}

// Helper: Build SMS notification message
function buildSMSNotification(agent, callData) {
  const { callerPhone, callerName, extractedData, callId } = callData;

  let message = `🔔 New ${agent.metadata.businessName} Voicemail\n\n`;

  if (callerName) {
    message += `📞 Caller: ${callerName}\n`;
  }
  message += `📱 Phone: ${callerPhone}\n`;

  if (extractedData) {
    if (extractedData.interest) message += `📋 Interest: ${extractedData.interest}\n`;
    if (extractedData.budget) message += `💰 Budget: ${extractedData.budget}\n`;
    if (extractedData.timePreference) message += `🕐 Callback: ${extractedData.timePreference}\n`;
    if (extractedData.isEmergency) message += `🚨 EMERGENCY CALL\n`;
  }

  message += `\n⭐ Call ID: ${callId}`;

  return message;
}

// Helper: Send test notification SMS
async function sendTestNotification(agent, phoneNumber) {
  const testMessage = `🎙️ VoiceFlow Voicemail Agent Demo

✅ Your ${agent.metadata.businessName} voicemail agent is ready!

This is how you'll receive notifications when someone calls:

📞 Caller: John Smith
📋 Interest: Kitchen Remodel
💰 Budget: $15k-20k
🕐 Callback: Tomorrow 2pm
📞 Phone: (555) 123-4567

⭐ Lead Score: High Priority

Reply "START" to activate your agent!`;

  try {
    // Use A2P compliant messaging service
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || 'MGa86452ccc15de86eee32177817a09d90';
    await twilioClient.messages.create({
      messagingServiceSid: messagingServiceSid,
      to: phoneNumber,
      body: testMessage
    });

    console.log(`✅ Test SMS sent to ${phoneNumber}`);
  } catch (smsError) {
    console.error('❌ Test SMS error:', smsError);
  }
}

export default router;
