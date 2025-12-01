import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const PORT = process.env.PORT || 3001;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Store active call sessions
const activeCalls = new Map();

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers for health checks
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  // Health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'ARIA WebSocket Bridge',
      activeCalls: activeCalls.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Call info endpoint
  if (req.url?.startsWith('/call/')) {
    const callId = req.url.split('/call/')[1];
    const callState = activeCalls.get(callId);
    res.writeHead(callState ? 200 : 404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(callState ? {
      id: callState.id,
      status: callState.status,
      startTime: callState.startTime
    } : { error: 'Call not found' }));
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

console.log(`🌐 [ARIA-BRIDGE] WebSocket server starting on port ${PORT}`);

wss.on('connection', (ws, req) => {
  // Extract callId from URL path: /media-stream/{callId}
  const urlParts = req.url?.split('/') || [];
  const callId = urlParts[urlParts.length - 1]?.split('?')[0];

  console.log(`🌐 [ARIA-BRIDGE] New WebSocket connection`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Call ID: ${callId}`);

  if (!callId) {
    console.error(`❌ [ARIA-BRIDGE] No call ID provided`);
    ws.close(1008, 'Call ID required');
    return;
  }

  // Get call context from query params or use defaults
  const url = new URL(req.url, `http://localhost`);
  const contactName = decodeURIComponent(url.searchParams.get('contactName') || 'there');
  const purpose = decodeURIComponent(url.searchParams.get('purpose') || 'to connect');
  const ownerName = decodeURIComponent(url.searchParams.get('ownerName') || 'the team');
  const ownerCompany = decodeURIComponent(url.searchParams.get('ownerCompany') || '');

  // Initialize call state
  const callState = {
    id: callId,
    status: 'connecting',
    startTime: new Date(),
    contactName,
    purpose,
    ownerName,
    ownerCompany,
    transcript: [],
    openaiWs: null,
    streamSid: null
  };
  activeCalls.set(callId, callState);

  // Build ARIA's system instructions
  const systemInstructions = buildSystemInstructions(callState);

  let openaiWs = null;
  let streamSid = null;

  // Connect to OpenAI Realtime API
  try {
    openaiWs = new WebSocket(
      'wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17',
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'realtime=v1'
        }
      }
    );

    callState.openaiWs = openaiWs;

    openaiWs.on('open', () => {
      console.log(`🤖 [ARIA-BRIDGE] Connected to OpenAI Realtime API for call: ${callId}`);

      // Configure the session
      openaiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: systemInstructions,
          voice: 'shimmer', // ARIA's voice
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

    openaiWs.on('message', (data) => {
      try {
        const event = JSON.parse(data.toString());
        handleOpenAIEvent(event, ws, callState);
      } catch (error) {
        console.error(`❌ [ARIA-BRIDGE] Error parsing OpenAI message:`, error);
      }
    });

    openaiWs.on('error', (error) => {
      console.error(`❌ [ARIA-BRIDGE] OpenAI WebSocket error:`, error.message);
    });

    openaiWs.on('close', (code, reason) => {
      console.log(`🔌 [ARIA-BRIDGE] OpenAI WebSocket closed: ${code} ${reason}`);
    });

  } catch (error) {
    console.error(`❌ [ARIA-BRIDGE] Failed to connect to OpenAI:`, error);
    ws.close();
    return;
  }

  // Handle Twilio media stream messages
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      switch (msg.event) {
        case 'connected':
          console.log(`📞 [ARIA-BRIDGE] Twilio connected for call: ${callId}`);
          break;

        case 'start':
          streamSid = msg.start.streamSid;
          callState.streamSid = streamSid;
          callState.status = 'connected';
          console.log(`🎙️ [ARIA-BRIDGE] Stream started: ${streamSid}`);
          break;

        case 'media':
          // Forward audio from Twilio to OpenAI
          if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
            openaiWs.send(JSON.stringify({
              type: 'input_audio_buffer.append',
              audio: msg.media.payload // Base64 g711_ulaw
            }));
          }
          break;

        case 'stop':
          console.log(`📞 [ARIA-BRIDGE] Stream stopped: ${callId}`);
          endCall(callId);
          break;
      }
    } catch (error) {
      console.error(`❌ [ARIA-BRIDGE] Error processing Twilio message:`, error);
    }
  });

  ws.on('close', () => {
    console.log(`📞 [ARIA-BRIDGE] Twilio WebSocket closed: ${callId}`);
    endCall(callId);
  });

  ws.on('error', (error) => {
    console.error(`❌ [ARIA-BRIDGE] Twilio WebSocket error:`, error.message);
    endCall(callId);
  });
});

/**
 * Handle events from OpenAI Realtime API
 */
function handleOpenAIEvent(event, twilioWs, callState) {
  switch (event.type) {
    case 'session.created':
      console.log(`✅ [ARIA-BRIDGE] OpenAI session created for call: ${callState.id}`);
      break;

    case 'session.updated':
      console.log(`✅ [ARIA-BRIDGE] OpenAI session configured for call: ${callState.id}`);
      // Send initial greeting
      sendInitialGreeting(callState);
      break;

    case 'response.audio.delta':
      // Forward audio from OpenAI to Twilio
      if (twilioWs && twilioWs.readyState === WebSocket.OPEN && callState.streamSid) {
        twilioWs.send(JSON.stringify({
          event: 'media',
          streamSid: callState.streamSid,
          media: {
            payload: event.delta // Base64 g711_ulaw audio
          }
        }));
      }
      break;

    case 'response.audio_transcript.delta':
      // ARIA is speaking
      if (event.delta) {
        callState.transcript.push({
          role: 'assistant',
          content: event.delta,
          timestamp: new Date()
        });
      }
      break;

    case 'conversation.item.input_audio_transcription.completed':
      // User finished speaking
      if (event.transcript) {
        console.log(`👤 [ARIA-BRIDGE] User said: "${event.transcript}"`);
        callState.transcript.push({
          role: 'user',
          content: event.transcript,
          timestamp: new Date()
        });
      }
      break;

    case 'response.done':
      console.log(`✅ [ARIA-BRIDGE] ARIA finished speaking`);
      break;

    case 'error':
      console.error(`❌ [ARIA-BRIDGE] OpenAI error:`, event.error);
      break;
  }
}

/**
 * Build ARIA's system instructions
 */
function buildSystemInstructions(callState) {
  const { contactName, purpose, ownerName, ownerCompany } = callState;
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
You're calling on behalf of ${ownerName}${ownerCompany ? ` from ${ownerCompany}` : ''}.
If asked who you are: "I'm ARIA, ${ownerName}'s assistant${ownerCompany ? ` at ${ownerCompany}` : ''}. Think of me as the most organized team member - minus the coffee breaks!"

# THIS CALL
- You're calling: ${contactName || 'this person'}
- Purpose: ${purpose || 'to connect and help'}

# CALL FLOW
1. OPENING: Be warm but quick. "Hey ${contactFirstName}! It's ARIA calling from ${ownerCompany || `${ownerName}'s office`}. Got a quick sec?"
2. REASON: Get to the point fast. Don't waste their time.
3. LISTEN: Actually listen. Respond to what they say, not what you planned to say.
4. CLOSE: Clear next steps. "So we're good to..." or "I'll have ${ownerName} follow up on..."

# REMEMBER THROUGHOUT
- You're ARIA - personality ON at all times
- Keep responses SHORT and conversational
- React like a human would
- If they're busy, offer to call back
- If they're chatty, match their energy
- End calls cleanly - don't drag them out`;
}

/**
 * Send ARIA's initial greeting
 */
function sendInitialGreeting(callState) {
  const { openaiWs, contactName, ownerName, ownerCompany } = callState;
  if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) return;

  const contactFirstName = contactName ? contactName.split(' ')[0] : 'there';
  const greeting = `Hey ${contactFirstName}! It's ARIA calling from ${ownerCompany || (ownerName ? `${ownerName}'s office` : 'the team')}. Got a quick sec?`;

  openaiWs.send(JSON.stringify({
    type: 'response.create',
    response: {
      modalities: ['text', 'audio'],
      instructions: `Say this greeting naturally and warmly: "${greeting}" Then wait for their response.`
    }
  }));

  console.log(`🗣️ [ARIA-BRIDGE] Sending greeting: "${greeting}"`);
}

/**
 * End a call and cleanup
 */
function endCall(callId) {
  const callState = activeCalls.get(callId);
  if (!callState) return;

  console.log(`📞 [ARIA-BRIDGE] Ending call: ${callId}`);

  // Close OpenAI WebSocket
  if (callState.openaiWs) {
    try {
      callState.openaiWs.close();
    } catch (e) { }
  }

  // Log transcript
  if (callState.transcript.length > 0) {
    console.log(`📝 [ARIA-BRIDGE] Call transcript for ${callId}:`);
    callState.transcript.forEach(t => {
      console.log(`   ${t.role}: ${t.content}`);
    });
  }

  callState.status = 'completed';
  callState.endTime = new Date();

  // Keep for a bit then cleanup
  setTimeout(() => {
    activeCalls.delete(callId);
    console.log(`🧹 [ARIA-BRIDGE] Cleaned up call: ${callId}`);
  }, 60000);
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [ARIA-BRIDGE] Server running on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   WebSocket: ws://localhost:${PORT}/media-stream/{callId}`);
});
