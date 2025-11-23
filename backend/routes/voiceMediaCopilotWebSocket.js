import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import voiceMediaCopilotService from '../services/voiceMediaCopilotService.js';

/**
 * Setup Voice Media Copilot WebSocket Server
 * Handles real-time communication between voice agent and frontend
 *
 * Connection Flow:
 * 1. Client connects to /ws/voice-copilot
 * 2. Client sends authentication token
 * 3. Client joins conversation with conversationId
 * 4. Real-time updates stream: user speech, agent responses, media generation
 */
export function setupVoiceMediaCopilotWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/voice-copilot'
  });

  console.log('🎙️  Voice Media Copilot WebSocket server initialized on /ws/voice-copilot');

  wss.on('connection', (ws, req) => {
    console.log('🎙️  New voice copilot WebSocket connection');

    let userId = null;
    let conversationId = null;
    let isAuthenticated = false;

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'Voice Copilot WebSocket connected. Please authenticate.'
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'authenticate':
            try {
              const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
              userId = decoded.userId;
              isAuthenticated = true;

              ws.send(JSON.stringify({
                type: 'authenticated',
                userId
              }));

              console.log(`✅ Voice copilot authenticated: ${userId}`);
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Authentication failed'
              }));
              ws.close();
            }
            break;

          case 'join_conversation':
            if (!isAuthenticated) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }));
              return;
            }

            conversationId = data.conversationId;

            // Register session with copilot service
            voiceMediaCopilotService.registerSession(conversationId, ws, userId);

            ws.send(JSON.stringify({
              type: 'conversation_joined',
              conversationId
            }));

            console.log(`📞 User ${userId} joined copilot conversation ${conversationId}`);
            break;

          case 'leave_conversation':
            if (conversationId) {
              voiceMediaCopilotService.unregisterSession(conversationId);
              conversationId = null;

              ws.send(JSON.stringify({
                type: 'conversation_left'
              }));
            }
            break;

          case 'get_credits':
            if (!isAuthenticated) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }));
              return;
            }

            const credits = await voiceMediaCopilotService.getUserCredits(userId);
            ws.send(JSON.stringify({
              type: 'credits_update',
              credits
            }));
            break;

          case 'get_recent_media':
            if (!isAuthenticated) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }));
              return;
            }

            const media = await voiceMediaCopilotService.getRecentMedia(userId, data.limit || 5);
            ws.send(JSON.stringify({
              type: 'recent_media',
              media
            }));
            break;

          case 'search_media':
            if (!isAuthenticated) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }));
              return;
            }

            if (!data.query) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Query required'
              }));
              return;
            }

            const searchResults = await voiceMediaCopilotService.searchMediaLibrary(userId, data.query);
            ws.send(JSON.stringify({
              type: 'search_results',
              media: searchResults,
              query: data.query
            }));
            break;

          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    ws.on('close', () => {
      if (conversationId) {
        voiceMediaCopilotService.unregisterSession(conversationId);
      }
      console.log('🎙️  Voice copilot WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('Voice copilot WebSocket error:', error);
    });
  });

  return wss;
}
