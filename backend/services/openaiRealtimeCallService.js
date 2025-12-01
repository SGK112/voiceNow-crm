import WebSocket from 'ws';
import twilio from 'twilio';

/**
 * OpenAI Realtime + Twilio Call Service
 * Handles outbound calls using Twilio for phone connection and OpenAI Realtime API for conversation
 * This gives ARIA full control over phone calls with her personality
 */
class OpenAIRealtimeCallService {
  constructor() {
    this.activeCalls = new Map(); // Track active call sessions
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.baseUrl = process.env.BASE_URL || 'https://voiceflow-crm.onrender.com';
  }

  /**
   * Initiate an outbound call with OpenAI Realtime
   * @param {Object} options - Call options
   * @param {string} options.toNumber - Phone number to call
   * @param {string} options.contactName - Name of the person being called
   * @param {string} options.purpose - Purpose of the call
   * @param {Object} options.context - Additional context (user profile, contact info, etc.)
   * @returns {Promise<Object>} Call result
   */
  async initiateCall({ toNumber, contactName, purpose, context = {} }) {
    try {
      console.log(`📞 [ARIA-CALL] Initiating OpenAI Realtime call to ${toNumber}`);
      console.log(`   Contact: ${contactName || 'Unknown'}`);
      console.log(`   Purpose: ${purpose || 'General call'}`);

      // Generate a unique call ID
      const callId = `aria_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Build ARIA's system instructions for this call
      const systemInstructions = this.buildSystemInstructions({
        contactName,
        purpose,
        context
      });

      // Store call context
      this.activeCalls.set(callId, {
        id: callId,
        toNumber,
        contactName,
        purpose,
        context,
        systemInstructions,
        status: 'initiating',
        startTime: new Date(),
        transcript: [],
        openaiWs: null,
        twilioStreamSid: null
      });

      // Make the outbound call via Twilio
      // The TwiML will connect to our WebSocket endpoint
      const call = await this.twilioClient.calls.create({
        to: toNumber,
        from: this.twilioPhoneNumber,
        url: `${this.baseUrl}/api/aria-realtime/twiml/${callId}`,
        statusCallback: `${this.baseUrl}/api/aria-realtime/status/${callId}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        statusCallbackMethod: 'POST'
      });

      console.log(`✅ [ARIA-CALL] Call initiated: ${call.sid}`);

      // Update call state
      const callState = this.activeCalls.get(callId);
      if (callState) {
        callState.twilioCallSid = call.sid;
        callState.status = 'calling';
      }

      return {
        success: true,
        callId,
        twilioCallSid: call.sid,
        message: `ARIA is calling ${contactName || toNumber}...`
      };

    } catch (error) {
      console.error(`❌ [ARIA-CALL] Failed to initiate call:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build ARIA's system instructions for the call
   */
  buildSystemInstructions({ contactName, purpose, context }) {
    const userName = context.ownerName || context.userName || 'the team';
    const userCompany = context.ownerCompany || context.userCompany || '';
    const contactFirstName = contactName ? contactName.split(' ')[0] : 'there';

    return `# ARIA'S CORE IDENTITY (NEVER FORGET THIS)
You are ARIA - a sharp, witty, genuinely likeable AI assistant making a phone call. You have REAL personality. You're warm but efficient, funny but professional. Think: your favorite coworker who's great at their job AND fun to talk to.

# YOUR VOICE (USE THIS THROUGHOUT THE ENTIRE CALL)
- SHORT punchy sentences. No rambling. Ever.
- Sound HUMAN: use "honestly," "here's the deal," "so basically," "look," "real talk"
- Use contractions ALWAYS: I'm, you're, we'll, that's, can't, won't
- React genuinely: laugh at funny things ("Ha! Good one"), show real empathy ("Oh man, that's rough")
- Light humor is your thing - clever, office-appropriate, never forced
- Mirror their energy: they're chill? be chill. They're rushed? be quick.
- NEVER say "I'm an AI" or "As an AI" unless directly asked. You're ARIA, that's your name.

# WHO YOU'RE REPRESENTING
You're calling on behalf of ${userName}${userCompany ? ` from ${userCompany}` : ''}.
If asked who you are: "I'm ARIA, ${userName}'s assistant${userCompany ? ` at ${userCompany}` : ''}. Think of me as the most organized team member - minus the coffee breaks!"

# THIS CALL
- You're calling: ${contactName || 'this person'}
- Purpose: ${purpose || 'to connect and help'}
${context.contactCompany ? `- Their company: ${context.contactCompany}` : ''}
${context.lastInteraction ? `- Last interaction: ${context.lastInteraction}` : ''}
${context.notes ? `- Notes: ${context.notes}` : ''}

# CALL FLOW
1. OPENING: Be warm but quick. "Hey ${contactFirstName}! It's ARIA calling from ${userCompany || `${userName}'s office`}. Got a quick sec?"
2. REASON: Get to the point fast. Don't waste their time.
3. LISTEN: Actually listen. Respond to what they say, not what you planned to say.
4. CLOSE: Clear next steps. "So we're good to..." or "I'll have ${userName} follow up on..."

# REMEMBER THROUGHOUT
- You're ARIA - personality ON at all times
- Keep responses SHORT and conversational
- React like a human would
- If they're busy, offer to call back
- If they're chatty, match their energy
- End calls cleanly - don't drag them out

# TOOLS AVAILABLE
You can execute these actions during the call:
- send_sms: Send a text message to the person you're calling
- schedule_callback: Schedule a follow-up call
- create_note: Save notes about the conversation
- lookup_info: Look up information from the CRM

When using tools, briefly tell them what you're doing: "Let me shoot you a quick text with that info..."`;
  }

  /**
   * Handle TwiML request for the call
   * Returns TwiML that connects to our media stream WebSocket
   */
  getTwiML(callId) {
    const wsUrl = `wss://${new URL(this.baseUrl).host}/api/aria-realtime/media-stream/${callId}`;

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${wsUrl}">
            <Parameter name="callId" value="${callId}" />
        </Stream>
    </Connect>
</Response>`;
  }

  /**
   * Handle Twilio media stream WebSocket connection
   * This bridges Twilio audio <-> OpenAI Realtime API
   * Supports both:
   * 1. Calls initiated via this service's initiateCall() method
   * 2. Calls initiated externally (e.g., from ariaCapabilities.js) with context in URL params
   */
  async handleMediaStream(ws, callId, urlParams = {}) {
    console.log(`🌐 [ARIA-CALL] Media stream connected for call: ${callId}`);

    let callState = this.activeCalls.get(callId);

    // If call doesn't exist in activeCalls, create it from URL parameters
    // This happens when calls are initiated externally (e.g., from ariaCapabilities.js)
    if (!callState) {
      console.log(`📞 [ARIA-CALL] Creating call state from URL params for: ${callId}`);
      const { contactName, purpose, ownerName, ownerCompany } = urlParams;

      // Build system instructions for external calls
      const systemInstructions = this.buildSystemInstructions({
        contactName: contactName || 'there',
        purpose: purpose || 'to connect and help',
        context: {
          ownerName: ownerName || 'the team',
          ownerCompany: ownerCompany || ''
        }
      });

      callState = {
        id: callId,
        toNumber: 'external', // We don't have this from URL params
        contactName: contactName || 'Unknown',
        purpose: purpose || 'General call',
        context: { ownerName, ownerCompany },
        systemInstructions,
        status: 'connecting',
        startTime: new Date(),
        transcript: [],
        openaiWs: null,
        twilioStreamSid: null,
        externalCall: true // Flag to indicate externally initiated call
      };

      this.activeCalls.set(callId, callState);
      console.log(`✅ [ARIA-CALL] Created call state:`, {
        contactName: callState.contactName,
        purpose: callState.purpose,
        ownerName,
        ownerCompany
      });
    }

    let streamSid = null;
    let openaiWs = null;

    // Connect to OpenAI Realtime API
    try {
      openaiWs = new WebSocket(
        'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'OpenAI-Beta': 'realtime=v1'
          }
        }
      );

      callState.openaiWs = openaiWs;

      // Handle OpenAI connection open
      openaiWs.on('open', () => {
        console.log(`🤖 [ARIA-CALL] Connected to OpenAI Realtime API`);

        // Configure the session
        openaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: callState.systemInstructions,
            voice: 'shimmer', // ARIA's voice - warm and expressive
            input_audio_format: 'g711_ulaw',
            output_audio_format: 'g711_ulaw',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            }
          }
        }));
      });

      // Handle OpenAI messages
      openaiWs.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleOpenAIEvent(event, ws, callState, streamSid);
        } catch (error) {
          console.error(`❌ [ARIA-CALL] Error parsing OpenAI message:`, error);
        }
      });

      openaiWs.on('error', (error) => {
        console.error(`❌ [ARIA-CALL] OpenAI WebSocket error:`, error);
      });

      openaiWs.on('close', () => {
        console.log(`🔌 [ARIA-CALL] OpenAI WebSocket closed`);
      });

    } catch (error) {
      console.error(`❌ [ARIA-CALL] Failed to connect to OpenAI:`, error);
      ws.close();
      return;
    }

    // Handle Twilio media stream messages
    ws.on('message', (message) => {
      try {
        const msg = JSON.parse(message);

        switch (msg.event) {
          case 'start':
            streamSid = msg.start.streamSid;
            callState.twilioStreamSid = streamSid;
            callState.status = 'connected';
            console.log(`🎙️ [ARIA-CALL] Stream started: ${streamSid}`);
            // Wait for OpenAI session to be ready, then greet
            // Small delay to ensure everything is ready for bidirectional audio
            if (callState.openaiSessionReady && !callState.greetingSent) {
              setTimeout(() => {
                this.sendInitialGreeting(callState);
              }, 500);
            }
            break;

          case 'media':
            // Forward audio from Twilio to OpenAI
            if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
              openaiWs.send(JSON.stringify({
                type: 'input_audio_buffer.append',
                audio: msg.media.payload // Already base64 g711_ulaw
              }));
            }
            break;

          case 'stop':
            console.log(`📞 [ARIA-CALL] Stream stopped: ${callId}`);
            this.endCall(callId);
            break;
        }
      } catch (error) {
        console.error(`❌ [ARIA-CALL] Error processing Twilio message:`, error);
      }
    });

    ws.on('close', () => {
      console.log(`📞 [ARIA-CALL] Twilio WebSocket closed: ${callId}`);
      this.endCall(callId);
    });

    ws.on('error', (error) => {
      console.error(`❌ [ARIA-CALL] Twilio WebSocket error:`, error);
      this.endCall(callId);
    });
  }

  /**
   * Handle events from OpenAI Realtime API
   */
  handleOpenAIEvent(event, twilioWs, callState, streamSid) {
    switch (event.type) {
      case 'session.created':
        console.log(`✅ [ARIA-CALL] OpenAI session created`);
        break;

      case 'session.updated':
        console.log(`✅ [ARIA-CALL] OpenAI session configured`);
        callState.openaiSessionReady = true;
        // Send greeting only if stream has started (person answered)
        // If stream hasn't started yet, the start handler will send it
        if (callState.twilioStreamSid && !callState.greetingSent) {
          setTimeout(() => {
            this.sendInitialGreeting(callState);
          }, 500);
        }
        break;

      case 'response.audio.delta':
        // Forward audio from OpenAI to Twilio
        if (twilioWs && twilioWs.readyState === WebSocket.OPEN && streamSid) {
          twilioWs.send(JSON.stringify({
            event: 'media',
            streamSid: streamSid,
            media: {
              payload: event.delta // Base64 g711_ulaw audio
            }
          }));
        }
        break;

      case 'response.audio_transcript.delta':
        // ARIA is speaking - log it
        if (event.delta) {
          callState.transcript.push({
            role: 'assistant',
            content: event.delta,
            timestamp: new Date()
          });
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        // User finished speaking - log transcript
        if (event.transcript) {
          console.log(`👤 [ARIA-CALL] User said: "${event.transcript}"`);
          callState.transcript.push({
            role: 'user',
            content: event.transcript,
            timestamp: new Date()
          });
        }
        break;

      case 'response.done':
        console.log(`✅ [ARIA-CALL] ARIA finished speaking`);
        break;

      case 'error':
        console.error(`❌ [ARIA-CALL] OpenAI error:`, event.error);
        break;

      default:
        // Log other events for debugging
        if (event.type.startsWith('response.') || event.type.startsWith('conversation.')) {
          // console.log(`📡 [ARIA-CALL] Event: ${event.type}`);
        }
    }
  }

  /**
   * Send ARIA's initial greeting
   */
  sendInitialGreeting(callState) {
    const { openaiWs, contactName, context } = callState;

    // Prevent duplicate greetings
    if (callState.greetingSent) {
      console.log(`⏭️ [ARIA-CALL] Greeting already sent, skipping`);
      return;
    }

    if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) {
      console.log(`⚠️ [ARIA-CALL] OpenAI WS not ready, can't send greeting`);
      return;
    }

    callState.greetingSent = true;

    const contactFirstName = contactName ? contactName.split(' ')[0] : 'there';
    const userCompany = context.ownerCompany || context.userCompany || '';
    const userName = context.ownerName || context.userName || '';

    const greeting = `Hey ${contactFirstName}! It's ARIA calling from ${userCompany || (userName ? `${userName}'s office` : 'the team')}. Got a quick sec?`;

    // Create a response with the greeting
    openaiWs.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: `Say this greeting naturally and warmly: "${greeting}" Then wait for their response.`
      }
    }));

    console.log(`🗣️ [ARIA-CALL] Sending greeting: "${greeting}"`);
  }

  /**
   * Handle call status updates from Twilio
   */
  handleStatusCallback(callId, status, callSid) {
    console.log(`📊 [ARIA-CALL] Status update for ${callId}: ${status}`);

    const callState = this.activeCalls.get(callId);
    if (callState) {
      callState.status = status;

      if (status === 'completed' || status === 'failed' || status === 'busy' || status === 'no-answer') {
        this.endCall(callId);
      }
    }
  }

  /**
   * End a call and cleanup
   */
  endCall(callId) {
    const callState = this.activeCalls.get(callId);
    if (!callState) return;

    console.log(`📞 [ARIA-CALL] Ending call: ${callId}`);

    // Close OpenAI WebSocket
    if (callState.openaiWs) {
      try {
        callState.openaiWs.close();
      } catch (e) { }
    }

    // Log transcript
    if (callState.transcript.length > 0) {
      console.log(`📝 [ARIA-CALL] Call transcript:`);
      callState.transcript.forEach(t => {
        console.log(`   ${t.role}: ${t.content}`);
      });
    }

    // Calculate duration
    const duration = callState.startTime
      ? Math.floor((Date.now() - callState.startTime.getTime()) / 1000)
      : 0;

    callState.status = 'completed';
    callState.endTime = new Date();
    callState.duration = duration;

    // Keep call state for a bit for status queries, then clean up
    setTimeout(() => {
      this.activeCalls.delete(callId);
      console.log(`🧹 [ARIA-CALL] Cleaned up call: ${callId}`);
    }, 60000); // Keep for 1 minute
  }

  /**
   * Get call state
   */
  getCallState(callId) {
    return this.activeCalls.get(callId);
  }

  /**
   * Get all active calls
   */
  getActiveCalls() {
    return Array.from(this.activeCalls.values());
  }
}

export default new OpenAIRealtimeCallService();
