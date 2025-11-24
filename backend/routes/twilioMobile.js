import express from 'express';
import twilio from 'twilio';
import TwilioService from '../services/twilioService.js';
import agentSMSService from '../services/agentSMSService.js';
import Contact from '../models/Contact.js';
import CallLog from '../models/CallLog.js';

const router = express.Router();
const twilioService = new TwilioService();
const VoiceResponse = twilio.twiml.VoiceResponse;

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

    // Look up the caller in contacts
    const normalizedPhone = From.replace(/\D/g, '').slice(-10);
    const contact = await Contact.findOne({
      phone: { $regex: normalizedPhone }
    });

    const callerDisplay = contact?.name || CallerName || From;

    // Log the incoming call
    try {
      await CallLog.create({
        twilioCallSid: CallSid,
        from: From,
        to: To,
        direction: 'inbound',
        status: 'ringing',
        contactId: contact?._id,
        callerName: callerDisplay,
        source: 'twilio'
      });
    } catch (logError) {
      console.error('Error logging incoming call:', logError);
    }

    // Try to connect to registered mobile client
    // The client identity should match what's used in the token
    const dial = response.dial({
      timeout: 25,
      action: '/api/twilio/voice/dial-status',
      method: 'POST'
    });

    // Ring all registered clients (you can filter by user)
    // For now, ring clients with the default user pattern
    dial.client({
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallback: '/api/twilio/voice/call-events',
      statusCallbackMethod: 'POST'
    }, 'mobile_user'); // This should match the identity used in token generation

    // If no answer, go to voicemail
    response.say('The person you are trying to reach is unavailable. Please leave a message after the beep.');
    response.record({
      maxLength: 120,
      action: '/api/twilio/voice/voicemail',
      transcribe: true,
      transcribeCallback: '/api/twilio/voice/transcription'
    });

    res.type('text/xml').send(response.toString());
  } catch (error) {
    console.error('Incoming call error:', error);
    const response = new VoiceResponse();
    response.say('We are unable to take your call right now. Please try again later.');
    res.type('text/xml').send(response.toString());
  }
});

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

export default router;
