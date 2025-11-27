import WebSocket from 'ws';
import { EventEmitter } from 'events';

/**
 * WebSocket Service for Real-Time Agent Testing
 *
 * This service establishes a WebSocket connection with ElevenLabs
 * to enable real-time conversational AI testing in the browser.
 *
 * Based on: https://elevenlabs.io/docs/agents-platform/api-reference/agents-platform/websocket
 */
class AgentWebSocketService extends EventEmitter {
  constructor() {
    super();
    this.activeConnections = new Map(); // conversationId -> WebSocket
  }

  /**
   * Start a test conversation with an agent
   * @param {string} agentId - ElevenLabs agent ID
   * @param {object} options - Conversation options
   * @returns {Promise<string>} conversationId
   */
  async startTestConversation(agentId, options = {}) {
    const {
      customPrompt,
      customFirstMessage,
      dynamicVariables = {},
      onAudio,
      onTranscript,
      onResponse,
      onError
    } = options;

    return new Promise((resolve, reject) => {
      try {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          throw new Error('ELEVENLABS_API_KEY not configured');
        }

        // Build WebSocket URL with agent_id query parameter
        const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${agentId}`;

        console.log(`🔌 [AGENT WS] Connecting to: ${wsUrl}`);

        // Create WebSocket connection with auth header
        const ws = new WebSocket(wsUrl, {
          headers: {
            'xi-api-key': apiKey
          }
        });

        let conversationId = null;

        ws.on('open', () => {
          console.log('✅ [AGENT WS] Connected to ElevenLabs');

          // Send conversation initiation message
          const initMessage = {
            type: 'conversation_initiation_client_data',
            dynamic_variables: {
              customer_name: 'Test User',
              lead_name: 'Test User',
              company_name: 'VoiceNow CRM',
              ...dynamicVariables
            }
          };

          // Add conversation config override if custom prompt/message provided
          if (customPrompt || customFirstMessage) {
            initMessage.conversation_config_override = {
              agent: {}
            };

            if (customPrompt) {
              initMessage.conversation_config_override.agent.prompt = {
                prompt: customPrompt
              };
            }

            if (customFirstMessage) {
              initMessage.conversation_config_override.agent.first_message = customFirstMessage;
            }
          }

          console.log('📤 [AGENT WS] Sending init message:', JSON.stringify(initMessage, null, 2));
          ws.send(JSON.stringify(initMessage));
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            console.log('📥 [AGENT WS] Received:', message.type);

            switch (message.type) {
              case 'conversation_initiation_metadata':
                conversationId = message.conversation_initiation_metadata_event.conversation_id;
                console.log(`✅ [AGENT WS] Conversation started: ${conversationId}`);

                // Store connection
                this.activeConnections.set(conversationId, ws);

                // Resolve with conversation ID
                resolve(conversationId);

                this.emit('conversation_started', { conversationId, message });
                break;

              case 'audio':
                // Base64 audio chunk
                if (onAudio) {
                  onAudio(message.audio_event.audio_base_64);
                }
                this.emit('audio', { conversationId, audio: message.audio_event.audio_base_64 });
                break;

              case 'user_transcript':
                // User's speech transcribed
                const userText = message.user_transcription_event.user_transcript;
                console.log(`👤 [AGENT WS] User: ${userText}`);
                if (onTranscript) {
                  onTranscript('user', userText);
                }
                this.emit('user_transcript', { conversationId, text: userText });
                break;

              case 'agent_response':
                // Agent's text response
                const agentText = message.agent_response_event.agent_response;
                console.log(`🤖 [AGENT WS] Agent: ${agentText}`);
                if (onResponse) {
                  onResponse(agentText);
                }
                this.emit('agent_response', { conversationId, text: agentText });
                break;

              case 'agent_response_correction':
                // Agent corrected its response
                console.log(`🔄 [AGENT WS] Correction: ${message.agent_response_correction_event.corrected_agent_response}`);
                this.emit('agent_response_correction', {
                  conversationId,
                  original: message.agent_response_correction_event.original_agent_response,
                  corrected: message.agent_response_correction_event.corrected_agent_response
                });
                break;

              case 'interruption':
                // User interrupted agent
                console.log('⏸️  [AGENT WS] Interruption detected');
                this.emit('interruption', { conversationId });
                break;

              case 'ping':
                // Respond to ping to keep connection alive
                ws.send(JSON.stringify({
                  type: 'pong',
                  event_id: message.ping_event.event_id
                }));
                break;

              case 'client_tool_call':
                // Agent requesting to call a tool
                console.log(`🔧 [AGENT WS] Tool call: ${message.client_tool_call.tool_name}`);
                this.emit('tool_call', {
                  conversationId,
                  toolName: message.client_tool_call.tool_name,
                  toolCallId: message.client_tool_call.tool_call_id,
                  parameters: message.client_tool_call.parameters
                });
                break;

              default:
                console.log(`📋 [AGENT WS] Unhandled message type: ${message.type}`);
            }
          } catch (error) {
            console.error('❌ [AGENT WS] Error parsing message:', error);
          }
        });

        ws.on('error', (error) => {
          console.error('❌ [AGENT WS] WebSocket error:', error);
          if (onError) {
            onError(error);
          }
          this.emit('error', { conversationId, error });

          if (!conversationId) {
            // Connection failed before conversation started
            reject(error);
          }
        });

        ws.on('close', () => {
          console.log('🔌 [AGENT WS] Connection closed');
          if (conversationId) {
            this.activeConnections.delete(conversationId);
          }
          this.emit('connection_closed', { conversationId });
        });

      } catch (error) {
        console.error('❌ [AGENT WS] Failed to start conversation:', error);
        reject(error);
      }
    });
  }

  /**
   * Send audio chunk to agent (user speaking)
   * @param {string} conversationId
   * @param {string} audioBase64 - Base64 encoded audio chunk
   */
  sendAudioChunk(conversationId, audioBase64) {
    const ws = this.activeConnections.get(conversationId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`No active connection for conversation ${conversationId}`);
    }

    ws.send(JSON.stringify({
      user_audio_chunk: audioBase64
    }));
  }

  /**
   * Send text message to agent
   * @param {string} conversationId
   * @param {string} text - User's text message
   */
  sendTextMessage(conversationId, text) {
    const ws = this.activeConnections.get(conversationId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`No active connection for conversation ${conversationId}`);
    }

    ws.send(JSON.stringify({
      type: 'user_message',
      text: text
    }));

    console.log(`📤 [AGENT WS] Sent text: ${text}`);
  }

  /**
   * Send contextual update to agent (background info)
   * @param {string} conversationId
   * @param {string} context - Contextual information
   */
  sendContextualUpdate(conversationId, context) {
    const ws = this.activeConnections.get(conversationId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`No active connection for conversation ${conversationId}`);
    }

    ws.send(JSON.stringify({
      type: 'contextual_update',
      text: context
    }));

    console.log(`📤 [AGENT WS] Sent context: ${context}`);
  }

  /**
   * End a test conversation
   * @param {string} conversationId
   */
  endConversation(conversationId) {
    const ws = this.activeConnections.get(conversationId);
    if (ws) {
      ws.close();
      this.activeConnections.delete(conversationId);
      console.log(`🔌 [AGENT WS] Ended conversation: ${conversationId}`);
    }
  }

  /**
   * End all active conversations
   */
  endAllConversations() {
    for (const [conversationId, ws] of this.activeConnections.entries()) {
      ws.close();
      console.log(`🔌 [AGENT WS] Ended conversation: ${conversationId}`);
    }
    this.activeConnections.clear();
  }

  /**
   * Get active conversation count
   */
  getActiveCount() {
    return this.activeConnections.size;
  }
}

// Export singleton instance
export default new AgentWebSocketService();
