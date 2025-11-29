import express from 'express';
import twilio from 'twilio';
import OpenAI from 'openai';
import TwilioService from '../services/twilioService.js';
import agentSMSService from '../services/agentSMSService.js';
import ariaCRMService from '../services/ariaCRMService.js';
import backgroundSyncService from '../services/backgroundSyncService.js';
import Contact from '../models/Contact.js';
import CallLog from '../models/CallLog.js';
import Lead from '../models/Lead.js';
import User from '../models/User.js';

const router = express.Router();

// OpenAI for Aria voice AI
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Active voice conversations store
const voiceConversations = new Map();
const twilioService = new TwilioService();
const VoiceResponse = twilio.twiml.VoiceResponse;

// Get default user for system operations (first admin user or first user)
async function getDefaultUserId() {
  const user = await User.findOne({ role: 'admin' }) || await User.findOne({});
  return user?._id?.toString() || '000000000000000000000000';
}

// ============================================
// VOICE TOKEN & CALLING ENDPOINTS
// ============================================

// @desc    Get Twilio access token for VoIP calling
// @route   POST /api/twilio/voice/token
// @access  Private (should add auth)
router.post('/voice/token', async (req, res) => {
  try {
    const { userId, deviceId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    // Generate unique identity for this user/device
    const identity = deviceId ? `${userId}_${deviceId}` : userId;

    // Get push credential SID for mobile notifications (optional)
    const pushCredentialSid = process.env.TWILIO_PUSH_CREDENTIAL_SID;

    const tokenData = twilioService.generateAccessToken(identity, pushCredentialSid);

    res.json({
      success: true,
      ...tokenData,
      twilioNumber: process.env.TWILIO_PHONE_NUMBER
    });
  } catch (error) {
    console.error('Token generation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Handle outgoing call from mobile app (TwiML App webhook)
// @route   POST /api/twilio/voice/outgoing
// @access  Public (Twilio webhook)
router.post('/voice/outgoing', async (req, res) => {
  try {
    const { To, From, CallSid, Caller } = req.body;

    console.log(`📞 Outgoing call: ${Caller} -> ${To}`);

    const response = new VoiceResponse();

    // Validate phone number
    if (!To || To.length < 10) {
      response.say('Please provide a valid phone number.');
      return res.type('text/xml').send(response.toString());
    }

    // Clean the phone number
    let toNumber = To;
    if (!toNumber.startsWith('+')) {
      toNumber = toNumber.startsWith('1') ? `+${toNumber}` : `+1${toNumber}`;
    }

    // Use the Twilio phone number as caller ID
    const callerId = process.env.TWILIO_PHONE_NUMBER;

    // Dial the number
    const dial = response.dial({
      callerId: callerId,
      timeout: 30,
      action: '/api/twilio/voice/dial-status',
      method: 'POST'
    });

    dial.number({
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallback: '/api/twilio/voice/call-events',
      statusCallbackMethod: 'POST'
    }, toNumber);

    // Log the call attempt
    try {
      // Extract user ID from caller identity (format: userId_deviceId)
      const userId = Caller?.split('_')[0] || '000000000000000000000000';

      // Try to find contact by phone number
      const contact = await Contact.findOne({
        phone: { $regex: toNumber.replace(/\D/g, '').slice(-10) }
      });

      await CallLog.create({
        twilioCallSid: CallSid,
        from: callerId,
        to: toNumber,
        direction: 'outbound',
        status: 'initiated',
        userId: userId,
        contactId: contact?._id,
        source: 'mobile_app'
      });
    } catch (logError) {
      console.error('Error logging call:', logError);
    }

    res.type('text/xml').send(response.toString());
  } catch (error) {
    console.error('Outgoing call error:', error);
    const response = new VoiceResponse();
    response.say('An error occurred. Please try again.');
    res.type('text/xml').send(response.toString());
  }
});

// @desc    Handle incoming call to Twilio number (route to mobile app)
// @route   POST /api/twilio/voice/incoming
// @access  Public (Twilio webhook)
router.post('/voice/incoming', async (req, res) => {
  try {
    const { From, To, CallSid, CallerName } = req.body;

    console.log(`📲 Incoming call: ${From} -> ${To}`);

    const response = new VoiceResponse();
    const userId = await getDefaultUserId();

    // Get full context about caller using Aria CRM Service
    const callerContext = await ariaCRMService.getCallerContext(userId, From);
    const { contact, lead, smsHistory, callHistory, appointments, isKnown, name, hasUpcomingAppointment, nextAppointment } = callerContext;

    const callerDisplay = name || CallerName || From;

    // Store context for this call
    voiceConversations.set(CallSid, {
      history: [],
      context: callerContext,
      userId,
      callerPhone: From
    });

    // Log the incoming call
    try {
      await CallLog.create({
        userId,
        twilioCallSid: CallSid,
        phoneNumber: From,
        direction: 'inbound',
        status: 'ringing',
        contactId: contact?._id,
        leadId: lead?._id,
        callerName: callerDisplay,
        source: 'twilio'
      });
    } catch (logError) {
      console.error('Error logging incoming call:', logError);
    }

    // Build personalized greeting based on context
    let greeting;
    if (isKnown && hasUpcomingAppointment) {
      const aptDate = new Date(nextAppointment.startTime);
      const aptDateStr = aptDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      greeting = `Hi ${name.split(' ')[0]}! Good to hear from you. I see you have an appointment scheduled for ${aptDateStr}. Are you calling about that, or is there something else I can help you with?`;
    } else if (isKnown) {
      greeting = `Hi ${name.split(' ')[0]}! Thanks for calling back. How can I help you today?`;
    } else {
      greeting = `Hi there! Thanks for calling. This is Aria, your AI assistant. May I get your name and how I can help you today?`;
    }

    response.say({
      voice: 'Polly.Joanna',
      language: 'en-US'
    }, greeting);

    // Gather speech input from caller
    response.gather({
      input: 'speech',
      timeout: 5,
      speechTimeout: 'auto',
      action: '/api/twilio/voice/aria-respond',
      method: 'POST',
      language: 'en-US'
    });

    // If no speech detected, prompt again
    response.say({
      voice: 'Polly.Joanna'
    }, "I didn't catch that. Please tell me how I can help you.");

    response.redirect('/api/twilio/voice/incoming');

    res.type('text/xml').send(response.toString());
  } catch (error) {
    console.error('Incoming call error:', error);
    const response = new VoiceResponse();
    response.say('We are unable to take your call right now. Please try again later.');
    res.type('text/xml').send(response.toString());
  }
});

// @desc    Handle Aria AI voice response
// @route   POST /api/twilio/voice/aria-respond
// @access  Public (Twilio webhook)
router.post('/voice/aria-respond', async (req, res) => {
  try {
    const { CallSid, From, SpeechResult, Confidence } = req.body;
    const response = new VoiceResponse();

    console.log(`🎤 Aria heard: "${SpeechResult}" (confidence: ${Confidence})`);

    if (!SpeechResult) {
      response.say({ voice: 'Polly.Joanna' }, "I didn't catch that. Could you please repeat?");
      response.redirect('/api/twilio/voice/incoming');
      return res.type('text/xml').send(response.toString());
    }

    // Get conversation context
    let callData = voiceConversations.get(CallSid);
    if (!callData) {
      const userId = await getDefaultUserId();
      const callerContext = await ariaCRMService.getCallerContext(userId, From);
      callData = {
        history: [],
        context: callerContext,
        userId,
        callerPhone: From
      };
      voiceConversations.set(CallSid, callData);
    }

    callData.history.push({ role: 'user', content: SpeechResult });

    // Build context summary for AI
    const { context, userId } = callData;
    const contextSummary = buildContextSummary(context);

    // Generate AI response with full context
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Aria, an intelligent AI assistant with FULL access to the CRM system.
Keep responses SHORT and conversational (1-2 sentences max for phone calls).

YOUR CAPABILITIES:
- Create and update leads in the CRM
- Schedule appointments
- Send follow-up SMS messages
- Access full contact/lead history
- Remember caller preferences

CALLER CONTEXT:
${contextSummary}

INSTRUCTIONS:
1. If caller gives their name, remember it
2. If they need a service, create a lead
3. If they want to schedule, offer available times (weekdays 8am-6pm)
4. Collect: name, service needed, urgency, best callback time
5. If they have an appointment, confirm details or help reschedule
6. Be warm, professional, and efficient
7. End calls gracefully when business is complete

RESPONSE FORMAT:
- Keep it brief (1-2 sentences)
- Sound natural and conversational
- If you need to take action (create lead, schedule), do it but keep talking naturally`
        },
        ...callData.history.slice(-8)
      ],
      max_tokens: 150,
      temperature: 0.7
    });

    const ariaResponse = completion.choices[0].message.content;
    callData.history.push({ role: 'assistant', content: ariaResponse });

    console.log(`🤖 Aria says: "${ariaResponse}"`);

    // Extract and process any actions from conversation
    await processAriaActions(userId, callData, SpeechResult);

    // Check if conversation should end
    const isEnding = ariaResponse.toLowerCase().includes('goodbye') ||
                     ariaResponse.toLowerCase().includes('have a great day') ||
                     ariaResponse.toLowerCase().includes('talk to you soon') ||
                     ariaResponse.toLowerCase().includes('take care');

    if (isEnding) {
      // Save/update lead with full conversation
      try {
        await finalizeCallLead(userId, callData);
      } catch (leadError) {
        console.error('Error finalizing lead:', leadError);
      }

      response.say({ voice: 'Polly.Joanna' }, ariaResponse);
      response.hangup();
      voiceConversations.delete(CallSid);
    } else {
      response.say({ voice: 'Polly.Joanna' }, ariaResponse);

      // Continue gathering speech
      response.gather({
        input: 'speech',
        timeout: 5,
        speechTimeout: 'auto',
        action: '/api/twilio/voice/aria-respond',
        method: 'POST',
        language: 'en-US'
      });

      // Timeout fallback
      response.say({ voice: 'Polly.Joanna' }, "Are you still there?");
      response.redirect('/api/twilio/voice/aria-respond');
    }

    res.type('text/xml').send(response.toString());
  } catch (error) {
    console.error('Aria respond error:', error);
    const response = new VoiceResponse();
    response.say({ voice: 'Polly.Joanna' }, "I'm sorry, I had trouble processing that. Let me connect you to voicemail.");
    response.say("Please leave a message after the beep.");
    response.record({ maxLength: 120, action: '/api/twilio/voice/voicemail' });
    res.type('text/xml').send(response.toString());
  }
});

// Build context summary for AI
function buildContextSummary(context) {
  const parts = [];

  if (context.isKnown) {
    parts.push(`KNOWN CALLER: ${context.name}`);
    if (context.lead) {
      parts.push(`Lead Status: ${context.lead.status}`);
      parts.push(`Service Interest: ${context.lead.projectType || 'Not specified'}`);
    }
    if (context.smsHistory?.length > 0) {
      const recentSMS = context.smsHistory.slice(0, 3).map(s =>
        `${s.direction === 'inbound' ? 'Them' : 'Us'}: ${s.message}`
      ).join('\n');
      parts.push(`Recent SMS:\n${recentSMS}`);
    }
    if (context.hasUpcomingAppointment) {
      const apt = context.nextAppointment;
      parts.push(`Upcoming Appointment: ${apt.title} on ${new Date(apt.startTime).toLocaleDateString()}`);
    }
  } else {
    parts.push('NEW CALLER - Unknown contact');
  }

  return parts.join('\n');
}

// Process actions Aria should take based on conversation
async function processAriaActions(userId, callData, userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  const { context, callerPhone } = callData;

  // Extract name if mentioned
  const nameMatch = userMessage.match(/(?:my name is|i'm|this is|call me)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) {
    callData.extractedName = nameMatch[1].split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    console.log(`📝 Extracted name: ${callData.extractedName}`);
  }

  // Extract service interest
  if (lowerMessage.includes('roof')) callData.extractedService = 'roofing';
  else if (lowerMessage.includes('plumb')) callData.extractedService = 'plumbing';
  else if (lowerMessage.includes('electric')) callData.extractedService = 'electrical';
  else if (lowerMessage.includes('hvac') || lowerMessage.includes('air condition') || lowerMessage.includes('heating')) callData.extractedService = 'hvac';
  else if (lowerMessage.includes('remodel') || lowerMessage.includes('renovation')) callData.extractedService = 'renovation';
  else if (lowerMessage.includes('repair')) callData.extractedService = 'repair';
  else if (lowerMessage.includes('paint')) callData.extractedService = 'painting';
  else if (lowerMessage.includes('floor')) callData.extractedService = 'flooring';
  else if (lowerMessage.includes('kitchen')) callData.extractedService = 'kitchen_remodel';
  else if (lowerMessage.includes('bath')) callData.extractedService = 'bathroom_remodel';

  // Check urgency
  if (lowerMessage.includes('urgent') || lowerMessage.includes('emergency') || lowerMessage.includes('asap') || lowerMessage.includes('right away')) {
    callData.isUrgent = true;
  }
}

// Finalize lead creation/update at end of call
async function finalizeCallLead(userId, callData) {
  const { callerPhone, history, context, extractedName, extractedService, isUrgent } = callData;

  const transcript = history.map(m => `${m.role === 'user' ? 'Caller' : 'Aria'}: ${m.content}`).join('\n');

  if (context.lead) {
    // Update existing lead
    const lead = context.lead;
    if (extractedService && !lead.projectType) lead.projectType = extractedService;
    if (isUrgent) lead.priority = 'urgent';
    lead.notes.push({
      content: `Voice call transcript:\n${transcript}`,
      createdBy: 'Aria AI',
      createdAt: new Date()
    });
    lead.lastActivityAt = new Date();
    lead.lastActivityType = 'ai_call';
    lead.callsReceived = (lead.callsReceived || 0) + 1;
    await lead.save();
    console.log(`📝 Updated existing lead: ${lead.name}`);
  } else {
    // Create new lead
    const leadData = {
      phone: callerPhone,
      name: extractedName || 'Voice Caller',
      source: 'ai_call',
      projectType: extractedService,
      priority: isUrgent ? 'urgent' : 'medium'
    };

    const newLead = await ariaCRMService.createLeadFromCaller(userId, {
      ...leadData,
      notes: `Voice call transcript:\n${transcript}`
    });
    console.log(`📝 Created new lead: ${newLead.name} (${newLead.phone})`);

    // Also create/update contact
    await ariaCRMService.upsertContact(userId, {
      phone: callerPhone,
      name: extractedName || 'Voice Caller',
      notes: `First contact via voice call. Service interest: ${extractedService || 'Not specified'}`
    });
  }
}

// Helper to extract lead info from conversation
function extractLeadInfo(messages) {
  const fullText = messages.map(m => m.content).join(' ').toLowerCase();
  const info = {};

  // Extract name patterns
  const nameMatch = fullText.match(/(?:my name is|i'm|this is|call me)\s+([a-z]+(?:\s+[a-z]+)?)/i);
  if (nameMatch) info.name = nameMatch[1].split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // Extract service needs
  if (fullText.includes('roof')) info.service = 'roofing';
  else if (fullText.includes('plumb')) info.service = 'plumbing';
  else if (fullText.includes('electric')) info.service = 'electrical';
  else if (fullText.includes('remodel') || fullText.includes('renovation')) info.service = 'renovation';
  else if (fullText.includes('repair')) info.service = 'repair';

  return info;
}

// @desc    Handle dial status (call ended)
// @route   POST /api/twilio/voice/dial-status
// @access  Public (Twilio webhook)
router.post('/dial-status', async (req, res) => {
  try {
    const { CallSid, DialCallStatus, DialCallDuration } = req.body;

    console.log(`📞 Dial status: ${CallSid} - ${DialCallStatus} (${DialCallDuration}s)`);

    // Update call log
    await CallLog.findOneAndUpdate(
      { twilioCallSid: CallSid },
      {
        status: DialCallStatus,
        duration: parseInt(DialCallDuration) || 0,
        endedAt: new Date()
      }
    );

    // Log conversation to contact if call was answered
    if (DialCallStatus === 'completed' && DialCallDuration > 0) {
      const callLog = await CallLog.findOne({ twilioCallSid: CallSid });
      if (callLog?.contactId) {
        const contact = await Contact.findById(callLog.contactId);
        if (contact) {
          await contact.addConversation(
            'call',
            callLog.direction === 'outbound' ? 'outgoing' : 'incoming',
            `${callLog.direction === 'outbound' ? 'Outgoing' : 'Incoming'} call (${Math.floor(DialCallDuration / 60)}m ${DialCallDuration % 60}s)`,
            {
              twilioCallSid: CallSid,
              duration: DialCallDuration,
              source: 'twilio_voip'
            }
          );
        }
      }
    }

    const response = new VoiceResponse();
    res.type('text/xml').send(response.toString());
  } catch (error) {
    console.error('Dial status error:', error);
    res.type('text/xml').send(new VoiceResponse().toString());
  }
});

// @desc    Handle call events (status updates)
// @route   POST /api/twilio/voice/call-events
// @access  Public (Twilio webhook)
router.post('/call-events', async (req, res) => {
  try {
    const { CallSid, CallStatus, CallDuration, Timestamp } = req.body;

    console.log(`📞 Call event: ${CallSid} - ${CallStatus}`);

    // Update call log
    await CallLog.findOneAndUpdate(
      { twilioCallSid: CallSid },
      {
        status: CallStatus,
        duration: parseInt(CallDuration) || 0,
        ...(CallStatus === 'completed' && { endedAt: new Date() })
      }
    );

    res.sendStatus(200);
  } catch (error) {
    console.error('Call event error:', error);
    res.sendStatus(500);
  }
});

// @desc    Handle voicemail recording
// @route   POST /api/twilio/voice/voicemail
// @access  Public (Twilio webhook)
router.post('/voicemail', async (req, res) => {
  try {
    const { CallSid, RecordingUrl, RecordingDuration, From } = req.body;

    console.log(`📼 Voicemail received: ${CallSid} (${RecordingDuration}s)`);

    // Update call log with voicemail
    await CallLog.findOneAndUpdate(
      { twilioCallSid: CallSid },
      {
        status: 'voicemail',
        voicemailUrl: RecordingUrl,
        voicemailDuration: parseInt(RecordingDuration) || 0
      }
    );

    // TODO: Send push notification about voicemail

    const response = new VoiceResponse();
    response.say('Thank you for your message. Goodbye.');
    response.hangup();

    res.type('text/xml').send(response.toString());
  } catch (error) {
    console.error('Voicemail error:', error);
    res.type('text/xml').send(new VoiceResponse().toString());
  }
});

// @desc    Handle voicemail transcription
// @route   POST /api/twilio/voice/transcription
// @access  Public (Twilio webhook)
router.post('/transcription', async (req, res) => {
  try {
    const { CallSid, TranscriptionText, TranscriptionStatus } = req.body;

    console.log(`📝 Transcription: ${CallSid} - ${TranscriptionStatus}`);

    if (TranscriptionStatus === 'completed' && TranscriptionText) {
      await CallLog.findOneAndUpdate(
        { twilioCallSid: CallSid },
        { voicemailTranscription: TranscriptionText }
      );

      // Log to contact conversation
      const callLog = await CallLog.findOne({ twilioCallSid: CallSid });
      if (callLog?.contactId) {
        const contact = await Contact.findById(callLog.contactId);
        if (contact) {
          await contact.addConversation(
            'call',
            'incoming',
            `Voicemail: "${TranscriptionText}"`,
            {
              twilioCallSid: CallSid,
              voicemailUrl: callLog.voicemailUrl,
              duration: callLog.voicemailDuration,
              source: 'twilio_voicemail'
            }
          );
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Transcription error:', error);
    res.sendStatus(500);
  }
});

// ============================================
// SMS ENDPOINTS
// ============================================

// @desc    Send SMS from mobile app
// @route   POST /api/twilio/sms/send
// @access  Private (should add auth)
router.post('/sms/send', async (req, res) => {
  try {
    const { to, message, contactId, userId } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and message are required'
      });
    }

    // Send SMS via Twilio
    const result = await twilioService.sendSMS(to, message);

    // Log to contact if provided
    if (contactId) {
      try {
        const contact = await Contact.findById(contactId);
        if (contact) {
          await contact.addConversation(
            'sms',
            'outgoing',
            message,
            {
              twilioSid: result.sid,
              status: result.status,
              source: 'mobile_app'
            }
          );
        }
      } catch (logError) {
        console.error('Error logging SMS to contact:', logError);
      }
    }

    // Also log via agent SMS service for full tracking
    try {
      await agentSMSService.sendSMS({
        userId: userId || '000000000000000000000000',
        to: to,
        message: message,
        leadId: contactId
      });
    } catch (smsLogError) {
      console.error('Error logging via agentSMSService:', smsLogError);
    }

    res.json({
      success: true,
      messageSid: result.sid,
      status: result.status,
      message: 'SMS sent successfully'
    });
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get SMS conversation with a contact
// @route   GET /api/twilio/sms/conversation/:contactId
// @access  Private (should add auth)
router.get('/sms/conversation/:contactId', async (req, res) => {
  try {
    const { contactId } = req.params;
    const { limit = 50 } = req.query;

    const contact = await Contact.findById(contactId);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }

    // Get SMS messages from conversation history
    const smsMessages = (contact.conversationHistory || [])
      .filter(msg => msg.type === 'sms')
      .slice(-parseInt(limit))
      .map(msg => ({
        id: msg._id,
        direction: msg.direction,
        content: msg.content,
        timestamp: msg.timestamp,
        status: msg.metadata?.status,
        twilioSid: msg.metadata?.twilioSid
      }));

    res.json({
      success: true,
      contact: {
        id: contact._id,
        name: contact.name,
        phone: contact.phone
      },
      messages: smsMessages,
      count: smsMessages.length
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Handle incoming SMS webhook (log to contact)
// @route   POST /api/twilio/sms/incoming
// @access  Public (Twilio webhook)
router.post('/sms/incoming', async (req, res) => {
  try {
    const { From, To, Body, MessageSid, NumMedia } = req.body;

    console.log(`💬 Incoming SMS: ${From} -> ${To}: ${Body}`);

    // Find contact by phone number
    const normalizedPhone = From.replace(/\D/g, '').slice(-10);
    const contact = await Contact.findOne({
      phone: { $regex: normalizedPhone }
    });

    if (contact) {
      // Log to contact conversation history
      await contact.addConversation(
        'sms',
        'incoming',
        Body,
        {
          twilioSid: MessageSid,
          numMedia: parseInt(NumMedia) || 0,
          source: 'twilio'
        }
      );

      console.log(`📱 SMS logged to contact: ${contact.name}`);
    } else {
      console.log(`📱 SMS from unknown number: ${From}`);
    }

    // TODO: Send push notification to mobile app

    // Respond with empty TwiML (no auto-reply from this endpoint)
    res.type('text/xml').send('<Response></Response>');
  } catch (error) {
    console.error('Incoming SMS error:', error);
    res.type('text/xml').send('<Response></Response>');
  }
});

// @desc    Get all SMS threads (for inbox view)
// @route   GET /api/twilio/sms/threads
// @access  Private (should add auth)
router.get('/sms/threads', async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;

    // Get contacts with recent SMS activity
    const contacts = await Contact.find({
      user: userId || '000000000000000000000000',
      isDeleted: false,
      'conversationHistory.type': 'sms'
    })
    .select('name phone avatar conversationHistory')
    .sort({ lastInteraction: -1 })
    .limit(parseInt(limit));

    const threads = contacts.map(contact => {
      const smsMessages = (contact.conversationHistory || [])
        .filter(msg => msg.type === 'sms');
      const lastMessage = smsMessages[smsMessages.length - 1];

      return {
        contactId: contact._id,
        name: contact.name,
        phone: contact.phone,
        avatar: contact.avatar,
        lastMessage: lastMessage?.content || '',
        lastMessageTime: lastMessage?.timestamp,
        lastMessageDirection: lastMessage?.direction,
        unreadCount: smsMessages.filter(m => m.direction === 'incoming' && !m.metadata?.read).length,
        totalMessages: smsMessages.length
      };
    });

    // Sort by last message time
    threads.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    res.json({
      success: true,
      threads,
      count: threads.length
    });
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get call history
// @route   GET /api/twilio/calls/history
// @access  Private (should add auth)
router.get('/calls/history', async (req, res) => {
  try {
    const { userId, limit = 50 } = req.query;

    const calls = await CallLog.find({
      userId: userId || '000000000000000000000000'
    })
    .populate('contactId', 'name phone avatar')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    const history = calls.map(call => ({
      id: call._id,
      twilioSid: call.twilioCallSid,
      direction: call.direction,
      status: call.status,
      from: call.from,
      to: call.to,
      duration: call.duration,
      contact: call.contactId ? {
        id: call.contactId._id,
        name: call.contactId.name,
        phone: call.contactId.phone,
        avatar: call.contactId.avatar
      } : null,
      callerName: call.callerName,
      voicemailUrl: call.voicemailUrl,
      voicemailTranscription: call.voicemailTranscription,
      timestamp: call.createdAt
    }));

    res.json({
      success: true,
      calls: history,
      count: history.length
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Setup Twilio for mobile (creates TwiML App and API Key)
// @route   POST /api/twilio/setup
// @access  Private (admin only)
router.post('/setup', async (req, res) => {
  try {
    const results = {};

    // Create TwiML App
    const app = await twilioService.getOrCreateTwiMLApp();
    results.twimlApp = {
      sid: app.sid,
      friendlyName: app.friendlyName,
      voiceUrl: app.voiceUrl
    };

    // Create API Key if needed
    if (!process.env.TWILIO_API_KEY) {
      const key = await twilioService.createApiKey();
      results.apiKey = {
        sid: key.sid,
        // Don't return secret in response - logged to console only
        message: 'API Key created - check server logs for secret'
      };
    } else {
      results.apiKey = {
        message: 'API Key already configured'
      };
    }

    res.json({
      success: true,
      message: 'Twilio mobile setup complete',
      results,
      nextSteps: [
        'Add TWILIO_TWIML_APP_SID to .env',
        'Add TWILIO_API_KEY and TWILIO_API_SECRET to .env',
        'Configure incoming call webhook to /api/twilio/voice/incoming',
        'Configure SMS webhook to /api/twilio/sms/incoming'
      ]
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// DEVICE SYNC ENDPOINTS
// ============================================

// @desc    Sync contacts from device
// @route   POST /api/twilio/sync/contacts
// @access  Private
router.post('/sync/contacts', async (req, res) => {
  try {
    const { userId, contacts } = req.body;

    if (!userId || !contacts || !Array.isArray(contacts)) {
      return res.status(400).json({
        success: false,
        message: 'userId and contacts array are required'
      });
    }

    const result = await backgroundSyncService.syncContacts(userId, contacts);

    res.json({
      success: true,
      message: 'Contacts synced successfully',
      ...result
    });
  } catch (error) {
    console.error('Contact sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Sync calendar events from device
// @route   POST /api/twilio/sync/calendar
// @access  Private
router.post('/sync/calendar', async (req, res) => {
  try {
    const { userId, events } = req.body;

    if (!userId || !events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'userId and events array are required'
      });
    }

    const result = await backgroundSyncService.syncCalendar(userId, events);

    res.json({
      success: true,
      message: 'Calendar synced successfully',
      ...result
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Sync call history from device
// @route   POST /api/twilio/sync/calls
// @access  Private
router.post('/sync/calls', async (req, res) => {
  try {
    const { userId, calls } = req.body;

    if (!userId || !calls || !Array.isArray(calls)) {
      return res.status(400).json({
        success: false,
        message: 'userId and calls array are required'
      });
    }

    const result = await backgroundSyncService.syncCallHistory(userId, calls);

    res.json({
      success: true,
      message: 'Call history synced successfully',
      ...result
    });
  } catch (error) {
    console.error('Call history sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Sync SMS history from device
// @route   POST /api/twilio/sync/sms
// @access  Private
router.post('/sync/sms', async (req, res) => {
  try {
    const { userId, messages } = req.body;

    if (!userId || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: 'userId and messages array are required'
      });
    }

    const result = await backgroundSyncService.syncSMSHistory(userId, messages);

    res.json({
      success: true,
      message: 'SMS history synced successfully',
      ...result
    });
  } catch (error) {
    console.error('SMS sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Full device sync (all data types)
// @route   POST /api/twilio/sync/full
// @access  Private
router.post('/sync/full', async (req, res) => {
  try {
    const { userId, contacts, calendar, calls, sms } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const result = await backgroundSyncService.fullDeviceSync(userId, {
      contacts: contacts || [],
      calendar: calendar || [],
      calls: calls || [],
      sms: sms || []
    });

    res.json({
      success: true,
      message: 'Full device sync completed',
      results: result
    });
  } catch (error) {
    console.error('Full sync error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get sync status
// @route   GET /api/twilio/sync/status
// @access  Private
router.get('/sync/status', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const status = await backgroundSyncService.getSyncStatus(userId);

    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// ARIA CRM ENDPOINTS
// ============================================

// @desc    Search contacts via Aria
// @route   GET /api/twilio/aria/search
// @access  Private
router.get('/aria/search', async (req, res) => {
  try {
    const { userId, query } = req.query;

    if (!userId || !query) {
      return res.status(400).json({
        success: false,
        message: 'userId and query are required'
      });
    }

    const contacts = await ariaCRMService.searchContacts(userId, query);
    const leads = await ariaCRMService.searchLeads(userId, query);

    res.json({
      success: true,
      contacts,
      leads
    });
  } catch (error) {
    console.error('Aria search error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get caller context
// @route   GET /api/twilio/aria/context
// @access  Private
router.get('/aria/context', async (req, res) => {
  try {
    const { userId, phone } = req.query;

    if (!userId || !phone) {
      return res.status(400).json({
        success: false,
        message: 'userId and phone are required'
      });
    }

    const context = await ariaCRMService.getCallerContext(userId, phone);

    res.json({
      success: true,
      ...context
    });
  } catch (error) {
    console.error('Get context error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Have Aria take autonomous action
// @route   POST /api/twilio/aria/action
// @access  Private
router.post('/aria/action', async (req, res) => {
  try {
    const { userId, context, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId and message are required'
      });
    }

    // Have Aria decide what action to take
    const decision = await ariaCRMService.decideAction(userId, context || {}, message);

    // Execute the action
    const result = await ariaCRMService.executeAction(userId, decision);

    res.json({
      success: true,
      decision,
      result
    });
  } catch (error) {
    console.error('Aria action error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Make outbound call via Aria
// @route   POST /api/twilio/aria/call
// @access  Private
router.post('/aria/call', async (req, res) => {
  try {
    const { userId, to, message } = req.body;

    if (!userId || !to) {
      return res.status(400).json({
        success: false,
        message: 'userId and to phone number are required'
      });
    }

    const call = await ariaCRMService.makeCall(userId, to, message || 'Hello, this is Aria calling from VoiceFlow. How can I help you today?');

    res.json({
      success: true,
      message: 'Call initiated',
      callSid: call.sid
    });
  } catch (error) {
    console.error('Aria call error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Send SMS via Aria
// @route   POST /api/twilio/aria/sms
// @access  Private
router.post('/aria/sms', async (req, res) => {
  try {
    const { userId, to, message, leadId } = req.body;

    if (!userId || !to || !message) {
      return res.status(400).json({
        success: false,
        message: 'userId, to, and message are required'
      });
    }

    const sms = await ariaCRMService.sendSMS(userId, to, message, leadId);

    res.json({
      success: true,
      message: 'SMS sent',
      smsId: sms._id
    });
  } catch (error) {
    console.error('Aria SMS error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get leads needing follow-up
// @route   GET /api/twilio/aria/followups
// @access  Private
router.get('/aria/followups', async (req, res) => {
  try {
    const { userId, daysOld = 3 } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const leads = await ariaCRMService.getLeadsNeedingFollowUp(userId, parseInt(daysOld));

    res.json({
      success: true,
      leads,
      count: leads.length
    });
  } catch (error) {
    console.error('Get followups error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get today's appointments
// @route   GET /api/twilio/aria/appointments/today
// @access  Private
router.get('/aria/appointments/today', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required'
      });
    }

    const appointments = await ariaCRMService.getTodayAppointments(userId);

    res.json({
      success: true,
      appointments,
      count: appointments.length
    });
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
