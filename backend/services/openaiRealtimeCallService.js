import WebSocket from 'ws';
import twilio from 'twilio';
import { getAgentTemplate, getAgentVoice, ARIA_AGENT_TEMPLATES } from '../config/ariaAgentTemplates.js';

/**
 * OpenAI Realtime + Twilio Call Service
 * Handles outbound calls using Twilio for phone connection and OpenAI Realtime API for conversation
 * Supports multiple agent personalities with different voices
 *
 * Agent Voices:
 * - aria: shimmer (bright, energetic female)
 * - sales: verse (dynamic, expressive)
 * - project_manager: echo (clear, professional)
 * - support: coral (warm, friendly female)
 * - estimator: sage (calm, wise)
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
   * @param {string} options.agentId - Agent ID ('aria', 'sales', 'support', 'project_manager', 'estimator')
   * @param {Object} options.context - Additional context (user profile, contact info, CRM data, etc.)
   * @param {Object} options.crmData - Dynamic CRM variables to inject into the call
   * @returns {Promise<Object>} Call result
   */
  async initiateCall({ toNumber, contactName, purpose, agentId = 'aria', context = {}, crmData = {} }) {
    try {
      // Get the agent template and voice
      const agentTemplate = getAgentTemplate(agentId);
      const { voice, settings: voiceSettings } = getAgentVoice(agentId);

      console.log(`📞 [AGENT-CALL] Initiating call with ${agentTemplate.name} (${voice} voice)`);
      console.log(`   To: ${toNumber}`);
      console.log(`   Contact: ${contactName || 'Unknown'}`);
      console.log(`   Purpose: ${purpose || 'General call'}`);
      console.log(`   CRM Data: ${Object.keys(crmData).length > 0 ? JSON.stringify(crmData) : 'None provided'}`);

      // Generate a unique call ID
      const callId = `${agentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Build agent-specific system instructions with CRM data
      const systemInstructions = this.buildAgentInstructions({
        agentId,
        agentTemplate,
        contactName,
        purpose,
        context,
        crmData
      });

      // Store call context with agent info
      this.activeCalls.set(callId, {
        id: callId,
        agentId,
        agentName: agentTemplate.name,
        voice,
        voiceSettings,
        toNumber,
        contactName,
        purpose,
        context,
        crmData,
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

      console.log(`✅ [AGENT-CALL] Call initiated: ${call.sid}`);

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
        agentId,
        agentName: agentTemplate.name,
        voice,
        message: `${agentTemplate.name} is calling ${contactName || toNumber}...`
      };

    } catch (error) {
      console.error(`❌ [AGENT-CALL] Failed to initiate call:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build agent-specific system instructions with CRM data
   * This is the core method for dynamic variable injection
   */
  buildAgentInstructions({ agentId, agentTemplate, contactName, purpose, context, crmData }) {
    const userName = context.ownerName || context.userName || 'the team';
    const userCompany = context.ownerCompany || context.userCompany || '';
    const contactFirstName = contactName ? contactName.split(' ')[0] : 'there';

    // Extract CRM data with graceful fallbacks
    const crm = {
      leadScore: crmData.leadScore || crmData.score || null,
      lastPurchase: crmData.lastPurchase || crmData.lastOrder || null,
      totalSpent: crmData.totalSpent || crmData.lifetimeValue || null,
      tags: crmData.tags || [],
      recentNotes: crmData.recentNotes || crmData.notes || context.notes || null,
      openDeals: crmData.openDeals || crmData.deals || null,
      pendingEstimates: crmData.pendingEstimates || null,
      appointmentHistory: crmData.appointmentHistory || null,
      preferredContactMethod: crmData.preferredContactMethod || null,
      timezone: crmData.timezone || null,
      customFields: crmData.customFields || {}
    };

    // Build CRM context section (only include if data exists)
    let crmContext = '';
    if (Object.values(crm).some(v => v !== null && (Array.isArray(v) ? v.length > 0 : true))) {
      crmContext = `\n# CRM DATA (USE THIS TO PERSONALIZE THE CALL)`;
      if (crm.leadScore) crmContext += `\n- Lead Score: ${crm.leadScore}`;
      if (crm.lastPurchase) crmContext += `\n- Last Purchase: ${crm.lastPurchase}`;
      if (crm.totalSpent) crmContext += `\n- Lifetime Value: $${crm.totalSpent}`;
      if (crm.tags.length > 0) crmContext += `\n- Tags: ${crm.tags.join(', ')}`;
      if (crm.openDeals) crmContext += `\n- Open Deals: ${crm.openDeals}`;
      if (crm.pendingEstimates) crmContext += `\n- Pending Estimates: ${crm.pendingEstimates}`;
      if (crm.recentNotes) crmContext += `\n- Notes: ${crm.recentNotes}`;
      if (crm.preferredContactMethod) crmContext += `\n- Prefers: ${crm.preferredContactMethod}`;
      if (crm.timezone) crmContext += `\n- Timezone: ${crm.timezone}`;

      // Add custom fields
      for (const [key, value] of Object.entries(crm.customFields)) {
        if (value) crmContext += `\n- ${key}: ${value}`;
      }
    }

    // Get agent's base personality from template
    const basePersonality = agentTemplate.systemPrompt || '';

    // Build agent-specific call instructions
    const agentCallInstructions = this.getAgentCallInstructions(agentId, agentTemplate, {
      contactName,
      contactFirstName,
      purpose,
      userName,
      userCompany,
      context,
      crm
    });

    return `# ${agentTemplate.name.toUpperCase()} - PHONE CALL MODE
${agentTemplate.description}

${basePersonality}

# PHONE CALL SPECIFIC BEHAVIOR
- Keep responses SHORT (10-20 words max)
- Sound natural - use contractions, natural speech patterns
- React genuinely to what they say
- If they're busy, offer to call back
- Don't ramble - get to the point
- NEVER say "I'm an AI" unless directly asked

# WHO YOU'RE REPRESENTING
You're calling on behalf of ${userName}${userCompany ? ` from ${userCompany}` : ''}.

# THIS CALL
- Calling: ${contactName || 'this person'}
- Purpose: ${purpose || 'to connect and help'}
${context.contactCompany ? `- Their company: ${context.contactCompany}` : ''}
${context.lastInteraction ? `- Last interaction: ${context.lastInteraction}` : ''}
${crmContext}

# CALL FLOW
${agentCallInstructions}

# TOOLS AVAILABLE
During the call you can:
- send_sms: Send a text message
- schedule_callback: Schedule a follow-up
- create_note: Save notes about the conversation
- lookup_info: Look up CRM information

Briefly tell them what you're doing: "Let me shoot you a quick text with that..."`;
  }

  /**
   * Get agent-specific call flow instructions
   */
  getAgentCallInstructions(agentId, agentTemplate, callContext) {
    const { contactFirstName, purpose, userName, userCompany, crm } = callContext;
    const company = userCompany || `${userName}'s office`;

    const agentScripts = {
      aria: `
1. OPENING: "Hey ${contactFirstName}! It's ARIA calling from ${company}. Got a quick sec?"
2. REASON: Get to the point - explain why you're calling
3. LISTEN: Actually respond to what they say
4. CLOSE: Clear next steps - "So we're good to..." or "I'll have ${userName} follow up on..."`,

      sales: `
1. OPENING: "Hey ${contactFirstName}! This is your sales rep calling from ${company}. Quick sec?"
${crm.leadScore ? `2. CONTEXT: (High-value lead - score ${crm.leadScore}, be extra attentive)` : ''}
3. PURPOSE: ${purpose || 'Check in on their needs and opportunities'}
4. DISCOVERY: Ask about their current situation, needs, timeline
5. VALUE: Share how you can help
6. NEXT STEP: Book a meeting, send an estimate, or schedule follow-up
7. CLOSE: Confirm action items and timeline`,

      project_manager: `
1. OPENING: "Hi ${contactFirstName}, this is your project coordinator from ${company}."
2. STATUS: ${purpose || 'Provide project update or scheduling info'}
${crm.appointmentHistory ? `3. REFERENCE: Previous appointments - ${crm.appointmentHistory}` : ''}
4. DETAILS: Share specific dates, times, or deliverables
5. CONFIRM: Get verbal confirmation on next steps
6. CLOSE: Recap what's scheduled and any action items`,

      support: `
1. OPENING: "Hi ${contactFirstName}, this is customer support from ${company}. How are you?"
2. EMPATHY: Listen first - understand their situation
${crm.recentNotes ? `3. CONTEXT: Reference previous interactions - ${crm.recentNotes}` : ''}
4. RESOLUTION: Offer solutions or next steps
5. CONFIRM: Make sure they're satisfied
6. CLOSE: "Is there anything else I can help with today?"`,

      estimator: `
1. OPENING: "Hi ${contactFirstName}, this is the estimating team from ${company}."
2. PURPOSE: ${purpose || 'Discuss your estimate request'}
${crm.pendingEstimates ? `3. REFERENCE: Pending estimates - ${crm.pendingEstimates}` : ''}
4. SCOPE: Clarify project details and requirements
5. PRICING: Discuss numbers clearly and professionally
6. CLOSE: Confirm timeline for formal estimate or next steps`
    };

    return agentScripts[agentId] || agentScripts.aria;
  }

  /**
   * Legacy method - redirects to new buildAgentInstructions
   * Kept for backward compatibility
   */
  buildSystemInstructions({ contactName, purpose, context }) {
    return this.buildAgentInstructions({
      agentId: 'aria',
      agentTemplate: getAgentTemplate('aria'),
      contactName,
      purpose,
      context,
      crmData: {}
    });
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
      console.log(`📞 [AGENT-CALL] Creating call state from URL params for: ${callId}`);
      const { contactName, purpose, ownerName, ownerCompany, agentId: urlAgentId, crmData: urlCrmData } = urlParams;

      // Determine agent (from URL param, callId prefix, or default to aria)
      let agentId = urlAgentId || 'aria';
      // Try to extract agent from callId (e.g., "sales_1234567890_abc")
      const callIdPrefix = callId.split('_')[0];
      if (['aria', 'sales', 'support', 'project_manager', 'estimator'].includes(callIdPrefix)) {
        agentId = callIdPrefix;
      }

      const agentTemplate = getAgentTemplate(agentId);
      const { voice, settings: voiceSettings } = getAgentVoice(agentId);

      // Parse CRM data if provided as JSON string
      let crmData = {};
      if (urlCrmData) {
        try {
          crmData = typeof urlCrmData === 'string' ? JSON.parse(urlCrmData) : urlCrmData;
        } catch (e) {
          console.log(`⚠️ [AGENT-CALL] Could not parse CRM data: ${e.message}`);
        }
      }

      // Build agent-specific system instructions
      const systemInstructions = this.buildAgentInstructions({
        agentId,
        agentTemplate,
        contactName: contactName || 'there',
        purpose: purpose || 'to connect and help',
        context: {
          ownerName: ownerName || 'the team',
          ownerCompany: ownerCompany || ''
        },
        crmData
      });

      callState = {
        id: callId,
        agentId,
        agentName: agentTemplate.name,
        voice,
        voiceSettings,
        toNumber: 'external', // We don't have this from URL params
        contactName: contactName || 'Unknown',
        purpose: purpose || 'General call',
        context: { ownerName, ownerCompany },
        crmData,
        systemInstructions,
        status: 'connecting',
        startTime: new Date(),
        transcript: [],
        openaiWs: null,
        twilioStreamSid: null,
        externalCall: true // Flag to indicate externally initiated call
      };

      this.activeCalls.set(callId, callState);
      console.log(`✅ [AGENT-CALL] Created call state for ${agentTemplate.name} (${voice} voice):`, {
        agentId,
        contactName: callState.contactName,
        purpose: callState.purpose,
        hasCrmData: Object.keys(crmData).length > 0
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
        // Get agent voice from call state, default to shimmer
        const agentVoice = callState.voice || 'shimmer';
        const agentName = callState.agentName || 'ARIA';

        console.log(`🤖 [AGENT-CALL] Connected to OpenAI Realtime API`);
        console.log(`   Agent: ${agentName}, Voice: ${agentVoice}`);

        // Configure the session with agent-specific voice
        openaiWs.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: callState.systemInstructions,
            voice: agentVoice, // Agent-specific voice from template
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
   * Send agent's initial greeting based on their personality
   */
  sendInitialGreeting(callState) {
    const { openaiWs, contactName, context, agentId, agentName } = callState;

    // Prevent duplicate greetings
    if (callState.greetingSent) {
      console.log(`⏭️ [AGENT-CALL] Greeting already sent, skipping`);
      return;
    }

    if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) {
      console.log(`⚠️ [AGENT-CALL] OpenAI WS not ready, can't send greeting`);
      return;
    }

    callState.greetingSent = true;

    const contactFirstName = contactName ? contactName.split(' ')[0] : 'there';
    const userCompany = context.ownerCompany || context.userCompany || '';
    const userName = context.ownerName || context.userName || '';
    const company = userCompany || (userName ? `${userName}'s office` : 'the team');

    // Generate agent-appropriate greeting
    const greeting = this.getAgentGreeting(agentId || 'aria', {
      agentName: agentName || 'ARIA',
      contactFirstName,
      company,
      purpose: callState.purpose
    });

    // Create a response with the greeting
    openaiWs.send(JSON.stringify({
      type: 'response.create',
      response: {
        modalities: ['text', 'audio'],
        instructions: `Say this greeting naturally and warmly: "${greeting}" Then wait for their response.`
      }
    }));

    console.log(`🗣️ [AGENT-CALL] ${agentName || 'Agent'} sending greeting: "${greeting}"`);
  }

  /**
   * Get agent-specific greeting based on personality
   */
  getAgentGreeting(agentId, { agentName, contactFirstName, company, purpose }) {
    const greetings = {
      aria: `Hey ${contactFirstName}! It's ARIA calling from ${company}. Got a quick sec?`,
      sales: `Hey ${contactFirstName}! This is your sales rep from ${company}. Hope I caught you at a good time?`,
      project_manager: `Hi ${contactFirstName}, this is your project coordinator from ${company}. How are you today?`,
      support: `Hi ${contactFirstName}, this is customer support from ${company}. How are you doing?`,
      estimator: `Hi ${contactFirstName}, this is the estimating team from ${company}. Do you have a moment to chat?`
    };

    return greetings[agentId] || greetings.aria;
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
