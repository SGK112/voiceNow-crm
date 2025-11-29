import express from 'express';
import twilio from 'twilio';
import { callMonitoringService } from '../services/callMonitoringService.js';
import UserProfile from '../models/UserProfile.js';
import OpenAI from 'openai';
import { ariaMemoryService } from '../services/ariaMemoryService.js';

const router = express.Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * POST /api/voicemail/interactive/:userId
 * TwiML endpoint for interactive voicemail
 */
router.post('/interactive/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { SpeechResult, Digits } = req.body;

    console.log(`<�  [VOICEMAIL] Interactive call for user ${userId}`);

    const profile = await UserProfile.findOne({ userId });
    const response = new VoiceResponse();

    // Get conversation context
    const sessionId = `voicemail_${userId}_${Date.now()}`;
    const context = await ariaMemoryService.getConversationContext(sessionId, userId);

    // Initial greeting if no input yet
    if (!SpeechResult && !Digits) {
      const greeting = profile?.ariaPreferences?.interactiveVoicemail?.greeting ||
        `Hi, this is Aria, the AI assistant. The person you're trying to reach is unavailable. I can take a message or answer questions. What can I help you with?`;

      const gather = response.gather({
        input: ['speech'],
        timeout: 5,
        action: `/api/voicemail/interactive/${userId}`,
        method: 'POST',
        speechTimeout: 'auto',
        language: 'en-US'
      });

      gather.say(greeting);

      // If no response, take message
      response.say('I didn\'t catch that. Please leave a message after the beep.');
      response.record({
        transcribe: true,
        transcribeCallback: `/api/voicemail/transcribe/${userId}`,
        maxLength: 120,
        playBeep: true
      });
      response.say('Thank you for your message. Goodbye!');
      response.hangup();

      res.type('text/xml');
      return res.send(response.toString());
    }

    // Handle speech input
    if (SpeechResult) {
      console.log(`=� [VOICEMAIL] Speech: "${SpeechResult}"`);

      // Add message to conversation
      await ariaMemoryService.addMessage(sessionId, 'user', SpeechResult);

      // Get AI response using full context and memories
      const messages = [
        {
          role: 'system',
          content: `You are Aria, an AI voicemail assistant for ${profile?.personalInfo?.firstName || 'your user'}.

You're taking a call on their behalf. Be helpful, professional, and conversational.

CAPABILITIES:
- Take messages and remember important details
- Answer common questions about the user's availability
- Schedule callbacks
- Provide basic information

CONTEXT:
${context.memories?.length > 0 ? `Relevant information:\n${context.memories.map(m => `- ${m.key}: ${m.value}`).join('\n')}` : ''}

RESPONSE STYLE:
- Keep responses under 30 words for phone calls
- Be natural and conversational
- Ask clarifying questions if needed
- Offer to take a message if you can't help

Current situation: The caller missed ${profile?.personalInfo?.firstName || 'the user'} and you're handling the call.`
        },
        {
          role: 'user',
          content: SpeechResult
        }
      ];

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 80,
        temperature: 0.7
      });

      const aiResponse = completion.choices[0].message.content;
      console.log(`> [VOICEMAIL] AI Response: "${aiResponse}"`);

      // Save AI response
      await ariaMemoryService.addMessage(sessionId, 'assistant', aiResponse);

      // Continue conversation
      const gather = response.gather({
        input: ['speech'],
        timeout: 5,
        action: `/api/voicemail/interactive/${userId}`,
        method: 'POST',
        speechTimeout: 'auto',
        language: 'en-US'
      });

      gather.say(aiResponse);

      // If no follow-up, end call
      response.say('Thank you for calling. Goodbye!');
      response.hangup();

      res.type('text/xml');
      return res.send(response.toString());
    }

    // Fallback
    response.say('Thank you for calling. Goodbye!');
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  } catch (error) {
    console.error('L [VOICEMAIL] Interactive error:', error);

    const response = new VoiceResponse();
    response.say('I apologize, but I\'m having technical difficulties. Please try again later. Goodbye!');
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  }
});

/**
 * POST /api/voicemail/transcribe/:userId
 * Callback for voicemail transcription
 */
router.post('/transcribe/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { TranscriptionText, RecordingUrl, CallSid } = req.body;

    console.log(`=� [VOICEMAIL] Transcription for user ${userId}: "${TranscriptionText}"`);

    // Store voicemail as memory
    await ariaMemoryService.storeMemory(
      userId,
      `voicemail_${CallSid}`,
      TranscriptionText,
      {
        category: 'conversation',
        importance: 8,
        source: 'voicemail',
        sessionId: CallSid
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('L [VOICEMAIL] Transcription error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voicemail/status/:userId
 * Call status callback
 */
router.post('/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { CallStatus, CallSid, To } = req.body;

    console.log(`=� [VOICEMAIL] Call ${CallSid} status: ${CallStatus}`);

    // You can emit events or update database here based on call status

    res.json({ success: true });
  } catch (error) {
    console.error('L [VOICEMAIL] Status callback error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voicemail/monitor/start
 * Start call monitoring for user
 */
router.post('/monitor/start', async (req, res) => {
  try {
    const { userId, phoneNumber } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = await callMonitoringService.startMonitoring(userId, phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('L [MONITOR] Start error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voicemail/monitor/stop
 * Stop call monitoring for user
 */
router.post('/monitor/stop', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const result = callMonitoringService.stopMonitoring(userId);
    res.json(result);
  } catch (error) {
    console.error('L [MONITOR] Stop error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voicemail/log-call
 * Log incoming call from mobile app
 */
router.post('/log-call', async (req, res) => {
  try {
    const { userId, callData } = req.body;

    if (!userId || !callData) {
      return res.status(400).json({
        success: false,
        error: 'userId and callData are required'
      });
    }

    const result = await callMonitoringService.logIncomingCall(userId, callData);
    res.json(result);
  } catch (error) {
    console.error('L [CALL LOG] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voicemail/missed-calls/:userId
 * Get missed calls for user
 */
router.get('/missed-calls/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const missedCalls = callMonitoringService.getMissedCalls(userId);

    res.json({
      success: true,
      missedCalls
    });
  } catch (error) {
    console.error('L [MISSED CALLS] Get error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/voicemail/callback
 * Manually trigger callback to a number
 */
router.post('/callback', async (req, res) => {
  try {
    const { userId, phoneNumber, callerName } = req.body;

    if (!userId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'userId and phoneNumber are required'
      });
    }

    const result = await callMonitoringService.triggerCallback(userId, phoneNumber, callerName);
    res.json(result);
  } catch (error) {
    console.error('L [CALLBACK] Trigger error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/voicemail/stats/:userId
 * Get monitoring stats for user
 */
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = callMonitoringService.getMonitoringStats(userId);
    res.json(result);
  } catch (error) {
    console.error('L [STATS] Get error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
