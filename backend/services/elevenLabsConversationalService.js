/**
 * ElevenLabs Conversational AI Service
 *
 * Supports multimodal conversations (voice + text) using ElevenLabs Conversational AI 2.0
 * Enables real-time text messaging during voice calls
 */

import axios from 'axios';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

class ElevenLabsConversationalService extends EventEmitter {
  constructor(apiKey = process.env.ELEVENLABS_API_KEY) {
    super();
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.wsUrl = 'wss://api.elevenlabs.io/v1/convai/conversation';

    if (!this.apiKey) {
      console.error('⚠️ ELEVENLABS_API_KEY is not set!');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Active sessions tracking
    this.activeSessions = new Map();
  }

  /**
   * Create a signed URL for WebSocket connection to an agent
   * Required for secure conversational AI sessions
   */
  async getSignedUrl(agentId) {
    try {
      const response = await this.client.get(`/convai/conversation/get_signed_url`, {
        params: { agent_id: agentId }
      });
      return response.data.signed_url;
    } catch (error) {
      console.error('❌ Failed to get signed URL:', error.response?.data || error.message);
      throw new Error('Failed to initialize conversation session');
    }
  }

  /**
   * Start a conversational AI session with an agent
   * Supports multimodal interaction (voice + text)
   *
   * @param {string} agentId - ElevenLabs agent ID
   * @param {object} options - Session configuration
   * @returns {object} Session object with methods to interact
   */
  async startSession(agentId, options = {}) {
    const {
      enableTextInput = true,
      enableVoiceInput = true,
      customVariables = {},
      onMessage = () => {},
      onTranscript = () => {},
      onAgentResponse = () => {},
      onError = () => {},
      onClose = () => {}
    } = options;

    try {
      console.log(`🚀 Starting conversational session with agent: ${agentId}`);

      // Get signed URL for WebSocket connection
      const signedUrl = await this.getSignedUrl(agentId);

      // Create WebSocket connection
      const ws = new WebSocket(signedUrl);

      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const session = {
        id: sessionId,
        agentId,
        ws,
        isConnected: false,
        isMuted: false,

        // Send text message to agent during conversation
        sendText: (message) => {
          if (!session.isConnected) {
            console.warn('⚠️ Session not connected');
            return false;
          }

          console.log(`💬 Sending text to agent: "${message}"`);

          ws.send(JSON.stringify({
            type: 'user_message',
            message: message
          }));

          return true;
        },

        // Send contextual update (invisible to user, provides context to agent)
        sendContextUpdate: (context) => {
          if (!session.isConnected) {
            console.warn('⚠️ Session not connected');
            return false;
          }

          console.log(`📝 Sending context update:`, context);

          ws.send(JSON.stringify({
            type: 'conversation_initiation_client_data',
            conversation_initiation_client_data: context
          }));

          return true;
        },

        // Toggle microphone mute
        toggleMute: () => {
          session.isMuted = !session.isMuted;

          ws.send(JSON.stringify({
            type: 'set_mic_muted',
            muted: session.isMuted
          }));

          console.log(`🎤 Microphone ${session.isMuted ? 'muted' : 'unmuted'}`);
          return session.isMuted;
        },

        // End the session
        end: () => {
          console.log(`🛑 Ending session: ${sessionId}`);
          ws.close();
          this.activeSessions.delete(sessionId);
        }
      };

      // WebSocket event handlers
      ws.on('open', () => {
        console.log(`✅ WebSocket connected for session: ${sessionId}`);
        session.isConnected = true;

        // Send initial configuration
        if (Object.keys(customVariables).length > 0) {
          session.sendContextUpdate({ dynamic_variables: customVariables });
        }

        this.emit('session_started', { sessionId, agentId });
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());

          // Handle different message types
          switch (message.type) {
            case 'agent_response':
              console.log(`🤖 Agent response: "${message.text}"`);
              onAgentResponse(message.text, message);
              this.emit('agent_response', { sessionId, text: message.text, data: message });
              break;

            case 'user_transcript':
              console.log(`👤 User said: "${message.text}"`);
              onTranscript(message.text, 'user', message);
              this.emit('user_transcript', { sessionId, text: message.text, data: message });
              break;

            case 'agent_transcript':
              console.log(`🤖 Agent said: "${message.text}"`);
              onTranscript(message.text, 'agent', message);
              this.emit('agent_transcript', { sessionId, text: message.text, data: message });
              break;

            case 'interruption':
              console.log(`⚡ User interrupted agent`);
              this.emit('interruption', { sessionId, data: message });
              break;

            case 'ping':
              // Respond to ping to keep connection alive
              ws.send(JSON.stringify({ type: 'pong' }));
              break;

            default:
              console.log(`📨 Received message:`, message);
              onMessage(message);
              this.emit('message', { sessionId, data: message });
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      ws.on('error', (error) => {
        console.error(`❌ WebSocket error for session ${sessionId}:`, error);
        onError(error);
        this.emit('error', { sessionId, error });
      });

      ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed for session ${sessionId}. Code: ${code}, Reason: ${reason}`);
        session.isConnected = false;
        this.activeSessions.delete(sessionId);
        onClose(code, reason);
        this.emit('session_ended', { sessionId, code, reason });
      });

      // Store session
      this.activeSessions.set(sessionId, session);

      return session;

    } catch (error) {
      console.error('❌ Failed to start conversational session:', error);
      throw error;
    }
  }

  /**
   * Create a conversational AI agent with multimodal capabilities
   */
  async createConversationalAgent(config) {
    try {
      const {
        name,
        prompt,
        firstMessage = 'Hello! How can I help you today?',
        voiceId,
        language = 'en',
        enableTextInput = true,
        tools = []
      } = config;

      console.log(`🔧 Creating conversational agent: ${name}`);

      const agentConfig = {
        name,
        conversation_config: {
          agent: {
            prompt: {
              prompt: prompt,
              llm: 'gemini-2.5-flash', // Best for conversational AI
              temperature: 0.8,
              max_tokens: 4096
            },
            first_message: firstMessage,
            language: language
          },
          tts: {
            voice_id: voiceId,
            model_id: 'eleven_flash_v2', // Required for conversational AI
            optimize_streaming_latency: 3,
            stability: 0.6,
            similarity_boost: 0.75,
            speed: 0.95
          },
          asr: {
            quality: 'high',
            provider: 'elevenlabs'
          },
          conversation: {
            max_duration_seconds: 1800, // 30 minutes max call duration
            client_events: ['conversation_ended', 'user_transcript', 'agent_response']
          }
        },
        platform_settings: {
          widget: {
            allow_text_input: enableTextInput
          }
        }
      };

      // Add tools/functions if provided
      if (tools && tools.length > 0) {
        agentConfig.conversation_config.agent.client_tools = tools;
      }

      const response = await this.client.post('/convai/agents/create', agentConfig);

      console.log(`✅ Agent created: ${response.data.agent_id}`);

      return response.data;

    } catch (error) {
      console.error('❌ Failed to create conversational agent:', error.response?.data || error.message);
      throw new Error('Failed to create conversational agent');
    }
  }

  /**
   * Get agent configuration including widget embed code
   */
  async getAgentConfig(agentId) {
    try {
      const response = await this.client.get(`/convai/agents/${agentId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get agent config:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generate widget embed code for an agent
   */
  getWidgetEmbedCode(agentId) {
    return `<!-- ElevenLabs Conversational AI Widget -->
<script src="https://elevenlabs.io/convai-widget/index.js" async type="text/javascript"></script>
<elevenlabs-convai agent-id="${agentId}"></elevenlabs-convai>`;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * End all active sessions
   */
  endAllSessions() {
    console.log(`🛑 Ending all active sessions (${this.activeSessions.size})`);
    this.activeSessions.forEach(session => session.end());
    this.activeSessions.clear();
  }
}

export default ElevenLabsConversationalService;
