import { WebSocketServer } from 'ws';
import voiceToImageService from '../services/voiceToImageService.js';
import jwt from 'jsonwebtoken';

/**
 * WebSocket server for real-time image delivery during voice calls
 */
export function setupVoiceImageWebSocket(server) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/voice-images'
  });

  wss.on('connection', (ws, req) => {
    console.log('🔌 WebSocket client connected to voice-images');

    let userId = null;
    let conversationId = null;

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'authenticate':
            // Verify JWT token
            const token = data.token;

            if (!token) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'No token provided'
              }));
              ws.close();
              return;
            }

            try {
              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              userId = decoded.userId;

              ws.send(JSON.stringify({
                type: 'authenticated',
                userId
              }));
            } catch (error) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid token'
              }));
              ws.close();
            }
            break;

          case 'join_conversation':
            // Join a specific conversation
            if (!userId) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }));
              return;
            }

            conversationId = data.conversationId;
            voiceToImageService.registerSession(conversationId, ws, userId);

            ws.send(JSON.stringify({
              type: 'joined',
              conversationId
            }));
            break;

          case 'manual_generate':
            // Allow manual image generation from UI
            if (!userId || !conversationId) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated or no active conversation'
              }));
              return;
            }

            await voiceToImageService.generateImageDuringCall(conversationId, {
              prompt: data.prompt,
              style: data.style,
              aspectRatio: data.aspectRatio
            });
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: error.message
        }));
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected from voice-images');

      if (conversationId) {
        const images = voiceToImageService.endSession(conversationId);
        console.log(`Session ended with ${images.length} images generated`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.log('✅ Voice-Image WebSocket server initialized on /ws/voice-images');

  return wss;
}

export default setupVoiceImageWebSocket;
